-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054726
-- Remote name: m13i7_e14_increment_attempt
-- Remote SQL SHA-256: a27b8e12c2b77afdbf7098c3ca56a2936cdd402b4dd912918dba1d93db07a37b
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_increment_attempt(a uuid)
returns bigint language sql security definer set search_path=pg_catalog as $$
 update assessment.attempts set aggregate_version=aggregate_version+1 where id=a returning aggregate_version
$$;
