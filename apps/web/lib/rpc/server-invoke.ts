import "server-only";
import { browserE2EEnabled } from "@/lib/browser-e2e/config";
import { invokeSyntheticRpc } from "@/lib/browser-e2e/synthetic-runtime";
import { syntheticSupplementalRpc } from "@/lib/browser-e2e/synthetic-supplemental-rpc";
import { publicSupabaseEnv } from "@/lib/env";
import { normalizeLegacyRpcArgumentsForSynthetic } from "@/lib/journey-runtime/legacy-rpc-arguments";
import { createSessionClient } from "@/lib/supabase/server";

export class ServerRpcError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ServerRpcError";
  }
}

type GatewaySuccess<T> = { ok: true; data: T };
type GatewayFailure = { ok: false; code?: string; message?: string };

export async function invokeServerRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (browserE2EEnabled()) {
    try {
      const supplemental = syntheticSupplementalRpc(name, args);
      if (supplemental.handled) return supplemental.value as T;
      return await invokeSyntheticRpc<T>(name, normalizeLegacyRpcArgumentsForSynthetic(name, args));
    } catch (error) {
      const message = error instanceof Error ? error.message : "BROWSER_E2E_RPC_ERROR";
      throw new ServerRpcError(message, message);
    }
  }

  const sessionClient = await createSessionClient();
  const { data: sessionData, error: sessionError } = await sessionClient.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) {
    throw new ServerRpcError("AUTHENTICATED_SESSION_REQUIRED", "An authenticated session is required.");
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
    throw new ServerRpcError("RPC_GATEWAY_INVALID_RESPONSE", "The authenticated RPC gateway returned an invalid response.");
  }

  if (!response.ok || !payload.ok) {
    throw new ServerRpcError(
      payload.code ?? `RPC_GATEWAY_HTTP_${response.status}`,
      payload.message ?? "The authenticated RPC gateway rejected the request.",
    );
  }

  return payload.data;
}
