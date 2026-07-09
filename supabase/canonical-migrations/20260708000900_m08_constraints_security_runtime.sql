-- Plataforma Estímulo — M08 — foreign keys, integrity, indexes, triggers, RLS and runtime database APIs
-- Generated from the approved v0.2 baseline. Do not edit a migration after it has been applied.
set lock_timeout = '5s';
set statement_timeout = '5min';

-- Foreign keys
alter table iam.external_identities add constraint fk_iam_external_identities_user_account_id_iam_user_accounts foreign key (user_account_id) references iam.user_accounts(id);

alter table iam.organization_memberships add constraint fk_iam_organization_memberships_organization_id_iam_87edb784 foreign key (organization_id) references iam.organizations(id);

alter table iam.organization_memberships add constraint fk_iam_organization_memberships_user_account_id_iam_ebf86e2b foreign key (user_account_id) references iam.user_accounts(id);

alter table iam.role_definitions add constraint fk_iam_role_definitions_organization_id_iam_organizations foreign key (organization_id) references iam.organizations(id);

alter table iam.role_permissions add constraint fk_iam_role_permissions_role_id_iam_role_definitions foreign key (role_id) references iam.role_definitions(id);

alter table iam.role_permissions add constraint fk_iam_role_permissions_permission_id_iam_permissio_ea8b4ade foreign key (permission_id) references iam.permission_definitions(id);

alter table iam.membership_roles add constraint fk_iam_membership_roles_membership_id_iam_organizat_e9b49a9c foreign key (membership_id) references iam.organization_memberships(id);

alter table iam.membership_roles add constraint fk_iam_membership_roles_role_id_iam_role_definitions foreign key (role_id) references iam.role_definitions(id);

alter table core.entrepreneurs add constraint fk_core_entrepreneurs_user_account_id_iam_user_accounts foreign key (user_account_id) references iam.user_accounts(id);

alter table core.business_memberships add constraint fk_core_business_memberships_entrepreneur_id_core_e_b6d59fd4 foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table core.business_memberships add constraint fk_core_business_memberships_business_id_core_businesses foreign key (business_id) references core.businesses(id);

alter table core.file_objects add constraint fk_core_file_objects_owner_organization_id_iam_organizations foreign key (owner_organization_id) references iam.organizations(id);

alter table catalog.programs add constraint fk_catalog_programs_owner_organization_id_iam_organizations foreign key (owner_organization_id) references iam.organizations(id);

alter table catalog.journey_definitions add constraint fk_catalog_journey_definitions_program_id_catalog_programs foreign key (program_id) references catalog.programs(id);

alter table catalog.journey_definitions add constraint fk_catalog_journey_definitions_owner_organization_i_126993ee foreign key (owner_organization_id) references iam.organizations(id);

alter table catalog.journey_versions add constraint fk_catalog_journey_versions_journey_definition_id_c_74ed390b foreign key (journey_definition_id) references catalog.journey_definitions(id);

alter table catalog.journey_versions add constraint fk_catalog_journey_versions_created_by_iam_user_accounts foreign key (created_by) references iam.user_accounts(id);

alter table catalog.course_definitions add constraint fk_catalog_course_definitions_owner_organization_id_52b90a54 foreign key (owner_organization_id) references iam.organizations(id);

alter table catalog.course_versions add constraint fk_catalog_course_versions_course_definition_id_cat_6e130313 foreign key (course_definition_id) references catalog.course_definitions(id);

alter table catalog.course_versions add constraint fk_catalog_course_versions_created_by_iam_user_accounts foreign key (created_by) references iam.user_accounts(id);

alter table catalog.modules add constraint fk_catalog_modules_course_version_id_catalog_course_versions foreign key (course_version_id) references catalog.course_versions(id);

alter table catalog.activity_definitions add constraint fk_catalog_activity_definitions_owner_organization__274e5a8c foreign key (owner_organization_id) references iam.organizations(id);

alter table catalog.activity_versions add constraint fk_catalog_activity_versions_activity_definition_id_f6975b0a foreign key (activity_definition_id) references catalog.activity_definitions(id);

alter table catalog.activity_versions add constraint fk_catalog_activity_versions_created_by_iam_user_accounts foreign key (created_by) references iam.user_accounts(id);

alter table catalog.module_activities add constraint fk_catalog_module_activities_module_id_catalog_modules foreign key (module_id) references catalog.modules(id);

alter table catalog.module_activities add constraint fk_catalog_module_activities_activity_version_id_ca_06762018 foreign key (activity_version_id) references catalog.activity_versions(id);

alter table catalog.content_assets add constraint fk_catalog_content_assets_activity_version_id_catal_ac36c890 foreign key (activity_version_id) references catalog.activity_versions(id);

alter table catalog.content_assets add constraint fk_catalog_content_assets_file_object_id_core_file_objects foreign key (file_object_id) references core.file_objects(id);

alter table catalog.competencies add constraint fk_catalog_competencies_owner_organization_id_iam_o_e91b917c foreign key (owner_organization_id) references iam.organizations(id);

alter table catalog.journey_competencies add constraint fk_catalog_journey_competencies_journey_version_id__4acc22a4 foreign key (journey_version_id) references catalog.journey_versions(id);

alter table catalog.journey_competencies add constraint fk_catalog_journey_competencies_competency_id_catal_4c2abdb3 foreign key (competency_id) references catalog.competencies(id);

alter table catalog.activity_competencies add constraint fk_catalog_activity_competencies_activity_version_i_cc2019cb foreign key (activity_version_id) references catalog.activity_versions(id);

alter table catalog.activity_competencies add constraint fk_catalog_activity_competencies_competency_id_cata_893b9256 foreign key (competency_id) references catalog.competencies(id);

alter table catalog.content_contributors add constraint fk_catalog_content_contributors_activity_version_id_8f878bcc foreign key (activity_version_id) references catalog.activity_versions(id);

alter table catalog.content_contributors add constraint fk_catalog_content_contributors_course_version_id_c_9a1abd7f foreign key (course_version_id) references catalog.course_versions(id);

alter table catalog.content_contributors add constraint fk_catalog_content_contributors_organization_id_iam_affbdf06 foreign key (organization_id) references iam.organizations(id);

alter table catalog.content_contributors add constraint fk_catalog_content_contributors_user_account_id_iam_52edaddf foreign key (user_account_id) references iam.user_accounts(id);

alter table orchestration.rule_definitions add constraint fk_orchestration_rule_definitions_owner_organizatio_f46ccd50 foreign key (owner_organization_id) references iam.organizations(id);

alter table orchestration.rule_versions add constraint fk_orchestration_rule_versions_rule_definition_id_o_cc0dd15a foreign key (rule_definition_id) references orchestration.rule_definitions(id);

alter table orchestration.path_templates add constraint fk_orchestration_path_templates_journey_version_id__e525ccbc foreign key (journey_version_id) references catalog.journey_versions(id);

alter table orchestration.path_steps add constraint fk_orchestration_path_steps_path_template_id_orches_a982ee73 foreign key (path_template_id) references orchestration.path_templates(id);

alter table orchestration.path_steps add constraint fk_orchestration_path_steps_activity_version_id_cat_533a31c8 foreign key (activity_version_id) references catalog.activity_versions(id);

alter table orchestration.path_steps add constraint fk_orchestration_path_steps_availability_rule_versi_19155afc foreign key (availability_rule_version_id) references orchestration.rule_versions(id);

alter table orchestration.path_steps add constraint fk_orchestration_path_steps_completion_rule_version_d8dfcd04 foreign key (completion_rule_version_id) references orchestration.rule_versions(id);

alter table orchestration.path_transitions add constraint fk_orchestration_path_transitions_path_template_id__d6610985 foreign key (path_template_id) references orchestration.path_templates(id);

alter table orchestration.path_transitions add constraint fk_orchestration_path_transitions_from_step_id_orch_693a6b81 foreign key (from_step_id) references orchestration.path_steps(id);

alter table orchestration.path_transitions add constraint fk_orchestration_path_transitions_to_step_id_orches_27224bc1 foreign key (to_step_id) references orchestration.path_steps(id);

alter table orchestration.path_transitions add constraint fk_orchestration_path_transitions_condition_rule_ve_96b30cdd foreign key (condition_rule_version_id) references orchestration.rule_versions(id);

alter table orchestration.assignment_policies add constraint fk_orchestration_assignment_policies_journey_versio_b6416c55 foreign key (journey_version_id) references catalog.journey_versions(id);

alter table orchestration.assignment_policies add constraint fk_orchestration_assignment_policies_rule_version_i_6bdb3248 foreign key (rule_version_id) references orchestration.rule_versions(id);

alter table orchestration.cohorts add constraint fk_orchestration_cohorts_program_id_catalog_programs foreign key (program_id) references catalog.programs(id);

alter table orchestration.cohorts add constraint fk_orchestration_cohorts_journey_version_id_catalog_c7745cf2 foreign key (journey_version_id) references catalog.journey_versions(id);

alter table orchestration.enrollments add constraint fk_orchestration_enrollments_entrepreneur_id_core_e_eb3c5521 foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table orchestration.enrollments add constraint fk_orchestration_enrollments_business_id_core_businesses foreign key (business_id) references core.businesses(id);

alter table orchestration.enrollments add constraint fk_orchestration_enrollments_journey_version_id_cat_f50004d3 foreign key (journey_version_id) references catalog.journey_versions(id);

alter table orchestration.enrollments add constraint fk_orchestration_enrollments_cohort_id_orchestration_cohorts foreign key (cohort_id) references orchestration.cohorts(id);

alter table orchestration.journey_instances add constraint fk_orchestration_journey_instances_enrollment_id_or_5de599f4 foreign key (enrollment_id) references orchestration.enrollments(id);

alter table orchestration.path_assignments add constraint fk_orchestration_path_assignments_journey_instance__26a36a39 foreign key (journey_instance_id) references orchestration.journey_instances(id);

