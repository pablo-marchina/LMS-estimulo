import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cache } from "react";
import { cookies } from "next/headers";
import { publicSupabaseEnv } from "@/lib/env";
import { platformRuntimeProvider } from "@/lib/platform/runtime-provider";

function isSupabaseSessionCookie(name: string) {
  return name.startsWith("sb-") || name.includes("auth-token");
}

export async function clearSupabaseSessionCookies() {
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (isSupabaseSessionCookie(cookie.name)) cookieStore.delete(cookie.name);
  }
}

async function createRequestSessionClient() {
  if (platformRuntimeProvider() !== "supabase") {
    throw new Error("SUPABASE_SESSION_ADAPTER_FORBIDDEN_IN_AWS_RUNTIME");
  }

  const cookieStore = await cookies();
  const { url, anonKey } = publicSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          for (const { name, value, options } of values) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot always mutate cookies; proxy.ts refreshes them.
        }
      },
    },
  });
}

// A participant page can invoke several RPCs in parallel. Reusing the same
// request-scoped Supabase client lets the auth library coordinate a token refresh
// instead of multiple independent clients racing on the same refresh token.
export const createSessionClient = cache(createRequestSessionClient);
