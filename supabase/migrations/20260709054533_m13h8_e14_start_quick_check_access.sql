-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054533
-- Remote name: m13h8_e14_start_quick_check_access
-- Remote SQL SHA-256: 2b8197d444102e19e41bebe9ef2889e2e5bb435c06938a4dea3befab6bdf714c
-- Do not edit after reconciliation; corrections require a new migration.

revoke all on function public.e14_start_quick_check(uuid,uuid,text) from public;
revoke all on function public.e14_start_quick_check(uuid,uuid,text) from anon;
revoke all on function public.e14_start_quick_check(uuid,uuid,text) from authenticated;
grant execute on function public.e14_start_quick_check(uuid,uuid,text) to service_role;
grant execute on function public.e14_start_quick_check(uuid,uuid,text) to app_worker;
