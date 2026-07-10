-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054905
-- Remote name: m13i11_e14_quick_answer_name
-- Remote SQL SHA-256: c4467ce3cd06e1427228965e516c6294c4ebd5334050896262ad1a5e4f97e591
-- Do not edit after reconciliation; corrections require a new migration.

alter function public.e14_rpc_h(uuid,uuid,uuid,text,text) rename to e14_record_quick_check_answer;
