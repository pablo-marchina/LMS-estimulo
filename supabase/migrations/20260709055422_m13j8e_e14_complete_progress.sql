-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055422
-- Remote name: m13j8e_e14_complete_progress
-- Remote SQL SHA-256: ea638974edfc7221bccb4fac7f5837ece43022c9bbe9b5bd0c0556b761acf2f8
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_complete_progress(a uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 update orchestration.progress_projections set completed_required_steps=1,total_required_steps=1,completion_ratio=1,current_step_id=null,last_activity_at=now(),projection_version=projection_version+1,updated_at=now() where journey_instance_id=a
$$;
