-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054030
-- Remote name: m13g8_e14_acknowledge_section_name
-- Remote SQL SHA-256: 15da00bb5e9d3efbc3b69942f6dcef08473339e119996032d5b5e817e37eaec1
-- Do not edit after reconciliation; corrections require a new migration.

alter function public.e14_rpc_e(uuid,uuid,text,boolean,text) rename to e14_acknowledge_section;
