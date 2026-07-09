import "server-only";
import { createHash } from "node:crypto";
import { createSessionClient } from "@/lib/supabase/server";
import { e14, E14RpcError } from "@/lib/e14/rpc";
import type { IdentityContext } from "@/lib/e14/contracts";

export type AuthContext =
  | { status: "anonymous" }
  | { status: "identity_error"; reason: string }
  | { status: "authenticated"; identity: IdentityContext; email: string };

export async function getAuthContext(): Promise<AuthContext> {
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
    const identity = await e14.resolveIdentity({
      provider,
      issuer,
      subject: user.id,
      email,
      emailVerified: true,
      claimsFingerprint: fingerprint
    });
    return { status: "authenticated", identity, email };
  } catch (error) {
    const reason = error instanceof E14RpcError ? error.message : "IDENTITY_RESOLUTION_FAILED";
    return { status: "identity_error", reason };
  }
}
