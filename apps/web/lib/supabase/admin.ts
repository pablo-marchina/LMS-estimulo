import "server-only";
import { createClient } from "@supabase/supabase-js";
import { privilegedSupabaseEnv } from "@/lib/env";
import { platformRuntimeProvider } from "@/lib/platform/runtime-provider";

export function createPrivilegedClient() {
  if (platformRuntimeProvider() !== "supabase") {
    throw new Error("SUPABASE_PRIVILEGED_ADAPTER_FORBIDDEN_IN_AWS_RUNTIME");
  }

  const { url, serviceRoleKey } = privilegedSupabaseEnv();
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
