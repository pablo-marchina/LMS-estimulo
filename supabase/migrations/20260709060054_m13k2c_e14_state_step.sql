-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060054
-- Remote name: m13k2c_e14_state_step
-- Remote SQL SHA-256: 66b0743db4ae06690dd007abf6249c835dbbd17081623c3fa002b2097f5f21d2
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_state_step(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('step_instance_id',si.id,'status',si.status,'aggregate_version',si.aggregate_version,'version_id',si.activity_version_id,'accepted_sections',coalesce(ac.accepted_observation_count,0),'session_id',ac.id)
 from orchestration.path_assignments pa join orchestration.step_instances si on si.path_assignment_id=pa.id left join orchestration.activity_sessions ac on ac.step_instance_id=si.id
 where pa.journey_instance_id=a order by si.available_at desc limit 1
$$;
