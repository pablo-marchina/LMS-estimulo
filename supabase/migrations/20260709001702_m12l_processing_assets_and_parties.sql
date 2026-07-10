-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709001702
-- Remote name: m12l_processing_assets_and_parties
-- Remote SQL SHA-256: 14d70bca5f2ecb2c86b077aa57fde9981172d3ff32aa05fbbb6091075180390b
-- Do not edit after reconciliation; corrections require a new migration.

insert into governance.data_assets(
  asset_reference,system_code,schema_name,table_name,field_path,classification_code,
  data_subject_category,source_category,contains_direct_identifier,contains_behavioral_profile,
  contains_credit_context,status,notes
) values
 ('platform.identity_accounts','platform','iam','user_accounts',null,'personal','users','direct_collection',true,false,false,'active','Account identifiers and lifecycle metadata.'),
 ('platform.entrepreneur_profile','platform','core','entrepreneurs',null,'personal','entrepreneurs','direct_collection',true,false,false,'active','Participant profile and contact references.'),
 ('platform.business_profile','platform','core','businesses',null,'confidential','businesses','direct_collection',false,false,true,'active','Business operational profile; fields may indirectly identify owners.'),
 ('platform.diagnostic_responses','platform','diagnostics','responses',null,'behavioral_profile','entrepreneurs','direct_collection',false,true,false,'active','Diagnostic answers and revisions.'),
 ('platform.diagnostic_results','platform','diagnostics','dimension_results',null,'behavioral_profile','entrepreneurs','derived',false,true,false,'active','Derived diagnostic dimensions.'),
 ('platform.learning_progress','platform','orchestration','progress_projections',null,'personal','entrepreneurs','observed',false,true,false,'active','Progress, state and completion projections.'),
 ('platform.assessment_attempts','platform','assessment','attempts',null,'personal','entrepreneurs','observed',false,true,false,'active','Assessment attempt metadata.'),
 ('platform.assessment_responses','platform','assessment','responses',null,'personal','entrepreneurs','direct_collection',false,true,false,'active','Assessment responses.'),
 ('platform.practice_submissions','platform','assessment','submissions',null,'personal','entrepreneurs','direct_collection',false,true,false,'active','Practical submissions and review state.'),
 ('platform.uploaded_files','platform','core','file_objects',null,'personal','entrepreneurs','direct_collection',false,false,false,'active','Private uploaded evidence; actual sensitivity depends on upload profile.'),
 ('platform.behavioral_events','platform','eventing','events',null,'personal','entrepreneurs','observed',false,true,false,'active','Pseudonymous event stream with privacy classification and minimized payload.'),
 ('platform.behavioral_features','platform','intelligence','feature_values',null,'behavioral_profile','entrepreneurs','derived',false,true,false,'active','Derived behavioral features.'),
 ('platform.experimental_scores','platform','intelligence','score_results',null,'credit_related','entrepreneurs','derived',false,true,true,'active','Experimental scores; production credit use blocked.'),
 ('platform.audit_trail','platform','governance','audit_log',null,'confidential','users','observed',false,false,false,'active','Administrative and security audit metadata with redaction.'),
 ('platform.crm_mappings','platform','integration','external_object_mappings',null,'personal','entrepreneurs','external_system',true,false,true,'active','Mappings between internal entities and CRM objects.'),
 ('platform.security_incidents','platform','governance','security_incidents',null,'confidential','users','observed',false,false,false,'active','Incident records; may reference personal-data impact without storing raw exposed content.'),
 ('platform.consent_evidence','platform','governance','consent_records',null,'personal','entrepreneurs','direct_collection',true,false,false,'active','Append-only evidence of consent decisions where consent is the approved basis.'),
 ('platform.privacy_requests','platform','governance','privacy_requests',null,'personal','entrepreneurs','direct_collection',true,false,false,'active','Data-subject request workflow and evidence references.')
on conflict(asset_reference) do update set classification_code=excluded.classification_code,notes=excluded.notes,status=excluded.status;

insert into governance.processing_activity_assets(processing_activity_id,data_asset_id,necessity_rationale,mandatory_for_purpose)
select pa.id,da.id,x.rationale,x.mandatory
from (values
 ('platform_core','platform.identity_accounts','Required for authenticated account lifecycle.',true),
 ('platform_core','platform.entrepreneur_profile','Required to associate the participant with enrollments and support.',true),
 ('platform_core','platform.business_profile','Required where the journey applies to a beneficiary business.',false),
 ('platform_core','platform.learning_progress','Required to resume and complete journeys.',true),
 ('platform_core','platform.assessment_attempts','Required for assessment integrity and progression.',true),
 ('platform_core','platform.practice_submissions','Required only for journeys containing practical evidence.',false),
 ('platform_core','platform.uploaded_files','Required only for activities explicitly allowing uploads.',false),
 ('learning_personalization','platform.diagnostic_responses','Input for approved personalization rules.',true),
 ('learning_personalization','platform.diagnostic_results','Derived dimensions used to adapt the learning path.',true),
 ('learning_personalization','platform.learning_progress','Needed to avoid irrelevant or repetitive interventions.',true),
 ('learning_personalization','platform.behavioral_events','Only approved event types and windows may support personalization.',false),
 ('security_operations','platform.identity_accounts','Account security and incident investigation metadata.',true),
 ('security_operations','platform.audit_trail','Required for accountability and investigation.',true),
 ('security_operations','platform.security_incidents','Required to manage response and lessons learned.',true),
 ('security_operations','platform.uploaded_files','Object metadata and scan status only.',false),
 ('program_evaluation','platform.learning_progress','Aggregated progress and completion measures.',true),
 ('program_evaluation','platform.assessment_attempts','Aggregated learning evidence.',false),
 ('program_evaluation','platform.behavioral_events','Minimized and preferably aggregated event measures.',false),
 ('crm_sync','platform.entrepreneur_profile','Only allowlisted operational fields after approval.',true),
 ('crm_sync','platform.crm_mappings','Required for idempotent synchronization and reconciliation.',true),
 ('behavioral_research','platform.behavioral_events','Research input restricted to approved events.',true),
 ('behavioral_research','platform.behavioral_features','Derived research variables with lineage.',true),
 ('behavioral_research','platform.experimental_scores','Validation output only; no credit effect.',false),
 ('credit_decision_support','platform.behavioral_features','Potential future input, currently blocked.',true),
 ('credit_decision_support','platform.experimental_scores','Potential future decision support output, currently blocked.',true),
 ('credit_decision_support','platform.crm_mappings','Potential linkage to credit workflow, pending inventory and approval.',false)
) x(activity_code,asset_reference,rationale,mandatory)
join governance.processing_activities pa on pa.code=x.activity_code
join governance.data_assets da on da.asset_reference=x.asset_reference
on conflict(processing_activity_id,data_asset_id) do update set necessity_rationale=excluded.necessity_rationale,mandatory_for_purpose=excluded.mandatory_for_purpose;

