import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IdentityContext } from "@/lib/journey-runtime/contracts";
import {
  AuthenticatedGatewayError,
  invokeAuthenticatedGateway,
} from "@/lib/rpc/authenticated-gateway";

export class CurrentIdentityError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "CurrentIdentityError";
  }
}

export async function resolveCurrentIdentity(client: SupabaseClient): Promise<IdentityContext> {
  try {
    const data = await invokeAuthenticatedGateway<IdentityContext>(
      "e14_resolve_current_identity",
      {},
      client,
    );
    if (!data?.user_account_id || !Array.isArray(data.organizations)) {
      throw new CurrentIdentityError(
        "CURRENT_IDENTITY_INVALID",
        "The authenticated identity response is invalid.",
      );
    }
    return data;
  } catch (error) {
    if (error instanceof CurrentIdentityError) throw error;
    if (error instanceof AuthenticatedGatewayError) {
      throw new CurrentIdentityError(error.code, error.message);
    }
    throw error;
  }
}
