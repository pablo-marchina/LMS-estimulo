-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054546
-- Remote name: m13i1_e14_attempt_context_view
-- Remote SQL SHA-256: 6beb9735c87cb27170054d7bf050a6e519d41d7263af3af9505a92d7752abc80
-- Do not edit after reconciliation; corrections require a new migration.

create or replace view app_private.e14_attempt_context as
select a.id attempt_id,a.step_instance_id,a.activity_version_id,a.entrepreneur_id,a.attempt_number,a.status attempt_status,a.aggregate_version attempt_version,x.journey_instance_id instance_id,x.owner_organization_id org_id
from assessment.attempts a join app_private.e14_step_context x on x.step_instance_id=a.step_instance_id;
revoke all on app_private.e14_attempt_context from public,anon,authenticated;
