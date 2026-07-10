-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055115
-- Remote name: m13j5_e14_set_i
-- Remote SQL SHA-256: a451dafccbd6f85756998398661bbdea7f8e31b2c668963b90590144a604d1d8
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_set_i(a uuid,b text,c bigint)
returns bigint language sql security definer set search_path=pg_catalog as $$
 update assessment.attempts set status=b,submitted_at=now(),scored_at=now(),aggregate_version=c where id=a returning aggregate_version
$$;
