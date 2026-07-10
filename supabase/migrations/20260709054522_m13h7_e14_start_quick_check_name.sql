-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054522
-- Remote name: m13h7_e14_start_quick_check_name
-- Remote SQL SHA-256: fd92dc6c3e5ac093580bd6a6cd4aa8eac96243a66961ba98aed7e02b180fa1dc
-- Do not edit after reconciliation; corrections require a new migration.

alter function public.e14_rpc_f(uuid,uuid,text) rename to e14_start_quick_check;
