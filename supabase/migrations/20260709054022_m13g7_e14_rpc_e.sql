-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054022
-- Remote name: m13g7_e14_rpc_e
-- Remote SQL SHA-256: 6ea4bd91081087ba7db221b04991a9015f3d8267244439b1f426edeaca2d29e6
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_rpc_e(a uuid,b uuid,c text,d boolean,e text) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_e(a,b,c,d,e)$$;