alter table orchestration.path_assignments add constraint fk_orchestration_path_assignments_path_template_id__c389efa0 foreign key (path_template_id) references orchestration.path_templates(id);

alter table orchestration.path_assignments add constraint fk_orchestration_path_assignments_assignment_policy_9b7b73ab foreign key (assignment_policy_id) references orchestration.assignment_policies(id);

alter table orchestration.step_instances add constraint fk_orchestration_step_instances_path_assignment_id__8defdeca foreign key (path_assignment_id) references orchestration.path_assignments(id);

alter table orchestration.step_instances add constraint fk_orchestration_step_instances_path_step_id_orches_6a3a0be0 foreign key (path_step_id) references orchestration.path_steps(id);

alter table orchestration.step_instances add constraint fk_orchestration_step_instances_activity_version_id_0a907532 foreign key (activity_version_id) references catalog.activity_versions(id);

alter table orchestration.activity_sessions add constraint fk_orchestration_activity_sessions_step_instance_id_a7da53cb foreign key (step_instance_id) references orchestration.step_instances(id);

alter table orchestration.activity_sessions add constraint fk_orchestration_activity_sessions_entrepreneur_id__b75ddfc1 foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table orchestration.progress_projections add constraint fk_orchestration_progress_projections_journey_insta_2edfd8ec foreign key (journey_instance_id) references orchestration.journey_instances(id);

alter table orchestration.progress_projections add constraint fk_orchestration_progress_projections_current_step__cf465542 foreign key (current_step_id) references orchestration.path_steps(id);

alter table orchestration.personalization_decisions add constraint fk_orchestration_personalization_decisions_entrepre_979bca38 foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table orchestration.personalization_decisions add constraint fk_orchestration_personalization_decisions_journey__d02ddadb foreign key (journey_instance_id) references orchestration.journey_instances(id);

alter table orchestration.personalization_decisions add constraint fk_orchestration_personalization_decisions_rule_ver_b46873e6 foreign key (rule_version_id) references orchestration.rule_versions(id);

alter table diagnostics.diagnostic_definitions add constraint fk_diagnostics_diagnostic_definitions_owner_organiz_c2b3033f foreign key (owner_organization_id) references iam.organizations(id);

alter table diagnostics.diagnostic_versions add constraint fk_diagnostics_diagnostic_versions_diagnostic_defin_0572b12d foreign key (diagnostic_definition_id) references diagnostics.diagnostic_definitions(id);

alter table diagnostics.dimensions add constraint fk_diagnostics_dimensions_diagnostic_version_id_dia_d32e5139 foreign key (diagnostic_version_id) references diagnostics.diagnostic_versions(id);

alter table diagnostics.items add constraint fk_diagnostics_items_diagnostic_version_id_diagnost_a2e8673e foreign key (diagnostic_version_id) references diagnostics.diagnostic_versions(id);

alter table diagnostics.items add constraint fk_diagnostics_items_dimension_id_diagnostics_dimensions foreign key (dimension_id) references diagnostics.dimensions(id);

alter table diagnostics.item_options add constraint fk_diagnostics_item_options_item_id_diagnostics_items foreign key (item_id) references diagnostics.items(id);

alter table diagnostics.sessions add constraint fk_diagnostics_sessions_diagnostic_version_id_diagn_a1b24324 foreign key (diagnostic_version_id) references diagnostics.diagnostic_versions(id);

alter table diagnostics.sessions add constraint fk_diagnostics_sessions_entrepreneur_id_core_entrepreneurs foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table diagnostics.sessions add constraint fk_diagnostics_sessions_business_id_core_businesses foreign key (business_id) references core.businesses(id);

alter table diagnostics.sessions add constraint fk_diagnostics_sessions_journey_instance_id_orchest_8961bb03 foreign key (journey_instance_id) references orchestration.journey_instances(id);

alter table diagnostics.responses add constraint fk_diagnostics_responses_session_id_diagnostics_sessions foreign key (session_id) references diagnostics.sessions(id);

alter table diagnostics.responses add constraint fk_diagnostics_responses_item_id_diagnostics_items foreign key (item_id) references diagnostics.items(id);

alter table diagnostics.responses add constraint fk_diagnostics_responses_supersedes_response_id_dia_29d8e638 foreign key (supersedes_response_id) references diagnostics.responses(id);

alter table diagnostics.responses add constraint fk_diagnostics_responses_source_event_id_eventing_events foreign key (source_event_id) references eventing.events(event_id);

alter table diagnostics.results add constraint fk_diagnostics_results_session_id_diagnostics_sessions foreign key (session_id) references diagnostics.sessions(id);

alter table diagnostics.dimension_results add constraint fk_diagnostics_dimension_results_result_id_diagnost_47456731 foreign key (result_id) references diagnostics.results(id);

alter table diagnostics.dimension_results add constraint fk_diagnostics_dimension_results_dimension_id_diagn_b63b7b0c foreign key (dimension_id) references diagnostics.dimensions(id);

alter table diagnostics.segment_definitions add constraint fk_diagnostics_segment_definitions_owner_organizati_57a7ebec foreign key (owner_organization_id) references iam.organizations(id);

alter table diagnostics.segment_versions add constraint fk_diagnostics_segment_versions_segment_definition__6b342786 foreign key (segment_definition_id) references diagnostics.segment_definitions(id);

alter table diagnostics.segment_versions add constraint fk_diagnostics_segment_versions_rule_version_id_orc_c6498325 foreign key (rule_version_id) references orchestration.rule_versions(id);

alter table diagnostics.segment_assignments add constraint fk_diagnostics_segment_assignments_segment_version__6eaaa781 foreign key (segment_version_id) references diagnostics.segment_versions(id);

alter table diagnostics.segment_assignments add constraint fk_diagnostics_segment_assignments_entrepreneur_id__afecec0a foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table diagnostics.segment_assignments add constraint fk_diagnostics_segment_assignments_journey_instance_e7b3828f foreign key (journey_instance_id) references orchestration.journey_instances(id);

alter table diagnostics.archetype_definitions add constraint fk_diagnostics_archetype_definitions_owner_organiza_82282af8 foreign key (owner_organization_id) references iam.organizations(id);

alter table diagnostics.archetype_versions add constraint fk_diagnostics_archetype_versions_archetype_definit_ca801bee foreign key (archetype_definition_id) references diagnostics.archetype_definitions(id);

alter table diagnostics.archetype_assignments add constraint fk_diagnostics_archetype_assignments_entrepreneur_i_266cfb25 foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table diagnostics.archetype_assignments add constraint fk_diagnostics_archetype_assignments_journey_instan_f66e7835 foreign key (journey_instance_id) references orchestration.journey_instances(id);

alter table diagnostics.archetype_assignments add constraint fk_diagnostics_archetype_assignments_primary_archet_388121a0 foreign key (primary_archetype_version_id) references diagnostics.archetype_versions(id);

alter table diagnostics.archetype_assignments add constraint fk_diagnostics_archetype_assignments_secondary_arch_3a1ef2c7 foreign key (secondary_archetype_version_id) references diagnostics.archetype_versions(id);

alter table assessment.assessment_specs add constraint fk_assessment_assessment_specs_activity_version_id__6ff746cf foreign key (activity_version_id) references catalog.activity_versions(id);

alter table assessment.questions add constraint fk_assessment_questions_activity_version_id_catalog_e5a87850 foreign key (activity_version_id) references catalog.activity_versions(id);

alter table assessment.answer_options add constraint fk_assessment_answer_options_question_id_assessment_282e9ef8 foreign key (question_id) references assessment.questions(id);

alter table assessment.attempts add constraint fk_assessment_attempts_step_instance_id_orchestrati_c32496c0 foreign key (step_instance_id) references orchestration.step_instances(id);

alter table assessment.attempts add constraint fk_assessment_attempts_activity_version_id_catalog__418603bb foreign key (activity_version_id) references catalog.activity_versions(id);

alter table assessment.attempts add constraint fk_assessment_attempts_entrepreneur_id_core_entrepreneurs foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table assessment.responses add constraint fk_assessment_responses_attempt_id_assessment_attempts foreign key (attempt_id) references assessment.attempts(id);

alter table assessment.responses add constraint fk_assessment_responses_question_id_assessment_questions foreign key (question_id) references assessment.questions(id);

alter table assessment.responses add constraint fk_assessment_responses_source_event_id_eventing_events foreign key (source_event_id) references eventing.events(event_id);

alter table assessment.results add constraint fk_assessment_results_attempt_id_assessment_attempts foreign key (attempt_id) references assessment.attempts(id);

alter table assessment.practice_specs add constraint fk_assessment_practice_specs_activity_version_id_ca_d07c94dc foreign key (activity_version_id) references catalog.activity_versions(id);

alter table assessment.rubric_definitions add constraint fk_assessment_rubric_definitions_owner_organization_56ac8a0c foreign key (owner_organization_id) references iam.organizations(id);

alter table assessment.rubric_versions add constraint fk_assessment_rubric_versions_rubric_definition_id__8a2c6cdd foreign key (rubric_definition_id) references assessment.rubric_definitions(id);

alter table assessment.rubric_criteria add constraint fk_assessment_rubric_criteria_rubric_version_id_ass_3d2af844 foreign key (rubric_version_id) references assessment.rubric_versions(id);

alter table assessment.submissions add constraint fk_assessment_submissions_step_instance_id_orchestr_31f68ed1 foreign key (step_instance_id) references orchestration.step_instances(id);

alter table assessment.submissions add constraint fk_assessment_submissions_activity_version_id_catal_ecb732c7 foreign key (activity_version_id) references catalog.activity_versions(id);

alter table assessment.submissions add constraint fk_assessment_submissions_entrepreneur_id_core_entrepreneurs foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table assessment.submission_evidence add constraint fk_assessment_submission_evidence_submission_id_ass_056e6335 foreign key (submission_id) references assessment.submissions(id);

