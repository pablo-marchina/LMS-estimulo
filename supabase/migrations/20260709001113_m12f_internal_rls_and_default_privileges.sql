-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709001113
-- Remote name: m12f_internal_rls_and_default_privileges
-- Remote SQL SHA-256: b16c89986b8aad67c328f34c2edac23d99cbbfa07064cedd58dd327838a33fa5
-- Do not edit after reconciliation; corrections require a new migration.

do $$
declare
  v_table text;
  v_tables text[]:=array[
    'iam.role_definitions','iam.permission_definitions','iam.role_permissions',
    'eventing.event_schemas','eventing.events','eventing.outbox','eventing.consumer_definitions',
    'eventing.consumer_inbox','eventing.delivery_attempts','eventing.dead_letters','eventing.projection_checkpoints',
    'intelligence.feature_definitions','intelligence.feature_versions','intelligence.feature_dependencies',
    'intelligence.feature_computation_runs','intelligence.score_definitions','intelligence.score_versions',
    'intelligence.score_runs','intelligence.validation_runs','intelligence.validation_metrics',
    'governance.purposes','governance.retention_policies','governance.data_lineage_edges','governance.model_approvals',
    'governance.legal_basis_definitions','governance.data_classifications','governance.policy_documents',
    'governance.data_assets','governance.processing_activities','governance.processing_activity_assets',
    'governance.processing_parties','governance.processing_activity_parties','governance.dpo_designations',
    'governance.privacy_request_events','governance.legal_holds','governance.legal_hold_targets',
    'governance.retention_runs','governance.retention_actions','governance.security_incidents',
    'governance.security_incident_events','governance.secret_inventory','governance.access_reviews',
    'governance.backup_restore_tests','governance.production_readiness_controls'
  ];
  v_schema text;
  v_name text;
begin
  foreach v_table in array v_tables loop
    v_schema:=split_part(v_table,'.',1);
    v_name:=split_part(v_table,'.',2);
    execute format('alter table %I.%I enable row level security',v_schema,v_name);
    execute format('grant select,insert,update,delete on %I.%I to app_worker',v_schema,v_name);
    if not exists(select 1 from pg_policies where schemaname=v_schema and tablename=v_name and policyname='m12_worker_select') then
      execute format('create policy m12_worker_select on %I.%I for select to app_worker using (app_private.is_trusted_worker())',v_schema,v_name);
    end if;
    if not exists(select 1 from pg_policies where schemaname=v_schema and tablename=v_name and policyname='m12_worker_insert') then
      execute format('create policy m12_worker_insert on %I.%I for insert to app_worker with check (app_private.is_trusted_worker())',v_schema,v_name);
    end if;
    if not exists(select 1 from pg_policies where schemaname=v_schema and tablename=v_name and policyname='m12_worker_update') then
      execute format('create policy m12_worker_update on %I.%I for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker())',v_schema,v_name);
    end if;
    if not exists(select 1 from pg_policies where schemaname=v_schema and tablename=v_name and policyname='m12_worker_delete') then
      execute format('create policy m12_worker_delete on %I.%I for delete to app_worker using (app_private.is_trusted_worker())',v_schema,v_name);
    end if;
  end loop;
end $$;

revoke all on all tables in schema iam,core,catalog,orchestration,diagnostics,assessment,engagement,intervention,eventing,integration,intelligence,governance,reporting from public,anon,authenticated;
revoke all on all sequences in schema iam,core,catalog,orchestration,diagnostics,assessment,engagement,intervention,eventing,integration,intelligence,governance,reporting from public,anon,authenticated;

alter default privileges for role postgres in schema iam revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema core revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema catalog revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema orchestration revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema diagnostics revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema assessment revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema engagement revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema intervention revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema eventing revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema integration revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema intelligence revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema governance revoke all on tables from public,anon,authenticated;
alter default privileges for role postgres in schema reporting revoke all on tables from public,anon,authenticated;

alter default privileges for role postgres in schema iam revoke all on sequences from public,anon,authenticated;
alter default privileges for role postgres in schema core revoke all on sequences from public,anon,authenticated;
alter default privileges for role postgres in schema catalog revoke all on sequences from public,anon,authenticated;
alter default privileges for role postgres in schema orchestration revoke all on sequences from public,anon,authenticated;
alter default privileges for role postgres in schema diagnostics revoke all on sequences from public,anon,authenticated;
alter default privileges for role postgres in schema assessment revoke all on sequences from public,anon,authenticated;
alter default privileges for role postgres in schema engagement revoke all on sequences from public,anon,authenticated;
alter default privileges for role postgres in schema intervention revoke all on sequences from public,anon,authenticated;
alter default privileges for role postgres in schema eventing revoke all on sequences from public,anon,authenticated;
alter default privileges for role postgres in schema integration revoke all on sequences from public,anon,authenticated;
alter default privileges for role postgres in schema intelligence revoke all on sequences from public,anon,authenticated;
alter default privileges for role postgres in schema governance revoke all on sequences from public,anon,authenticated;
alter default privileges for role postgres in schema reporting revoke all on sequences from public,anon,authenticated;

grant usage,select on sequence eventing.queue_metric_snapshots_id_seq to app_worker;
