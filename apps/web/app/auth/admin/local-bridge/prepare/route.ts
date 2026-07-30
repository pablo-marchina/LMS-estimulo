import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_LOCAL_OAUTH_RETURN_COOKIE,
  encodeLocalAdminCallback,
  localAdminOAuthResumeUrl,
} from "@/lib/auth/admin-oauth-bridge-core.mjs";

export function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("return_to") ?? undefined;
  const encodedReturn = encodeLocalAdminCallback(returnTo);
  const resume = localAdminOAuthResumeUrl(returnTo);
  if (!encodedReturn || !resume) {
    return NextResponse.redirect(new URL("/entrar/administracao?erro=oauth_invalido", request.nextUrl.origin));
  }

  const response = NextResponse.redirect(resume);
  response.cookies.set(ADMIN_LOCAL_OAUTH_RETURN_COOKIE, encodedReturn, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 5,
  });
  response.headers.set("cache-control", "no-store");
  return response;
}
