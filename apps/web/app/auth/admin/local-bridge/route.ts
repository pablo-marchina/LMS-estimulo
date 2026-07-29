import { NextResponse, type NextRequest } from "next/server";
import { localAdminCallbackUrl } from "@/lib/auth/admin-oauth-bridge-core.mjs";

const forwardedParameters = ["code", "error", "error_code", "error_description"] as const;

export function GET(request: NextRequest) {
  const returnTo = localAdminCallbackUrl(request.nextUrl.searchParams.get("return_to") ?? undefined);
  if (!returnTo) {
    return NextResponse.redirect(new URL("/entrar/administracao?erro=oauth_invalido", request.nextUrl.origin));
  }

  for (const parameter of forwardedParameters) {
    const value = request.nextUrl.searchParams.get(parameter);
    if (value) returnTo.searchParams.set(parameter, value);
  }

  return NextResponse.redirect(returnTo);
}
