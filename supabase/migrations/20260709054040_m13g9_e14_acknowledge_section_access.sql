-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054040
-- Remote name: m13g9_e14_acknowledge_section_access
-- Remote SQL SHA-256: 51b5adf87bae004f992b493d5b3b325e2f15d30bc97a309225c8504200b73e9e
-- Do not edit after reconciliation; corrections require a new migration.

revoke all on function public.e14_acknowledge_section(uuid,uuid,text,boolean,text) from public;
revoke all on function public.e14_acknowledge_section(uuid,uuid,text,boolean,text) from anon;
revoke all on function public.e14_acknowledge_section(uuid,uuid,text,boolean,text) from authenticated;
grant execute on function public.e14_acknowledge_section(uuid,uuid,text,boolean,text) to service_role;
grant execute on function public.e14_acknowledge_section(uuid,uuid,text,boolean,text) to app_worker;
