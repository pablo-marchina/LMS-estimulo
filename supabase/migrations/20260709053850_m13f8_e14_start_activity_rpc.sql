-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053850
-- Remote name: m13f8_e14_start_activity_rpc
-- Remote SQL SHA-256: fdb21f970d828817587f4e4da57fc40d9fce86d16bce00893feefc69bef7e389
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_rpc_d(a uuid,b uuid,c bigint,d text) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_d(a,b,c,d)$$;
alter function public.e14_rpc_d(uuid,uuid,bigint,text) rename to e14_start_activity;
revoke all on function public.e14_start_activity(uuid,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.e14_start_activity(uuid,uuid,bigint,text) to service_role,app_worker;
