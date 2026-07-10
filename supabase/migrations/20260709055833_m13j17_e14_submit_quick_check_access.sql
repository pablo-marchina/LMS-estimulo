-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055833
-- Remote name: m13j17_e14_submit_quick_check_access
-- Remote SQL SHA-256: 922840c6325f815e03e1b03d3fb8d0f15640f9b0de2629416ebe72f0b1a4c8fc
-- Do not edit after reconciliation; corrections require a new migration.

revoke all on function public.e14_submit_quick_check(uuid,uuid,bigint,text) from public;
revoke all on function public.e14_submit_quick_check(uuid,uuid,bigint,text) from anon;
revoke all on function public.e14_submit_quick_check(uuid,uuid,bigint,text) from authenticated;
grant execute on function public.e14_submit_quick_check(uuid,uuid,bigint,text) to service_role;
grant execute on function public.e14_submit_quick_check(uuid,uuid,bigint,text) to app_worker;
