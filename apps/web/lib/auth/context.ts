import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { BROWSER_E2E_COOKIE, browserE2EEnabled, browserE2EToken } from "@/lib/browser-e2e/config";
import { syntheticIdentity } from "@/lib/browser-e2e/synthetic-runtime";
import { CurrentIdentityError, resolveCurrentIdentity, type CurrentIdentityContext } from "@/lib/auth/current-identity";
import { createSessionClient } from "@/lib/supabase/server";

export type AuthContext =
  | { status: "anonymous" }
  | { status: "identity_error"; reason: string }
  | { status: "authenticated"; identity: CurrentIdentityContext; email: string; provider: string };

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  if (browserE2EEnabled()) {
    const cookieStore = await cookies();
    if (cookieStore.get(BROWSER_E2E_COOKIE)?.value === browserE2EToken()) {
      return {
        status: "authenticated",
        identity: {
          ...syntheticIdentity(),
          authenticated_email: "e2e@estimulo.org",
          authenticated_provider: "google",
          access_mode: "participant",
          next_path: "/empreendedor",
        },
        email: "e2e@estimulo.org",
        provider: "google",
      };
    }
    return { status: "anonymous" };
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
