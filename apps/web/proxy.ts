import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { encodeFirstTouch, FIRST_TOUCH_COOKIE, firstTouchFromUrl } from "@/lib/auth/first-touch";

const BROWSER_E2E_COOKIE = "estimulo_browser_e2e";

function localSyntheticSession(request: NextRequest): boolean {
  const token = process.env.BROWSER_E2E_TOKEN?.trim() ?? "";
  if (process.env.BROWSER_E2E_MODE !== "synthetic" || token.length < 24) return false;
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) return false;
  try {
    const hostname = new URL(configuredUrl).hostname;
    if (!new Set(["127.0.0.1", "localhost", "::1"]).has(hostname)) return false;
  } catch {
    return false;
  }
  return request.cookies.get(BROWSER_E2E_COOKIE)?.value === token;
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
  let response = NextResponse.next({ request });
  const protectedPath = request.nextUrl.pathname.startsWith("/empreendedor")
    || request.nextUrl.pathname.startsWith("/capacitacao")
    || request.nextUrl.pathname.startsWith("/admin")
    || request.nextUrl.pathname.startsWith("/cadastro/concluir");
  if (protectedPath && localSyntheticSession(request)) return withFirstTouch(response, request);

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
      }
    }
  });
  const { data } = await client.auth.getUser();
  if (protectedPath && !data.user) {
    return withFirstTouch(NextResponse.redirect(new URL("/entrar", request.url)), request);
  }
  return withFirstTouch(response, request);
}

export const config = { matcher: ["/entrar", "/cadastro/:path*", "/auth/:path*", "/empreendedor/:path*", "/capacitacao/:path*", "/admin/:path*"] };