insert into governance.processing_activity_parties(processing_activity_id,processing_party_id,role_in_activity,data_shared_description)
select a.id,p.id,x.role_in_activity,x.description
from (values
 ('platform_core','estimulo_controller','controller','Determines purpose and essential means; formal scope pending confirmation.'),
 ('platform_core','supabase_test_provider','test_infrastructure','Test database, authentication, storage and functions; no real participant data authorized.'),
 ('platform_core','aws_production_provider','production_infrastructure','Production target pending contract, region and security approval.'),
 ('learning_personalization','estimulo_controller','controller','Defines educational personalization purpose and safeguards.'),
 ('learning_personalization','aws_production_provider','production_infrastructure','Hosts approved production data and processing.'),
 ('security_operations','estimulo_controller','controller','Owns incident decisions and data-subject/regulator communication assessment.'),
 ('security_operations','supabase_test_provider','test_infrastructure','Provides test logs and infrastructure controls.'),
 ('security_operations','aws_production_provider','production_infrastructure','Provides production security, logging, encryption and resilience services.'),
 ('program_evaluation','estimulo_controller','controller','Defines evaluation questions and publication safeguards.'),
 ('program_evaluation','aws_production_provider','production_infrastructure','Hosts restricted analytical workloads after approval.'),
 ('crm_sync','estimulo_controller','controller','Defines the field allowlist and operational recipients.'),
 ('crm_sync','hubspot_crm_provider','crm_operator','Receives only approved allowlisted facts; assessment pending.'),
 ('behavioral_research','estimulo_controller','controller','Owns research governance and prohibition of credit effects.'),
 ('behavioral_research','aws_production_provider','production_infrastructure','Potential restricted research environment after approval.'),
 ('credit_decision_support','estimulo_controller','controller','Future role subject to formal credit-governance confirmation.'),
 ('credit_decision_support','aws_production_provider','production_infrastructure','Future processing only after gate approval.')
) x(activity_code,party_code,role_in_activity,description)
join governance.processing_activities a on a.code=x.activity_code
join governance.processing_parties p on p.code=x.party_code
on conflict(processing_activity_id,processing_party_id) do update set role_in_activity=excluded.role_in_activity,data_shared_description=excluded.data_shared_description;

create or replace function governance.guard_processing_activity_activation()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
declare v_purpose_status text; v_retention_status text; v_ripd_status text;
begin
  if new.status='active' then
    if new.legal_basis_code is null then raise exception 'legal_basis_required_for_active_processing' using errcode='23514'; end if;
    if new.approved_at is null then raise exception 'approval_required_for_active_processing' using errcode='23514'; end if;
    select status into v_purpose_status from governance.purposes where id=new.purpose_id;
    if v_purpose_status not in ('approved','active') then raise exception 'approved_purpose_required' using errcode='23514'; end if;
    if new.retention_policy_id is null then raise exception 'retention_policy_required' using errcode='23514'; end if;
    select status into v_retention_status from governance.retention_policies where id=new.retention_policy_id;
    if v_retention_status not in ('approved','active') then raise exception 'approved_retention_policy_required' using errcode='23514'; end if;
    if not exists(select 1 from governance.processing_activity_assets where processing_activity_id=new.id) then raise exception 'processing_assets_required' using errcode='23514'; end if;
    if new.ripd_required or new.high_risk or new.credit_decision_use then
      if new.ripd_policy_document_id is null then raise exception 'effective_ripd_required' using errcode='23514'; end if;
      select status into v_ripd_status from governance.policy_documents where id=new.ripd_policy_document_id;
      if v_ripd_status<>'effective' then raise exception 'effective_ripd_required' using errcode='23514'; end if;
    end if;
    if new.credit_decision_use and not exists(
      select 1 from governance.production_readiness_controls
      where environment='production' and control_code='CREDIT_DECISION_GOVERNANCE' and status='passed'
    ) then raise exception 'credit_decision_governance_not_ready' using errcode='23514'; end if;
  end if;
  return new;
end;
$$;
