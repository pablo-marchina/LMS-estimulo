-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053629
-- Remote name: m13e13_e14_rpc_c
-- Remote SQL SHA-256: 1a034dabd9816196d1c6b32875e157e8fefcdab3b907bf4707b605c98029fd37
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_rpc_c(a uuid,b uuid,c bigint,d text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_c(a,b,c,d)$$;
