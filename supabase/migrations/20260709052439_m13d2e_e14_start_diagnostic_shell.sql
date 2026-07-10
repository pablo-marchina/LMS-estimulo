-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052439
-- Remote name: m13d2e_e14_start_diagnostic_shell
-- Remote SQL SHA-256: 58aa2ef12e2d162294f364883a80ed1c25ff430996c77fb907dcfbc1bd769d14
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_cmd_start_diagnostic(p_actor uuid,p_instance uuid,p_diag uuid,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$begin return '{}'::jsonb;end;$$;
