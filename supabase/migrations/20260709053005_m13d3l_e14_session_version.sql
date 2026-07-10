-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053005
-- Remote name: m13d3l_e14_session_version
-- Remote SQL SHA-256: 19f1a883339a8b3318f1ced5da1486aea7628d1f9f6a1003b09f7c722b2ca4b7
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_session_version(a uuid)
returns bigint language sql stable security definer set search_path=pg_catalog as $$select aggregate_version from diagnostics.sessions where id=a$$;
