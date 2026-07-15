import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { BROWSER_E2E_COOKIE, browserE2EEnabled, browserE2EToken } from "@/lib/browser-e2e/config";
import { syntheticIdentity } from "@/lib/browser-e2e/synthetic-runtime";
import { createSessionClient } from "@/lib/supabase/server";
import { journeyRuntime, JourneyRpcError } from "@/lib/journey-runtime/rpc";
import type { IdentityContext } from "@/lib/journey-runtime/contracts";

export type AuthContext =
  | { status: "anonymous" }
  | { status: "identity_error"; reason: string }
  | { status: "authenticated"; identity: IdentityContext; email: string };

export async function getAuthContext(): Promise<AuthContext> {
  if (browserE2EEnabled()) {
    const cookieStore = await cookies();
    if (cookieStore.get(BROWSER_E2E_COOKIE)?.value === browserE2EToken()) {
      return {
        status: "authenticated",
        identity: syntheticIdentity(),
        email: "participante.e2e@estimulo.local"
      };
    }
    return { status: "anonymous" };
  }

  const session = await createSessionClient();
  const { data, error } = await session.auth.getUser();
  if (error || !data.user) return { status: "anonymous" };

  const user = data.user;
  const email = user.email?.trim().toLowerCase();
  if (!email || !user.email_confirmed_at) return { status: "identity_error", reason: "VERIFIED_EMAIL_REQUIRED" };

  const issuer = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")}/auth/v1`;
  const provider = String(user.app_metadata?.provider ?? "supabase");
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ issuer, subject: user.id, email, provider, audience: user.aud }))
    .digest("hex");

  try {
    const identity = await journeyRuntime.resolveIdentity({
      provider,
      issuer,
      subject: user.id,
      email,
      emailVerified: true,
      claimsFingerprint: fingerprint
    });
    return { status: "authenticated", identity, email };
  } catch (error) {
    const reason = error instanceof JourneyRpcError ? error.message : "IDENTITY_RESOLUTION_FAILED";
    return { status: "identity_error", reason };
  }
}
