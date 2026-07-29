import "server-only";
import { cache } from "react";
import { CurrentIdentityError, resolveCurrentIdentity, type CurrentIdentityContext } from "@/lib/auth/current-identity";
import { assertPlatformRuntimePolicy } from "@/lib/platform/runtime-provider";
import { createSessionClient } from "@/lib/supabase/server";

export type AuthContext =
  | { status: "anonymous" }
  | { status: "identity_error"; reason: string }
  | { status: "authenticated"; identity: CurrentIdentityContext; email: string; provider: string };

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  let provider: "supabase" | "aws";
  try {
    provider = assertPlatformRuntimePolicy();
  } catch {
    return { status: "identity_error", reason: "RUNTIME_POLICY_REJECTED" };
  }

  if (provider === "aws") {
    return { status: "identity_error", reason: "AWS_IDENTITY_ARCHITECTURE_PENDING" };
  }

  const session = await createSessionClient();
  try {
    const identity = await resolveCurrentIdentity(session);
    return {
      status: "authenticated",
      identity,
      email: identity.authenticated_email.trim().toLowerCase(),
      provider: identity.authenticated_provider,
    };
  } catch (error) {
    const reason = error instanceof CurrentIdentityError ? error.code : "IDENTITY_RESOLUTION_FAILED";
    if (reason === "AUTHENTICATED_SESSION_REQUIRED" || reason === "VERIFIED_SESSION_REQUIRED") {
      return { status: "anonymous" };
    }
    return { status: "identity_error", reason };
  }
});
