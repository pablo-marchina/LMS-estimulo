import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IdentityContext } from "@/lib/journey-runtime/contracts";
import {
  AuthenticatedGatewayError,
  invokeAuthenticatedGateway,
} from "@/lib/rpc/authenticated-gateway";

export type CurrentIdentityContext = IdentityContext & {
  authenticated_email: string;
  authenticated_provider: "email" | "google";
};

export class CurrentIdentityError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "CurrentIdentityError";
  }
}

export async function resolveCurrentIdentity(client: SupabaseClient): Promise<CurrentIdentityContext> {
  try {
    const data = await invokeAuthenticatedGateway<CurrentIdentityContext>(
      "e14_resolve_current_identity",
      {},
      client,
    );
    if (
      !data?.user_account_id
      || !Array.isArray(data.organizations)
      || typeof data.authenticated_email !== "string"
      || !["email", "google"].includes(data.authenticated_provider)
    ) {
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
