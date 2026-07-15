import "server-only";
import { browserE2EEnabled } from "@/lib/browser-e2e/config";
import { invokeSyntheticRpc } from "@/lib/browser-e2e/synthetic-runtime";
import { normalizeLegacyRpcArgumentsForSynthetic } from "@/lib/journey-runtime/legacy-rpc-arguments";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export class ServerRpcError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ServerRpcError";
  }
}

export async function invokeServerRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (browserE2EEnabled()) {
    try {
      return await invokeSyntheticRpc<T>(name, normalizeLegacyRpcArgumentsForSynthetic(name, args));
    } catch (error) {
      const message = error instanceof Error ? error.message : "BROWSER_E2E_RPC_ERROR";
      throw new ServerRpcError(message, message);
    }
  }

  const client = createPrivilegedClient();
  const { data, error } = await client.rpc(name, args);
  if (error) throw new ServerRpcError(error.code ?? "SERVER_RPC_ERROR", error.message);
  return data as T;
}