alter table assessment.submission_evidence add constraint fk_assessment_submission_evidence_file_object_id_co_6b2855fc foreign key (file_object_id) references core.file_objects(id);

alter table assessment.reviews add constraint fk_assessment_reviews_submission_id_assessment_submissions foreign key (submission_id) references assessment.submissions(id);

alter table assessment.reviews add constraint fk_assessment_reviews_reviewer_user_account_id_iam__ef77c869 foreign key (reviewer_user_account_id) references iam.user_accounts(id);

alter table assessment.reviews add constraint fk_assessment_reviews_rubric_version_id_assessment__0d071d24 foreign key (rubric_version_id) references assessment.rubric_versions(id);

alter table assessment.reviews add constraint fk_assessment_reviews_source_event_id_eventing_events foreign key (source_event_id) references eventing.events(event_id);

alter table assessment.review_scores add constraint fk_assessment_review_scores_review_id_assessment_reviews foreign key (review_id) references assessment.reviews(id);

alter table assessment.review_scores add constraint fk_assessment_review_scores_rubric_criterion_id_ass_a018d990 foreign key (rubric_criterion_id) references assessment.rubric_criteria(id);

alter table engagement.point_rule_definitions add constraint fk_engagement_point_rule_definitions_owner_organiza_c83f6184 foreign key (owner_organization_id) references iam.organizations(id);

alter table engagement.point_rule_versions add constraint fk_engagement_point_rule_versions_point_rule_defini_54260805 foreign key (point_rule_definition_id) references engagement.point_rule_definitions(id);

alter table engagement.point_rule_versions add constraint fk_engagement_point_rule_versions_eligibility_rule__30221a96 foreign key (eligibility_rule_version_id) references orchestration.rule_versions(id);

alter table engagement.point_ledger add constraint fk_engagement_point_ledger_entrepreneur_id_core_ent_505ff6f7 foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table engagement.point_ledger add constraint fk_engagement_point_ledger_journey_instance_id_orch_52d2b09a foreign key (journey_instance_id) references orchestration.journey_instances(id);

alter table engagement.point_ledger add constraint fk_engagement_point_ledger_point_rule_version_id_en_7425cf03 foreign key (point_rule_version_id) references engagement.point_rule_versions(id);

alter table engagement.point_ledger add constraint fk_engagement_point_ledger_source_event_id_eventing_events foreign key (source_event_id) references eventing.events(event_id);

alter table engagement.point_ledger add constraint fk_engagement_point_ledger_reverses_entry_id_engage_ebcab170 foreign key (reverses_entry_id) references engagement.point_ledger(id);

alter table engagement.point_balance_projections add constraint fk_engagement_point_balance_projections_entrepreneu_08149cd5 foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table engagement.point_balance_projections add constraint fk_engagement_point_balance_projections_journey_ins_92a3ae7e foreign key (journey_instance_id) references orchestration.journey_instances(id);

alter table engagement.point_balance_projections add constraint fk_engagement_point_balance_projections_last_ledger_68964fcc foreign key (last_ledger_entry_id) references engagement.point_ledger(id);

alter table engagement.badge_definitions add constraint fk_engagement_badge_definitions_owner_organization__1c31e77b foreign key (owner_organization_id) references iam.organizations(id);

alter table engagement.badge_versions add constraint fk_engagement_badge_versions_badge_definition_id_en_e8ae5c03 foreign key (badge_definition_id) references engagement.badge_definitions(id);

alter table engagement.badge_versions add constraint fk_engagement_badge_versions_criteria_rule_version__d8ebaeb1 foreign key (criteria_rule_version_id) references orchestration.rule_versions(id);

alter table engagement.badge_versions add constraint fk_engagement_badge_versions_asset_file_object_id_c_6c35fbf5 foreign key (asset_file_object_id) references core.file_objects(id);

alter table engagement.badge_awards add constraint fk_engagement_badge_awards_entrepreneur_id_core_ent_ad8d34db foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table engagement.badge_awards add constraint fk_engagement_badge_awards_journey_instance_id_orch_1fcf3c81 foreign key (journey_instance_id) references orchestration.journey_instances(id);

alter table engagement.badge_awards add constraint fk_engagement_badge_awards_badge_version_id_engagem_0cffb905 foreign key (badge_version_id) references engagement.badge_versions(id);

alter table engagement.badge_awards add constraint fk_engagement_badge_awards_source_event_id_eventing_events foreign key (source_event_id) references eventing.events(event_id);

alter table engagement.certificate_definitions add constraint fk_engagement_certificate_definitions_owner_organiz_b145cad9 foreign key (owner_organization_id) references iam.organizations(id);

alter table engagement.certificate_versions add constraint fk_engagement_certificate_versions_certificate_defi_95e48c24 foreign key (certificate_definition_id) references engagement.certificate_definitions(id);

alter table engagement.certificate_versions add constraint fk_engagement_certificate_versions_journey_version__5dfee49c foreign key (journey_version_id) references catalog.journey_versions(id);

alter table engagement.certificate_versions add constraint fk_engagement_certificate_versions_requirements_rul_72cf8726 foreign key (requirements_rule_version_id) references orchestration.rule_versions(id);

alter table engagement.certificate_versions add constraint fk_engagement_certificate_versions_template_file_ob_53a1fcda foreign key (template_file_object_id) references core.file_objects(id);

alter table engagement.certificate_issuances add constraint fk_engagement_certificate_issuances_entrepreneur_id_f877e78c foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table engagement.certificate_issuances add constraint fk_engagement_certificate_issuances_journey_instanc_42eef2e8 foreign key (journey_instance_id) references orchestration.journey_instances(id);

alter table engagement.certificate_issuances add constraint fk_engagement_certificate_issuances_certificate_ver_c4519751 foreign key (certificate_version_id) references engagement.certificate_versions(id);

alter table engagement.certificate_issuances add constraint fk_engagement_certificate_issuances_source_event_id_0c2f9b81 foreign key (source_event_id) references eventing.events(event_id);

alter table engagement.certificate_issuances add constraint fk_engagement_certificate_issuances_document_file_o_e1ff3432 foreign key (document_file_object_id) references core.file_objects(id);

alter table engagement.streak_projections add constraint fk_engagement_streak_projections_entrepreneur_id_co_27fc3578 foreign key (entrepreneur_id) references core.entrepreneurs(id);

alter table engagement.streak_projections add constraint fk_engagement_streak_projections_journey_instance_i_1ad87f78 foreign key (journey_instance_id) references orchestration.journey_instances(id);

alter table intervention.definitions add constraint fk_intervention_definitions_owner_organization_id_i_ea4bb4fd foreign key (owner_organization_id) references iam.organizations(id);

alter table intervention.versions add constraint fk_intervention_versions_intervention_definition_id_29b19ce5 foreign key (intervention_definition_id) references intervention.definitions(id);

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

-- Core integrity checks
alter table catalog.journey_versions add constraint ck_catalog_journey_versions_version_positive check (version_number > 0);

alter table catalog.course_versions add constraint ck_catalog_course_versions_version_positive check (version_number > 0);

alter table catalog.activity_versions add constraint ck_catalog_activity_versions_version_positive check (version_number > 0);

alter table orchestration.rule_versions add constraint ck_orchestration_rule_versions_version_positive check (version_number > 0);

alter table diagnostics.diagnostic_versions add constraint ck_diagnostics_diagnostic_versions_version_positive check (version_number > 0);

alter table diagnostics.dimensions add constraint ck_diagnostics_dimensions_answer_ratio check (minimum_answer_ratio between 0 and 1);

alter table diagnostics.dimension_results add constraint ck_diagnostics_dimension_results_dimension_range check (answered_ratio between 0 and 1 and (score is null or score between 0 and 100));

alter table diagnostics.segment_assignments add constraint ck_diagnostics_segment_assignments_confidence_range check (confidence is null or confidence between 0 and 1);

alter table diagnostics.archetype_assignments add constraint ck_diagnostics_archetype_assignments_probability_range check ((probability is null or probability between 0 and 1) and (secondary_probability is null or secondary_probability between 0 and 1));

alter table assessment.assessment_specs add constraint ck_assessment_assessment_specs_assessment_limits check ((passing_score is null or passing_score between 0 and 100) and (max_attempts is null or max_attempts > 0));

alter table assessment.attempts add constraint ck_assessment_attempts_attempt_positive check (attempt_number > 0);

alter table assessment.results add constraint ck_assessment_results_normalized_score check (normalized_score between 0 and 100);

alter table assessment.practice_specs add constraint ck_assessment_practice_specs_submission_limit check (max_submissions is null or max_submissions > 0);

alter table assessment.submissions add constraint ck_assessment_submissions_submission_positive check (submission_number > 0);

alter table engagement.point_rule_versions add constraint ck_engagement_point_rule_versions_nonzero_amount check (amount <> 0);

alter table engagement.point_ledger add constraint ck_engagement_point_ledger_nonzero_amount check (amount <> 0);

alter table engagement.badge_versions add constraint ck_engagement_badge_versions_version_positive check (version_number > 0);

alter table engagement.certificate_versions add constraint ck_engagement_certificate_versions_version_positive check (version_number > 0);

alter table eventing.event_schemas add constraint ck_eventing_event_schemas_event_version_positive check (event_version > 0);

alter table eventing.events add constraint ck_eventing_events_event_versions check (event_version > 0 and (aggregate_version is null or aggregate_version >= 0));

alter table eventing.outbox add constraint ck_eventing_outbox_attempt_nonnegative check (attempt_count >= 0);

alter table eventing.consumer_inbox add constraint ck_eventing_consumer_inbox_attempt_nonnegative check (attempt_count >= 0);

alter table integration.mapping_versions add constraint ck_integration_mapping_versions_version_positive check (version_number > 0);

alter table integration.sync_jobs add constraint ck_integration_sync_jobs_attempt_nonnegative check (attempt_count >= 0);

alter table intelligence.feature_versions add constraint ck_intelligence_feature_versions_version_positive check (version_number > 0);

