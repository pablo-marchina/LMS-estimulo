-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053641
-- Remote name: m13e14_e14_complete_diagnostic_rpc
-- Remote SQL SHA-256: 8bc4533e59ef668fc9bbe0702947e910bb8754fd66ab0427cf563858c1f2016a
-- Do not edit after reconciliation; corrections require a new migration.

drop function public.e14_complete_diagnostic(uuid,uuid,bigint,text);
alter function public.e14_rpc_c(uuid,uuid,bigint,text) rename to e14_complete_diagnostic;
revoke all on function public.e14_complete_diagnostic(uuid,uuid,bigint,text) from public;
revoke all on function public.e14_complete_diagnostic(uuid,uuid,bigint,text) from anon;
revoke all on function public.e14_complete_diagnostic(uuid,uuid,bigint,text) from authenticated;
grant execute on function public.e14_complete_diagnostic(uuid,uuid,bigint,text) to service_role;
grant execute on function public.e14_complete_diagnostic(uuid,uuid,bigint,text) to app_worker;
