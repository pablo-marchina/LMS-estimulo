import { NextResponse, type NextRequest } from "next/server";
import {
  adminOAuthPreparationTarget,
  adminOAuthRedirectTarget,
  isLocalApplicationOrigin,
} from "@/lib/auth/admin-oauth-bridge-core.mjs";
import { publicApplicationOrigin } from "@/lib/http-public-origin";
import { createSessionClient } from "@/lib/supabase/server";

function signInError(request: NextRequest) {
  return NextResponse.redirect(new URL("/entrar/administracao?erro=oauth_indisponivel", request.url));
}

export async function GET(request: NextRequest) {
  const applicationOrigin = publicApplicationOrigin(request.nextUrl.origin);
  const localRequest = isLocalApplicationOrigin(request.nextUrl.origin);
  const bridgeReady = request.nextUrl.searchParams.get("bridge_ready") === "1";

  if (localRequest && !bridgeReady) {
    const preparation = adminOAuthPreparationTarget({
      applicationOrigin,
      requestOrigin: request.nextUrl.origin,
      bridgeOrigin: process.env.ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN,
    });
    if (!preparation) return signInError(request);
    return NextResponse.redirect(preparation);
  }

  const client = await createSessionClient();
  const redirectTo = adminOAuthRedirectTarget({
    applicationOrigin,
    requestOrigin: request.nextUrl.origin,
    bridgeOrigin: process.env.ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN,
  });
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) return signInError(request);
  return NextResponse.redirect(data.url);
}
