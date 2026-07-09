-- Plataforma Estímulo — M12 — security, privacy/LGPD governance and production-readiness gate.
-- This canonical migration consolidates the remote incremental M12a–M12l execution.
-- It does not assign final legal bases, retention periods, controller scope, DPO identity,
-- vendor approvals or production cloud configuration. Those remain explicit release blockers.

set lock_timeout = '5s';
set statement_timeout = '5min';

-- -----------------------------------------------------------------------------
-- Privacy and legal-governance catalogs
-- -----------------------------------------------------------------------------

create table governance.legal_basis_definitions (
  code text primary key,
  name text not null,
  law_reference text not null,
  data_scope text not null,
  requires_consent boolean not null default false,
  description text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_legal_basis_code check (code ~ '^[a-z][a-z0-9_]{2,62}$'),
  constraint ck_legal_basis_scope check (data_scope in ('personal','sensitive_personal','both')),
  constraint ck_legal_basis_status check (status in ('active','deprecated'))
);

create table governance.data_classifications (
  code text primary key,
  rank smallint not null unique,
  name text not null,
  is_personal_data boolean not null default false,
  is_sensitive_personal_data boolean not null default false,
  description text not null,
  handling_rules jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_data_classification_code check (code ~ '^[a-z][a-z0-9_]{2,62}$'),
  constraint ck_data_classification_rank check (rank between 0 and 100),
  constraint ck_data_classification_status check (status in ('active','deprecated')),
  constraint ck_data_classification_sensitive check (not is_sensitive_personal_data or is_personal_data)
);

create table governance.policy_documents (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version text not null,
  document_type text not null,
  status text not null default 'draft',
  content_hash text,
  reference_uri text,
  supersedes_policy_id uuid references governance.policy_documents(id),
  effective_at timestamptz,
  approved_by uuid references iam.user_accounts(id),
  approved_at timestamptz,
  review_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_policy_documents_code_version unique(code,version),
  constraint ck_policy_documents_code check (code ~ '^[a-z][a-z0-9_]{2,80}$'),
  constraint ck_policy_documents_type check (document_type in (
    'privacy_notice','privacy_governance','retention','incident_response','access_control',
    'backup_restore','acceptable_use','vendor_management','ripd',
    'legitimate_interest_assessment','credit_data_use','other'
  )),
  constraint ck_policy_documents_status check (status in ('draft','under_review','approved','effective','superseded','retired')),
  constraint ck_policy_documents_hash check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$'),
  constraint ck_policy_documents_approval check ((status in ('approved','effective','superseded','retired')) = (approved_at is not null))
);

alter table governance.purposes
  add column if not exists requires_consent boolean not null default false,
  add column if not exists owner_role text,
  add column if not exists approved_by uuid references iam.user_accounts(id),
  add column if not exists approved_at timestamptz,
  add column if not exists review_due_at timestamptz,
  add column if not exists policy_document_id uuid references governance.policy_documents(id),
  add column if not exists updated_at timestamptz not null default now();

alter table governance.purposes
  add constraint ck_governance_purposes_status check (status in ('draft','under_review','approved','active','suspended','retired')),
  add constraint ck_governance_purposes_approval check ((status in ('approved','active','suspended','retired'))=(approved_at is not null));

alter table governance.retention_policies
  add column if not exists version integer not null default 1,
  add column if not exists trigger_type text not null default 'record_created',
  add column if not exists trigger_reference text,
  add column if not exists anonymization_spec jsonb not null default '{}'::jsonb,
  add column if not exists approved_by uuid references iam.user_accounts(id),
  add column if not exists approved_at timestamptz,
  add column if not exists review_due_at timestamptz,
  add column if not exists policy_document_id uuid references governance.policy_documents(id),
  add column if not exists updated_at timestamptz not null default now();

alter table governance.retention_policies
  add constraint ck_retention_version check (version > 0),
  add constraint ck_retention_trigger_type check (trigger_type in ('record_created','purpose_completed','relationship_ended','consent_withdrawn','contract_ended','legal_deadline','manual')),
  add constraint ck_retention_deletion_action check (deletion_action in ('delete','anonymize','aggregate','archive_restricted','manual_review','retain_legal_hold')),
  add constraint ck_retention_status check (status in ('draft','under_review','approved','active','suspended','retired'));

create table governance.data_assets (
  id uuid primary key default gen_random_uuid(),
  asset_reference text not null unique,
  system_code text not null,
  schema_name text,
  table_name text,
  field_path text,
  classification_code text not null references governance.data_classifications(code),
  data_subject_category text not null,
  source_category text not null,
  contains_direct_identifier boolean not null default false,
  contains_behavioral_profile boolean not null default false,
  contains_credit_context boolean not null default false,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_data_assets_reference check (length(trim(asset_reference)) between 3 and 240),
  constraint ck_data_assets_status check (status in ('active','deprecated','retired'))
);

create table governance.processing_activities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  purpose_id uuid not null references governance.purposes(id),
  legal_basis_code text references governance.legal_basis_definitions(code),
  controller_organization_id uuid references iam.organizations(id),
  status text not null default 'draft',
  data_subject_categories text[] not null default '{}'::text[],
  processing_operations text[] not null default '{}'::text[],
  recipient_categories text[] not null default '{}'::text[],
  international_transfer boolean not null default false,
  transfer_countries text[] not null default '{}'::text[],
  automated_decision boolean not null default false,
  profiling boolean not null default false,
  credit_decision_use boolean not null default false,
  high_risk boolean not null default false,
  ripd_required boolean not null default false,
  retention_policy_id uuid references governance.retention_policies(id),
  owner_role text not null,
  approved_by uuid references iam.user_accounts(id),
  approved_at timestamptz,
  review_due_at timestamptz,
  limitations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ripd_policy_document_id uuid references governance.policy_documents(id),
  legitimate_interest_assessment_document_id uuid references governance.policy_documents(id),
  constraint ck_processing_activity_code check (code ~ '^[a-z][a-z0-9_]{2,80}$'),
  constraint ck_processing_activity_status check (status in ('draft','under_review','approved','active','suspended','retired')),
  constraint ck_processing_activity_transfer check (international_transfer or cardinality(transfer_countries)=0),
  constraint ck_processing_activity_credit_review check (not credit_decision_use or automated_decision or profiling),
  constraint ck_processing_activity_approval check ((status in ('approved','active','suspended','retired')) = (approved_at is not null))
);

create table governance.processing_activity_assets (
  processing_activity_id uuid not null references governance.processing_activities(id) on delete cascade,
  data_asset_id uuid not null references governance.data_assets(id),
  necessity_rationale text not null,
  mandatory_for_purpose boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(processing_activity_id,data_asset_id)
);

create table governance.processing_parties (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  party_name text not null,
  party_role text not null,
  country_code char(2),
  contract_status text not null default 'not_assessed',
  dpa_reference text,
  transfer_mechanism text,
  security_review_status text not null default 'not_assessed',
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_processing_party_code check (code ~ '^[a-z][a-z0-9_]{2,80}$'),
  constraint ck_processing_party_role check (party_role in ('controller','joint_controller','operator','subprocessor','recipient','infrastructure_provider')),
  constraint ck_processing_party_contract check (contract_status in ('not_assessed','pending','approved','expired','terminated')),
  constraint ck_processing_party_security check (security_review_status in ('not_assessed','pending','approved','conditional','rejected')),
  constraint ck_processing_party_status check (status in ('draft','active','suspended','retired'))
);

create table governance.processing_activity_parties (
  processing_activity_id uuid not null references governance.processing_activities(id) on delete cascade,
  processing_party_id uuid not null references governance.processing_parties(id),
  role_in_activity text not null,
  data_shared_description text,
  created_at timestamptz not null default now(),
  primary key(processing_activity_id,processing_party_id)
);

create table governance.dpo_designations (
  id uuid primary key default gen_random_uuid(),
  designation_type text not null,
  designated_party_name text,
  public_contact_channel text not null,
  formal_act_reference text,
  substitute_party_name text,
  conflict_assessment_reference text,
  effective_from date not null,
  effective_until date,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_dpo_designation_type check (designation_type in ('appointed_natural_person','appointed_legal_entity','small_agent_exemption')),
  constraint ck_dpo_designation_status check (status in ('draft','under_review','active','expired','revoked')),
  constraint ck_dpo_designation_period check (effective_until is null or effective_until>=effective_from),
  constraint ck_dpo_designation_act check (designation_type='small_agent_exemption' or formal_act_reference is not null)
);

-- -----------------------------------------------------------------------------
-- Data-subject rights, consent evidence, retention and legal holds
-- -----------------------------------------------------------------------------