alter table intelligence.feature_values add constraint ck_intelligence_feature_values_single_value check ((numeric_value is not null)::int + (text_value is not null)::int + (json_value is not null)::int = 1);

alter table intelligence.score_versions add constraint ck_intelligence_score_versions_version_positive check (version_number > 0);

alter table intelligence.score_results add constraint ck_intelligence_score_results_uncertainty_range check (uncertainty is null or uncertainty between 0 and 1);

alter table core.file_objects add constraint ck_core_file_objects_size_nonnegative check (size_bytes >= 0);

alter table catalog.modules add constraint ck_catalog_modules_module_values check (position > 0 and estimated_minutes >= 0);

alter table catalog.activity_versions add constraint ck_catalog_activity_versions_duration_nonnegative check (estimated_minutes >= 0);

alter table catalog.content_assets add constraint ck_catalog_content_assets_asset_location check (position > 0 and ((file_object_id is not null)::int + (external_url is not null)::int = 1));

alter table catalog.content_contributors add constraint ck_catalog_content_contributors_contributor_target check (((activity_version_id is not null)::int + (course_version_id is not null)::int = 1) and ((organization_id is not null)::int + (user_account_id is not null)::int >= 1));

alter table orchestration.path_transitions add constraint ck_orchestration_path_transitions_transition_endpoint check (from_step_id is not null or to_step_id is not null);

alter table orchestration.enrollments add constraint ck_orchestration_enrollments_enrollment_dates check (expires_at is null or expires_at >= assigned_at);

alter table orchestration.path_assignments add constraint ck_orchestration_path_assignments_assignment_dates check (valid_until is null or valid_until > valid_from);

alter table diagnostics.responses add constraint ck_diagnostics_responses_response_values check (revision > 0 and (response_time_ms is null or response_time_ms >= 0));

alter table engagement.certificate_issuances add constraint ck_engagement_certificate_issuances_certificate_dates check (expires_at is null or expires_at > issued_at);

alter table intervention.delivery_attempts add constraint ck_intervention_delivery_attempts_attempt_positive check (attempt_number > 0);

alter table integration.sync_attempts add constraint ck_integration_sync_attempts_attempt_positive check (attempt_number > 0);

-- Uniqueness requiring NULL-aware or partial semantics
create unique index uq_iam_global_role_code on iam.role_definitions(code) where organization_id is null;

create unique index uq_iam_org_role_code on iam.role_definitions(organization_id, code) where organization_id is not null;

create unique index uq_orchestration_enrollment_scope on orchestration.enrollments(entrepreneur_id, coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid), journey_version_id, coalesce(cohort_id, '00000000-0000-0000-0000-000000000000'::uuid));

create unique index uq_engagement_point_balance_scope on engagement.point_balance_projections(entrepreneur_id, coalesce(journey_instance_id, '00000000-0000-0000-0000-000000000000'::uuid));

create unique index uq_engagement_streak_scope on engagement.streak_projections(entrepreneur_id, coalesce(journey_instance_id, '00000000-0000-0000-0000-000000000000'::uuid), streak_type);

create unique index uq_eventing_aggregate_version on eventing.events(aggregate_type, aggregate_id, aggregate_version) where aggregate_id is not null and aggregate_version is not null;

create unique index uq_integration_provider_event on integration.webhook_receipts(connection_id, provider_event_id) where provider_event_id is not null;

-- Query indexes
create index ix_iam_external_identities_user_account_id on iam.external_identities (user_account_id);

create index ix_core_entrepreneurs_email_normalized on core.entrepreneurs (email_normalized);

create index ix_core_entrepreneurs_phone_e164 on core.entrepreneurs (phone_e164);

create index ix_core_business_memberships_business_id_valid_until on core.business_memberships (business_id, valid_until);

create index ix_core_business_memberships_entrepreneur_id_valid_until on core.business_memberships (entrepreneur_id, valid_until);

create index ix_catalog_journey_versions_journey_definition_id_status on catalog.journey_versions (journey_definition_id, status);

create index ix_catalog_activity_versions_activity_definition_id_status on catalog.activity_versions (activity_definition_id, status);

create index ix_orchestration_enrollments_entrepreneur_id_status on orchestration.enrollments (entrepreneur_id, status);

create index ix_orchestration_enrollments_journey_version_id_status on orchestration.enrollments (journey_version_id, status);

create index ix_orchestration_journey_instances_status_updated_at on orchestration.journey_instances (status, updated_at);

create index ix_orchestration_step_instances_path_assignment_id_status on orchestration.step_instances (path_assignment_id, status);

create index ix_orchestration_step_instances_activity_version_id_status on orchestration.step_instances (activity_version_id, status);

create index ix_orchestration_activity_sessions_entrepreneur_id__396f60cf on orchestration.activity_sessions (entrepreneur_id, started_at desc);

create index ix_diagnostics_sessions_entrepreneur_id_started_at on diagnostics.sessions (entrepreneur_id, started_at desc);

create index ix_diagnostics_responses_session_id_item_id_revision on diagnostics.responses (session_id, item_id, revision desc);

create index ix_diagnostics_segment_assignments_entrepreneur_id__729ee0e6 on diagnostics.segment_assignments (entrepreneur_id, valid_until);

create index ix_assessment_attempts_entrepreneur_id_started_at on assessment.attempts (entrepreneur_id, started_at desc);

create index ix_assessment_submissions_entrepreneur_id_submitted_at on assessment.submissions (entrepreneur_id, submitted_at desc);

create index ix_engagement_point_ledger_entrepreneur_id_occurred_at on engagement.point_ledger (entrepreneur_id, occurred_at desc);

create index ix_engagement_badge_awards_entrepreneur_id_awarded_at on engagement.badge_awards (entrepreneur_id, awarded_at desc);

create index ix_engagement_certificate_issuances_entrepreneur_id_af0fcf8f on engagement.certificate_issuances (entrepreneur_id, issued_at desc);

create index ix_intervention_instances_entrepreneur_id_status_sc_e77cc4c4 on intervention.instances (entrepreneur_id, status, scheduled_at);

create index ix_eventing_events_received_at on eventing.events (received_at desc);

create index ix_eventing_events_event_name_received_at on eventing.events (event_name, received_at desc);

create index ix_eventing_events_subject_type_subject_id_received_at on eventing.events (subject_type, subject_id, received_at desc);

create index ix_eventing_events_journey_instance_id_received_at on eventing.events (journey_instance_id, received_at desc);

create index ix_eventing_events_correlation_id on eventing.events (correlation_id);

create index ix_eventing_events_causation_id on eventing.events (causation_id);

create index ix_eventing_outbox_status_available_at on eventing.outbox (status, available_at);

create index ix_eventing_consumer_inbox_consumer_id_status_received_at on eventing.consumer_inbox (consumer_id, status, received_at);

create index ix_eventing_dead_letters_status_created_at on eventing.dead_letters (status, created_at);

create index ix_integration_external_object_mappings_internal_en_a15fbc86 on integration.external_object_mappings (internal_entity_type, internal_entity_id);

create index ix_integration_sync_jobs_status_scheduled_at on integration.sync_jobs (status, scheduled_at);

create index ix_integration_conflicts_status_detected_at on integration.conflicts (status, detected_at);

create index ix_integration_webhook_receipts_status_received_at on integration.webhook_receipts (status, received_at);

create index ix_intelligence_feature_values_subject_type_subject_id_as_of on intelligence.feature_values (subject_type, subject_id, as_of desc);

create index ix_intelligence_feature_values_journey_instance_id_as_of on intelligence.feature_values (journey_instance_id, as_of desc);

create index ix_intelligence_score_results_subject_type_subject__e9659ee4 on intelligence.score_results (subject_type, subject_id, calculated_at desc);

create index ix_governance_consent_records_entrepreneur_id_purpo_deed4eac on governance.consent_records (entrepreneur_id, purpose_id, captured_at desc);

create index ix_governance_audit_log_occurred_at on governance.audit_log (occurred_at desc);

create index ix_governance_audit_log_resource_type_resource_id_o_b53ffe95 on governance.audit_log (resource_type, resource_id, occurred_at desc);

-- updated_at triggers
create trigger trg_iam_user_accounts_updated_at before update on iam.user_accounts for each row execute function governance.set_updated_at();

create trigger trg_iam_external_identities_updated_at before update on iam.external_identities for each row execute function governance.set_updated_at();

create trigger trg_iam_organizations_updated_at before update on iam.organizations for each row execute function governance.set_updated_at();

create trigger trg_core_entrepreneurs_updated_at before update on core.entrepreneurs for each row execute function governance.set_updated_at();

create trigger trg_core_businesses_updated_at before update on core.businesses for each row execute function governance.set_updated_at();

create trigger trg_catalog_programs_updated_at before update on catalog.programs for each row execute function governance.set_updated_at();

create trigger trg_catalog_journey_definitions_updated_at before update on catalog.journey_definitions for each row execute function governance.set_updated_at();

create trigger trg_catalog_course_definitions_updated_at before update on catalog.course_definitions for each row execute function governance.set_updated_at();

create trigger trg_catalog_activity_definitions_updated_at before update on catalog.activity_definitions for each row execute function governance.set_updated_at();

create trigger trg_orchestration_journey_instances_updated_at before update on orchestration.journey_instances for each row execute function governance.set_updated_at();

create trigger trg_orchestration_step_instances_updated_at before update on orchestration.step_instances for each row execute function governance.set_updated_at();

create trigger trg_orchestration_progress_projections_updated_at before update on orchestration.progress_projections for each row execute function governance.set_updated_at();

create trigger trg_engagement_point_balance_projections_updated_at before update on engagement.point_balance_projections for each row execute function governance.set_updated_at();

create trigger trg_engagement_streak_projections_updated_at before update on engagement.streak_projections for each row execute function governance.set_updated_at();

create trigger trg_eventing_projection_checkpoints_updated_at before update on eventing.projection_checkpoints for each row execute function governance.set_updated_at();

