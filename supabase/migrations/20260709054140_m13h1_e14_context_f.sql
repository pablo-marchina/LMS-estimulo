-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054140
-- Remote name: m13h1_e14_context_f
-- Remote SQL SHA-256: d246c18a9ecf2c6643d5ea901e8c385fe248f35afd4010adf82e4c057b093e2c
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_context_f(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('person',x.entrepreneur_id,'instance',x.journey_instance_id,'org',x.owner_organization_id,'version',x.activity_version_id,'state',x.step_status,'aggregate',x.step_version,'sections',s.accepted_observation_count,'max_attempts',sp.max_attempts,'question_id',q.id)
 from app_private.e14_step_context x
 join orchestration.activity_sessions s on s.step_instance_id=x.step_instance_id and s.ended_at is null
 join assessment.assessment_specs sp on sp.activity_version_id=x.activity_version_id
 join assessment.questions q on q.activity_version_id=x.activity_version_id and q.position=1
 where x.step_instance_id=a
$$;
