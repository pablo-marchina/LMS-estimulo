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

