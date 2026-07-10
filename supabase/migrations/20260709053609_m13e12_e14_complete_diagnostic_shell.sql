-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053609
-- Remote name: m13e12_e14_complete_diagnostic_shell
-- Remote SQL SHA-256: 69d2e0783a5ceb1b5260f25a6ca5a98fa77d6b957a394aa6a7685385766b56e5
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_complete_diagnostic(p_actor_user_account_id uuid,p_session_id uuid,p_expected_aggregate_version bigint,p_idempotency_key text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select '{}'::jsonb$$;