create trigger trg_integration_connections_updated_at before update on integration.connections for each row execute function governance.set_updated_at();

-- Append-only protections. INSERT remains allowed; UPDATE/DELETE require controlled superseding/compensation rows.
create trigger trg_diagnostics_responses_append_only before update or delete on diagnostics.responses for each row execute function governance.reject_mutation();

create trigger trg_engagement_point_ledger_append_only before update or delete on engagement.point_ledger for each row execute function governance.reject_mutation();

create trigger trg_eventing_events_append_only before update or delete on eventing.events for each row execute function governance.reject_mutation();

create trigger trg_eventing_delivery_attempts_append_only before update or delete on eventing.delivery_attempts for each row execute function governance.reject_mutation();

create trigger trg_integration_sync_attempts_append_only before update or delete on integration.sync_attempts for each row execute function governance.reject_mutation();

create trigger trg_governance_consent_records_append_only before update or delete on governance.consent_records for each row execute function governance.reject_mutation();

create trigger trg_governance_audit_log_append_only before update or delete on governance.audit_log for each row execute function governance.reject_mutation();

-- RLS is enabled now; concrete policies are installed only after the auth/provider adapter and operational scopes are approved in E12.
alter table iam.user_accounts enable row level security;

alter table iam.external_identities enable row level security;

alter table iam.organizations enable row level security;

alter table iam.organization_memberships enable row level security;

alter table iam.membership_roles enable row level security;

alter table core.entrepreneurs enable row level security;

alter table core.businesses enable row level security;

alter table core.business_memberships enable row level security;

alter table core.file_objects enable row level security;

alter table orchestration.enrollments enable row level security;

alter table orchestration.journey_instances enable row level security;

alter table orchestration.path_assignments enable row level security;

alter table orchestration.step_instances enable row level security;

alter table orchestration.activity_sessions enable row level security;

alter table orchestration.progress_projections enable row level security;

alter table orchestration.personalization_decisions enable row level security;

alter table diagnostics.sessions enable row level security;

alter table diagnostics.responses enable row level security;

alter table diagnostics.results enable row level security;

alter table diagnostics.dimension_results enable row level security;

alter table diagnostics.segment_assignments enable row level security;

alter table diagnostics.archetype_assignments enable row level security;

alter table assessment.attempts enable row level security;

alter table assessment.responses enable row level security;

alter table assessment.results enable row level security;

alter table assessment.submissions enable row level security;

alter table assessment.submission_evidence enable row level security;

alter table assessment.reviews enable row level security;

alter table assessment.review_scores enable row level security;

alter table engagement.point_ledger enable row level security;

alter table engagement.point_balance_projections enable row level security;

alter table engagement.badge_awards enable row level security;

alter table engagement.certificate_issuances enable row level security;

alter table engagement.streak_projections enable row level security;

alter table intervention.instances enable row level security;

alter table intervention.delivery_attempts enable row level security;

alter table intervention.responses enable row level security;

alter table integration.connections enable row level security;

alter table integration.external_object_mappings enable row level security;

alter table integration.sync_jobs enable row level security;

alter table integration.sync_attempts enable row level security;

alter table integration.conflicts enable row level security;

alter table integration.webhook_receipts enable row level security;

alter table intelligence.feature_values enable row level security;

alter table intelligence.score_results enable row level security;

alter table intelligence.score_contributions enable row level security;

alter table governance.consent_records enable row level security;

alter table governance.privacy_requests enable row level security;

alter table governance.audit_log enable row level security;

-- Direct client roles must receive no privileges on eventing/intelligence/governance internals.
-- Application/service roles and API views/functions will be granted explicitly in implementation migrations.;

