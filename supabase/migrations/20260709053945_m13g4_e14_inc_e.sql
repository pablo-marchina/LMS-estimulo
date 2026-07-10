-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053945
-- Remote name: m13g4_e14_inc_e
-- Remote SQL SHA-256: e604f1547704f995af40deb41589535ba42d2540c5096e9d8cd0db5f8620fd35
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_inc_e(a uuid)
returns integer language sql security definer set search_path=pg_catalog as $$
 update orchestration.activity_sessions set accepted_observation_count=accepted_observation_count+1,last_seen_at=now() where id=a and ended_at is null returning accepted_observation_count
$$;
