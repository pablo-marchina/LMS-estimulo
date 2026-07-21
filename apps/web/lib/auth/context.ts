import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { BROWSER_E2E_COOKIE, browserE2EEnabled, browserE2EToken } from "@/lib/browser-e2e/config";
import { syntheticIdentity } from "@/lib/browser-e2e/synthetic-runtime";
import { resolveAuthProvider } from "@/lib/auth/provider";
import { createSessionClient } from "@/lib/supabase/server";
import { journeyRuntime, JourneyRpcError } from "@/lib/journey-runtime/rpc";
import type { IdentityContext } from "@/lib/journey-runtime/contracts";

export type AuthContext =
  | { status: "anonymous" }
  | { status: "identity_error"; reason: string }
  | { status: "authenticated"; identity: IdentityContext; email: string; provider: string };

export async function getAuthContext(): Promise<AuthContext> {
  if (browserE2EEnabled()) {
    const cookieStore = await cookies();
    if (cookieStore.get(BROWSER_E2E_COOKIE)?.value === browserE2EToken()) {
      return {
        status: "authenticated",
        identity: syntheticIdentity(),
        email: "e2e@estimulo.org",
        provider: "google",
      };
    }
    return { status: "anonymous" };
  }

  const session = await createSessionClient();
  const [{ data, error }, { data: claimsData, error: claimsError }] = await Promise.all([
    session.auth.getUser(),
    session.auth.getClaims(),
  ]);
  if (error || !data.user) return { status: "anonymous" };
  if (claimsError || !claimsData?.claims) return { status: "identity_error", reason: "VERIFIED_AUTH_CLAIMS_REQUIRED" };

  const user = data.user;
  const email = user.email?.trim().toLowerCase();
  if (!email || !user.email_confirmed_at) return { status: "identity_error", reason: "VERIFIED_EMAIL_REQUIRED" };

  const issuer = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")}/auth/v1`;
  const provider = resolveAuthProvider(user, claimsData.claims.amr);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ issuer, subject: user.id, email, provider, audience: user.aud, amr: claimsData.claims.amr }))
    .digest("hex");

  try {
    const identity = await journeyRuntime.resolveIdentity({
      provider,
      issuer,
      subject: user.id,
      email,
      emailVerified: true,
      claimsFingerprint: fingerprint,
    });
    return { status: "authenticated", identity, email, provider };
  } catch (error) {
    const reason = error instanceof JourneyRpcError ? error.message : "IDENTITY_RESOLUTION_FAILED";
    return { status: "identity_error", reason };
  }
}