-- -------------------------------------------------------------------------
-- Provider-neutral identity resolution. Raw JWTs and raw claim documents are
-- never persisted. The backend verifies the token before calling these APIs.
-- -------------------------------------------------------------------------
create or replace function iam.resolve_external_identity(
  p_provider text,
  p_issuer text,
  p_subject text,
  p_email_normalized text,
  p_email_verified boolean,
  p_claims_fingerprint text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_account_id uuid;
  v_email text := lower(trim(p_email_normalized));
begin
  if p_provider is null or length(trim(p_provider)) = 0
     or p_issuer is null or length(trim(p_issuer)) = 0
     or p_subject is null or length(trim(p_subject)) = 0 then
    raise exception 'invalid_external_identity' using errcode = '22023';
  end if;
  if not p_email_verified or v_email is null or length(v_email) = 0 then
    raise exception 'verified_email_required' using errcode = '28000';
  end if;
  if p_claims_fingerprint is null or length(trim(p_claims_fingerprint)) < 16 then
    raise exception 'claims_fingerprint_required' using errcode = '22023';
  end if;

  select ei.user_account_id into v_account_id
  from iam.external_identities ei
  where ei.issuer = trim(p_issuer) and ei.subject = trim(p_subject)
  for update;

  if v_account_id is not null then
    update iam.external_identities
       set provider = trim(p_provider),
           email_normalized = v_email,
           email_verified = true,
           claims_fingerprint = trim(p_claims_fingerprint),
           last_authenticated_at = now()
     where issuer = trim(p_issuer) and subject = trim(p_subject);
    update iam.user_accounts
       set last_authenticated_at = now()
     where id = v_account_id;
    return v_account_id;
  end if;

  if exists(select 1 from iam.user_accounts ua where ua.email_normalized = v_email) then
    raise exception 'identity_link_required' using errcode = '23505';
  end if;

  insert into iam.user_accounts(email_normalized, status, last_authenticated_at)
  values (v_email, 'active', now())
  returning id into v_account_id;

  insert into iam.external_identities(
    user_account_id, provider, issuer, subject, email_normalized,
    email_verified, claims_fingerprint
  ) values (
    v_account_id, trim(p_provider), trim(p_issuer), trim(p_subject), v_email,
    true, trim(p_claims_fingerprint)
  );

  return v_account_id;
end;
$$;

create or replace function iam.link_external_identity(
  p_user_account_id uuid,
  p_provider text,
  p_issuer text,
  p_subject text,
  p_email_normalized text,
  p_email_verified boolean,
  p_claims_fingerprint text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_identity_id uuid;
  v_account_email text;
  v_email text := lower(trim(p_email_normalized));
begin
  if not p_email_verified then
    raise exception 'verified_email_required' using errcode = '28000';
  end if;
  select email_normalized into v_account_email
    from iam.user_accounts where id = p_user_account_id for update;
  if v_account_email is null then
    raise exception 'user_account_not_found' using errcode = 'P0002';
  end if;
  if v_account_email <> v_email then
    raise exception 'identity_email_mismatch' using errcode = '22023';
  end if;
  insert into iam.external_identities(
    user_account_id, provider, issuer, subject, email_normalized,
    email_verified, claims_fingerprint
  ) values (
    p_user_account_id, trim(p_provider), trim(p_issuer), trim(p_subject), v_email,
    true, trim(p_claims_fingerprint)
  ) returning id into v_identity_id;
  return v_identity_id;
end;
$$;

-- -------------------------------------------------------------------------
-- Authorization helpers. SECURITY DEFINER avoids policy recursion; each
-- function fixes its search_path and returns only a boolean or opaque ID.
-- -------------------------------------------------------------------------
create or replace function app_private.current_entrepreneur_id()
returns uuid
language sql stable security definer
set search_path = pg_catalog
as $$
  select e.id
  from core.entrepreneurs e
  where e.user_account_id = app_private.current_user_account_id()
    and e.status = 'active'
  limit 1;
$$;

create or replace function app_private.is_trusted_worker()
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select app_private.current_actor_type() in ('worker', 'system')
    and exists (
      select 1 from pg_catalog.pg_roles r
      where r.rolname = 'app_worker'
        and pg_catalog.pg_has_role(session_user, r.oid, 'member')
    );
$$;

create or replace function app_private.scope_allows(
  p_scope jsonb,
  p_resource_type text,
  p_resource_id uuid
) returns boolean
language sql immutable security invoker
set search_path = pg_catalog
as $$
  select coalesce(p_scope @> '{"all": true}'::jsonb, false)
      or (
        p_resource_type is not null and p_resource_id is not null
        and coalesce(
          (p_scope -> 'resources' -> p_resource_type) ? p_resource_id::text,
          false
        )
      );
$$;

create or replace function app_private.has_permission(
  p_permission_code text,
  p_organization_id uuid,
  p_resource_type text default null,
  p_resource_id uuid default null
) returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select app_private.is_trusted_worker()
      or exists (
        select 1
        from iam.organization_memberships om
        join iam.membership_roles mr on mr.membership_id = om.id
        join iam.role_definitions rd on rd.id = mr.role_id
        join iam.role_permissions rp on rp.role_id = rd.id
        join iam.permission_definitions pd on pd.id = rp.permission_id
        where om.user_account_id = app_private.current_user_account_id()
          and om.organization_id = p_organization_id
          and app_private.current_organization_id() = p_organization_id
          and om.status = 'active'
          and rd.status = 'active'
          and om.valid_from <= now()
          and (om.valid_until is null or om.valid_until > now())
          and mr.valid_from <= now()
          and (mr.valid_until is null or mr.valid_until > now())
          and pd.code = p_permission_code
          and app_private.scope_allows(mr.scope, p_resource_type, p_resource_id)
      );
$$;

create or replace function app_private.journey_owner_organization_id(p_journey_instance_id uuid)
returns uuid
language sql stable security definer
set search_path = pg_catalog
as $$
  select jd.owner_organization_id
  from orchestration.journey_instances ji
  join orchestration.enrollments e on e.id = ji.enrollment_id
  join catalog.journey_versions jv on jv.id = e.journey_version_id
  join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
  where ji.id = p_journey_instance_id;
$$;

create or replace function app_private.can_access_entrepreneur(p_entrepreneur_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select app_private.is_trusted_worker()
      or p_entrepreneur_id = app_private.current_entrepreneur_id()
      or exists (
        select 1
        from orchestration.enrollments e
        join catalog.journey_versions jv on jv.id = e.journey_version_id
        join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
        where e.entrepreneur_id = p_entrepreneur_id
          and app_private.has_permission('participant.read', jd.owner_organization_id, 'entrepreneur', p_entrepreneur_id)
      );
$$;

create or replace function app_private.can_manage_entrepreneur(p_entrepreneur_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select app_private.is_trusted_worker()
      or exists (
        select 1
        from orchestration.enrollments e
        join catalog.journey_versions jv on jv.id = e.journey_version_id
        join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
        where e.entrepreneur_id = p_entrepreneur_id
          and app_private.has_permission('participant.manage', jd.owner_organization_id, 'entrepreneur', p_entrepreneur_id)
      );
$$;

create or replace function app_private.can_access_business(p_business_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select app_private.is_trusted_worker()
      or exists (
        select 1 from core.business_memberships bm
        where bm.business_id = p_business_id
          and bm.entrepreneur_id = app_private.current_entrepreneur_id()
          and bm.valid_from <= current_date
          and (bm.valid_until is null or bm.valid_until >= current_date)
      )
      or exists (
        select 1
        from orchestration.enrollments e
        join catalog.journey_versions jv on jv.id = e.journey_version_id
        join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
        where e.business_id = p_business_id
          and app_private.has_permission('participant.read', jd.owner_organization_id, 'business', p_business_id)
      );
$$;

create or replace function app_private.can_access_journey_instance(p_journey_instance_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select app_private.is_trusted_worker()
      or exists (
        select 1
        from orchestration.journey_instances ji
        join orchestration.enrollments e on e.id = ji.enrollment_id
        join catalog.journey_versions jv on jv.id = e.journey_version_id
        join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
        where ji.id = p_journey_instance_id
          and (
            e.entrepreneur_id = app_private.current_entrepreneur_id()
            or app_private.has_permission('journey.execution.read', jd.owner_organization_id, 'journey_instance', ji.id)
          )
      );
$$;

create or replace function app_private.can_manage_journey_instance(p_journey_instance_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select app_private.is_trusted_worker()
      or exists (
        select 1
        from orchestration.journey_instances ji
        join orchestration.enrollments e on e.id = ji.enrollment_id
        join catalog.journey_versions jv on jv.id = e.journey_version_id
        join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
        where ji.id = p_journey_instance_id
          and app_private.has_permission('journey.execution.manage', jd.owner_organization_id, 'journey_instance', ji.id)
      );
$$;

create or replace function app_private.can_access_step_instance(p_step_instance_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from orchestration.step_instances si
    join orchestration.path_assignments pa on pa.id = si.path_assignment_id
    where si.id = p_step_instance_id
      and app_private.can_access_journey_instance(pa.journey_instance_id)
  );
$$;

create or replace function app_private.can_manage_step_instance(p_step_instance_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from orchestration.step_instances si
    join orchestration.path_assignments pa on pa.id = si.path_assignment_id
    where si.id = p_step_instance_id
      and app_private.can_manage_journey_instance(pa.journey_instance_id)
  );
$$;

create or replace function app_private.can_access_file_object(p_file_object_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select app_private.is_trusted_worker()
      or exists (
        select 1
        from assessment.submission_evidence se
        join assessment.submissions s on s.id = se.submission_id
        where se.file_object_id = p_file_object_id
          and s.entrepreneur_id = app_private.current_entrepreneur_id()
      )
      or exists (
        select 1 from core.file_objects f
        where f.id = p_file_object_id
          and app_private.has_permission('file.manage', f.owner_organization_id, 'file_object', f.id)
      );
$$;

-- -------------------------------------------------------------------------
-- Foundational permission codes. Roles and assignments are environment data.
-- -------------------------------------------------------------------------
insert into iam.permission_definitions(id, code, resource_type, action, description)
values
  (gen_random_uuid(), 'iam.accounts.read', 'user_account', 'read', 'Read user accounts within authorized scope'),
  (gen_random_uuid(), 'iam.accounts.manage', 'user_account', 'manage', 'Manage user accounts within authorized scope'),
  (gen_random_uuid(), 'iam.organizations.read', 'organization', 'read', 'Read organization details'),
  (gen_random_uuid(), 'iam.organizations.manage', 'organization', 'manage', 'Manage organization details'),
  (gen_random_uuid(), 'iam.memberships.read', 'organization_membership', 'read', 'Read organization memberships'),
  (gen_random_uuid(), 'iam.memberships.manage', 'organization_membership', 'manage', 'Manage organization memberships'),
  (gen_random_uuid(), 'participant.read', 'entrepreneur', 'read', 'Read participants in an authorized program or journey'),
  (gen_random_uuid(), 'participant.manage', 'entrepreneur', 'manage', 'Manage participants in an authorized program or journey'),
  (gen_random_uuid(), 'journey.execution.read', 'journey_instance', 'read', 'Read journey execution state'),
  (gen_random_uuid(), 'journey.execution.manage', 'journey_instance', 'manage', 'Manage journey execution state'),
  (gen_random_uuid(), 'assessment.review', 'submission', 'review', 'Review participant submissions'),
  (gen_random_uuid(), 'engagement.manage', 'engagement', 'manage', 'Manage points, badges and certificates'),
  (gen_random_uuid(), 'intervention.manage', 'intervention', 'manage', 'Manage participant interventions'),
  (gen_random_uuid(), 'file.manage', 'file_object', 'manage', 'Manage protected files'),
  (gen_random_uuid(), 'integration.manage', 'integration', 'manage', 'Operate external integrations'),
  (gen_random_uuid(), 'intelligence.read', 'intelligence', 'read', 'Read governed behavioral features and score results'),
  (gen_random_uuid(), 'intelligence.manage', 'intelligence', 'manage', 'Manage behavioral intelligence definitions and runs'),
  (gen_random_uuid(), 'governance.manage', 'governance', 'manage', 'Operate privacy, consent, retention and audit workflows')
on conflict (code) do nothing;

-- -------------------------------------------------------------------------
-- Concrete RLS policies for the initial production release. Direct browser
-- grants remain disabled; these policies provide defense in depth for the API.
-- -------------------------------------------------------------------------
create policy user_accounts_select_self_or_admin on iam.user_accounts
for select using (
  id = app_private.current_user_account_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.read', app_private.current_organization_id(), 'user_account', id)
);

create policy user_accounts_write_admin on iam.user_accounts
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.manage', app_private.current_organization_id(), 'user_account', id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.manage', app_private.current_organization_id(), 'user_account', id)
);

create policy external_identities_select_self_or_admin on iam.external_identities
for select using (
  user_account_id = app_private.current_user_account_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.read', app_private.current_organization_id(), 'user_account', user_account_id)
);

create policy external_identities_write_admin on iam.external_identities
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.manage', app_private.current_organization_id(), 'user_account', user_account_id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.manage', app_private.current_organization_id(), 'user_account', user_account_id)
);

create policy organizations_select_member on iam.organizations
for select using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from iam.organization_memberships om
    where om.organization_id = iam.organizations.id
      and om.user_account_id = app_private.current_user_account_id()
      and om.status = 'active'
      and om.valid_from <= now()
      and (om.valid_until is null or om.valid_until > now())
  )
  or app_private.has_permission('iam.organizations.read', iam.organizations.id, 'organization', iam.organizations.id)
);

create policy organizations_write_admin on iam.organizations
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.organizations.manage', iam.organizations.id, 'organization', iam.organizations.id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.organizations.manage', iam.organizations.id, 'organization', iam.organizations.id)
);

create policy memberships_select_self_or_admin on iam.organization_memberships
for select using (
  user_account_id = app_private.current_user_account_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('iam.memberships.read', organization_id, 'organization_membership', id)
);

create policy memberships_write_admin on iam.organization_memberships
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.memberships.manage', organization_id, 'organization_membership', id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.memberships.manage', organization_id, 'organization_membership', id)
);

create policy membership_roles_select_self_or_admin on iam.membership_roles
for select using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from iam.organization_memberships om
    where om.id = membership_id
      and (
        om.user_account_id = app_private.current_user_account_id()
        or app_private.has_permission('iam.memberships.read', om.organization_id, 'organization_membership', om.id)
      )
  )
);

create policy membership_roles_write_admin on iam.membership_roles
for all using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from iam.organization_memberships om
    where om.id = membership_id
      and app_private.has_permission('iam.memberships.manage', om.organization_id, 'organization_membership', om.id)
  )
) with check (
  app_private.is_trusted_worker()
  or exists (
    select 1 from iam.organization_memberships om
    where om.id = membership_id
      and app_private.has_permission('iam.memberships.manage', om.organization_id, 'organization_membership', om.id)
  )
);

create policy entrepreneurs_select_authorized on core.entrepreneurs
for select using (app_private.can_access_entrepreneur(id));

create policy entrepreneurs_write_authorized on core.entrepreneurs
for all using (
  id = app_private.current_entrepreneur_id() or app_private.can_manage_entrepreneur(id)
) with check (
  id = app_private.current_entrepreneur_id() or app_private.can_manage_entrepreneur(id)
);

create policy businesses_select_authorized on core.businesses
for select using (app_private.can_access_business(id));

create policy businesses_write_operator on core.businesses
for all using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from orchestration.enrollments e
    join catalog.journey_versions jv on jv.id = e.journey_version_id
    join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
    where e.business_id = core.businesses.id
      and app_private.has_permission('participant.manage', jd.owner_organization_id, 'business', core.businesses.id)
  )
) with check (app_private.is_trusted_worker() or app_private.can_access_business(core.businesses.id));

create policy business_memberships_select_authorized on core.business_memberships
for select using (
  app_private.can_access_entrepreneur(entrepreneur_id)
  and app_private.can_access_business(business_id)
);

