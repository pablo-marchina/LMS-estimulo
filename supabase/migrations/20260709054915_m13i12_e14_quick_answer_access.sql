-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054915
-- Remote name: m13i12_e14_quick_answer_access
-- Remote SQL SHA-256: 8e4db582f9d3d87aadf75204041b32f236622e0234ee9c4ef820986c8d71ba6c
-- Do not edit after reconciliation; corrections require a new migration.

revoke all on function public.e14_record_quick_check_answer(uuid,uuid,uuid,text,text) from public;
revoke all on function public.e14_record_quick_check_answer(uuid,uuid,uuid,text,text) from anon;
revoke all on function public.e14_record_quick_check_answer(uuid,uuid,uuid,text,text) from authenticated;
grant execute on function public.e14_record_quick_check_answer(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.e14_record_quick_check_answer(uuid,uuid,uuid,text,text) to app_worker;
