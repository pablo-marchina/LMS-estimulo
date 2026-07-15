import { NextRequest, NextResponse } from "next/server";
import { BROWSER_E2E_COOKIE, browserE2EEnabled, browserE2EToken } from "@/lib/browser-e2e/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!browserE2EEnabled()) return new NextResponse("Not Found", { status: 404 });
  const supplied = request.nextUrl.searchParams.get("token") ?? "";
  if (supplied !== browserE2EToken()) return new NextResponse("Forbidden", { status: 403 });

  const response = NextResponse.redirect(new URL("/empreendedor", request.url), 303);
  response.cookies.set(BROWSER_E2E_COOKIE, browserE2EToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 30
  });
  return response;
}
