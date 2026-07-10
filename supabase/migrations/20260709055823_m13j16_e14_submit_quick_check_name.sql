-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055823
-- Remote name: m13j16_e14_submit_quick_check_name
-- Remote SQL SHA-256: 576ec5779f9dc7b3f46ef396832cfda0c986e0aa8a3aa7fb19ad3e42af2ced17
-- Do not edit after reconciliation; corrections require a new migration.

alter function public.e14_rpc_i(uuid,uuid,bigint,text) rename to e14_submit_quick_check;
