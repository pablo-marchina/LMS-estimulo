-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060029
-- Remote name: m13k2a_e14_state_base
-- Remote SQL SHA-256: dbb1bfdf73e4d94df557eb9c4307e43e7ff4fd4b5b0f275e9b98f3dcfec3b89d
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_state_base(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('journey_instance_id',journey_instance_id,'journey_code',journey_code,'journey_version_number',version_number,'journey_version_id',journey_version_id,'journey_content_hash',content_hash,'journey_status',journey_status,'journey_aggregate_version',journey_version,'enrollment_status',enrollment_status,'entrepreneur_id',entrepreneur_id,'organization_id',owner_organization_id,'progress',coalesce(completion_ratio,0),'completed_required_steps',coalesce(completed_required_steps,0),'total_required_steps',coalesce(total_required_steps,0)) from app_private.e14_instance_context where journey_instance_id=a
$$;
