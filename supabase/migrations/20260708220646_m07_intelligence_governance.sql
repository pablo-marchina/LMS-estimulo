-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708220646
-- Remote name: m07_intelligence_governance
-- Remote SQL SHA-256: a7d38985210f460913a90579a828453bd6d6c3ee0d80bb774e07598d961b4f7b
-- Do not edit after reconciliation; corrections require a new migration.

-- Plataforma Estímulo — M07 — behavioral intelligence, score research and governance
-- Generated from the approved v0.2 baseline. Do not edit a migration after it has been applied.
set lock_timeout = '5s';
set statement_timeout = '5min';

create table intelligence.feature_definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  name text not null,
  description text not null,
  value_type text not null,
  status text not null,
  allowed_uses text[] not null,
  prohibited_uses text[] not null,
  constraint pk_intelligence_feature_definitions primary key (id),
  constraint uq_intelligence_feature_definitions_owner_organizat_fa582c87 unique (owner_organization_id, code)
);

create table intelligence.feature_versions (
  id uuid default gen_random_uuid() not null,
  feature_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  computation_type text not null,
  expression jsonb not null,
  window_definition jsonb not null,
  missing_policy jsonb not null,
  quality_policy jsonb not null,
  published_at timestamptz not null,
  content_hash text not null,
  constraint pk_intelligence_feature_versions primary key (id),
  constraint uq_intelligence_feature_versions_feature_definition_2577572a unique (feature_definition_id, version_number),
  constraint uq_intelligence_feature_versions_feature_definition_4ee1d7f3 unique (feature_definition_id, content_hash)
);

create table intelligence.feature_dependencies (
  feature_version_id uuid not null,
  dependency_type text not null,
  dependency_reference text not null,
  required boolean not null,
  weight numeric,
  constraint pk_intelligence_feature_dependencies primary key (feature_version_id, dependency_type, dependency_reference)
);

create table intelligence.feature_computation_runs (
  id uuid default gen_random_uuid() not null,
  feature_version_id uuid not null,
  run_type text not null,
  status text not null,
  window_start timestamptz,
  window_end timestamptz,
  input_high_watermark timestamptz,
  code_reference text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  summary jsonb not null,
  constraint pk_intelligence_feature_computation_runs primary key (id)
);

create table intelligence.feature_values (
  id uuid default gen_random_uuid() not null,
  feature_version_id uuid not null,
  run_id uuid not null,
  subject_type text not null,
  subject_id uuid not null,
  journey_instance_id uuid,
  window_start timestamptz,
  window_end timestamptz,
  as_of timestamptz not null,
  numeric_value numeric,
  text_value text,
  json_value jsonb,
  quality_status text not null,
  evidence_count integer default 0 not null,
  lineage_hash text not null,
  created_at timestamptz default now() not null,
  constraint pk_intelligence_feature_values primary key (id),
  constraint uq_intelligence_feature_values_feature_version_id_s_8fa3d24d unique (feature_version_id, subject_type, subject_id, journey_instance_id, window_start, window_end, as_of)
);

create table intelligence.score_definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  name text not null,
  purpose text not null,
  status text not null,
  allowed_uses text[] not null,
  prohibited_uses text[] not null,
  constraint pk_intelligence_score_definitions primary key (id),
  constraint uq_intelligence_score_definitions_owner_organization_id_code unique (owner_organization_id, code)
);

create table intelligence.score_versions (
  id uuid default gen_random_uuid() not null,
  score_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  model_type text not null,
  model_reference text not null,
  input_schema jsonb not null,
  output_schema jsonb not null,
  decision_thresholds jsonb,
  validation_status text not null,
  published_at timestamptz,
  content_hash text not null,
  constraint pk_intelligence_score_versions primary key (id),
  constraint uq_intelligence_score_versions_score_definition_id__2c87f182 unique (score_definition_id, version_number),
  constraint uq_intelligence_score_versions_score_definition_id__c6f1dd07 unique (score_definition_id, content_hash)
);

create table intelligence.score_runs (
  id uuid default gen_random_uuid() not null,
  score_version_id uuid not null,
  status text not null,
  run_type text not null,
  code_reference text not null,
  input_high_watermark timestamptz,
  started_at timestamptz not null,
  completed_at timestamptz,
  summary jsonb not null,
  constraint pk_intelligence_score_runs primary key (id)
);

