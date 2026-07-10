-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055413
-- Remote name: m13j8d_e14_complete_journey_state
-- Remote SQL SHA-256: 967637d1bbc6c5a1c1d899aea5d37e797726ac1065fab91eba165e7188f2e898
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_complete_journey_state(a uuid,b bigint)
returns bigint language sql security definer set search_path=pg_catalog as $$
 update orchestration.journey_instances set status='completed',base_completed_at=coalesce(base_completed_at,now()),fully_completed_at=now(),ended_at=now(),aggregate_version=b+1,updated_at=now() where id=a and aggregate_version=b returning aggregate_version
$$;
