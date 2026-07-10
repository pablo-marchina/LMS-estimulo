-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052219
-- Remote name: m13d1e_e14_progress_touch
-- Remote SQL SHA-256: 75e271aabc32cc4fc02bf70c23444208b82395487b30b580a7998a1815e26bb5
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_progress_touch(p_instance uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 update orchestration.progress_projections set last_activity_at=now(),projection_version=projection_version+1,updated_at=now() where journey_instance_id=p_instance
$$;
revoke all on function app_private.e14_progress_touch(uuid) from public,anon,authenticated;
