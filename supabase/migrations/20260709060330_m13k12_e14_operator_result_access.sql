-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060330
-- Remote name: m13k12_e14_operator_result_access
-- Remote SQL SHA-256: 2bd0ac9d302c21c2f152ead2177122b984bc4a91f6aa3aebafbe6f0aab5b4348
-- Do not edit after reconciliation; corrections require a new migration.

revoke all on function public.e14_get_operator_result(uuid,uuid,uuid) from public;
revoke all on function public.e14_get_operator_result(uuid,uuid,uuid) from anon;
revoke all on function public.e14_get_operator_result(uuid,uuid,uuid) from authenticated;
grant execute on function public.e14_get_operator_result(uuid,uuid,uuid) to service_role;
grant execute on function public.e14_get_operator_result(uuid,uuid,uuid) to app_worker;
