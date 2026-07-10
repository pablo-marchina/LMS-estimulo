-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053735
-- Remote name: m13f2_e14_context_d_raw
-- Remote SQL SHA-256: 44dea65f09352165c078e35ea30a767d0e8e2e2fe2e029ed8f2c9cb63a5310e3
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_context_d(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('person',entrepreneur_id,'instance',journey_instance_id,'org',owner_organization_id,'version',activity_version_id,'state',step_status,'aggregate',step_version) from app_private.e14_step_context where step_instance_id=a
$$;
