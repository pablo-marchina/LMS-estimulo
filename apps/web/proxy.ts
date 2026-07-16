import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "@/lib/auth/navigation.js";

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

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/entrar";
  loginUrl.search = "";
  loginUrl.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const protectedPath = isProtectedPath(request.nextUrl.pathname);
  if (protectedPath && localSyntheticSession(request)) return response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return protectedPath ? redirectToLogin(request) : response;

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
  if (protectedPath && !data.user) return redirectToLogin(request);
  return response;
}

export const config = { matcher: ["/", "/entrar", "/empreendedor/:path*", "/capacitacao/:path*", "/admin/:path*"] };