create table intelligence.score_results (
  id uuid default gen_random_uuid() not null,
  score_version_id uuid not null,
  run_id uuid not null,
  subject_type text not null,
  subject_id uuid not null,
  journey_instance_id uuid,
  score_value numeric,
  score_band text,
  uncertainty numeric,
  input_snapshot_hash text not null,
  status text not null,
  calculated_at timestamptz not null,
  constraint pk_intelligence_score_results primary key (id),
  constraint uq_intelligence_score_results_score_version_id_subj_3ef13a94 unique (score_version_id, subject_type, subject_id, journey_instance_id, calculated_at)
);

create table intelligence.score_contributions (
  score_result_id uuid not null,
  feature_version_id uuid not null,
  feature_value_id uuid,
  contribution numeric,
  rank integer,
  explanation jsonb not null,
  constraint pk_intelligence_score_contributions primary key (score_result_id, feature_version_id)
);

create table intelligence.validation_runs (
  id uuid default gen_random_uuid() not null,
  target_type text not null,
  target_version_id uuid not null,
  validation_type text not null,
  dataset_reference text not null,
  status text not null,
  methodology jsonb not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  approved_for_use boolean default false not null,
  limitations jsonb not null,
  constraint pk_intelligence_validation_runs primary key (id)
);

create table intelligence.validation_metrics (
  id uuid default gen_random_uuid() not null,
  validation_run_id uuid not null,
  metric_code text not null,
  segment_reference text,
  metric_value numeric,
  metric_json jsonb,
  confidence_interval jsonb,
  constraint pk_intelligence_validation_metrics primary key (id)
);

create table governance.purposes (
  id uuid default gen_random_uuid() not null,
  code text not null,
  name text not null,
  description text not null,
  status text not null,
  legal_basis_reference text,
  constraint pk_governance_purposes primary key (id),
  constraint uq_governance_purposes_code unique (code)
);

create table governance.consent_records (
  id uuid default gen_random_uuid() not null,
  entrepreneur_id uuid not null,
  purpose_id uuid not null,
  policy_version text not null,
  status text not null,
  captured_at timestamptz not null,
  channel text not null,
  evidence_reference text not null,
  supersedes_consent_id uuid,
  constraint pk_governance_consent_records primary key (id)
);

create table governance.privacy_requests (
  id uuid default gen_random_uuid() not null,
  entrepreneur_id uuid,
  request_type text not null,
  status text not null,
  requested_at timestamptz not null,
  due_at timestamptz,
  completed_at timestamptz,
  request_reference text not null,
  resolution_summary text,
  constraint pk_governance_privacy_requests primary key (id)
);

create table governance.retention_policies (
  id uuid default gen_random_uuid() not null,
  code text not null,
  data_class text not null,
  store_reference text not null,
  retention_interval interval,
  deletion_action text not null,
  legal_hold_supported boolean default false not null,
  status text not null,
  effective_from date not null,
  constraint pk_governance_retention_policies primary key (id),
  constraint uq_governance_retention_policies_code unique (code)
);

create table governance.data_lineage_edges (
  id uuid default gen_random_uuid() not null,
  from_type text not null,
  from_reference text not null,
  to_type text not null,
  to_reference text not null,
  transformation_reference text,
  created_at timestamptz default now() not null,
  constraint pk_governance_data_lineage_edges primary key (id),
  constraint uq_governance_data_lineage_edges_from_type_from_ref_11f41cf8 unique (from_type, from_reference, to_type, to_reference, transformation_reference)
);

create table governance.model_approvals (
  id uuid default gen_random_uuid() not null,
  target_type text not null,
  target_version_id uuid not null,
  approval_scope text not null,
  status text not null,
  conditions jsonb not null,
  approved_by uuid,
  approved_at timestamptz,
  expires_at timestamptz,
  constraint pk_governance_model_approvals primary key (id)
);

create table governance.audit_log (
  id uuid default gen_random_uuid() not null,
  occurred_at timestamptz not null,
  actor_user_account_id uuid,
  organization_id uuid,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  request_id uuid,
  before_hash text,
  after_hash text,
  details jsonb not null,
  privacy_class text not null,
  constraint pk_governance_audit_log primary key (id)
);
