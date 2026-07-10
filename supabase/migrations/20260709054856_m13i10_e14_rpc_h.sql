-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054856
-- Remote name: m13i10_e14_rpc_h
-- Remote SQL SHA-256: e833fe11f1e56a3b77fa7d37a1ba2fee3f9ea53977b545fd7ce80c91873b16f0
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_rpc_h(a uuid,b uuid,c uuid,d text,e text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_h(a,b,c,d,e)$$;
