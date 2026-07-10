-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053332
-- Remote name: m13e5g_e14_set_current_step
-- Remote SQL SHA-256: 08f623f77c1f31102bf01cb8df8e141c9a37dac30d04f799359866cf9b353078
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_set_current_step(a uuid,b uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 update orchestration.progress_projections set current_step_id=b,last_activity_at=now(),projection_version=projection_version+1,updated_at=now() where journey_instance_id=a
$$;
