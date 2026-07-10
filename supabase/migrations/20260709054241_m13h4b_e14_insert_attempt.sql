-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054241
-- Remote name: m13h4b_e14_insert_attempt
-- Remote SQL SHA-256: df85d2907945d4d28e50f243de86edf6a5b95089c8b5f5dd7dc470dfc6bfde75
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_insert_attempt(a uuid,b uuid,c jsonb,d integer)
returns void language sql security definer set search_path=pg_catalog as $$
 insert into assessment.attempts(id,step_instance_id,activity_version_id,entrepreneur_id,attempt_number,status,started_at,aggregate_version)
 values(a,b,(c->>'version')::uuid,(c->>'person')::uuid,d,'in_progress',now(),0)
$$;
