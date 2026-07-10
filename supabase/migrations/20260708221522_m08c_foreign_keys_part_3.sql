-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708221522
-- Remote name: m08c_foreign_keys_part_3
-- Remote SQL SHA-256: 1a9c24a07f933bd03eb445e687dfe53e23da20ea9ad4ece03203333c9a26f7c6
-- Do not edit after reconciliation; corrections require a new migration.

set lock_timeout = '5s';
set statement_timeout = '5min';

alter table intervention.versions add constraint fk_intervention_versions_eligibility_rule_version_i_b34655f1 foreign key (eligibility_rule_version_id) references orchestration.rule_versions(id);
alter table intervention.instances add constraint fk_intervention_instances_intervention_version_id_i_5fbeb039 foreign key (intervention_version_id) references intervention.versions(id);
alter table intervention.instances add constraint fk_intervention_instances_entrepreneur_id_core_entrepreneurs foreign key (entrepreneur_id) references core.entrepreneurs(id);
alter table intervention.instances add constraint fk_intervention_instances_journey_instance_id_orche_41eca4bf foreign key (journey_instance_id) references orchestration.journey_instances(id);
alter table intervention.instances add constraint fk_intervention_instances_trigger_event_id_eventing_events foreign key (trigger_event_id) references eventing.events(event_id);
alter table intervention.delivery_attempts add constraint fk_intervention_delivery_attempts_intervention_inst_024ae896 foreign key (intervention_instance_id) references intervention.instances(id);
alter table intervention.responses add constraint fk_intervention_responses_intervention_instance_id__ff109f27 foreign key (intervention_instance_id) references intervention.instances(id);
alter table intervention.responses add constraint fk_intervention_responses_source_event_id_eventing_events foreign key (source_event_id) references eventing.events(event_id);
alter table eventing.events add constraint fk_eventing_events_schema_id_eventing_event_schemas foreign key (schema_id) references eventing.event_schemas(id);
alter table eventing.events add constraint fk_eventing_events_organization_id_iam_organizations foreign key (organization_id) references iam.organizations(id);
alter table eventing.events add constraint fk_eventing_events_journey_instance_id_orchestratio_48b58368 foreign key (journey_instance_id) references orchestration.journey_instances(id);
alter table eventing.outbox add constraint fk_eventing_outbox_event_id_eventing_events foreign key (event_id) references eventing.events(event_id);
alter table eventing.consumer_inbox add constraint fk_eventing_consumer_inbox_consumer_id_eventing_con_908b310f foreign key (consumer_id) references eventing.consumer_definitions(id);
alter table eventing.consumer_inbox add constraint fk_eventing_consumer_inbox_event_id_eventing_events foreign key (event_id) references eventing.events(event_id);
alter table eventing.delivery_attempts add constraint fk_eventing_delivery_attempts_outbox_id_eventing_outbox foreign key (outbox_id) references eventing.outbox(id);
alter table eventing.delivery_attempts add constraint fk_eventing_delivery_attempts_consumer_id_eventing__c6abcf7f foreign key (consumer_id) references eventing.consumer_definitions(id);
alter table eventing.dead_letters add constraint fk_eventing_dead_letters_event_id_eventing_events foreign key (event_id) references eventing.events(event_id);
alter table eventing.dead_letters add constraint fk_eventing_dead_letters_consumer_id_eventing_consu_356c857c foreign key (consumer_id) references eventing.consumer_definitions(id);
alter table eventing.projection_checkpoints add constraint fk_eventing_projection_checkpoints_last_event_id_ev_070c3507 foreign key (last_event_id) references eventing.events(event_id);
alter table integration.connections add constraint fk_integration_connections_organization_id_iam_organizations foreign key (organization_id) references iam.organizations(id);
alter table integration.external_object_mappings add constraint fk_integration_external_object_mappings_connection__c00c33ee foreign key (connection_id) references integration.connections(id);
alter table integration.mapping_definitions add constraint fk_integration_mapping_definitions_connection_id_in_d2f4ee91 foreign key (connection_id) references integration.connections(id);
alter table integration.mapping_versions add constraint fk_integration_mapping_versions_mapping_definition__98b9621f foreign key (mapping_definition_id) references integration.mapping_definitions(id);
alter table integration.sync_jobs add constraint fk_integration_sync_jobs_connection_id_integration__e8d62777 foreign key (connection_id) references integration.connections(id);
alter table integration.sync_jobs add constraint fk_integration_sync_jobs_mapping_version_id_integra_8ca941e7 foreign key (mapping_version_id) references integration.mapping_versions(id);
alter table integration.sync_jobs add constraint fk_integration_sync_jobs_source_event_id_eventing_events foreign key (source_event_id) references eventing.events(event_id);
alter table integration.sync_attempts add constraint fk_integration_sync_attempts_sync_job_id_integratio_39ee8db5 foreign key (sync_job_id) references integration.sync_jobs(id);
alter table integration.conflicts add constraint fk_integration_conflicts_connection_id_integration__b868191a foreign key (connection_id) references integration.connections(id);
alter table integration.reconciliation_runs add constraint fk_integration_reconciliation_runs_connection_id_in_090fbcd0 foreign key (connection_id) references integration.connections(id);
alter table integration.reconciliation_items add constraint fk_integration_reconciliation_items_run_id_integrat_97dc4c7c foreign key (run_id) references integration.reconciliation_runs(id);
alter table integration.webhook_receipts add constraint fk_integration_webhook_receipts_connection_id_integ_cd6e5e7a foreign key (connection_id) references integration.connections(id);
alter table integration.webhook_receipts add constraint fk_integration_webhook_receipts_normalized_event_id_ce8ecb2e foreign key (normalized_event_id) references eventing.events(event_id);
alter table intelligence.feature_definitions add constraint fk_intelligence_feature_definitions_owner_organizat_fbefe643 foreign key (owner_organization_id) references iam.organizations(id);
alter table intelligence.feature_versions add constraint fk_intelligence_feature_versions_feature_definition_8d6fa39c foreign key (feature_definition_id) references intelligence.feature_definitions(id);
alter table intelligence.feature_dependencies add constraint fk_intelligence_feature_dependencies_feature_versio_c151d4f7 foreign key (feature_version_id) references intelligence.feature_versions(id);
alter table intelligence.feature_computation_runs add constraint fk_intelligence_feature_computation_runs_feature_ve_d867cc62 foreign key (feature_version_id) references intelligence.feature_versions(id);
alter table intelligence.feature_values add constraint fk_intelligence_feature_values_feature_version_id_i_5a72dae8 foreign key (feature_version_id) references intelligence.feature_versions(id);
alter table intelligence.feature_values add constraint fk_intelligence_feature_values_run_id_intelligence__39cf64e9 foreign key (run_id) references intelligence.feature_computation_runs(id);
alter table intelligence.feature_values add constraint fk_intelligence_feature_values_journey_instance_id__f707f0b0 foreign key (journey_instance_id) references orchestration.journey_instances(id);
alter table intelligence.score_definitions add constraint fk_intelligence_score_definitions_owner_organizatio_0b5f2e71 foreign key (owner_organization_id) references iam.organizations(id);
alter table intelligence.score_versions add constraint fk_intelligence_score_versions_score_definition_id__f15b4626 foreign key (score_definition_id) references intelligence.score_definitions(id);
alter table intelligence.score_runs add constraint fk_intelligence_score_runs_score_version_id_intelli_3d2123c2 foreign key (score_version_id) references intelligence.score_versions(id);
alter table intelligence.score_results add constraint fk_intelligence_score_results_score_version_id_inte_83ae27ff foreign key (score_version_id) references intelligence.score_versions(id);
alter table intelligence.score_results add constraint fk_intelligence_score_results_run_id_intelligence_score_runs foreign key (run_id) references intelligence.score_runs(id);
alter table intelligence.score_results add constraint fk_intelligence_score_results_journey_instance_id_o_b20e3ab2 foreign key (journey_instance_id) references orchestration.journey_instances(id);
alter table intelligence.score_contributions add constraint fk_intelligence_score_contributions_score_result_id_c0900e78 foreign key (score_result_id) references intelligence.score_results(id);
alter table intelligence.score_contributions add constraint fk_intelligence_score_contributions_feature_version_5a22b94f foreign key (feature_version_id) references intelligence.feature_versions(id);
alter table intelligence.score_contributions add constraint fk_intelligence_score_contributions_feature_value_i_8b6988d6 foreign key (feature_value_id) references intelligence.feature_values(id);
alter table intelligence.validation_metrics add constraint fk_intelligence_validation_metrics_validation_run_i_7155301c foreign key (validation_run_id) references intelligence.validation_runs(id);
alter table governance.consent_records add constraint fk_governance_consent_records_entrepreneur_id_core__df65316d foreign key (entrepreneur_id) references core.entrepreneurs(id);
alter table governance.consent_records add constraint fk_governance_consent_records_purpose_id_governance_purposes foreign key (purpose_id) references governance.purposes(id);
alter table governance.consent_records add constraint fk_governance_consent_records_supersedes_consent_id_535accf0 foreign key (supersedes_consent_id) references governance.consent_records(id);
alter table governance.privacy_requests add constraint fk_governance_privacy_requests_entrepreneur_id_core_273580f8 foreign key (entrepreneur_id) references core.entrepreneurs(id);
alter table governance.model_approvals add constraint fk_governance_model_approvals_approved_by_iam_user_accounts foreign key (approved_by) references iam.user_accounts(id);
alter table governance.audit_log add constraint fk_governance_audit_log_actor_user_account_id_iam_u_c2bd2ce2 foreign key (actor_user_account_id) references iam.user_accounts(id);
alter table governance.audit_log add constraint fk_governance_audit_log_organization_id_iam_organizations foreign key (organization_id) references iam.organizations(id);
