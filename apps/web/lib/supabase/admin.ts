import "server-only";
import { createClient } from "@supabase/supabase-js";
import { privilegedSupabaseEnv } from "@/lib/env";

export function createPrivilegedClient() {
  const { url, serviceRoleKey } = privilegedSupabaseEnv();
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}
