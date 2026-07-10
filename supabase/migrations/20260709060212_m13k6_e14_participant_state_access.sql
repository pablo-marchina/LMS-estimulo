-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060212
-- Remote name: m13k6_e14_participant_state_access
-- Remote SQL SHA-256: 3574db65a87fb21a87bb465f8a7a867d16e9a4e11a1b12a6e7e9a1842867976c
-- Do not edit after reconciliation; corrections require a new migration.

revoke all on function public.e14_get_participant_state(uuid,uuid) from public;
revoke all on function public.e14_get_participant_state(uuid,uuid) from anon;
revoke all on function public.e14_get_participant_state(uuid,uuid) from authenticated;
grant execute on function public.e14_get_participant_state(uuid,uuid) to service_role;
grant execute on function public.e14_get_participant_state(uuid,uuid) to app_worker;
