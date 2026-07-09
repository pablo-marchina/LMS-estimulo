import "server-only";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`CONFIGURATION_MISSING:${name}`);
  return value;
}

export function publicSupabaseEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  };
}

export function privilegedSupabaseEnv() {
  return {
    ...publicSupabaseEnv(),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY")
  };
}
