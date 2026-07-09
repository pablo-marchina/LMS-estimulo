import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

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
  const protectedPath = request.nextUrl.pathname.startsWith("/empreendedor") || request.nextUrl.pathname.startsWith("/admin");
  if (protectedPath && !data.user) return NextResponse.redirect(new URL("/entrar", request.url));
  if (request.nextUrl.pathname === "/entrar" && data.user) return NextResponse.redirect(new URL("/empreendedor", request.url));
  return response;
}

export const config = { matcher: ["/entrar", "/empreendedor/:path*", "/admin/:path*"] };
