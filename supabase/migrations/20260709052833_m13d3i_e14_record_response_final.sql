-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052833
-- Remote name: m13d3i_e14_record_response_final
-- Remote SQL SHA-256: 6d437a3e8bd12e11c61563492146fa05c14e36271d5ea42c7169eb3e79a160f8
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_record_diagnostic_response(p_actor_user_account_id uuid,p_session_id uuid,p_item_id uuid,p_option_code text,p_revision integer,p_response_time_ms integer,p_idempotency_key text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_b($1,$2,$3,$4,$5,$6,$7)$$;
