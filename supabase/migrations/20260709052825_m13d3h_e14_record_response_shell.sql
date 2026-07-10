-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052825
-- Remote name: m13d3h_e14_record_response_shell
-- Remote SQL SHA-256: 2dbe7e0b33f5626d9046c31308dfafd1ba03101ca20d5c268431f63c4c988c52
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_record_diagnostic_response(p_actor_user_account_id uuid,p_session_id uuid,p_item_id uuid,p_option_code text,p_revision integer,p_response_time_ms integer,p_idempotency_key text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select '{}'::jsonb$$;
