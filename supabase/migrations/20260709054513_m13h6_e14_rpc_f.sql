-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054513
-- Remote name: m13h6_e14_rpc_f
-- Remote SQL SHA-256: bc52cfd82592927561e8b529d325e4082ecaf813ef4ec33c07f72bdcd2a4f55f
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_rpc_f(a uuid,b uuid,c text) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_f(a,b,c)$$;