alter table governance.privacy_requests
  add column if not exists requester_type text not null default 'data_subject',
  add column if not exists identity_verification_status text not null default 'pending',
  add column if not exists identity_verified_at timestamptz,
  add column if not exists intake_channel text not null default 'internal',
  add column if not exists scope jsonb not null default '{}'::jsonb,
  add column if not exists assigned_role text,
  add column if not exists legal_hold_checked_at timestamptz,
  add column if not exists rejection_reason_code text,
  add column if not exists updated_at timestamptz not null default now();

alter table governance.privacy_requests
  add constraint ck_privacy_requests_type check (request_type in ('confirmation','access','correction','anonymization','blocking','deletion','portability','information_sharing','consent_information','consent_withdrawal','automated_decision_review','objection','other')),
  add constraint ck_privacy_requests_status check (status in ('received','identity_verification','validated','in_progress','waiting_third_party','waiting_legal_review','fulfilled','partially_fulfilled','rejected','cancelled')),
  add constraint ck_privacy_requests_requester check (requester_type in ('data_subject','legal_representative','authorized_agent','internal_control')),
  add constraint ck_privacy_requests_verification check (identity_verification_status in ('pending','verified','failed','not_required')),
  add constraint ck_privacy_requests_channel check (intake_channel in ('web','email','phone','whatsapp','in_person','regulator','internal')),
  add constraint ck_privacy_requests_completed check (completed_at is null or completed_at>=requested_at);

