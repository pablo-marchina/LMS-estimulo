-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053545
-- Remote name: m13e10_e14_snapshot_c
-- Remote SQL SHA-256: 210f1cc328fce59dbcc14ecc168f740c7a0a221f4775f42261fdd5b8d976159f
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_snapshot_c(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object(
  'session_id',s.id,'session_status',s.status,'session_aggregate_version',s.aggregate_version,
  'result_id',r.id,'path_code',pt.code,'assignment_id',pa.id,'step_instance_id',si.id,'step_status',si.status
 )
 from diagnostics.sessions s
 left join diagnostics.results r on r.session_id=s.id and r.calculation_version='v1'
 left join orchestration.path_assignments pa on pa.journey_instance_id=s.journey_instance_id and pa.status in('active','completed')
 left join orchestration.path_templates pt on pt.id=pa.path_template_id
 left join orchestration.step_instances si on si.path_assignment_id=pa.id
 where s.id=a
 order by pa.created_at desc limit 1
$$;
