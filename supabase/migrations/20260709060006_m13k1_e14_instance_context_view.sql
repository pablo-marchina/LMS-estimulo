-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060006
-- Remote name: m13k1_e14_instance_context_view
-- Remote SQL SHA-256: b394b788b0b3ebf7c159fde9dcfeb15b6af904aa902dff175cb5506a5d4ece20
-- Do not edit after reconciliation; corrections require a new migration.

create or replace view app_private.e14_instance_context as
select ji.id journey_instance_id,ji.status journey_status,ji.aggregate_version journey_version,ji.started_at,ji.fully_completed_at,
       en.id enrollment_id,en.entrepreneur_id,en.journey_version_id,en.status enrollment_status,
       jd.owner_organization_id,jd.code journey_code,jv.version_number,jv.content_hash,
       pp.completion_ratio,pp.completed_required_steps,pp.total_required_steps,pp.current_step_id
from orchestration.journey_instances ji
join orchestration.enrollments en on en.id=ji.enrollment_id
join catalog.journey_versions jv on jv.id=en.journey_version_id
join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
left join orchestration.progress_projections pp on pp.journey_instance_id=ji.id;
revoke all on app_private.e14_instance_context from public,anon,authenticated;
