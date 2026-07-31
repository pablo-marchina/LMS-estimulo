import "server-only";

import { publicSupabaseEnv } from "@/lib/env";
import { platformRuntimeProvider } from "@/lib/platform/runtime-provider";
import { createSessionClient } from "@/lib/supabase/server";

export class ExtensionsGatewayError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ExtensionsGatewayError";
  }
}

type GatewaySuccess<T> = { ok: true; data: T };
type GatewayFailure = { ok: false; code?: string; message?: string };

function configuredInteger(name: string, fallback: number, minimum: number, maximum: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new ExtensionsGatewayError(`${name}_INVALID`, `${name} is invalid.`);
  }
  return value;
}

export async function invokeExtensionsGateway<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (platformRuntimeProvider() !== "supabase") {
    throw new ExtensionsGatewayError("AWS_DATA_ARCHITECTURE_PENDING", "The AWS data architecture is pending approval.");
  }

  const sessionClient = await createSessionClient();
  const { data: sessionData, error: sessionError } = await sessionClient.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) {
    throw new ExtensionsGatewayError("AUTHENTICATED_SESSION_REQUIRED", "An authenticated session is required.");
  }

  const body = JSON.stringify({ name, args });
  const maxBytes = configuredInteger("RPC_GATEWAY_MAX_PAYLOAD_BYTES", 262_144, 1_024, 1_048_576);
  if (Buffer.byteLength(body, "utf8") > maxBytes) {
    throw new ExtensionsGatewayError("RPC_GATEWAY_PAYLOAD_TOO_LARGE", "The request is too large.");
  }

  const { url } = publicSupabaseEnv();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), configuredInteger("RPC_GATEWAY_TIMEOUT_MS", 15_000, 1_000, 60_000));
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/functions/v1/platform-extensions-rpc`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        "x-request-id": crypto.randomUUID(),
      },
      body,
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as GatewaySuccess<T> | GatewayFailure | null;
    if (!response.ok || !payload?.ok) {
      const failure = payload as GatewayFailure | null;
      throw new ExtensionsGatewayError(
        failure?.code ?? `EXTENSIONS_GATEWAY_HTTP_${response.status}`,
        failure?.message ?? "The platform extensions request failed.",
      );
    }
    return payload.data;
  } catch (error) {
    if (error instanceof ExtensionsGatewayError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ExtensionsGatewayError("EXTENSIONS_GATEWAY_TIMEOUT", "The platform extensions request timed out.");
    }
    throw new ExtensionsGatewayError("EXTENSIONS_GATEWAY_UNAVAILABLE", "The platform extensions gateway is unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}