create table governance.privacy_request_events (
  id uuid primary key default gen_random_uuid(),
  privacy_request_id uuid not null references governance.privacy_requests(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_user_account_id uuid references iam.user_accounts(id),
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  evidence_reference text,
  created_at timestamptz not null default now(),
  constraint ck_privacy_request_event_type check (event_type in ('received','identity_verified','identity_failed','scope_defined','assigned','search_started','third_party_requested','legal_review_requested','correction_applied','data_export_generated','consent_withdrawn','decision_reviewed','fulfilled','partially_fulfilled','rejected','cancelled','note'))
);

alter table governance.consent_records
  add column if not exists policy_document_id uuid references governance.policy_documents(id),
  add column if not exists consent_text_hash text,
  add column if not exists presented_data_categories text[] not null default '{}'::text[],
  add column if not exists collection_context jsonb not null default '{}'::jsonb,
  add column if not exists expires_at timestamptz;

alter table governance.consent_records
  add constraint ck_consent_status check (status in ('granted','refused','withdrawn','expired','superseded')),
  add constraint ck_consent_hash check (consent_text_hash is null or consent_text_hash ~ '^[a-f0-9]{64}$'),
  add constraint ck_consent_expiry check (expires_at is null or expires_at>=captured_at);

create table governance.legal_holds (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  reason_category text not null,
  legal_reference text,
  status text not null default 'draft',
  effective_from timestamptz not null,
  effective_until timestamptz,
  approved_by uuid references iam.user_accounts(id),
  approved_at timestamptz,
  released_by uuid references iam.user_accounts(id),
  released_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_legal_hold_code check (code ~ '^[a-z][a-z0-9_:-]{2,100}$'),
  constraint ck_legal_hold_reason check (reason_category in ('litigation','regulatory_investigation','fraud_investigation','contractual_dispute','audit','law_enforcement','other')),
  constraint ck_legal_hold_status check (status in ('draft','active','released','expired','cancelled')),
  constraint ck_legal_hold_period check (effective_until is null or effective_until>=effective_from),
  constraint ck_legal_hold_approval check ((status in ('active','released','expired')) = (approved_at is not null))
);

create table governance.legal_hold_targets (
  legal_hold_id uuid not null references governance.legal_holds(id) on delete cascade,
  target_type text not null,
  target_reference text not null,
  scope jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key(legal_hold_id,target_type,target_reference),
  constraint ck_legal_hold_target_type check (target_type in ('entrepreneur','business','organization','data_asset','processing_activity','file_object','event_partition','privacy_request','custom'))
);

create table governance.retention_runs (
  id uuid primary key default gen_random_uuid(),
  retention_policy_id uuid not null references governance.retention_policies(id),
  run_type text not null,
  status text not null default 'planned',
  dry_run boolean not null default true,
  cutoff_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  initiated_by uuid references iam.user_accounts(id),
  summary jsonb not null default '{}'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  constraint ck_retention_run_type check (run_type in ('scheduled','manual','privacy_request','legal_hold_release','proof')),
  constraint ck_retention_run_status check (status in ('planned','running','succeeded','partially_succeeded','failed','cancelled')),
  constraint ck_retention_run_dates check (completed_at is null or started_at is not null and completed_at>=started_at)
);

create table governance.retention_actions (
  id uuid primary key default gen_random_uuid(),
  retention_run_id uuid not null references governance.retention_runs(id) on delete cascade,
  target_type text not null,
  target_reference text not null,
  proposed_action text not null,
  status text not null default 'candidate',
  legal_hold_id uuid references governance.legal_holds(id),
  reason_code text,
  before_hash text,
  after_hash text,
  executed_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint uq_retention_actions_target unique(retention_run_id,target_type,target_reference),
  constraint ck_retention_action_type check (proposed_action in ('delete','anonymize','aggregate','archive_restricted','manual_review','retain')),
  constraint ck_retention_action_status check (status in ('candidate','blocked_legal_hold','approved','executing','succeeded','failed','skipped')),
  constraint ck_retention_action_hashes check ((before_hash is null or before_hash ~ '^[a-f0-9]{64}$') and (after_hash is null or after_hash ~ '^[a-f0-9]{64}$'))
);

-- -----------------------------------------------------------------------------
-- Security operations and production-readiness registry
-- -----------------------------------------------------------------------------

create table governance.security_incidents (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  incident_type text not null,
  severity text not null,
  status text not null default 'detected',
  detected_at timestamptz not null,
  occurred_from timestamptz,
  occurred_until timestamptz,
  contained_at timestamptz,
  eradicated_at timestamptz,
  recovered_at timestamptz,
  closed_at timestamptz,
  personal_data_involved boolean not null default false,
  sensitive_personal_data_involved boolean not null default false,
  affected_subjects_estimate bigint,
  affected_records_estimate bigint,
  impact_summary text,
  containment_summary text,
  root_cause_summary text,
  notification_assessment_status text not null default 'pending',
  notification_assessment_reference text,
  regulator_notified_at timestamptz,
  data_subjects_notified_at timestamptz,
  owner_role text not null,
  created_by uuid references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_security_incident_code check (code ~ '^[A-Z0-9][A-Z0-9_-]{3,80}$'),
  constraint ck_security_incident_type check (incident_type in ('confidentiality','integrity','availability','credential_compromise','malware','ransomware','unauthorized_access','data_exfiltration','misconfiguration','vendor_incident','fraud','other')),
  constraint ck_security_incident_severity check (severity in ('low','medium','high','critical')),
  constraint ck_security_incident_status check (status in ('detected','triage','investigating','contained','eradicated','recovering','monitoring','closed','false_positive')),
  constraint ck_security_incident_notification check (notification_assessment_status in ('pending','not_required','required','notified','overdue')),
  constraint ck_security_incident_estimates check ((affected_subjects_estimate is null or affected_subjects_estimate>=0) and (affected_records_estimate is null or affected_records_estimate>=0)),
  constraint ck_security_incident_dates check ((occurred_until is null or occurred_from is null or occurred_until>=occurred_from) and (closed_at is null or closed_at>=detected_at))
);

create table governance.security_incident_events (
  id uuid primary key default gen_random_uuid(),
  security_incident_id uuid not null references governance.security_incidents(id) on delete cascade,
  event_type text not null,
  actor_user_account_id uuid references iam.user_accounts(id),
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  evidence_reference text,
  created_at timestamptz not null default now(),
  constraint ck_security_incident_event_type check (event_type in ('detected','classified','assigned','triage_updated','evidence_collected','contained','eradicated','recovery_started','recovered','notification_assessed','regulator_notified','data_subjects_notified','postmortem_completed','closed','reopened','note'))
);

create table governance.secret_inventory (
  id uuid primary key default gen_random_uuid(),
  secret_code text not null unique,
  environment text not null,
  provider text not null,
  storage_reference text not null,
  purpose text not null,
  owner_role text not null,
  rotation_policy text not null,
  maximum_age_days integer,
  last_rotated_at timestamptz,
  next_rotation_due_at timestamptz,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_secret_inventory_code check (secret_code ~ '^[A-Z][A-Z0-9_]{2,100}$'),
  constraint ck_secret_inventory_environment check (environment in ('local','test','staging','production','shared')),
  constraint ck_secret_inventory_provider check (provider in ('supabase_vault','aws_secrets_manager','github_actions','local_environment','other')),
  constraint ck_secret_inventory_rotation check (rotation_policy in ('automatic','scheduled_manual','on_demand','immutable_public','not_applicable')),
  constraint ck_secret_inventory_age check (maximum_age_days is null or maximum_age_days between 1 and 3650),
  constraint ck_secret_inventory_status check (status in ('active','rotation_due','compromised','revoked','retired')),
  constraint ck_secret_inventory_no_value check (storage_reference !~* '(secret|token|password|key)=[^[:space:]]+')
);

create table governance.access_reviews (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  review_scope text not null,
  status text not null default 'planned',
  period_start date not null,
  period_end date not null,
  reviewer_role text not null,
  started_at timestamptz,
  completed_at timestamptz,
  reviewed_identities integer not null default 0,
  access_removed_count integer not null default 0,
  exceptions_count integer not null default 0,
  evidence_reference text,
  findings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ck_access_review_environment check (environment in ('test','staging','production','all')),
  constraint ck_access_review_scope check (review_scope in ('database_roles','application_roles','cloud_iam','third_party_access','service_accounts','all')),
  constraint ck_access_review_status check (status in ('planned','running','completed','completed_with_exceptions','cancelled')),
  constraint ck_access_review_period check (period_end>=period_start),
  constraint ck_access_review_counts check (reviewed_identities>=0 and access_removed_count>=0 and exceptions_count>=0)
);

create table governance.backup_restore_tests (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  backup_type text not null,
  scope text not null,
  status text not null default 'planned',
  backup_reference text,
  restore_target_reference text,
  point_in_time timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  rpo_seconds integer,
  rto_seconds integer,
  integrity_verified boolean,
  application_smoke_verified boolean,
  storage_objects_verified boolean,
  evidence_reference text,
  findings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ck_backup_test_environment check (environment in ('test','staging','production')),
  constraint ck_backup_test_type check (backup_type in ('logical_dump','snapshot','point_in_time_recovery','cross_region_copy','storage_object_restore','full_disaster_recovery')),
  constraint ck_backup_test_scope check (scope in ('database','storage','database_and_storage','full_platform')),
  constraint ck_backup_test_status check (status in ('planned','running','succeeded','partially_succeeded','failed','cancelled')),
  constraint ck_backup_test_objectives check ((rpo_seconds is null or rpo_seconds>=0) and (rto_seconds is null or rto_seconds>=0)),
  constraint ck_backup_test_dates check (completed_at is null or started_at is not null and completed_at>=started_at)
);

create table governance.production_readiness_controls (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  control_code text not null,
  control_domain text not null,
  title text not null,
  description text not null,
  blocking boolean not null default true,
  status text not null default 'pending',
  evidence_reference text,
  owner_role text not null,
  due_at timestamptz,
  verified_by uuid references iam.user_accounts(id),
  verified_at timestamptz,
  exception_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_production_readiness_controls unique(environment,control_code),
  constraint ck_readiness_environment check (environment in ('test','staging','production')),
  constraint ck_readiness_code check (control_code ~ '^[A-Z][A-Z0-9_]{2,100}$'),
  constraint ck_readiness_domain check (control_domain in ('privacy','legal','security','identity','data','operations','resilience','observability','vendor','application','cloud','credit_governance')),
  constraint ck_readiness_status check (status in ('pending','in_progress','passed','failed','blocked','not_applicable','accepted_risk')),
  constraint ck_readiness_verification check ((status='passed')=(verified_at is not null))
);

-- -----------------------------------------------------------------------------
-- Redaction, audit and workflow guards
-- -----------------------------------------------------------------------------

create or replace function governance.redact_jsonb(p_value jsonb)
returns jsonb
language plpgsql
immutable
set search_path=pg_catalog
as $$
declare
  v_type text;
  v_result jsonb;
  v_key text;
  v_item jsonb;
begin
  if p_value is null then return null; end if;
  v_type:=jsonb_typeof(p_value);
  if v_type='object' then
    v_result:='{}'::jsonb;
    for v_key,v_item in select key,value from jsonb_each(p_value) loop
      if lower(v_key) ~ '(password|passwd|secret|client_secret|api_?key|access_?token|refresh_?token|authorization|cookie|set-cookie|signed_?url|upload_?url|download_?url|private_?key|credential|session_?token|dispatch_?token)' then
        v_result:=v_result||jsonb_build_object(v_key,'[REDACTED]');
      else
        v_result:=v_result||jsonb_build_object(v_key,governance.redact_jsonb(v_item));
      end if;
    end loop;
    return v_result;
  elsif v_type='array' then
    select coalesce(jsonb_agg(governance.redact_jsonb(value)),'[]'::jsonb)
      into v_result from jsonb_array_elements(p_value);
    return v_result;
  end if;
  return p_value;
end;
$$;

create or replace function governance.redact_jsonb_column()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
declare
  v_column text:=tg_argv[0];
  v_row jsonb;
begin
  v_row:=to_jsonb(new);
  if v_row ? v_column then
    new:=jsonb_populate_record(new,jsonb_build_object(v_column,governance.redact_jsonb(v_row->v_column)));
  end if;
  return new;
end;
$$;

create or replace function governance.redact_payload_and_hash()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
begin
  new.payload:=governance.redact_jsonb(coalesce(new.payload,'{}'::jsonb));
  new.payload_hash:=encode(extensions.digest(convert_to(new.payload::text,'UTF8'),'sha256'),'hex');
  return new;
end;
$$;

create or replace function governance.has_active_legal_hold(p_target_type text,p_target_reference text)
returns boolean
language sql
stable
security definer
set search_path=pg_catalog
as $$
  select exists(
    select 1
    from governance.legal_holds h
    join governance.legal_hold_targets t on t.legal_hold_id=h.id
    where h.status='active'
      and h.effective_from<=now()
      and (h.effective_until is null or h.effective_until>=now())
      and t.target_type=p_target_type
      and t.target_reference=p_target_reference
  );
$$;

create or replace function governance.enforce_retention_legal_hold()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
declare v_hold_id uuid;
begin
  if new.status in ('approved','executing') or new.proposed_action in ('delete','anonymize','aggregate') then
    select h.id into v_hold_id
    from governance.legal_holds h
    join governance.legal_hold_targets t on t.legal_hold_id=h.id
    where h.status='active' and h.effective_from<=now()
      and (h.effective_until is null or h.effective_until>=now())
      and t.target_type=new.target_type and t.target_reference=new.target_reference
    order by h.effective_from desc limit 1;
    if v_hold_id is not null then
      new.status:='blocked_legal_hold';
      new.legal_hold_id:=v_hold_id;
      new.reason_code:='active_legal_hold';
    end if;
  end if;
  return new;
end;
$$;

create or replace function governance.guard_processing_activity_activation()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
declare
  v_purpose_status text;
  v_retention_status text;
  v_ripd_status text;
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

create or replace function governance.write_audit_entry(
  p_action text,p_resource_type text,p_resource_id uuid,p_details jsonb default '{}'::jsonb,
  p_privacy_class text default 'internal',p_organization_id uuid default null,p_actor_user_account_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare v_id uuid;
begin
  insert into governance.audit_log(
    occurred_at,actor_user_account_id,organization_id,action,resource_type,resource_id,
    request_id,details,privacy_class
  ) values (
    now(),coalesce(p_actor_user_account_id,app_private.current_user_account_id()),
    coalesce(p_organization_id,app_private.current_organization_id()),p_action,p_resource_type,p_resource_id,
    nullif(app_private.current_request_id(),'')::uuid,
    governance.redact_jsonb(coalesce(p_details,'{}'::jsonb)),p_privacy_class
  ) returning id into v_id;
  return v_id;
exception when invalid_text_representation then
  insert into governance.audit_log(
    occurred_at,actor_user_account_id,organization_id,action,resource_type,resource_id,
    request_id,details,privacy_class
  ) values (
    now(),coalesce(p_actor_user_account_id,app_private.current_user_account_id()),
    coalesce(p_organization_id,app_private.current_organization_id()),p_action,p_resource_type,p_resource_id,
    null,governance.redact_jsonb(coalesce(p_details,'{}'::jsonb)),p_privacy_class
  ) returning id into v_id;
  return v_id;
end;
$$;

-- Rebuild payload hash from the redacted payload before persistence.
create or replace function eventing.enqueue_job(
  p_queue_code text,p_job_type text,p_job_version integer,p_deduplication_key text,
  p_source_event_id uuid,p_organization_id uuid,p_subject_type text,p_subject_id uuid,
  p_payload jsonb,p_delay_seconds integer default 0
) returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_job_id uuid;
  v_message_id bigint;
  v_payload_hash text;
  v_payload jsonb;
  v_existing_status text;
begin
  if p_job_version<1 then raise exception 'invalid_job_version' using errcode='22023'; end if;
  if p_delay_seconds<0 or p_delay_seconds>900 then raise exception 'invalid_job_delay' using errcode='22023'; end if;
  if p_job_type is null or p_job_type !~ '^[a-z][a-z0-9_.-]{2,119}$' then raise exception 'invalid_job_type' using errcode='22023'; end if;
  if p_deduplication_key is null or length(p_deduplication_key) not between 1 and 240 then raise exception 'invalid_deduplication_key' using errcode='22023'; end if;

  select * into v_definition from eventing.queue_definitions where code=p_queue_code and status='active' for share;
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;
  v_payload:=governance.redact_jsonb(coalesce(p_payload,'{}'::jsonb));
  v_payload_hash:=encode(extensions.digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex');

  insert into eventing.queue_jobs(
    queue_code,job_type,job_version,deduplication_key,source_event_id,organization_id,
    subject_type,subject_id,payload,payload_hash,status,provider,provider_queue_name,available_at,max_attempts
  ) values (
    v_definition.code,p_job_type,p_job_version,p_deduplication_key,p_source_event_id,p_organization_id,
    p_subject_type,p_subject_id,v_payload,v_payload_hash,'created',v_definition.provider,
    v_definition.provider_queue_name,now()+make_interval(secs=>p_delay_seconds),v_definition.max_receive_count
  ) on conflict(queue_code,deduplication_key) do nothing returning id into v_job_id;

  if v_job_id is null then
    select id,status into v_job_id,v_existing_status from eventing.queue_jobs
    where queue_code=p_queue_code and deduplication_key=p_deduplication_key;
    if v_existing_status='cancelled' then raise exception 'deduplicated_job_cancelled' using errcode='55000'; end if;
    return v_job_id;
  end if;

  if v_definition.provider<>'pgmq' then raise exception 'queue_provider_not_available_in_test_environment' using errcode='0A000'; end if;
  select send into v_message_id
  from pgmq.send(
    v_definition.provider_queue_name,eventing.queue_job_envelope(v_job_id),
    jsonb_build_object('job_id',v_job_id,'job_type',p_job_type,'deduplication_key',p_deduplication_key,'payload_hash',v_payload_hash),
    p_delay_seconds
  ) limit 1;
  if v_message_id is null then raise exception 'queue_publish_failed' using errcode='58000'; end if;
  update eventing.queue_jobs
  set status='queued',provider_message_id=v_message_id::text,enqueued_at=now(),available_at=now()+make_interval(secs=>p_delay_seconds)
  where id=v_job_id;
  return v_job_id;
end;
$$;

create or replace function eventing.append_event(
  p_event_id uuid,p_event_name text,p_event_version integer,p_occurred_at timestamptz,p_producer text,
  p_subject_type text,p_subject_id uuid,p_actor_type text,p_actor_id uuid,p_organization_id uuid,
  p_journey_instance_id uuid,p_aggregate_type text,p_aggregate_id uuid,p_aggregate_version bigint,
  p_partition_key text,p_correlation_id uuid,p_causation_id uuid,p_traceparent text,
  p_evidence_nature text,p_privacy_class text,p_payload jsonb,p_schema_id uuid,p_route_keys text[]
) returns uuid
language plpgsql
set search_path=pg_catalog
as $$
declare
  v_route text;
  v_payload_hash text;
  v_payload jsonb;
begin
  if p_event_id is null or p_correlation_id is null or p_schema_id is null then raise exception 'event_identity_fields_required' using errcode='22023'; end if;
  if p_event_version<1 or p_aggregate_version<0 then raise exception 'invalid_event_version' using errcode='22023'; end if;
  if p_route_keys is null or cardinality(p_route_keys)=0 then raise exception 'event_route_required' using errcode='22023'; end if;
  v_payload:=governance.redact_jsonb(coalesce(p_payload,'{}'::jsonb));
  v_payload_hash:=encode(extensions.digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex');

  insert into eventing.events(
    event_id,event_name,event_version,occurred_at,producer,subject_type,subject_id,actor_type,actor_id,
    organization_id,journey_instance_id,aggregate_type,aggregate_id,aggregate_version,partition_key,
    correlation_id,causation_id,traceparent,evidence_nature,privacy_class,payload,payload_hash,schema_id
  ) values (
    p_event_id,p_event_name,p_event_version,p_occurred_at,p_producer,p_subject_type,p_subject_id,p_actor_type,p_actor_id,
    p_organization_id,p_journey_instance_id,p_aggregate_type,p_aggregate_id,p_aggregate_version,p_partition_key,
    p_correlation_id,p_causation_id,p_traceparent,p_evidence_nature,p_privacy_class,v_payload,v_payload_hash,p_schema_id
  );
  foreach v_route in array p_route_keys loop
    if v_route is null or length(trim(v_route))=0 then raise exception 'invalid_route_key' using errcode='22023'; end if;
    insert into eventing.outbox(event_id,route_key,status,available_at)
    values(p_event_id,trim(v_route),'pending',now()) on conflict(event_id,route_key) do nothing;
  end loop;
  return p_event_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Backend-only privacy, consent, incident and readiness RPCs
-- -----------------------------------------------------------------------------

create or replace function public.privacy_submit_request(
  p_entrepreneur_id uuid,
  p_request_type text,
  p_request_reference text,
  p_intake_channel text,
  p_scope jsonb default '{}'::jsonb,
  p_due_at timestamptz default null,
  p_requester_type text default 'data_subject'
) returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare v_id uuid;
begin
  if p_request_reference is null or length(trim(p_request_reference))<3 then
    raise exception 'request_reference_required' using errcode='22023';
  end if;
  if p_entrepreneur_id is not null and not exists(select 1 from core.entrepreneurs where id=p_entrepreneur_id) then
    raise exception 'entrepreneur_not_found' using errcode='P0002';
  end if;
  insert into governance.privacy_requests(
    entrepreneur_id,request_type,status,requested_at,due_at,request_reference,
    requester_type,identity_verification_status,intake_channel,scope
  ) values (
    p_entrepreneur_id,p_request_type,'received',now(),p_due_at,trim(p_request_reference),
    p_requester_type,'pending',p_intake_channel,governance.redact_jsonb(coalesce(p_scope,'{}'::jsonb))
  ) returning id into v_id;
  insert into governance.privacy_request_events(privacy_request_id,event_type,to_status,details)
  values(v_id,'received','received',jsonb_build_object('channel',p_intake_channel));
  perform governance.write_audit_entry(
    'privacy_request.created','privacy_request',v_id,
    jsonb_build_object('requestType',p_request_type),'personal'
  );
  return v_id;
end;
$$;

create or replace function public.privacy_record_event(
  p_privacy_request_id uuid,
  p_event_type text,
  p_to_status text,
  p_details jsonb default '{}'::jsonb,
  p_evidence_reference text default null,
  p_resolution_summary text default null
) returns boolean
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare v_old_status text;
begin
  select status into v_old_status from governance.privacy_requests
  where id=p_privacy_request_id for update;
  if not found then raise exception 'privacy_request_not_found' using errcode='P0002'; end if;
  update governance.privacy_requests
  set status=p_to_status,
      completed_at=case when p_to_status in ('fulfilled','partially_fulfilled','rejected','cancelled') then now() else completed_at end,
      resolution_summary=coalesce(p_resolution_summary,resolution_summary),
      identity_verification_status=case when p_event_type='identity_verified' then 'verified' when p_event_type='identity_failed' then 'failed' else identity_verification_status end,
      identity_verified_at=case when p_event_type='identity_verified' then now() else identity_verified_at end
  where id=p_privacy_request_id;
  insert into governance.privacy_request_events(
    privacy_request_id,event_type,from_status,to_status,actor_user_account_id,details,evidence_reference
  ) values (
    p_privacy_request_id,p_event_type,v_old_status,p_to_status,app_private.current_user_account_id(),
    governance.redact_jsonb(coalesce(p_details,'{}'::jsonb)),p_evidence_reference
  );
  perform governance.write_audit_entry(
    'privacy_request.status_changed','privacy_request',p_privacy_request_id,
    jsonb_build_object('from',v_old_status,'to',p_to_status,'eventType',p_event_type),'personal'
  );
  return true;
end;
$$;

create or replace function public.consent_record_decision(
  p_entrepreneur_id uuid,
  p_purpose_code text,
  p_status text,
  p_policy_version text,
  p_channel text,
  p_evidence_reference text,
  p_consent_text_hash text,
  p_presented_data_categories text[] default '{}'::text[],
  p_collection_context jsonb default '{}'::jsonb,
  p_expires_at timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_purpose governance.purposes%rowtype;
  v_previous uuid;
  v_id uuid;
begin
  select * into v_purpose from governance.purposes
  where code=p_purpose_code and status in ('approved','active');
  if not found then raise exception 'purpose_not_approved' using errcode='55000'; end if;
  if not v_purpose.requires_consent then raise exception 'purpose_does_not_use_consent' using errcode='22023'; end if;
  select id into v_previous from governance.consent_records
  where entrepreneur_id=p_entrepreneur_id and purpose_id=v_purpose.id
  order by captured_at desc limit 1;
  insert into governance.consent_records(
    entrepreneur_id,purpose_id,policy_version,status,captured_at,channel,evidence_reference,
    supersedes_consent_id,policy_document_id,consent_text_hash,presented_data_categories,
    collection_context,expires_at
  ) values (
    p_entrepreneur_id,v_purpose.id,p_policy_version,p_status,now(),p_channel,p_evidence_reference,
    v_previous,v_purpose.policy_document_id,p_consent_text_hash,
    coalesce(p_presented_data_categories,'{}'::text[]),
    governance.redact_jsonb(coalesce(p_collection_context,'{}'::jsonb)),p_expires_at
  ) returning id into v_id;
  perform governance.write_audit_entry(
    'consent.decision_recorded','consent_record',v_id,
    jsonb_build_object('purposeCode',p_purpose_code,'status',p_status),'personal'
  );
  return v_id;
end;
$$;

create or replace function public.security_open_incident(
  p_code text,p_title text,p_incident_type text,p_severity text,p_detected_at timestamptz,
  p_owner_role text,p_personal_data_involved boolean default false,
  p_sensitive_personal_data_involved boolean default false,p_impact_summary text default null
) returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare v_id uuid;
begin
  insert into governance.security_incidents(
    code,title,incident_type,severity,status,detected_at,personal_data_involved,
    sensitive_personal_data_involved,impact_summary,owner_role,created_by
  ) values (
    upper(trim(p_code)),p_title,p_incident_type,p_severity,'detected',p_detected_at,
    p_personal_data_involved,p_sensitive_personal_data_involved,p_impact_summary,p_owner_role,
    app_private.current_user_account_id()
  ) returning id into v_id;
  insert into governance.security_incident_events(
    security_incident_id,event_type,actor_user_account_id,details
  ) values (
    v_id,'detected',app_private.current_user_account_id(),jsonb_build_object('severity',p_severity)
  );
  perform governance.write_audit_entry(
    'security_incident.opened','security_incident',v_id,
    jsonb_build_object('severity',p_severity),'confidential'
  );
  return v_id;
end;
$$;

create or replace function public.security_record_incident_event(
  p_security_incident_id uuid,p_event_type text,p_to_status text,
  p_details jsonb default '{}'::jsonb,p_evidence_reference text default null
) returns boolean
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  update governance.security_incidents
  set status=p_to_status,
      contained_at=case when p_event_type='contained' then now() else contained_at end,
      eradicated_at=case when p_event_type='eradicated' then now() else eradicated_at end,
      recovered_at=case when p_event_type='recovered' then now() else recovered_at end,
      closed_at=case when p_event_type='closed' then now() else closed_at end
  where id=p_security_incident_id;
  if not found then raise exception 'security_incident_not_found' using errcode='P0002'; end if;
  insert into governance.security_incident_events(
    security_incident_id,event_type,actor_user_account_id,details,evidence_reference
  ) values (
    p_security_incident_id,p_event_type,app_private.current_user_account_id(),
    governance.redact_jsonb(coalesce(p_details,'{}'::jsonb)),p_evidence_reference
  );
  perform governance.write_audit_entry(
    'security_incident.status_changed','security_incident',p_security_incident_id,
    jsonb_build_object('to',p_to_status,'eventType',p_event_type),'confidential'
  );
  return true;
end;
$$;

create or replace function public.production_readiness_status(p_environment text default 'production')
returns jsonb
language sql
security definer
set search_path=pg_catalog
as $$
  select jsonb_build_object(
    'environment',p_environment,
    'ready',count(*) filter(where blocking and status not in ('passed','not_applicable','accepted_risk'))=0,
    'blockingOpen',count(*) filter(where blocking and status not in ('passed','not_applicable','accepted_risk')),
    'passed',count(*) filter(where status='passed'),
    'acceptedRisk',count(*) filter(where status='accepted_risk'),
    'controls',coalesce(jsonb_agg(to_jsonb(c) order by blocking desc,control_domain,control_code),'[]'::jsonb)
  )
  from governance.production_readiness_controls c
  where c.environment=p_environment;
$$;

revoke all on function public.privacy_submit_request(uuid,text,text,text,jsonb,timestamptz,text) from public,anon,authenticated;
revoke all on function public.privacy_record_event(uuid,text,text,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.consent_record_decision(uuid,text,text,text,text,text,text,text[],jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.security_open_incident(text,text,text,text,timestamptz,text,boolean,boolean,text) from public,anon,authenticated;
revoke all on function public.security_record_incident_event(uuid,text,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.production_readiness_status(text) from public,anon,authenticated;

grant execute on function public.privacy_submit_request(uuid,text,text,text,jsonb,timestamptz,text) to service_role;
grant execute on function public.privacy_record_event(uuid,text,text,jsonb,text,text) to service_role;
grant execute on function public.consent_record_decision(uuid,text,text,text,text,text,text,text[],jsonb,timestamptz) to service_role;
grant execute on function public.security_open_incident(text,text,text,text,timestamptz,text,boolean,boolean,text) to service_role;
grant execute on function public.security_record_incident_event(uuid,text,text,jsonb,text) to service_role;
grant execute on function public.production_readiness_status(text) to service_role;

-- -----------------------------------------------------------------------------
-- Indexes and triggers
-- -----------------------------------------------------------------------------

create index ix_processing_activities_purpose_status on governance.processing_activities(purpose_id,status);
create index ix_processing_activities_legal_basis on governance.processing_activities(legal_basis_code,status);
create index ix_processing_activities_controller on governance.processing_activities(controller_organization_id,status);
create index ix_data_assets_classification on governance.data_assets(classification_code,status);
create index ix_processing_parties_status on governance.processing_parties(status,party_role);
create index ix_privacy_requests_status_due on governance.privacy_requests(status,due_at);
create index ix_privacy_request_events_request on governance.privacy_request_events(privacy_request_id,occurred_at);
create index ix_legal_holds_status_period on governance.legal_holds(status,effective_from,effective_until);
create index ix_legal_hold_targets_reference on governance.legal_hold_targets(target_type,target_reference);
create index ix_retention_runs_policy_status on governance.retention_runs(retention_policy_id,status,created_at desc);
create index ix_retention_actions_status on governance.retention_actions(status,created_at);
create index ix_security_incidents_status_severity on governance.security_incidents(status,severity,detected_at desc);
create index ix_security_incident_events_incident on governance.security_incident_events(security_incident_id,occurred_at);
create index ix_secret_inventory_due on governance.secret_inventory(status,next_rotation_due_at);
create index ix_access_reviews_environment_status on governance.access_reviews(environment,status,period_end desc);
create index ix_backup_restore_tests_environment_status on governance.backup_restore_tests(environment,status,created_at desc);
create index ix_readiness_environment_status on governance.production_readiness_controls(environment,status,blocking);

create trigger trg_legal_basis_updated_at before update on governance.legal_basis_definitions for each row execute function governance.set_updated_at();
create trigger trg_data_classifications_updated_at before update on governance.data_classifications for each row execute function governance.set_updated_at();
create trigger trg_policy_documents_updated_at before update on governance.policy_documents for each row execute function governance.set_updated_at();
create trigger trg_purposes_updated_at before update on governance.purposes for each row execute function governance.set_updated_at();
create trigger trg_retention_policies_updated_at before update on governance.retention_policies for each row execute function governance.set_updated_at();
create trigger trg_data_assets_updated_at before update on governance.data_assets for each row execute function governance.set_updated_at();
create trigger trg_processing_activities_updated_at before update on governance.processing_activities for each row execute function governance.set_updated_at();
create trigger trg_processing_parties_updated_at before update on governance.processing_parties for each row execute function governance.set_updated_at();
create trigger trg_dpo_designations_updated_at before update on governance.dpo_designations for each row execute function governance.set_updated_at();
create trigger trg_privacy_requests_updated_at before update on governance.privacy_requests for each row execute function governance.set_updated_at();
create trigger trg_legal_holds_updated_at before update on governance.legal_holds for each row execute function governance.set_updated_at();
create trigger trg_security_incidents_updated_at before update on governance.security_incidents for each row execute function governance.set_updated_at();
create trigger trg_secret_inventory_updated_at before update on governance.secret_inventory for each row execute function governance.set_updated_at();
create trigger trg_readiness_controls_updated_at before update on governance.production_readiness_controls for each row execute function governance.set_updated_at();

create trigger trg_privacy_request_events_append_only before update or delete on governance.privacy_request_events for each row execute function governance.reject_mutation();
create trigger trg_security_incident_events_append_only before update or delete on governance.security_incident_events for each row execute function governance.reject_mutation();
create trigger trg_retention_actions_legal_hold before insert or update on governance.retention_actions for each row execute function governance.enforce_retention_legal_hold();
create trigger trg_processing_activity_activation before insert or update on governance.processing_activities for each row execute function governance.guard_processing_activity_activation();

create trigger trg_audit_log_redact before insert on governance.audit_log for each row execute function governance.redact_jsonb_column('details');
create trigger trg_privacy_request_events_redact before insert on governance.privacy_request_events for each row execute function governance.redact_jsonb_column('details');
create trigger trg_retention_actions_redact before insert or update on governance.retention_actions for each row execute function governance.redact_jsonb_column('details');
create trigger trg_security_incident_events_redact before insert on governance.security_incident_events for each row execute function governance.redact_jsonb_column('details');
create trigger trg_processing_activities_redact before insert or update on governance.processing_activities for each row execute function governance.redact_jsonb_column('limitations');
create trigger trg_eventing_events_redact_hash before insert or update of payload on eventing.events for each row execute function governance.redact_payload_and_hash();
create trigger trg_eventing_queue_jobs_redact_hash before insert or update of payload on eventing.queue_jobs for each row execute function governance.redact_payload_and_hash();
create trigger trg_eventing_queue_jobs_error_redact before insert or update on eventing.queue_jobs for each row execute function governance.redact_jsonb_column('last_error_details');
create trigger trg_eventing_queue_attempts_redact before insert or update on eventing.queue_attempts for each row execute function governance.redact_jsonb_column('details');
create trigger trg_eventing_queue_dead_letters_reason_redact before insert or update on eventing.queue_dead_letters for each row execute function governance.redact_jsonb_column('reason_details');
create trigger trg_eventing_queue_dead_letters_message_redact before insert or update on eventing.queue_dead_letters for each row execute function governance.redact_jsonb_column('message_snapshot');
create trigger trg_eventing_scheduler_runs_redact before insert or update on eventing.scheduler_runs for each row execute function governance.redact_jsonb_column('details');
create trigger trg_eventing_operational_alerts_redact before insert or update on eventing.operational_alerts for each row execute function governance.redact_jsonb_column('details');

-- -----------------------------------------------------------------------------
-- Defense-in-depth RLS and default privileges
-- -----------------------------------------------------------------------------

-- New governance tables are worker-managed and backend-facing through SECURITY DEFINER RPCs.
grant select,insert,update,delete on
  governance.legal_basis_definitions,governance.data_classifications,governance.policy_documents,
  governance.data_assets,governance.processing_activities,governance.processing_activity_assets,
  governance.processing_parties,governance.processing_activity_parties,governance.dpo_designations,
  governance.privacy_request_events,governance.legal_holds,governance.legal_hold_targets,
  governance.retention_runs,governance.retention_actions,governance.security_incidents,
  governance.security_incident_events,governance.secret_inventory,governance.access_reviews,
  governance.backup_restore_tests,governance.production_readiness_controls
  to app_worker;

-- Enable RLS on every application table that did not already have it. Preserve the
-- existing app_runtime SELECT contract only where that role already had SELECT.
do $$
declare
  r record;
  v_runtime_select boolean;
begin
  for r in
    select c.oid,n.nspname,c.relname
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where c.relkind='r'
      and n.nspname in (
        'iam','core','catalog','orchestration','diagnostics','assessment','engagement',
        'intervention','eventing','integration','intelligence','governance','reporting'
      )
      and not c.relrowsecurity
    order by n.nspname,c.relname
  loop
    v_runtime_select:=has_table_privilege('app_runtime',r.oid,'SELECT');
    execute format('alter table %I.%I enable row level security',r.nspname,r.relname);

    if has_table_privilege('app_worker',r.oid,'SELECT') then
      execute format('create policy m12_worker_select on %I.%I for select to app_worker using (app_private.is_trusted_worker())',r.nspname,r.relname);
    end if;
    if has_table_privilege('app_worker',r.oid,'INSERT') then
      execute format('create policy m12_worker_insert on %I.%I for insert to app_worker with check (app_private.is_trusted_worker())',r.nspname,r.relname);
    end if;
    if has_table_privilege('app_worker',r.oid,'UPDATE') then
      execute format('create policy m12_worker_update on %I.%I for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker())',r.nspname,r.relname);
    end if;
    if has_table_privilege('app_worker',r.oid,'DELETE') then
      execute format('create policy m12_worker_delete on %I.%I for delete to app_worker using (app_private.is_trusted_worker())',r.nspname,r.relname);
    end if;
    if v_runtime_select then
      execute format('create policy m12_runtime_select on %I.%I for select to app_runtime using (true)',r.nspname,r.relname);
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

-- Create covering indexes for every FK still lacking a left-prefix index.
do $$
declare
  r record;
  v_columns text;
  v_index_name text;
begin
  for r in
    select c.conname,c.conrelid,n.nspname,cl.relname,c.conkey
    from pg_constraint c
    join pg_class cl on cl.oid=c.conrelid
    join pg_namespace n on n.oid=cl.relnamespace
    where c.contype='f'
      and n.nspname in (
        'iam','core','catalog','orchestration','diagnostics','assessment','engagement',
        'intervention','eventing','integration','intelligence','governance','reporting'
      )
      and not exists(
        select 1 from pg_index i
        where i.indrelid=c.conrelid and i.indisvalid and i.indisready
          and (select array_agg(k.attnum::smallint order by k.ord)
               from unnest(i.indkey) with ordinality k(attnum,ord)
               where k.ord<=cardinality(c.conkey))=c.conkey
      )
  loop
    select string_agg(format('%I',a.attname),',' order by x.ord)
      into v_columns
    from unnest(r.conkey) with ordinality x(attnum,ord)
    join pg_attribute a on a.attrelid=r.conrelid and a.attnum=x.attnum;
    v_index_name:=left('ix_m12_fk_'||r.relname||'_'||substr(md5(r.conname),1,10),63);
    execute format('create index if not exists %I on %I.%I (%s)',v_index_name,r.nspname,r.relname,v_columns);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Non-sensitive governance catalog and explicit blocked production state
-- -----------------------------------------------------------------------------

insert into governance.legal_basis_definitions(code,name,law_reference,data_scope,requires_consent,description,status)
values
 ('consent','Consentimento','LGPD art. 7 I e art. 11 I','both',true,'Manifestação livre, informada e inequívoca, documentada e revogável.','active'),
 ('legal_regulatory_obligation','Cumprimento de obrigação legal ou regulatória','LGPD art. 7 II e art. 11 II a','both',false,'Tratamento necessário para obrigação legal ou regulatória aplicável ao controlador.','active'),
 ('public_policy','Execução de políticas públicas','LGPD art. 7 III e art. 11 II b','both',false,'Aplicável somente quando os requisitos legais e institucionais da política pública estiverem demonstrados.','active'),
 ('research_body','Estudos por órgão de pesquisa','LGPD art. 7 IV e art. 11 II c','both',false,'Requer enquadramento institucional e anonimização sempre que possível.','active'),
 ('contract','Execução de contrato ou procedimentos preliminares','LGPD art. 7 V','personal',false,'Tratamento necessário para contrato do qual o titular seja parte ou a seu pedido.','active'),
 ('exercise_of_rights','Exercício regular de direitos','LGPD art. 7 VI e art. 11 II d','both',false,'Defesa e exercício de direitos em processos judiciais, administrativos ou arbitrais.','active'),
 ('life_protection','Proteção da vida ou incolumidade física','LGPD art. 7 VII e art. 11 II e','both',false,'Uso excepcional para proteção da vida ou segurança física.','active'),
 ('health_protection','Tutela da saúde','LGPD art. 7 VIII e art. 11 II f','both',false,'Restrita aos agentes e contextos legalmente autorizados.','active'),
 ('legitimate_interest','Legítimo interesse','LGPD art. 7 IX e arts. 10 e 37','personal',false,'Exige finalidade legítima, necessidade, balanceamento, transparência e avaliação documentada. Não se aplica isoladamente a dados sensíveis.','active'),
 ('credit_protection','Proteção do crédito','LGPD art. 7 X','personal',false,'Possível base para proteção do crédito, sujeita a finalidade, necessidade, transparência e governança de decisões.','active'),
 ('fraud_security_identification','Prevenção à fraude e segurança na identificação e autenticação','LGPD art. 11 II g','sensitive_personal',false,'Aplicável no estrito contexto de identificação e autenticação em sistemas eletrônicos.','active')
on conflict(code) do update set
 name=excluded.name,law_reference=excluded.law_reference,data_scope=excluded.data_scope,
 requires_consent=excluded.requires_consent,description=excluded.description,status=excluded.status;

insert into governance.data_classifications(code,rank,name,is_personal_data,is_sensitive_personal_data,description,handling_rules,status)
values
 ('public',0,'Público',false,false,'Informação aprovada para divulgação pública.','{"encryption":"standard","logging":"allowed"}'::jsonb,'active'),
 ('internal',10,'Interno',false,false,'Informação operacional não destinada ao público.','{"access":"workforce_need_to_know","logging":"allowed_minimized"}'::jsonb,'active'),
 ('confidential',20,'Confidencial',false,false,'Informação de negócio ou segurança com acesso restrito.','{"access":"explicit","encryption":"required","logging":"redacted"}'::jsonb,'active'),
 ('personal',30,'Dado pessoal',true,false,'Informação relacionada a pessoa natural identificada ou identificável.','{"minimize":true,"purpose_bound":true,"encryption":"required","logging":"redacted"}'::jsonb,'active'),
 ('behavioral_profile',40,'Perfil comportamental',true,false,'Inferências, padrões e atributos comportamentais ligados ao titular.','{"high_risk_review":true,"explainability":true,"credit_use":"blocked_until_approved"}'::jsonb,'active'),
 ('credit_related',45,'Contexto de crédito',true,false,'Informação usada ou potencialmente utilizável em análise, concessão, acompanhamento ou recuperação de crédito.','{"credit_governance":true,"access":"strict","audit":"required"}'::jsonb,'active'),
 ('sensitive_personal',50,'Dado pessoal sensível',true,true,'Categoria sensível nos termos da LGPD.','{"access":"strict","encryption":"required","logging":"prohibited_except_metadata","ripd":"required_if_high_risk"}'::jsonb,'active'),
 ('secret',100,'Segredo técnico',false,false,'Credenciais, tokens, chaves e materiais criptográficos.','{"persist_value":"prohibited_outside_secret_manager","logging":"prohibited","rotation":"required"}'::jsonb,'active')
on conflict(code) do update set
 rank=excluded.rank,name=excluded.name,is_personal_data=excluded.is_personal_data,
 is_sensitive_personal_data=excluded.is_sensitive_personal_data,description=excluded.description,
 handling_rules=excluded.handling_rules,status=excluded.status;

insert into governance.purposes(code,name,description,status,legal_basis_reference,requires_consent,owner_role)
values
 ('platform_service_delivery','Prestação da plataforma de capacitação','Operar autenticação, matrícula, progressão, avaliações, suporte e emissão de credenciais.','draft',null,false,'product_owner'),
 ('learning_personalization','Personalização da aprendizagem','Adaptar conteúdos, sequência e intervenções para melhorar a experiência e aplicação do aprendizado.','draft',null,false,'learning_product_owner'),
 ('security_fraud_prevention','Segurança e prevenção a fraude','Proteger contas, arquivos, infraestrutura e integridade da plataforma.','draft',null,false,'security_owner'),
 ('program_evaluation_research','Avaliação de programa e pesquisa','Medir efetividade, qualidade e impacto da capacitação com minimização e agregação.','draft',null,false,'research_owner'),
 ('crm_operational_sync','Sincronização operacional com CRM','Sincronizar apenas fatos aprovados necessários ao acompanhamento do programa.','draft',null,false,'crm_integration_owner'),
 ('behavioral_intelligence_experimental','Inteligência comportamental experimental','Investigar sinais comportamentais da jornada em ambiente controlado, sem efeito em decisão de crédito.','draft',null,false,'behavioral_intelligence_owner'),
 ('credit_decision_support_future','Apoio futuro a decisões de crédito','Uso futuro e condicionado de sinais validados para suporte a decisões de crédito, vedado até aprovação específica.','draft',null,false,'credit_governance_owner')
on conflict(code) do update set
 name=excluded.name,description=excluded.description,owner_role=excluded.owner_role;

insert into governance.retention_policies(
 code,data_class,store_reference,retention_interval,deletion_action,legal_hold_supported,
 status,effective_from,version,trigger_type,trigger_reference,anonymization_spec
)
values
 ('participant_identity_draft','personal','iam.user_accounts,core.entrepreneurs',null,'manual_review',true,'draft',current_date,1,'relationship_ended','Define after legal approval','{}'::jsonb),
 ('learning_events_draft','personal','eventing.events',null,'anonymize',true,'draft',current_date,1,'purpose_completed','Define after analytics and legal approval','{"preserve_aggregate":true}'::jsonb),
 ('behavioral_features_draft','behavioral_profile','intelligence.feature_values,intelligence.score_results',null,'delete',true,'draft',current_date,1,'purpose_completed','No production score retention until governance approval','{}'::jsonb),
 ('uploaded_evidence_draft','personal','core.file_objects,storage',null,'delete',true,'draft',current_date,1,'purpose_completed','Define by upload profile and legal need','{}'::jsonb),
 ('security_audit_draft','confidential','governance.audit_log,eventing operational logs',null,'archive_restricted',true,'draft',current_date,1,'legal_deadline','Define from security, audit and legal requirements','{}'::jsonb)
on conflict(code) do update set
 data_class=excluded.data_class,store_reference=excluded.store_reference,
 deletion_action=excluded.deletion_action,legal_hold_supported=excluded.legal_hold_supported,
 trigger_type=excluded.trigger_type,trigger_reference=excluded.trigger_reference,
 anonymization_spec=excluded.anonymization_spec;

insert into governance.processing_activities(
 code,name,description,purpose_id,legal_basis_code,status,data_subject_categories,
 processing_operations,recipient_categories,international_transfer,automated_decision,
 profiling,credit_decision_use,high_risk,ripd_required,owner_role,limitations
)
select x.code,x.name,x.description,p.id,null,'draft',x.subjects,x.operations,x.recipients,
 false,x.automated,x.profiling,x.credit_use,x.high_risk,x.ripd,x.owner_role,x.limitations
from (values
 ('platform_core','Operação central da plataforma','Conta, matrícula, progressão, avaliação, suporte e credenciais.','platform_service_delivery',array['entrepreneurs'],array['collect','store','use','retrieve'],array['internal_workforce'],false,false,false,false,false,'product_owner','{"activation_blocker":"legal basis and retention approval"}'::jsonb),
 ('learning_personalization','Personalização da aprendizagem','Diagnóstico, recomendações de percurso e intervenções educacionais.','learning_personalization',array['entrepreneurs'],array['collect','infer','recommend'],array['internal_learning_team'],true,true,false,true,true,'learning_product_owner','{"credit_use":false,"human_override":true}'::jsonb),
 ('security_operations','Operações de segurança','Autenticação, trilha de auditoria, detecção e resposta a incidentes.','security_fraud_prevention',array['users','entrepreneurs','operators'],array['collect','monitor','detect','retain'],array['security_team','infrastructure_providers'],false,false,false,true,false,'security_owner','{"payload_minimization":true}'::jsonb),
 ('program_evaluation','Avaliação de efetividade','Métricas agregadas para qualidade e impacto do programa.','program_evaluation_research',array['entrepreneurs'],array['aggregate','analyze','report'],array['internal_research_team'],false,true,false,true,true,'research_owner','{"prefer_anonymized":true,"no_individual_adverse_action":true}'::jsonb),
 ('crm_sync','Sincronização com CRM','Envio de fatos operacionais mínimos e aprovados ao CRM.','crm_operational_sync',array['entrepreneurs'],array['share','synchronize'],array['crm_provider','authorized_operations_team'],false,false,false,true,false,'crm_integration_owner','{"field_allowlist_required":true,"hubspot_inventory_pending":true}'::jsonb),
 ('behavioral_research','Pesquisa comportamental experimental','Cálculo experimental de atributos comportamentais sem uso em decisão de crédito.','behavioral_intelligence_experimental',array['entrepreneurs'],array['infer','validate','compare'],array['restricted_research_team'],true,true,false,true,true,'behavioral_intelligence_owner','{"production_use":false,"credit_use":false,"approval_required":true}'::jsonb),
 ('credit_decision_support','Apoio futuro a crédito','Tratamento ainda proibido para suporte a decisões de crédito até validação, RIPD e aprovação.','credit_decision_support_future',array['credit_applicants','borrowers'],array['infer','score','support_decision'],array['authorized_credit_team'],true,true,true,true,true,'credit_governance_owner','{"status":"prohibited_until_gate_passed","automatic_denial":false,"human_review_required":true}'::jsonb)
) as x(code,name,description,purpose_code,subjects,operations,recipients,automated,profiling,credit_use,high_risk,ripd,owner_role,limitations)
join governance.purposes p on p.code=x.purpose_code
on conflict(code) do update set
 name=excluded.name,description=excluded.description,limitations=excluded.limitations,owner_role=excluded.owner_role;

insert into governance.processing_parties(
 code,party_name,party_role,country_code,contract_status,security_review_status,status,notes
)
values
 ('estimulo_controller','Estímulo','controller','BR','pending','pending','draft','Formal controller identification and scope require institutional confirmation.'),
 ('supabase_test_provider','Supabase test environment provider','infrastructure_provider',null,'not_assessed','pending','draft','Test environment only; region, DPA and transfer assessment pending.'),
 ('aws_production_provider','AWS production environment provider','infrastructure_provider',null,'not_assessed','pending','draft','Production target; account, region, contracts and controls pending.'),
 ('hubspot_crm_provider','HubSpot CRM provider','operator',null,'not_assessed','not_assessed','draft','Actual connection, fields, region, contract and transfer assessment pending.')
on conflict(code) do update set
 party_name=excluded.party_name,party_role=excluded.party_role,notes=excluded.notes;

insert into governance.secret_inventory(
 secret_code,environment,provider,storage_reference,purpose,owner_role,rotation_policy,
 maximum_age_days,status,notes
)
values
 ('SUPABASE_SERVICE_ROLE_KEY','test','local_environment','Supabase Edge Function managed environment','Backend privileged access for test Edge Functions.','security_owner','on_demand',null,'active','Value is never stored in governance tables or repository.'),
 ('SCHEDULER_PROJECT_URL','test','supabase_vault','vault:estimulo_project_url','Scheduler target URL.','platform_owner','immutable_public',null,'active','Public configuration, inventoried for change control.'),
 ('SCHEDULER_PUBLISHABLE_KEY','test','supabase_vault','vault:estimulo_publishable_key','Gateway key for scheduled Edge Function invocation; dispatch authorization still requires one-time token.','platform_owner','on_demand',null,'active','Publishable key is not treated as sole authorization.')
on conflict(secret_code) do update set
 storage_reference=excluded.storage_reference,purpose=excluded.purpose,notes=excluded.notes;

insert into governance.production_readiness_controls(
 environment,control_code,control_domain,title,description,blocking,status,
 evidence_reference,owner_role,verified_at
)
values
 ('production','INTERNAL_RLS_COMPLETE','security','RLS interno completo','Todas as tabelas internas possuem RLS e não há privilégios diretos para anon/authenticated.',true,'passed','migration:m12_complete_internal_rls','database_security_owner',now()),
 ('production','LOG_REDACTION_ACTIVE','observability','Redaction de logs ativa','Campos com aparência de segredo são redigidos antes da persistência.',true,'passed','migration:m12_payload_redaction_hash_integrity','security_owner',now()),
 ('production','CONTROLLER_IDENTIFIED','legal','Controlador e escopo formalizados','Identificação jurídica do controlador e responsabilidades documentadas.',true,'blocked',null,'legal_owner',null),
 ('production','DPO_DESIGNATION','privacy','Encarregado ou dispensa documentada','Designação formal e canal público, ou justificativa válida de dispensa.',true,'blocked',null,'privacy_owner',null),
 ('production','PRIVACY_NOTICE_EFFECTIVE','privacy','Aviso de privacidade vigente','Aviso versionado, aprovado, acessível e consistente com os tratamentos.',true,'blocked',null,'privacy_owner',null),
 ('production','ROPA_APPROVED','privacy','Registro de operações aprovado','Atividades de tratamento, ativos, partes e finalidades aprovados.',true,'blocked',null,'privacy_owner',null),
 ('production','LEGAL_BASES_APPROVED','legal','Bases legais aprovadas','Cada tratamento ativo possui base legal específica e evidência de aprovação.',true,'blocked',null,'legal_owner',null),
 ('production','RETENTION_APPROVED','data','Retenção aprovada','Prazos, gatilhos, ações e legal holds aprovados e testados.',true,'blocked',null,'data_governance_owner',null),
 ('production','DATA_SUBJECT_RIGHTS_OPERATIONAL','privacy','Direitos dos titulares operacionais','Canal, verificação, prazos, exportação, correção e resposta testados.',true,'in_progress','rpc:privacy_submit_request,privacy_record_event','privacy_operations_owner',null),
 ('production','INCIDENT_RESPONSE_OPERATIONAL','security','Resposta a incidentes operacional','Playbook, contatos, classificação, comunicação e exercícios aprovados.',true,'in_progress','rpc:security_open_incident,security_record_incident_event','incident_commander',null),
 ('production','REAL_MALWARE_SCANNER','application','Scanner de malware de produção','Scanner técnico de prova substituído por serviço real com cobertura e SLA.',true,'blocked',null,'security_owner',null),
 ('production','AWS_STAGING_PARITY','cloud','Staging AWS equivalente','Infraestrutura AWS de staging validada antes de produção.',true,'blocked',null,'cloud_owner',null),
 ('production','BACKUP_PITR_CONFIGURED','resilience','Backups e PITR configurados','Banco e objetos possuem estratégia de backup, retenção e cópia separada.',true,'blocked',null,'platform_owner',null),
 ('production','RESTORE_TEST_PASSED','resilience','Teste de restauração aprovado','Restauração de banco e objetos executada com RPO/RTO e integridade comprovados.',true,'blocked',null,'platform_owner',null),
 ('production','TLS_ENFORCEMENT_VERIFIED','security','TLS verificado','Conexões de banco, APIs e storage exigem transporte seguro.',true,'blocked',null,'security_owner',null),
 ('production','SECRETS_ROTATION_OPERATIONAL','security','Rotação de segredos operacional','Inventário, ownership, rotação e resposta a comprometimento testados.',true,'blocked',null,'security_owner',null),
 ('production','ACCESS_REVIEW_COMPLETED','identity','Revisão de acesso concluída','IAM, roles de aplicação, contas de serviço e terceiros revisados.',true,'blocked',null,'identity_owner',null),
 ('production','VENDOR_DPA_APPROVED','vendor','Contratos e DPAs aprovados','Operadores e subprocessadores avaliados e contratados.',true,'blocked',null,'vendor_owner',null),
 ('production','INTERNATIONAL_TRANSFER_ASSESSED','vendor','Transferências internacionais avaliadas','Regiões, fluxos, mecanismos e salvaguardas documentados.',true,'blocked',null,'privacy_owner',null),
 ('production','HUBSPOT_DATA_INVENTORY_APPROVED','data','Inventário HubSpot aprovado','Objetos, campos, identificadores, bases legais e sincronizações confirmados.',true,'blocked',null,'crm_integration_owner',null),
 ('production','BEHAVIORAL_RIPD_EFFECTIVE','credit_governance','RIPD comportamental efetivo','RIPD aprovado para perfilamento e sinais comportamentais de alto risco.',true,'blocked',null,'privacy_owner',null),
 ('production','CREDIT_DECISION_GOVERNANCE','credit_governance','Governança de decisão de crédito','Validação, explicabilidade, revisão humana, contestação, equidade e monitoramento aprovados.',true,'blocked',null,'credit_governance_owner',null),
 ('production','AWS_KMS_KEY_POLICY_APPROVED','cloud','KMS e política de chaves aprovados','Chaves gerenciadas, separação de funções, rotação e auditoria configuradas.',true,'blocked',null,'cloud_security_owner',null),
 ('production','CLOUD_AUDIT_INTEGRITY_ACTIVE','observability','Integridade de auditoria cloud ativa','Trilhas de ações administrativas com retenção, integridade e alertas.',true,'blocked',null,'cloud_security_owner',null)
on conflict(environment,control_code) do update set
 title=excluded.title,description=excluded.description,blocking=excluded.blocking,
 owner_role=excluded.owner_role,
 status=case when governance.production_readiness_controls.status='passed' then 'passed' else excluded.status end,
 evidence_reference=coalesce(governance.production_readiness_controls.evidence_reference,excluded.evidence_reference),
 verified_at=coalesce(governance.production_readiness_controls.verified_at,excluded.verified_at);

insert into governance.data_assets(
 asset_reference,system_code,schema_name,table_name,field_path,classification_code,
 data_subject_category,source_category,contains_direct_identifier,contains_behavioral_profile,
 contains_credit_context,status,notes
)
values
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
on conflict(asset_reference) do update set
 classification_code=excluded.classification_code,notes=excluded.notes,status=excluded.status;

insert into governance.processing_activity_assets(
 processing_activity_id,data_asset_id,necessity_rationale,mandatory_for_purpose
)
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
on conflict(processing_activity_id,data_asset_id) do update set
 necessity_rationale=excluded.necessity_rationale,mandatory_for_purpose=excluded.mandatory_for_purpose;

insert into governance.processing_activity_parties(
 processing_activity_id,processing_party_id,role_in_activity,data_shared_description
)
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
on conflict(processing_activity_id,processing_party_id) do update set
 role_in_activity=excluded.role_in_activity,data_shared_description=excluded.data_shared_description;

comment on table governance.processing_activities is
  'ROPA-style technical registry. Draft records are hypotheses only and do not establish legal approval.';
comment on table governance.production_readiness_controls is
  'Blocking release gate. Production remains prohibited while any blocking control is not passed, not applicable, or formally accepted as risk.';
comment on table governance.secret_inventory is
  'Metadata inventory only. Secret values must never be stored in this table or repository.';
