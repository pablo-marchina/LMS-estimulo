-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708221743
-- Remote name: m08i_rls_integration_intelligence_governance
-- Remote SQL SHA-256: e8f4bc7978ab888a8b78f182662a44172cdcc3639861b0c8141ac978944b789d
-- Do not edit after reconciliation; corrections require a new migration.

create policy integration_connections_operator on integration.connections
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('integration.manage', organization_id, 'integration', id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('integration.manage', organization_id, 'integration', id)
);
create policy external_mappings_worker on integration.external_object_mappings
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy sync_jobs_worker on integration.sync_jobs
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy sync_attempts_worker on integration.sync_attempts
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy integration_conflicts_worker on integration.conflicts
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy webhook_receipts_worker on integration.webhook_receipts
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy feature_values_governed on intelligence.feature_values
for select using (
  app_private.is_trusted_worker()
  or app_private.has_permission('intelligence.read', app_private.current_organization_id(), 'intelligence', id)
);
create policy feature_values_worker_write on intelligence.feature_values
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy score_results_governed on intelligence.score_results
for select using (
  app_private.is_trusted_worker()
  or app_private.has_permission('intelligence.read', app_private.current_organization_id(), 'intelligence', id)
);
create policy score_results_worker_write on intelligence.score_results
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy score_contributions_governed on intelligence.score_contributions
for select using (
  app_private.is_trusted_worker()
  or app_private.has_permission('intelligence.read', app_private.current_organization_id(), 'intelligence', score_result_id)
);
create policy score_contributions_worker_write on intelligence.score_contributions
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy consent_records_authorized on governance.consent_records
for select using (app_private.can_access_entrepreneur(entrepreneur_id));
create policy consent_records_insert_authorized on governance.consent_records
for insert with check (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('governance.manage', app_private.current_organization_id(), 'consent', id)
);
create policy privacy_requests_authorized on governance.privacy_requests
for all using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('governance.manage', app_private.current_organization_id(), 'privacy_request', id)
) with check (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('governance.manage', app_private.current_organization_id(), 'privacy_request', id)
);
create policy audit_log_governed on governance.audit_log
for select using (
  app_private.is_trusted_worker()
  or app_private.has_permission('governance.manage', organization_id, 'audit_log', id)
);
create policy audit_log_worker_insert on governance.audit_log
for insert with check (app_private.is_trusted_worker());
