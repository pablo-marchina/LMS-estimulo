-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053909
-- Remote name: m13g1_e14_ctx_activity
-- Remote SQL SHA-256: 0d7e14e361f1da1e9875a6dcdd1a5783c45872651c99df7c294b6e6b59ade95d
-- Do not edit after reconciliation; corrections require a new migration.

create or replace view app_private.e14_ctx_activity as
select s.id sid,s.step_instance_id step_id,s.entrepreneur_id person_id,s.ended_at,s.accepted_observation_count n,x.journey_instance_id instance_id,x.owner_organization_id org_id,x.activity_version_id version_id,x.step_status,x.step_version
from orchestration.activity_sessions s join app_private.e14_step_context x on x.step_instance_id=s.step_instance_id;
revoke all on app_private.e14_ctx_activity from public,anon,authenticated;
