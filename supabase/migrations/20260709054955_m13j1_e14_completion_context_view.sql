-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054955
-- Remote name: m13j1_e14_completion_context_view
-- Remote SQL SHA-256: cda7a648344af432409f9d9f0fe421c66a5369391ab9dfe872d8a365551ccaa6
-- Do not edit after reconciliation; corrections require a new migration.

create or replace view app_private.e14_completion_context as
select a.id attempt_id,a.step_instance_id,a.activity_version_id,a.entrepreneur_id,a.attempt_number,a.status attempt_status,a.aggregate_version attempt_version,
       s.path_assignment_id,s.status step_status,s.aggregate_version step_version,
       pa.journey_instance_id,pa.status path_status,
       ji.status journey_status,ji.aggregate_version journey_version,
       jd.owner_organization_id,
       act.id activity_session_id,act.accepted_observation_count
from assessment.attempts a
join orchestration.step_instances s on s.id=a.step_instance_id
join orchestration.path_assignments pa on pa.id=s.path_assignment_id
join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
join orchestration.enrollments en on en.id=ji.enrollment_id
join catalog.journey_versions jv on jv.id=en.journey_version_id
join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
left join orchestration.activity_sessions act on act.step_instance_id=s.id and act.ended_at is null;
revoke all on app_private.e14_completion_context from public,anon,authenticated;
