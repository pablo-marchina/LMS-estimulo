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