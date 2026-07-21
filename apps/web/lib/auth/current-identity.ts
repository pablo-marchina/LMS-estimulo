import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IdentityContext } from "@/lib/journey-runtime/contracts";

export class CurrentIdentityError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "CurrentIdentityError";
  }
}

export async function resolveCurrentIdentity(client: SupabaseClient): Promise<IdentityContext> {
  const { data, error } = await client.rpc("e14_resolve_current_identity");
  if (error) throw new CurrentIdentityError(error.code ?? "CURRENT_IDENTITY_ERROR", error.message);
  if (!data?.user_account_id || !Array.isArray(data.organizations)) {
    throw new CurrentIdentityError("CURRENT_IDENTITY_INVALID", "The authenticated identity response is invalid.");
  }
  return data as IdentityContext;
}