create policy business_memberships_write_operator on core.business_memberships
for all using (app_private.can_manage_entrepreneur(entrepreneur_id))
with check (app_private.can_manage_entrepreneur(entrepreneur_id));

create policy file_objects_select_authorized on core.file_objects
for select using (app_private.can_access_file_object(id));

create policy file_objects_write_operator on core.file_objects
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('file.manage', owner_organization_id, 'file_object', id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('file.manage', owner_organization_id, 'file_object', id)
);

-- Journey execution tables.
create policy enrollments_select_authorized on orchestration.enrollments
for select using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.is_trusted_worker()
  or exists (
    select 1 from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
    where jv.id = orchestration.enrollments.journey_version_id
      and app_private.has_permission('journey.execution.read', jd.owner_organization_id, 'enrollment', orchestration.enrollments.id)
  )
);

create policy enrollments_write_operator on orchestration.enrollments
for all using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
    where jv.id = orchestration.enrollments.journey_version_id
      and app_private.has_permission('journey.execution.manage', jd.owner_organization_id, 'enrollment', orchestration.enrollments.id)
  )
) with check (
  app_private.is_trusted_worker()
  or exists (
    select 1 from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
    where jv.id = orchestration.enrollments.journey_version_id
      and app_private.has_permission('journey.execution.manage', jd.owner_organization_id, 'enrollment', orchestration.enrollments.id)
  )
);

create policy journey_instances_select_authorized on orchestration.journey_instances
for select using (app_private.can_access_journey_instance(id));

create policy journey_instances_write_authorized on orchestration.journey_instances
for all using (
  app_private.can_access_journey_instance(id) or app_private.can_manage_journey_instance(id)
) with check (
  app_private.can_access_journey_instance(id) or app_private.can_manage_journey_instance(id)
);

create policy path_assignments_authorized on orchestration.path_assignments
for all using (app_private.can_access_journey_instance(journey_instance_id))
with check (app_private.can_access_journey_instance(journey_instance_id));

create policy step_instances_authorized on orchestration.step_instances
for all using (app_private.can_access_step_instance(id))
with check (app_private.can_access_step_instance(id));

create policy activity_sessions_authorized on orchestration.activity_sessions
for all using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_step_instance(step_instance_id)
) with check (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_step_instance(step_instance_id)
);

create policy progress_projections_authorized on orchestration.progress_projections
for select using (app_private.can_access_journey_instance(journey_instance_id));

create policy progress_projections_worker_write on orchestration.progress_projections
for all using (app_private.is_trusted_worker() or app_private.can_manage_journey_instance(journey_instance_id))
with check (app_private.is_trusted_worker() or app_private.can_manage_journey_instance(journey_instance_id));

create policy personalization_decisions_authorized on orchestration.personalization_decisions
for select using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_entrepreneur(entrepreneur_id)
);

create policy personalization_decisions_worker_write on orchestration.personalization_decisions
for all using (app_private.is_trusted_worker() or app_private.can_manage_entrepreneur(entrepreneur_id))
with check (app_private.is_trusted_worker() or app_private.can_manage_entrepreneur(entrepreneur_id));

-- Diagnostics.
create policy diagnostic_sessions_authorized on diagnostics.sessions
for all using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_entrepreneur(entrepreneur_id)
) with check (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_entrepreneur(entrepreneur_id)
);

create policy diagnostic_responses_authorized on diagnostics.responses
for select using (
  exists (select 1 from diagnostics.sessions s where s.id = session_id and app_private.can_access_entrepreneur(s.entrepreneur_id))
);

create policy diagnostic_responses_insert_authorized on diagnostics.responses
for insert with check (
  exists (select 1 from diagnostics.sessions s where s.id = session_id and s.entrepreneur_id = app_private.current_entrepreneur_id())
  or app_private.is_trusted_worker()
);

create policy diagnostic_results_authorized on diagnostics.results
for select using (
  exists (select 1 from diagnostics.sessions s where s.id = session_id and app_private.can_access_entrepreneur(s.entrepreneur_id))
);

create policy diagnostic_results_worker_write on diagnostics.results
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy dimension_results_authorized on diagnostics.dimension_results
for select using (
  exists (
    select 1 from diagnostics.results r
    join diagnostics.sessions s on s.id = r.session_id
    where r.id = result_id and app_private.can_access_entrepreneur(s.entrepreneur_id)
  )
);

create policy dimension_results_worker_write on diagnostics.dimension_results
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy segment_assignments_authorized on diagnostics.segment_assignments
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy segment_assignments_worker_write on diagnostics.segment_assignments
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy archetype_assignments_governed on diagnostics.archetype_assignments
for select using (
  app_private.can_access_entrepreneur(entrepreneur_id)
  and classification_status <> 'disabled'
);

create policy archetype_assignments_worker_write on diagnostics.archetype_assignments
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

-- Assessments and practical submissions.
create policy assessment_attempts_authorized on assessment.attempts
for all using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_step_instance(step_instance_id)
) with check (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_step_instance(step_instance_id)
);

create policy assessment_responses_authorized on assessment.responses
for select using (
  exists (select 1 from assessment.attempts a where a.id = attempt_id and app_private.can_access_entrepreneur(a.entrepreneur_id))
);

create policy assessment_responses_insert_authorized on assessment.responses
for insert with check (
  exists (select 1 from assessment.attempts a where a.id = attempt_id and a.entrepreneur_id = app_private.current_entrepreneur_id())
  or app_private.is_trusted_worker()
);

create policy assessment_results_authorized on assessment.results
for select using (
  exists (select 1 from assessment.attempts a where a.id = attempt_id and app_private.can_access_entrepreneur(a.entrepreneur_id))
);

create policy assessment_results_worker_write on assessment.results
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy submissions_authorized on assessment.submissions
for all using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_step_instance(step_instance_id)
) with check (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_step_instance(step_instance_id)
);

create policy submission_evidence_authorized on assessment.submission_evidence
for all using (
  exists (select 1 from assessment.submissions s where s.id = submission_id and app_private.can_access_entrepreneur(s.entrepreneur_id))
) with check (
  exists (select 1 from assessment.submissions s where s.id = submission_id and app_private.can_access_entrepreneur(s.entrepreneur_id))
);

create policy reviews_select_authorized on assessment.reviews
for select using (
  exists (select 1 from assessment.submissions s where s.id = submission_id and app_private.can_access_entrepreneur(s.entrepreneur_id))
  or reviewer_user_account_id = app_private.current_user_account_id()
);

create policy reviews_write_reviewer on assessment.reviews
for all using (
  app_private.is_trusted_worker()
  or reviewer_user_account_id = app_private.current_user_account_id()
) with check (
  app_private.is_trusted_worker()
  or reviewer_user_account_id = app_private.current_user_account_id()
);

create policy review_scores_select_authorized on assessment.review_scores
for select using (
  exists (select 1 from assessment.reviews r where r.id = review_id and (r.reviewer_user_account_id = app_private.current_user_account_id() or app_private.is_trusted_worker()))
  or exists (
    select 1 from assessment.reviews r
    join assessment.submissions s on s.id = r.submission_id
    where r.id = review_id and s.entrepreneur_id = app_private.current_entrepreneur_id()
  )
);

create policy review_scores_write_reviewer on assessment.review_scores
for all using (
  exists (select 1 from assessment.reviews r where r.id = review_id and (r.reviewer_user_account_id = app_private.current_user_account_id() or app_private.is_trusted_worker()))
) with check (
  exists (select 1 from assessment.reviews r where r.id = review_id and (r.reviewer_user_account_id = app_private.current_user_account_id() or app_private.is_trusted_worker()))
);

-- Engagement is readable by the participant, but only workers/operators mutate it.
create policy point_ledger_select_authorized on engagement.point_ledger
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy point_ledger_worker_insert on engagement.point_ledger
for insert with check (app_private.is_trusted_worker());

create policy point_balance_select_authorized on engagement.point_balance_projections
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy point_balance_worker_write on engagement.point_balance_projections
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy badge_awards_select_authorized on engagement.badge_awards
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy badge_awards_worker_write on engagement.badge_awards
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy certificate_issuances_select_authorized on engagement.certificate_issuances
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy certificate_issuances_worker_write on engagement.certificate_issuances
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy streaks_select_authorized on engagement.streak_projections
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy streaks_worker_write on engagement.streak_projections
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

-- Interventions.
create policy intervention_instances_select_authorized on intervention.instances
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy intervention_instances_worker_write on intervention.instances
for all using (app_private.is_trusted_worker() or app_private.can_manage_entrepreneur(entrepreneur_id))
with check (app_private.is_trusted_worker() or app_private.can_manage_entrepreneur(entrepreneur_id));

create policy intervention_delivery_operator on intervention.delivery_attempts
for all using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from intervention.instances i
    where i.id = intervention_instance_id and app_private.can_manage_entrepreneur(i.entrepreneur_id)
  )
) with check (
  app_private.is_trusted_worker()
  or exists (
    select 1 from intervention.instances i
    where i.id = intervention_instance_id and app_private.can_manage_entrepreneur(i.entrepreneur_id)
  )
);

create policy intervention_responses_authorized on intervention.responses
for all using (
  exists (
    select 1 from intervention.instances i
    where i.id = intervention_instance_id and app_private.can_access_entrepreneur(i.entrepreneur_id)
  )
) with check (
  exists (
    select 1 from intervention.instances i
    where i.id = intervention_instance_id and app_private.can_access_entrepreneur(i.entrepreneur_id)
  )
);

-- Integration, intelligence and governance are operator/worker-only.
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

-- -------------------------------------------------------------------------
-- m08 performance hardening: split FOR ALL policies into command-specific
-- policies without changing their expressions. This prevents redundant
-- permissive-policy evaluation for SELECT while preserving behavior.
-- -------------------------------------------------------------------------
do $$
declare
  r record;
  v_roles text;
  v_has_select boolean;
  v_base text;
  v_select_name text;
  v_insert_name text;
  v_update_name text;
  v_delete_name text;
  v_using text;
  v_check text;
