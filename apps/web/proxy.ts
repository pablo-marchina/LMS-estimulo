import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_LOCAL_OAUTH_RETURN_COOKIE,
  decodeLocalAdminCallback,
} from "@/lib/auth/admin-oauth-bridge-core.mjs";
import {
  encodeFirstTouch,
  FIRST_TOUCH_COOKIE,
  firstTouchFromUrl,
  hasUtmParameters,
} from "@/lib/auth/first-touch";
import { INTERFACE_PREVIEW_REQUEST_HEADER } from "@/lib/interface-preview/constants";
import { assertPlatformRuntimePolicy } from "@/lib/platform/runtime-provider";

const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/u;
const oauthResultParameters = ["code", "error", "error_code", "error_description"] as const;

function requestId(request: NextRequest): string {
  const candidate = request.headers.get("x-request-id") ?? request.headers.get("x-vercel-id") ?? "";
  return requestIdPattern.test(candidate) ? candidate : crypto.randomUUID();
}

function isParticipantPreviewRequest(request: NextRequest): boolean {
  return request.nextUrl.pathname.startsWith("/empreendedor")
    && request.nextUrl.searchParams.get("interface_preview") === "1";
}

function nextResponse(request: NextRequest, id: string): NextResponse {
  const headers = new Headers(request.headers);
  headers.set("x-request-id", id);
  if (isParticipantPreviewRequest(request)) headers.set(INTERFACE_PREVIEW_REQUEST_HEADER, "1");
  else headers.delete(INTERFACE_PREVIEW_REQUEST_HEADER);
  return NextResponse.next({ request: { headers } });
}

function finalize(response: NextResponse, id: string, startedAt: number): NextResponse {
  response.headers.set("x-request-id", id);
  response.headers.set("server-timing", `proxy;dur=${Math.max(0, performance.now() - startedAt).toFixed(1)}`);
  return response;
}

function clearLocalOAuthReturnCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_LOCAL_OAUTH_RETURN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}

function adminOAuthFallback(request: NextRequest): NextResponse | null {
  if (request.nextUrl.pathname !== "/") return null;
  const hasOAuthResult = oauthResultParameters.some((parameter) => request.nextUrl.searchParams.has(parameter));
  if (!hasOAuthResult) return null;

  const localCallback = decodeLocalAdminCallback(request.cookies.get(ADMIN_LOCAL_OAUTH_RETURN_COOKIE)?.value);
  if (localCallback) {
    for (const parameter of oauthResultParameters) {
      const value = request.nextUrl.searchParams.get(parameter);
      if (value) localCallback.searchParams.set(parameter, value);
    }
    const response = NextResponse.redirect(localCallback);
    response.headers.set("cache-control", "no-store");
    clearLocalOAuthReturnCookie(response);
    return response;
  }

  const callback = new URL("/auth/admin/callback", request.url);
  for (const parameter of oauthResultParameters) {
    const value = request.nextUrl.searchParams.get(parameter);
    if (value) callback.searchParams.set(parameter, value);
  }
  return NextResponse.redirect(callback);
}

function shouldCaptureFirstTouch(request: NextRequest): boolean {
  if (request.cookies.has(FIRST_TOUCH_COOKIE)) return false;

  const pathname = request.nextUrl.pathname;
  const administrativeEntry = pathname.startsWith("/admin")
    || pathname.startsWith("/auth/admin")
    || pathname.startsWith("/entrar/administracao");
  if (administrativeEntry) return false;

  return pathname === "/cadastro"
    || pathname === "/entrar"
    || hasUtmParameters(request.nextUrl);
}

function withFirstTouch(response: NextResponse, request: NextRequest): NextResponse {
  if (!shouldCaptureFirstTouch(request)) return response;
  response.cookies.set(FIRST_TOUCH_COOKIE, encodeFirstTouch(firstTouchFromUrl(request.nextUrl)), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

function unavailable(reason: string): NextResponse {
  return NextResponse.json(
    { status: "not_ready", reason },
    { status: 503, headers: { "cache-control": "no-store", "retry-after": "60" } },
  );
}

function clearSupabaseAuthCookies(response: NextResponse, request: NextRequest): void {
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith("sb-") && !cookie.name.includes("auth-token")) continue;
    response.cookies.set(cookie.name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
  }
}

export async function proxy(request: NextRequest) {
  const startedAt = performance.now();
  const id = requestId(request);

  let provider: "supabase" | "aws";
  try {
    provider = assertPlatformRuntimePolicy();
  } catch {
    return finalize(unavailable("runtime_policy_rejected"), id, startedAt);
  }

  if (provider === "aws") {
    return finalize(unavailable("aws_identity_architecture_pending"), id, startedAt);
  }

  const oauthFallback = adminOAuthFallback(request);
  if (oauthFallback) return finalize(oauthFallback, id, startedAt);

  let response = nextResponse(request, id);
  const administrativePath = request.nextUrl.pathname.startsWith("/admin");
  const protectedPath = request.nextUrl.pathname.startsWith("/empreendedor")
    || request.nextUrl.pathname.startsWith("/capacitacao")
    || administrativePath
    || request.nextUrl.pathname.startsWith("/cadastro/concluir");

  if (!protectedPath) {
    return finalize(withFirstTouch(response, request), id, startedAt);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return finalize(unavailable("supabase_identity_configuration_unavailable"), id, startedAt);
  }

  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = nextResponse(request, id);
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
      },
    },
  });

  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims?.sub) {
    const destination = administrativePath ? "/entrar/administracao" : "/entrar";
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
    redirectResponse.headers.set("cache-control", "no-store");
    clearSupabaseAuthCookies(redirectResponse, request);
    return finalize(withFirstTouch(redirectResponse, request), id, startedAt);
  }

  response.headers.set("cache-control", "private, no-store");
  return finalize(withFirstTouch(response, request), id, startedAt);
}

export const config = {
  matcher: ["/", "/entrar/:path*", "/cadastro/:path*", "/auth/:path*", "/empreendedor/:path*", "/capacitacao/:path*", "/admin/:path*"],
};
