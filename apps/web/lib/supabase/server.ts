import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicSupabaseEnv } from "@/lib/env";
import { platformRuntimeProvider } from "@/lib/platform/runtime-provider";

export async function createSessionClient() {
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
