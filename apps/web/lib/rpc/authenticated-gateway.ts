import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicSupabaseEnv } from "@/lib/env";
import { platformRuntimeProvider } from "@/lib/platform/runtime-provider";
import { createSessionClient } from "@/lib/supabase/server";

export class AuthenticatedGatewayError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "AuthenticatedGatewayError";
  }
}

type GatewaySuccess<T> = { ok: true; data: T };
type GatewayFailure = { ok: false; code?: string; message?: string };

function gatewayTimeoutMs(): number {
  const value = Number(process.env.RPC_GATEWAY_TIMEOUT_MS ?? 10_000);
  if (!Number.isInteger(value) || value < 1_000 || value > 60_000) {
    throw new AuthenticatedGatewayError(
      "RPC_GATEWAY_TIMEOUT_INVALID",
      "The authenticated RPC gateway timeout is invalid.",
    );
  }
  return value;
}

async function invokeSupabaseGateway<T>(
  name: string,
  args: Record<string, unknown>,
  client?: SupabaseClient,
): Promise<T> {
  const sessionClient = client ?? await createSessionClient();
  const { data: sessionData, error: sessionError } = await sessionClient.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) {
    throw new AuthenticatedGatewayError(
      "AUTHENTICATED_SESSION_REQUIRED",
      "An authenticated session is required.",
    );
  }

  const { url } = publicSupabaseEnv();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), gatewayTimeoutMs());
  let response: Response;
  try {
    response = await fetch(`${url.replace(/\/$/, "")}/functions/v1/authenticated-rpc`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name, args }),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AuthenticatedGatewayError(
        "RPC_GATEWAY_TIMEOUT",
        "The authenticated RPC gateway timed out.",
      );
    }
    throw new AuthenticatedGatewayError(
      "RPC_GATEWAY_UNAVAILABLE",
      "The authenticated RPC gateway is unavailable.",
    );
  } finally {
    clearTimeout(timeout);
  }

  let payload: GatewaySuccess<T> | GatewayFailure;
  try {
    payload = await response.json() as GatewaySuccess<T> | GatewayFailure;
  } catch {
    throw new AuthenticatedGatewayError(
      "RPC_GATEWAY_INVALID_RESPONSE",
      "The authenticated RPC gateway returned an invalid response.",
    );
  }

  if (!response.ok) {
    const failure = payload as GatewayFailure;
    throw new AuthenticatedGatewayError(
      failure.code ?? `RPC_GATEWAY_HTTP_${response.status}`,
      failure.message ?? "The authenticated RPC gateway rejected the request.",
    );
  }
  if (!payload.ok) {
    throw new AuthenticatedGatewayError(
      payload.code ?? "RPC_GATEWAY_REJECTED",
      payload.message ?? "The authenticated RPC gateway rejected the request.",
    );
  }

  return payload.data;
}

export async function invokeAuthenticatedGateway<T>(
  name: string,
  args: Record<string, unknown>,
  client?: SupabaseClient,
): Promise<T> {
  const provider = platformRuntimeProvider();
  if (provider === "supabase") return invokeSupabaseGateway<T>(name, args, client);

  // The AWS adapter will resolve the Cognito identity and execute approved PostgreSQL
  // operations through RDS Proxy. Until that implementation exists, fail closed.
  throw new AuthenticatedGatewayError(
    "AWS_RPC_GATEWAY_NOT_IMPLEMENTED",
    "The AWS authenticated RPC adapter is not implemented.",
  );
}
