-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060038
-- Remote name: m13k2b_e14_state_diag
-- Remote SQL SHA-256: 78c82dfa476d5b41fc11943baf02ee2e0db599d34fbafab655e10b70a11d1319
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_state_diag(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('session_id',s.id,'status',s.status,'aggregate_version',s.aggregate_version,'result_id',r.id,'path_code',pt.code,'low_confidence',coalesce((pd.output->>'low_confidence')::boolean,false))
 from diagnostics.sessions s
 left join diagnostics.results r on r.session_id=s.id
 left join orchestration.personalization_decisions pd on pd.journey_instance_id=s.journey_instance_id and pd.decision_type='path_selection'
 left join orchestration.path_assignments pa on pa.journey_instance_id=s.journey_instance_id
 left join orchestration.path_templates pt on pt.id=pa.path_template_id
 where s.journey_instance_id=a order by s.started_at desc limit 1
$$;
