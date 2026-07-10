-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709000740
-- Remote name: m12a_privacy_governance_catalogs
-- Remote SQL SHA-256: e6e9dd447c08c3a4979db5d6d8442c0e5e19b323b014fd48725eb055f08e412b
-- Do not edit after reconciliation; corrections require a new migration.

set lock_timeout='5s';
set statement_timeout='5min';

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
  constraint ck_policy_documents_type check (document_type in ('privacy_notice','privacy_governance','retention','incident_response','access_control','backup_restore','acceptable_use','vendor_management','ripd','legitimate_interest_assessment','credit_data_use','other')),
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
  add column if not exists policy_document_id uuid references governance.policy_documents(id);

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

create index ix_processing_activities_purpose_status on governance.processing_activities(purpose_id,status);
create index ix_processing_activities_legal_basis on governance.processing_activities(legal_basis_code,status);
create index ix_processing_activities_controller on governance.processing_activities(controller_organization_id,status);
create index ix_data_assets_classification on governance.data_assets(classification_code,status);
create index ix_processing_parties_status on governance.processing_parties(status,party_role);

create trigger trg_legal_basis_updated_at before update on governance.legal_basis_definitions for each row execute function governance.set_updated_at();
create trigger trg_data_classifications_updated_at before update on governance.data_classifications for each row execute function governance.set_updated_at();
create trigger trg_policy_documents_updated_at before update on governance.policy_documents for each row execute function governance.set_updated_at();
create trigger trg_purposes_updated_at before update on governance.purposes for each row execute function governance.set_updated_at();
create trigger trg_retention_policies_updated_at before update on governance.retention_policies for each row execute function governance.set_updated_at();
create trigger trg_data_assets_updated_at before update on governance.data_assets for each row execute function governance.set_updated_at();
create trigger trg_processing_activities_updated_at before update on governance.processing_activities for each row execute function governance.set_updated_at();
create trigger trg_processing_parties_updated_at before update on governance.processing_parties for each row execute function governance.set_updated_at();
create trigger trg_dpo_designations_updated_at before update on governance.dpo_designations for each row execute function governance.set_updated_at();