begin
  for r in
    select schemaname, tablename, policyname, roles, qual, with_check
    from pg_policies
    where schemaname in ('iam','core','orchestration','diagnostics','assessment','engagement','intervention','integration','intelligence','governance')
      and cmd = 'ALL'
    order by schemaname, tablename, policyname
  loop
    select string_agg(quote_ident(role_name), ', ')
      into v_roles
      from unnest(r.roles) as role_name;

    select exists (
      select 1 from pg_policies p
      where p.schemaname = r.schemaname
        and p.tablename = r.tablename
        and p.policyname <> r.policyname
        and p.cmd in ('SELECT','ALL')
    ) into v_has_select;

    v_using := coalesce(r.qual, 'true');
    v_check := coalesce(r.with_check, r.qual, 'true');
    v_base := left(r.policyname, 42) || '_' || substr(md5(r.schemaname || '.' || r.tablename || '.' || r.policyname), 1, 8);
    v_select_name := left(v_base || '_sel', 63);
    v_insert_name := left(v_base || '_ins', 63);
    v_update_name := left(v_base || '_upd', 63);
    v_delete_name := left(v_base || '_del', 63);

    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);

    if not v_has_select then
      execute format(
        'create policy %I on %I.%I for select to %s using (%s)',
        v_select_name, r.schemaname, r.tablename, v_roles, v_using
      );
    end if;

    execute format(
      'create policy %I on %I.%I for insert to %s with check (%s)',
      v_insert_name, r.schemaname, r.tablename, v_roles, v_check
    );
    execute format(
      'create policy %I on %I.%I for update to %s using (%s) with check (%s)',
      v_update_name, r.schemaname, r.tablename, v_roles, v_using, v_check
    );
    execute format(
      'create policy %I on %I.%I for delete to %s using (%s)',
      v_delete_name, r.schemaname, r.tablename, v_roles, v_using
    );
  end loop;
end $$;

-- Create deterministic covering indexes only for foreign keys that do not
-- already have an index whose leading columns cover the FK columns.
do $$
declare
  r record;
  v_index_name text;
begin
  for r in
    select
      n.nspname as schema_name,
      cl.relname as table_name,
      c.conname as constraint_name,
      c.conrelid,
      c.conkey,
      string_agg(quote_ident(a.attname), ', ' order by k.ord) as column_list
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    join lateral unnest(c.conkey) with ordinality as k(attnum, ord) on true
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
    where c.contype = 'f'
      and n.nspname in ('iam','core','catalog','orchestration','diagnostics','assessment','engagement','intervention','eventing','integration','intelligence','governance')
      and not exists (
        select 1
        from pg_index i
        where i.indrelid = c.conrelid
          and i.indisvalid
          and i.indisready
          and (
            select array_agg(ik.attnum::smallint order by ik.ord)
            from unnest(i.indkey) with ordinality as ik(attnum, ord)
            where ik.ord <= cardinality(c.conkey)
          ) = c.conkey
      )
    group by n.nspname, cl.relname, c.conname, c.conrelid, c.conkey
    order by n.nspname, cl.relname, c.conname
  loop
    v_index_name := left(
      'ix_fk_' || r.table_name || '_' || substr(md5(r.schema_name || '.' || r.table_name || '.' || r.constraint_name), 1, 10),
      63
    );
    execute format(
      'create index if not exists %I on %I.%I (%s)',
      v_index_name, r.schema_name, r.table_name, r.column_list
    );
  end loop;
end $$;

-- -------------------------------------------------------------------------
-- Transactional outbox API. Domain state is changed by the same transaction
-- before append_event; no external side effect occurs here.
-- -------------------------------------------------------------------------
create or replace function eventing.append_event(
  p_event_id uuid,
  p_event_name text,
  p_event_version integer,
  p_occurred_at timestamptz,
  p_producer text,
  p_subject_type text,
  p_subject_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_organization_id uuid,
  p_journey_instance_id uuid,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_aggregate_version bigint,
  p_partition_key text,
  p_correlation_id uuid,
  p_causation_id uuid,
  p_traceparent text,
  p_evidence_nature text,
  p_privacy_class text,
  p_payload jsonb,
  p_schema_id uuid,
  p_route_keys text[]
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_route text;
  v_payload_hash text;
begin
  if p_event_id is null or p_correlation_id is null or p_schema_id is null then
    raise exception 'event_identity_fields_required' using errcode = '22023';
  end if;
  if p_event_version < 1 or p_aggregate_version < 0 then
    raise exception 'invalid_event_version' using errcode = '22023';
  end if;
  if p_route_keys is null or cardinality(p_route_keys) = 0 then
    raise exception 'event_route_required' using errcode = '22023';
  end if;
  v_payload_hash := encode(extensions.digest(convert_to(coalesce(p_payload, '{}'::jsonb)::text, 'UTF8'), 'sha256'), 'hex');

  insert into eventing.events(
    event_id, event_name, event_version, occurred_at, producer,
    subject_type, subject_id, actor_type, actor_id, organization_id,
    journey_instance_id, aggregate_type, aggregate_id, aggregate_version,
    partition_key, correlation_id, causation_id, traceparent,
    evidence_nature, privacy_class, payload, payload_hash, schema_id
  ) values (
    p_event_id, p_event_name, p_event_version, p_occurred_at, p_producer,
    p_subject_type, p_subject_id, p_actor_type, p_actor_id, p_organization_id,
    p_journey_instance_id, p_aggregate_type, p_aggregate_id, p_aggregate_version,
    p_partition_key, p_correlation_id, p_causation_id, p_traceparent,
    p_evidence_nature, p_privacy_class, coalesce(p_payload, '{}'::jsonb), v_payload_hash, p_schema_id
  );

  foreach v_route in array p_route_keys loop
    if v_route is null or length(trim(v_route)) = 0 then
      raise exception 'invalid_route_key' using errcode = '22023';
    end if;
    insert into eventing.outbox(event_id, route_key, status, available_at)
    values (p_event_id, trim(v_route), 'pending', now())
    on conflict (event_id, route_key) do nothing;
  end loop;

  return p_event_id;
end;
$$;

create or replace function eventing.claim_outbox_batch(
  p_worker_id text,
  p_batch_size integer default 50,
  p_lease interval default interval '5 minutes'
) returns setof eventing.outbox
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if p_worker_id is null or length(trim(p_worker_id)) = 0 then
    raise exception 'worker_id_required' using errcode = '22023';
  end if;
  if p_batch_size < 1 or p_batch_size > 500 then
    raise exception 'invalid_batch_size' using errcode = '22023';
  end if;
  return query
  with candidates as (
    select o.id
    from eventing.outbox o
    where o.available_at <= now()
      and (
        o.status in ('pending', 'retry')
        or (o.status = 'processing' and o.claimed_at < now() - p_lease)
      )
    order by o.available_at, o.created_at
    for update skip locked
    limit p_batch_size
  )
  update eventing.outbox o
     set status = 'processing',
         claimed_at = now(),
         claimed_by = trim(p_worker_id),
         attempt_count = o.attempt_count + 1
    from candidates c
   where o.id = c.id
  returning o.*;
end;
$$;

create or replace function eventing.complete_outbox_item(
  p_outbox_id uuid,
  p_worker_id text
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  update eventing.outbox
     set status = 'completed', completed_at = now(), last_error_code = null
   where id = p_outbox_id and status = 'processing' and claimed_by = trim(p_worker_id);
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function eventing.retry_outbox_item(
  p_outbox_id uuid,
  p_worker_id text,
  p_error_code text,
  p_available_at timestamptz
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  update eventing.outbox
     set status = 'retry',
         available_at = greatest(p_available_at, now()),
         claimed_at = null,
         claimed_by = null,
         last_error_code = left(coalesce(p_error_code, 'unknown'), 120)
   where id = p_outbox_id and status = 'processing' and claimed_by = trim(p_worker_id);
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function eventing.move_outbox_to_dead_letter(
  p_outbox_id uuid,
  p_worker_id text,
  p_consumer_id uuid,
  p_reason_code text,
  p_reason_details jsonb
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_event_id uuid;
  v_dead_letter_id uuid;
begin
  select event_id into v_event_id
  from eventing.outbox
  where id = p_outbox_id and status = 'processing' and claimed_by = trim(p_worker_id)
  for update;
  if v_event_id is null then
    raise exception 'outbox_claim_not_owned' using errcode = '55000';
  end if;
  insert into eventing.dead_letters(
    event_id, consumer_id, source_type, reason_code, reason_details, status
  ) values (
    v_event_id, p_consumer_id, 'outbox', left(coalesce(p_reason_code, 'unknown'), 120),
    coalesce(p_reason_details, '{}'::jsonb), 'open'
  ) returning id into v_dead_letter_id;
  update eventing.outbox
     set status = 'dead_letter', completed_at = now(), last_error_code = left(coalesce(p_reason_code, 'unknown'), 120)
   where id = p_outbox_id;
  return v_dead_letter_id;
end;
$$;

create or replace function eventing.begin_consumer_processing(
  p_consumer_id uuid,
  p_event_id uuid
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  insert into eventing.consumer_inbox(
    consumer_id, event_id, status, processing_started_at, attempt_count
  ) values (
    p_consumer_id, p_event_id, 'processing', now(), 1
  ) on conflict (consumer_id, event_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function eventing.complete_consumer_processing(
  p_consumer_id uuid,
  p_event_id uuid
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  update eventing.consumer_inbox
     set status = 'processed', processed_at = now(), last_error_code = null
   where consumer_id = p_consumer_id and event_id = p_event_id and status = 'processing';
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

-- Internal schemas are never directly granted to browser roles.
revoke all on all tables in schema eventing, integration, intelligence, governance from public;

revoke all on all functions in schema app_private from public;

revoke all on function iam.resolve_external_identity(text, text, text, text, boolean, text) from public;

revoke all on function iam.link_external_identity(uuid, text, text, text, text, boolean, text) from public;
