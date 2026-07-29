import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { encodeFirstTouch, FIRST_TOUCH_COOKIE, firstTouchFromUrl } from "@/lib/auth/first-touch";

function adminOAuthFallback(request: NextRequest): NextResponse | null {
  if (request.nextUrl.pathname !== "/" || !request.nextUrl.searchParams.get("code")) return null;
  const callback = new URL("/auth/admin/callback", request.url);
  callback.search = request.nextUrl.search;
  return NextResponse.redirect(callback);
}

function shouldCaptureFirstTouch(request: NextRequest): boolean {
  return request.nextUrl.pathname === "/cadastro" && !request.cookies.has(FIRST_TOUCH_COOKIE);
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

export async function proxy(request: NextRequest) {
  const oauthFallback = adminOAuthFallback(request);
  if (oauthFallback) return oauthFallback;

  let response = NextResponse.next({ request });
  const administrativePath = request.nextUrl.pathname.startsWith("/admin");
  const protectedPath = request.nextUrl.pathname.startsWith("/empreendedor")
    || request.nextUrl.pathname.startsWith("/capacitacao")
    || administrativePath
    || request.nextUrl.pathname.startsWith("/cadastro/concluir");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return withFirstTouch(response, request);

  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await client.auth.getUser();
  if (protectedPath && !data.user) {
    const destination = administrativePath ? "/entrar/administracao" : "/entrar";
    return withFirstTouch(NextResponse.redirect(new URL(destination, request.url)), request);
  }
  return withFirstTouch(response, request);
}

export const config = { matcher: ["/", "/entrar/:path*", "/cadastro/:path*", "/auth/:path*", "/empreendedor/:path*", "/capacitacao/:path*", "/admin/:path*"] };