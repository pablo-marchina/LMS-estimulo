import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicSupabaseEnv } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";

export class AuthenticatedGatewayError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "AuthenticatedGatewayError";
  }
}

type GatewaySuccess<T> = { ok: true; data: T };
type GatewayFailure = { ok: false; code?: string; message?: string };

export async function invokeAuthenticatedGateway<T>(
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
  const response = await fetch(`${url.replace(/\/$/, "")}/functions/v1/authenticated-rpc`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ name, args }),
    cache: "no-store",
  });

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
