import "server-only";
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
  // The admin track editor was switched to the v2 client contract before the
  // corresponding database RPC was deployed. Production exposes the canonical
  // save_admin_track RPC, which already supports the fields used by creation
  // and editing. Keep the compatibility mapping at the gateway boundary so all
  // callers share the same working backend contract.
  if (name === "save_admin_track_v2") {
    return "save_admin_track";
  }
  return name;
}

export async function invokeServerRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invokeAuthenticatedGateway<T>(liveRpcName(name), args);
  } catch (error) {
    if (error instanceof AuthenticatedGatewayError) {
      throw new ServerRpcError(error.code, error.message);
    }
    throw error;
  }
}
