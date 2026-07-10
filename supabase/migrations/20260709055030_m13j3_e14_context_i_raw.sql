-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055030
-- Remote name: m13j3_e14_context_i_raw
-- Remote SQL SHA-256: 04bc3f9025046dcd93e1de27a8879a2a785193ff7b6168ab3196507ac29dea76
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_context_i_raw(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('person',x.entrepreneur_id,'step',x.step_instance_id,'activity',x.activity_version_id,'assignment',x.path_assignment_id,'instance',x.journey_instance_id,'org',x.owner_organization_id,'attempt_number',x.attempt_number,'attempt_state',x.attempt_status,'attempt_version',x.attempt_version,'step_version',x.step_version,'journey_version',x.journey_version,'activity_session',x.activity_session_id,'sections',x.accepted_observation_count,'correct',(select coalesce(bool_and((r.response_value->>'correct')::boolean),false) from assessment.responses r where r.attempt_id=x.attempt_id),'answer_count',(select count(*) from assessment.responses r where r.attempt_id=x.attempt_id))
 from app_private.e14_completion_context x where x.attempt_id=a
$$;
