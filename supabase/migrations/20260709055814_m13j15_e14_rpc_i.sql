-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055814
-- Remote name: m13j15_e14_rpc_i
-- Remote SQL SHA-256: 053183e7c780f5e7607a80706807f9e9f14c3190d72f97bc1ff8a2976646a510
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_rpc_i(a uuid,b uuid,c bigint,d text) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_i(a,b,c,d)$$;
