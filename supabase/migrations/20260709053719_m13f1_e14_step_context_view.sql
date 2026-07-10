-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053719
-- Remote name: m13f1_e14_step_context_view
-- Remote SQL SHA-256: 7271b571b1ff7a02ecac16a7210f7deb54b9b3e3a4594647c27cad1eea0119d5
-- Do not edit after reconciliation; corrections require a new migration.

create or replace view app_private.e14_step_context as
select si.id step_instance_id,si.path_assignment_id,si.path_step_id,si.activity_version_id,si.status step_status,si.aggregate_version step_version,pa.journey_instance_id,en.entrepreneur_id,en.journey_version_id,jd.owner_organization_id
from orchestration.step_instances si
join orchestration.path_assignments pa on pa.id=si.path_assignment_id
join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
join orchestration.enrollments en on en.id=ji.enrollment_id
join catalog.journey_versions jv on jv.id=en.journey_version_id
join catalog.journey_definitions jd on jd.id=jv.journey_definition_id;
revoke all on app_private.e14_step_context from public,anon,authenticated;
