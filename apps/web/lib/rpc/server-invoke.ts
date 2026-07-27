import "server-only";
import { browserE2EEnabled } from "@/lib/browser-e2e/config";
import { invokeSyntheticRpc } from "@/lib/browser-e2e/synthetic-runtime";
import { syntheticSupplementalRpc } from "@/lib/browser-e2e/synthetic-supplemental-rpc";
import { normalizeLegacyRpcArgumentsForSynthetic } from "@/lib/journey-runtime/legacy-rpc-arguments";
import {
  AuthenticatedGatewayError,
  invokeAuthenticatedGateway,
} from "@/lib/rpc/authenticated-gateway";

export class ServerRpcError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ServerRpcError";
  }
}

function liveRpcName(name: string): string {
  if (name === "e14_get_participant_experience") {
    return "get_participant_experience_with_default_diagnostic";
  }
  return name;
}

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

  try {
    return await invokeAuthenticatedGateway<T>(liveRpcName(name), args);
  } catch (error) {
    if (error instanceof AuthenticatedGatewayError) {
      throw new ServerRpcError(error.code, error.message);
    }
    throw error;
  }
}
