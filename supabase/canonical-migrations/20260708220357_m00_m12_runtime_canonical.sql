-- Canonical reconstruction of the E14 runtime migration range.
-- Generated deterministically from the Supabase migration history export.
-- This file is documentation/replay evidence; executable history remains
-- represented by the timestamped files under supabase/migrations.

-- BEGIN 20260708220357_m00_extensions_schemas_context
-- Remote SQL SHA-256: 1a8bf965c41f2a58c83ffdd00323b528d05e33c0750b9cd4b4dff3fec25db497
-- Plataforma Estímulo — M00 — extensions, schemas and provider-neutral request context
-- Generated from the approved v0.2 baseline. Do not edit a migration after it has been applied.
set lock_timeout = '5s';
set statement_timeout = '5min';

-- Plataforma Estímulo — modelo físico executável v0.2
-- PostgreSQL-compatible and provider-neutral.
-- Supabase is used for local/test; the same migrations target Amazon RDS PostgreSQL.

create extension if not exists pgcrypto;

create schema if not exists iam;

create schema if not exists core;

create schema if not exists catalog;

create schema if not exists orchestration;

create schema if not exists diagnostics;

create schema if not exists assessment;

create schema if not exists engagement;

create schema if not exists intervention;

create schema if not exists eventing;

create schema if not exists integration;

create schema if not exists intelligence;

create schema if not exists governance;

create schema if not exists reporting;

create or replace function governance.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create or replace function governance.reject_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'table %.% is append-only', tg_table_schema, tg_table_name;
end
$$;

create schema if not exists app_private;

revoke all on schema app_private from public;

create or replace function app_private.set_request_context(
  p_user_account_id uuid,
  p_organization_id uuid,
  p_request_id text,
  p_actor_type text default 'user'
) returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if p_request_id is null or length(trim(p_request_id)) = 0 then
    raise exception 'request_id_required' using errcode = '22023';
  end if;
  if p_actor_type not in ('user', 'operator', 'worker', 'system') then
    raise exception 'invalid_actor_type' using errcode = '22023';
  end if;
  perform set_config('app.user_account_id', coalesce(p_user_account_id::text, ''), true);
  perform set_config('app.organization_id', coalesce(p_organization_id::text, ''), true);
  perform set_config('app.request_id', trim(p_request_id), true);
  perform set_config('app.actor_type', p_actor_type, true);
end;
$$;

create or replace function app_private.current_user_account_id()
returns uuid
language sql stable security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.user_account_id', true), '')::uuid;
$$;

create or replace function app_private.current_organization_id()
returns uuid
language sql stable security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.organization_id', true), '')::uuid;
$$;

create or replace function app_private.current_request_id()
returns text
language sql stable security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.request_id', true), '');
$$;

create or replace function app_private.current_actor_type()
returns text
language sql stable security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.actor_type', true), '');
$$;

create or replace function iam.current_user_account_id()
returns uuid
language sql stable security invoker
set search_path = pg_catalog, app_private
as $$
  select app_private.current_user_account_id();
$$;
-- END 20260708220357_m00_extensions_schemas_context

-- BEGIN 20260708220419_m01_identity_core
-- Remote SQL SHA-256: e9676126a0a73fe1c12d776f80efccf08612989be1c7e27551229f093effe2c9
-- Plataforma Estímulo — M01 — identity, organizations, entrepreneurs, businesses and protected file metadata
-- Generated from the approved v0.2 baseline. Do not edit a migration after it has been applied.
set lock_timeout = '5s';
set statement_timeout = '5min';

create table iam.user_accounts (
  id uuid default gen_random_uuid() not null,
  email_normalized text not null,
  status text not null,
  last_authenticated_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_iam_user_accounts primary key (id),
  constraint uq_iam_user_accounts_email_normalized unique (email_normalized)
);

create table iam.external_identities (
  id uuid default gen_random_uuid() not null,
  user_account_id uuid not null,
  provider text not null,
  issuer text not null,
  subject text not null,
  email_normalized text,
  email_verified boolean default false not null,
  claims_fingerprint text not null,
  first_authenticated_at timestamptz default now() not null,
  last_authenticated_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_iam_external_identities primary key (id),
  constraint uq_iam_external_identities_issuer_subject unique (issuer, subject),
  constraint uq_iam_external_identities_account_issuer_subject unique (user_account_id, issuer, subject)
);

create table iam.organizations (
  id uuid default gen_random_uuid() not null,
  organization_type text not null,
  slug text not null,
  legal_name text not null,
  display_name text not null,
  status text not null,
  metadata jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_iam_organizations primary key (id),
  constraint uq_iam_organizations_slug unique (slug)
);

create table iam.organization_memberships (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  user_account_id uuid not null,
  status text not null,
  valid_from timestamptz not null,
  valid_until timestamptz,
  created_at timestamptz default now() not null,
  constraint pk_iam_organization_memberships primary key (id),
  constraint uq_iam_organization_memberships_organization_id_use_a29a4603 unique (organization_id, user_account_id, valid_from)
);

create table iam.role_definitions (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  code text not null,
  name text not null,
  description text not null,
  status text not null,
  constraint pk_iam_role_definitions primary key (id),
  constraint uq_iam_role_definitions_organization_id_code unique (organization_id, code)
);

create table iam.permission_definitions (
  id uuid default gen_random_uuid() not null,
  code text not null,
  resource_type text not null,
  action text not null,
  description text not null,
  constraint pk_iam_permission_definitions primary key (id),
  constraint uq_iam_permission_definitions_code unique (code)
);

create table iam.role_permissions (
  role_id uuid not null,
  permission_id uuid not null,
  constraint pk_iam_role_permissions primary key (role_id, permission_id)
);

create table iam.membership_roles (
  membership_id uuid not null,
  role_id uuid not null,
  scope jsonb not null,
  valid_from timestamptz not null,
  valid_until timestamptz,
  constraint pk_iam_membership_roles primary key (membership_id, role_id, valid_from)
);

create table core.entrepreneurs (
  id uuid default gen_random_uuid() not null,
  user_account_id uuid,
  preferred_name text,
  legal_name text,
  email_normalized text,
  phone_e164 text,
  status text not null,
  profile_data jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_core_entrepreneurs primary key (id),
  constraint uq_core_entrepreneurs_user_account_id unique (user_account_id)
);

create table core.businesses (
  id uuid default gen_random_uuid() not null,
  legal_name text,
  trade_name text,
  registration_type text,
  registration_number_hash text,
  status text not null,
  country_code char(2) not null,
  profile_data jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_core_businesses primary key (id),
  constraint uq_core_businesses_registration_type_registration_n_720bfeb6 unique (registration_type, registration_number_hash)
);

create table core.business_memberships (
  id uuid default gen_random_uuid() not null,
  entrepreneur_id uuid not null,
  business_id uuid not null,
  relationship_type text not null,
  is_primary boolean default false not null,
  verification_status text not null,
  valid_from date not null,
  valid_until date,
  evidence_reference text,
  created_at timestamptz default now() not null,
  constraint pk_core_business_memberships primary key (id),
  constraint uq_core_business_memberships_entrepreneur_id_busine_ad4b7356 unique (entrepreneur_id, business_id, relationship_type, valid_from)
);

create table core.file_objects (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  storage_provider text not null,
  bucket text not null,
  object_key text not null,
  content_type text not null,
  size_bytes bigint not null,
  sha256 text not null,
  security_status text not null,
  retention_class text not null,
  created_at timestamptz default now() not null,
  deleted_at timestamptz,
  constraint pk_core_file_objects primary key (id),
  constraint uq_core_file_objects_storage_provider_bucket_object_key unique (storage_provider, bucket, object_key),
  constraint uq_core_file_objects_sha256_size_bytes unique (sha256, size_bytes)
);
-- END 20260708220419_m01_identity_core

-- BEGIN 20260708220445_m02_catalog
-- Remote SQL SHA-256: 36a84b7aec22327e2ff3ebc0125905ba225bee1ed269bb69861cd33b12c15da4
-- Plataforma Estímulo — M02 — multi-journey versioned catalog
-- Generated from the approved v0.2 baseline. Do not edit a migration after it has been applied.
set lock_timeout = '5s';
set statement_timeout = '5min';

create table catalog.programs (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  name text not null,
  description text,
  status text not null,
  valid_from date,
  valid_until date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_catalog_programs primary key (id),
  constraint uq_catalog_programs_owner_organization_id_code unique (owner_organization_id, code)
);

create table catalog.journey_definitions (
  id uuid default gen_random_uuid() not null,
  program_id uuid not null,
  owner_organization_id uuid not null,
  code text not null,
  slug text not null,
  name text not null,
  purpose text,
  status text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_catalog_journey_definitions primary key (id),
  constraint uq_catalog_journey_definitions_owner_organization_id_code unique (owner_organization_id, code),
  constraint uq_catalog_journey_definitions_owner_organization_id_slug unique (owner_organization_id, slug)
);

create table catalog.journey_versions (
  id uuid default gen_random_uuid() not null,
  journey_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  title text not null,
  description text,
  configuration jsonb not null,
  schema_version text not null,
  published_at timestamptz,
  retired_at timestamptz,
  content_hash text not null,
  created_by uuid not null,
  created_at timestamptz default now() not null,
  constraint pk_catalog_journey_versions primary key (id),
  constraint uq_catalog_journey_versions_journey_definition_id_v_2e8961d1 unique (journey_definition_id, version_number),
  constraint uq_catalog_journey_versions_journey_definition_id_c_280c122a unique (journey_definition_id, content_hash)
);

create table catalog.course_definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  slug text not null,
  name text not null,
  status text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_catalog_course_definitions primary key (id),
  constraint uq_catalog_course_definitions_owner_organization_id_code unique (owner_organization_id, code),
  constraint uq_catalog_course_definitions_owner_organization_id_slug unique (owner_organization_id, slug)
);

create table catalog.course_versions (
  id uuid default gen_random_uuid() not null,
  course_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  title text not null,
  description text,
  estimated_minutes integer not null,
  published_at timestamptz,
  content_hash text not null,
  created_by uuid not null,
  created_at timestamptz default now() not null,
  constraint pk_catalog_course_versions primary key (id),
  constraint uq_catalog_course_versions_course_definition_id_ver_b809d32c unique (course_definition_id, version_number),
  constraint uq_catalog_course_versions_course_definition_id_content_hash unique (course_definition_id, content_hash)
);

create table catalog.modules (
  id uuid default gen_random_uuid() not null,
  course_version_id uuid not null,
  code text not null,
  title text not null,
  description text,
  position integer not null,
  estimated_minutes integer not null,
  metadata jsonb not null,
  constraint pk_catalog_modules primary key (id),
  constraint uq_catalog_modules_course_version_id_code unique (course_version_id, code),
  constraint uq_catalog_modules_course_version_id_position unique (course_version_id, position)
);

create table catalog.activity_definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  activity_type text not null,
  name text not null,
  status text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_catalog_activity_definitions primary key (id),
  constraint uq_catalog_activity_definitions_owner_organization_id_code unique (owner_organization_id, code)
);

create table catalog.activity_versions (
  id uuid default gen_random_uuid() not null,
  activity_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  title text not null,
  description text,
  activity_type text not null,
  configuration jsonb not null,
  estimated_minutes integer not null,
  published_at timestamptz,
  content_hash text not null,
  created_by uuid not null,
  created_at timestamptz default now() not null,
  constraint pk_catalog_activity_versions primary key (id),
  constraint uq_catalog_activity_versions_activity_definition_id_97bf7b11 unique (activity_definition_id, version_number),
  constraint uq_catalog_activity_versions_activity_definition_id_0bfc0637 unique (activity_definition_id, content_hash)
);

create table catalog.module_activities (
  module_id uuid not null,
  activity_version_id uuid not null,
  position integer not null,
  is_required boolean default false not null,
  constraint pk_catalog_module_activities primary key (module_id, activity_version_id),
  constraint uq_catalog_module_activities_module_id_position unique (module_id, position)
);

create table catalog.content_assets (
  id uuid default gen_random_uuid() not null,
  activity_version_id uuid not null,
  file_object_id uuid,
  asset_type text not null,
  title text not null,
  external_url text,
  language_code text not null,
  accessibility_metadata jsonb not null,
  position integer not null,
  is_required boolean default false not null,
  created_at timestamptz default now() not null,
  constraint pk_catalog_content_assets primary key (id),
  constraint uq_catalog_content_assets_activity_version_id_position unique (activity_version_id, position)
);

create table catalog.competencies (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  name text not null,
  description text,
  status text not null,
  constraint pk_catalog_competencies primary key (id),
  constraint uq_catalog_competencies_owner_organization_id_code unique (owner_organization_id, code)
);

create table catalog.journey_competencies (
  journey_version_id uuid not null,
  competency_id uuid not null,
  target_level numeric not null,
  weight numeric not null,
  constraint pk_catalog_journey_competencies primary key (journey_version_id, competency_id)
);

create table catalog.activity_competencies (
  activity_version_id uuid not null,
  competency_id uuid not null,
  evidence_type text not null,
  weight numeric not null,
  constraint pk_catalog_activity_competencies primary key (activity_version_id, competency_id, evidence_type)
);

create table catalog.content_contributors (
  id uuid default gen_random_uuid() not null,
  activity_version_id uuid,
  course_version_id uuid,
  organization_id uuid,
  user_account_id uuid,
  contribution_role text not null,
  display_name text,
  constraint pk_catalog_content_contributors primary key (id)
);
-- END 20260708220445_m02_catalog

-- BEGIN 20260708220505_m03_orchestration
-- Remote SQL SHA-256: ad536714d9ff7ca1571ea7469f242a32cb351fe6749abee81343455243f1dc8a
-- Plataforma Estímulo — M03 — rules, paths, cohorts, enrollments and runtime state
-- Generated from the approved v0.2 baseline. Do not edit a migration after it has been applied.
set lock_timeout = '5s';
set statement_timeout = '5min';

create table orchestration.rule_definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  rule_type text not null,
  name text not null,
  status text not null,
  constraint pk_orchestration_rule_definitions primary key (id),
  constraint uq_orchestration_rule_definitions_owner_organization_id_code unique (owner_organization_id, code)
);

create table orchestration.rule_versions (
  id uuid default gen_random_uuid() not null,
  rule_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  language text not null,
  expression jsonb not null,
  input_schema jsonb not null,
  output_schema jsonb not null,
  published_at timestamptz,
  content_hash text not null,
  created_at timestamptz default now() not null,
  constraint pk_orchestration_rule_versions primary key (id),
  constraint uq_orchestration_rule_versions_rule_definition_id_v_41abd28d unique (rule_definition_id, version_number),
  constraint uq_orchestration_rule_versions_rule_definition_id_c_6a91ff3f unique (rule_definition_id, content_hash)
);

create table orchestration.path_templates (
  id uuid default gen_random_uuid() not null,
  journey_version_id uuid not null,
  code text not null,
  name text not null,
  description text,
  is_default boolean not null,
  status text not null,
  constraint pk_orchestration_path_templates primary key (id),
  constraint uq_orchestration_path_templates_journey_version_id_code unique (journey_version_id, code)
);

create table orchestration.path_steps (
  id uuid default gen_random_uuid() not null,
  path_template_id uuid not null,
  code text not null,
  activity_version_id uuid not null,
  position_hint integer not null,
  is_required boolean default false not null,
  availability_rule_version_id uuid,
  completion_rule_version_id uuid,
  due_offset interval,
  metadata jsonb not null,
  constraint pk_orchestration_path_steps primary key (id),
  constraint uq_orchestration_path_steps_path_template_id_code unique (path_template_id, code)
);

create table orchestration.path_transitions (
  id uuid default gen_random_uuid() not null,
  path_template_id uuid not null,
  from_step_id uuid,
  to_step_id uuid,
  condition_rule_version_id uuid,
  priority integer not null,
  transition_type text not null,
  constraint pk_orchestration_path_transitions primary key (id),
  constraint uq_orchestration_path_transitions_path_template_id__289b19b9 unique (path_template_id, from_step_id, to_step_id, priority)
);

create table orchestration.assignment_policies (
  id uuid default gen_random_uuid() not null,
  journey_version_id uuid not null,
  rule_version_id uuid not null,
  priority integer not null,
  status text not null,
  valid_from timestamptz,
  valid_until timestamptz,
  constraint pk_orchestration_assignment_policies primary key (id)
);

create table orchestration.cohorts (
  id uuid default gen_random_uuid() not null,
  program_id uuid not null,
  journey_version_id uuid,
  code text not null,
  name text not null,
  status text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null,
  constraint pk_orchestration_cohorts primary key (id),
  constraint uq_orchestration_cohorts_program_id_code unique (program_id, code)
);

create table orchestration.enrollments (
  id uuid default gen_random_uuid() not null,
  entrepreneur_id uuid not null,
  business_id uuid,
  journey_version_id uuid not null,
  cohort_id uuid,
  source text not null,
  status text not null,
  assigned_at timestamptz not null,
  accepted_at timestamptz,
  expires_at timestamptz,
  aggregate_version bigint default 0 not null,
  created_at timestamptz default now() not null,
  constraint pk_orchestration_enrollments primary key (id),
  constraint uq_orchestration_enrollments_entrepreneur_id_busine_a5e89fcf unique (entrepreneur_id, business_id, journey_version_id, cohort_id)
);

create table orchestration.journey_instances (
  id uuid default gen_random_uuid() not null,
  enrollment_id uuid not null,
  status text not null,
  started_at timestamptz,
  paused_at timestamptz,
  base_completed_at timestamptz,
  fully_completed_at timestamptz,
  ended_at timestamptz,
  aggregate_version bigint default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_orchestration_journey_instances primary key (id),
  constraint uq_orchestration_journey_instances_enrollment_id unique (enrollment_id)
);

create table orchestration.path_assignments (
  id uuid default gen_random_uuid() not null,
  journey_instance_id uuid not null,
  path_template_id uuid not null,
  assignment_policy_id uuid,
  status text not null,
  reason jsonb not null,
  confidence numeric,
  valid_from timestamptz not null,
  valid_until timestamptz,
  created_at timestamptz default now() not null,
  constraint pk_orchestration_path_assignments primary key (id)
);

create table orchestration.step_instances (
  id uuid default gen_random_uuid() not null,
  path_assignment_id uuid not null,
  path_step_id uuid not null,
  activity_version_id uuid not null,
  status text not null,
  available_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  attempt_count integer default 0 not null,
  aggregate_version bigint default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_orchestration_step_instances primary key (id),
  constraint uq_orchestration_step_instances_path_assignment_id__d7b60712 unique (path_assignment_id, path_step_id)
);

create table orchestration.activity_sessions (
  id uuid default gen_random_uuid() not null,
  step_instance_id uuid not null,
  entrepreneur_id uuid not null,
  started_at timestamptz not null,
  last_seen_at timestamptz,
  ended_at timestamptz,
  device_class text,
  channel text,
  accepted_observation_count integer default 0 not null,
  constraint pk_orchestration_activity_sessions primary key (id)
);

create table orchestration.progress_projections (
  journey_instance_id uuid not null,
  completed_required_steps integer not null,
  total_required_steps integer not null,
  completion_ratio numeric not null,
  current_step_id uuid,
  last_activity_at timestamptz,
  projection_version bigint default 0 not null,
  updated_at timestamptz default now() not null,
  constraint pk_orchestration_progress_projections primary key (journey_instance_id)
);

create table orchestration.personalization_decisions (
  id uuid default gen_random_uuid() not null,
  entrepreneur_id uuid not null,
  journey_instance_id uuid,
  decision_type text not null,
  rule_version_id uuid,
  input_snapshot jsonb not null,
  output jsonb not null,
  confidence numeric,
  status text not null,
  decided_at timestamptz not null,
  expires_at timestamptz,
  constraint pk_orchestration_personalization_decisions primary key (id)
);
-- END 20260708220505_m03_orchestration

-- BEGIN 20260708220536_m04_diagnostics_assessment
-- Remote SQL SHA-256: 44e80d92e19876d7bf97fd656c9fc870510a4e98a4805c2338b54fa4eae243fc
-- Plataforma Estímulo — M04 — diagnostics, personalization evidence, assessments and practical work
-- Generated from the approved v0.2 baseline. Do not edit a migration after it has been applied.
set lock_timeout = '5s';
set statement_timeout = '5min';

create table diagnostics.diagnostic_definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  name text not null,
  purpose text not null,
  status text not null,
  constraint pk_diagnostics_diagnostic_definitions primary key (id),
  constraint uq_diagnostics_diagnostic_definitions_owner_organiz_d5bef019 unique (owner_organization_id, code)
);

create table diagnostics.diagnostic_versions (
  id uuid default gen_random_uuid() not null,
  diagnostic_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  configuration jsonb not null,
  published_at timestamptz not null,
  content_hash text not null,
  created_at timestamptz default now() not null,
  constraint pk_diagnostics_diagnostic_versions primary key (id),
  constraint uq_diagnostics_diagnostic_versions_diagnostic_defin_671e3a2d unique (diagnostic_definition_id, version_number),
  constraint uq_diagnostics_diagnostic_versions_diagnostic_defin_9edf0206 unique (diagnostic_definition_id, content_hash)
);

create table diagnostics.dimensions (
  id uuid default gen_random_uuid() not null,
  diagnostic_version_id uuid not null,
  code text not null,
  name text not null,
  description text,
  minimum_answer_ratio numeric not null,
  position integer not null,
  constraint pk_diagnostics_dimensions primary key (id),
  constraint uq_diagnostics_dimensions_diagnostic_version_id_code unique (diagnostic_version_id, code),
  constraint uq_diagnostics_dimensions_diagnostic_version_id_position unique (diagnostic_version_id, position)
);

create table diagnostics.items (
  id uuid default gen_random_uuid() not null,
  diagnostic_version_id uuid not null,
  dimension_id uuid,
  code text not null,
  item_type text not null,
  prompt text not null,
  configuration jsonb not null,
  position integer not null,
  is_required boolean default false not null,
  constraint pk_diagnostics_items primary key (id),
  constraint uq_diagnostics_items_diagnostic_version_id_code unique (diagnostic_version_id, code),
  constraint uq_diagnostics_items_diagnostic_version_id_position unique (diagnostic_version_id, position)
);

create table diagnostics.item_options (
  id uuid default gen_random_uuid() not null,
  item_id uuid not null,
  code text not null,
  label text not null,
  value jsonb not null,
  position integer not null,
  constraint pk_diagnostics_item_options primary key (id),
  constraint uq_diagnostics_item_options_item_id_code unique (item_id, code),
  constraint uq_diagnostics_item_options_item_id_position unique (item_id, position)
);

create table diagnostics.sessions (
  id uuid default gen_random_uuid() not null,
  diagnostic_version_id uuid not null,
  entrepreneur_id uuid not null,
  business_id uuid,
  journey_instance_id uuid,
  status text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  abandoned_at timestamptz,
  aggregate_version bigint default 0 not null,
  created_at timestamptz default now() not null,
  constraint pk_diagnostics_sessions primary key (id)
);

create table diagnostics.responses (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  item_id uuid not null,
  revision integer not null,
  response_value jsonb not null,
  response_time_ms integer,
  recorded_at timestamptz not null,
  supersedes_response_id uuid,
  source_event_id uuid not null,
  constraint pk_diagnostics_responses primary key (id),
  constraint uq_diagnostics_responses_session_id_item_id_revision unique (session_id, item_id, revision)
);

create table diagnostics.results (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  calculation_version text not null,
  status text not null,
  operational_readiness jsonb not null,
  data_quality jsonb not null,
  recommended_start jsonb not null,
  calculated_at timestamptz not null,
  source_event_high_watermark uuid,
  constraint pk_diagnostics_results primary key (id),
  constraint uq_diagnostics_results_session_id_calculation_version unique (session_id, calculation_version)
);

create table diagnostics.dimension_results (
  result_id uuid not null,
  dimension_id uuid not null,
  score numeric,
  answered_ratio numeric not null,
  evidence_status text not null,
  details jsonb not null,
  constraint pk_diagnostics_dimension_results primary key (result_id, dimension_id)
);

create table diagnostics.segment_definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  name text not null,
  description text,
  status text not null,
  constraint pk_diagnostics_segment_definitions primary key (id),
  constraint uq_diagnostics_segment_definitions_owner_organizati_238f5e72 unique (owner_organization_id, code)
);

create table diagnostics.segment_versions (
  id uuid default gen_random_uuid() not null,
  segment_definition_id uuid not null,
  version_number integer not null,
  rule_version_id uuid,
  status text not null,
  validity_interval interval,
  published_at timestamptz,
  constraint pk_diagnostics_segment_versions primary key (id),
  constraint uq_diagnostics_segment_versions_segment_definition__843e1019 unique (segment_definition_id, version_number)
);

create table diagnostics.segment_assignments (
  id uuid default gen_random_uuid() not null,
  segment_version_id uuid not null,
  entrepreneur_id uuid not null,
  journey_instance_id uuid,
  source_type text not null,
  source_reference jsonb not null,
  confidence numeric,
  assigned_at timestamptz not null,
  valid_until timestamptz,
  revoked_at timestamptz,
  constraint pk_diagnostics_segment_assignments primary key (id)
);

create table diagnostics.archetype_definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  name text not null,
  description text,
  status text not null,
  constraint pk_diagnostics_archetype_definitions primary key (id),
  constraint uq_diagnostics_archetype_definitions_owner_organiza_b10d0265 unique (owner_organization_id, code)
);

create table diagnostics.archetype_versions (
  id uuid default gen_random_uuid() not null,
  archetype_definition_id uuid not null,
  version_number integer not null,
  model_reference text,
  status text not null,
  validation_status text not null,
  published_at timestamptz,
  constraint pk_diagnostics_archetype_versions primary key (id),
  constraint uq_diagnostics_archetype_versions_archetype_definit_b05e1749 unique (archetype_definition_id, version_number)
);

create table diagnostics.archetype_assignments (
  id uuid default gen_random_uuid() not null,
  entrepreneur_id uuid not null,
  journey_instance_id uuid,
  model_version_reference text not null,
  primary_archetype_version_id uuid,
  probability numeric,
  secondary_archetype_version_id uuid,
  secondary_probability numeric,
  classification_status text not null,
  assigned_at timestamptz not null,
  constraint pk_diagnostics_archetype_assignments primary key (id)
);

create table assessment.assessment_specs (
  activity_version_id uuid not null,
  grading_mode text not null,
  passing_score numeric,
  max_attempts integer,
  time_limit_seconds integer,
  randomization_policy jsonb not null,
  feedback_policy jsonb not null,
  constraint pk_assessment_assessment_specs primary key (activity_version_id)
);

create table assessment.questions (
  id uuid default gen_random_uuid() not null,
  activity_version_id uuid not null,
  code text not null,
  question_type text not null,
  prompt text not null,
  points numeric not null,
  position integer not null,
  configuration jsonb not null,
  constraint pk_assessment_questions primary key (id),
  constraint uq_assessment_questions_activity_version_id_code unique (activity_version_id, code),
  constraint uq_assessment_questions_activity_version_id_position unique (activity_version_id, position)
);

create table assessment.answer_options (
  id uuid default gen_random_uuid() not null,
  question_id uuid not null,
  code text not null,
  label text not null,
  value jsonb not null,
  is_correct boolean,
  position integer not null,
  constraint pk_assessment_answer_options primary key (id),
  constraint uq_assessment_answer_options_question_id_code unique (question_id, code),
  constraint uq_assessment_answer_options_question_id_position unique (question_id, position)
);

create table assessment.attempts (
  id uuid default gen_random_uuid() not null,
  step_instance_id uuid not null,
  activity_version_id uuid not null,
  entrepreneur_id uuid not null,
  attempt_number integer not null,
  status text not null,
  started_at timestamptz not null,
  submitted_at timestamptz,
  scored_at timestamptz,
  aggregate_version bigint default 0 not null,
  constraint pk_assessment_attempts primary key (id),
  constraint uq_assessment_attempts_step_instance_id_attempt_number unique (step_instance_id, attempt_number)
);

create table assessment.responses (
  id uuid default gen_random_uuid() not null,
  attempt_id uuid not null,
  question_id uuid not null,
  response_value jsonb not null,
  responded_at timestamptz not null,
  source_event_id uuid not null,
  constraint pk_assessment_responses primary key (id),
  constraint uq_assessment_responses_attempt_id_question_id unique (attempt_id, question_id)
);

create table assessment.results (
  id uuid default gen_random_uuid() not null,
  attempt_id uuid not null,
  scoring_version text not null,
  raw_score numeric not null,
  normalized_score numeric not null,
  passed boolean not null,
  details jsonb not null,
  calculated_at timestamptz not null,
  constraint pk_assessment_results primary key (id),
  constraint uq_assessment_results_attempt_id_scoring_version unique (attempt_id, scoring_version)
);

create table assessment.practice_specs (
  activity_version_id uuid not null,
  submission_mode text not null,
  allowed_evidence_types text[] not null,
  max_submissions integer,
  review_required boolean not null,
  rubric_version_id uuid,
  terms_version text,
  constraint pk_assessment_practice_specs primary key (activity_version_id)
);

create table assessment.rubric_definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  name text not null,
  status text not null,
  constraint pk_assessment_rubric_definitions primary key (id),
  constraint uq_assessment_rubric_definitions_owner_organization_id_code unique (owner_organization_id, code)
);

create table assessment.rubric_versions (
  id uuid default gen_random_uuid() not null,
  rubric_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  published_at timestamptz,
  content_hash text not null,
  constraint pk_assessment_rubric_versions primary key (id),
  constraint uq_assessment_rubric_versions_rubric_definition_id__8a8cb790 unique (rubric_definition_id, version_number)
);

create table assessment.rubric_criteria (
  id uuid default gen_random_uuid() not null,
  rubric_version_id uuid not null,
  code text not null,
  name text not null,
  description text not null,
  max_score numeric not null,
  weight numeric not null,
  position integer not null,
  levels jsonb not null,
  constraint pk_assessment_rubric_criteria primary key (id),
  constraint uq_assessment_rubric_criteria_rubric_version_id_code unique (rubric_version_id, code),
  constraint uq_assessment_rubric_criteria_rubric_version_id_position unique (rubric_version_id, position)
);

create table assessment.submissions (
  id uuid default gen_random_uuid() not null,
  step_instance_id uuid not null,
  activity_version_id uuid not null,
  entrepreneur_id uuid not null,
  submission_number integer not null,
  status text not null,
  text_content text,
  external_link text,
  submitted_at timestamptz not null,
  accepted_at timestamptz,
  aggregate_version bigint default 0 not null,
  allow_public_use boolean default false not null,
  constraint pk_assessment_submissions primary key (id),
  constraint uq_assessment_submissions_step_instance_id_submission_number unique (step_instance_id, submission_number)
);

create table assessment.submission_evidence (
  id uuid default gen_random_uuid() not null,
  submission_id uuid not null,
  file_object_id uuid not null,
  evidence_type text not null,
  position integer not null,
  metadata jsonb not null,
  constraint pk_assessment_submission_evidence primary key (id),
  constraint uq_assessment_submission_evidence_submission_id_position unique (submission_id, position)
);

create table assessment.reviews (
  id uuid default gen_random_uuid() not null,
  submission_id uuid not null,
  reviewer_user_account_id uuid,
  review_type text not null,
  rubric_version_id uuid,
  status text not null,
  feedback text,
  reviewed_at timestamptz not null,
  source_event_id uuid not null,
  constraint pk_assessment_reviews primary key (id)
);

create table assessment.review_scores (
  review_id uuid not null,
  rubric_criterion_id uuid not null,
  score numeric not null,
  comment text,
  constraint pk_assessment_review_scores primary key (review_id, rubric_criterion_id)
);
-- END 20260708220536_m04_diagnostics_assessment

-- BEGIN 20260708220558_m05_engagement_intervention
-- Remote SQL SHA-256: be397638ff58ce8fefeb4b20b67469d41e566d30a28f50f0b4356e5ce320cada
-- Plataforma Estímulo — M05 — gamification, credentials and interventions
-- Generated from the approved v0.2 baseline. Do not edit a migration after it has been applied.
set lock_timeout = '5s';
set statement_timeout = '5min';

create table engagement.point_rule_definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  name text not null,
  status text not null,
  constraint pk_engagement_point_rule_definitions primary key (id),
  constraint uq_engagement_point_rule_definitions_owner_organiza_d0190c6f unique (owner_organization_id, code)
);

create table engagement.point_rule_versions (
  id uuid default gen_random_uuid() not null,
  point_rule_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  amount integer not null,
  eligibility_rule_version_id uuid not null,
  recurrence_policy jsonb not null,
  published_at timestamptz not null,
  constraint pk_engagement_point_rule_versions primary key (id),
  constraint uq_engagement_point_rule_versions_point_rule_defini_88833a45 unique (point_rule_definition_id, version_number)
);

create table engagement.point_ledger (
  id uuid default gen_random_uuid() not null,
  entrepreneur_id uuid not null,
  journey_instance_id uuid,
  point_rule_version_id uuid not null,
  amount integer not null,
  source_event_id uuid not null,
  idempotency_key text not null,
  reason text not null,
  reverses_entry_id uuid,
  occurred_at timestamptz not null,
  created_at timestamptz default now() not null,
  constraint pk_engagement_point_ledger primary key (id),
  constraint uq_engagement_point_ledger_idempotency_key unique (idempotency_key)
);

create table engagement.point_balance_projections (
  id uuid default gen_random_uuid() not null,
  entrepreneur_id uuid not null,
  journey_instance_id uuid,
  balance integer not null,
  last_ledger_entry_id uuid not null,
  projection_version bigint default 0 not null,
  updated_at timestamptz default now() not null,
  constraint pk_engagement_point_balance_projections primary key (id)
);

create table engagement.badge_definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  name text not null,
  status text not null,
  constraint pk_engagement_badge_definitions primary key (id),
  constraint uq_engagement_badge_definitions_owner_organization_id_code unique (owner_organization_id, code)
);

create table engagement.badge_versions (
  id uuid default gen_random_uuid() not null,
  badge_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  title text not null,
  description text not null,
  criteria_rule_version_id uuid not null,
  asset_file_object_id uuid,
  published_at timestamptz,
  constraint pk_engagement_badge_versions primary key (id),
  constraint uq_engagement_badge_versions_badge_definition_id_ve_7c0b21e3 unique (badge_definition_id, version_number)
);

create table engagement.badge_awards (
  id uuid default gen_random_uuid() not null,
  entrepreneur_id uuid not null,
  journey_instance_id uuid,
  badge_version_id uuid not null,
  source_event_id uuid not null,
  evidence_snapshot jsonb not null,
  awarded_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason text,
  constraint pk_engagement_badge_awards primary key (id),
  constraint uq_engagement_badge_awards_entrepreneur_id_journey__4841fb57 unique (entrepreneur_id, journey_instance_id, badge_version_id)
);

create table engagement.certificate_definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  name text not null,
  status text not null,
  constraint pk_engagement_certificate_definitions primary key (id),
  constraint uq_engagement_certificate_definitions_owner_organiz_b7063d9f unique (owner_organization_id, code)
);

create table engagement.certificate_versions (
  id uuid default gen_random_uuid() not null,
  certificate_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  journey_version_id uuid not null,
  requirements_rule_version_id uuid not null,
  template_file_object_id uuid,
  validity_policy jsonb not null,
  published_at timestamptz,
  constraint pk_engagement_certificate_versions primary key (id),
  constraint uq_engagement_certificate_versions_certificate_defi_35d346ac unique (certificate_definition_id, version_number)
);

create table engagement.certificate_issuances (
  id uuid default gen_random_uuid() not null,
  entrepreneur_id uuid not null,
  journey_instance_id uuid not null,
  certificate_version_id uuid not null,
  verification_code text not null,
  display_name_snapshot text not null,
  requirement_snapshot jsonb not null,
  source_event_id uuid not null,
  status text not null,
  issued_at timestamptz not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  document_file_object_id uuid,
  constraint pk_engagement_certificate_issuances primary key (id),
  constraint uq_engagement_certificate_issuances_verification_code unique (verification_code),
  constraint uq_engagement_certificate_issuances_journey_instanc_4254453b unique (journey_instance_id, certificate_version_id)
);

create table engagement.streak_projections (
  id uuid default gen_random_uuid() not null,
  entrepreneur_id uuid not null,
  journey_instance_id uuid,
  streak_type text not null,
  current_count integer default 0 not null,
  longest_count integer default 0 not null,
  last_qualifying_date date,
  projection_version bigint default 0 not null,
  updated_at timestamptz default now() not null,
  constraint pk_engagement_streak_projections primary key (id)
);

create table intervention.definitions (
  id uuid default gen_random_uuid() not null,
  owner_organization_id uuid not null,
  code text not null,
  name text not null,
  purpose text not null,
  status text not null,
  constraint pk_intervention_definitions primary key (id),
  constraint uq_intervention_definitions_owner_organization_id_code unique (owner_organization_id, code)
);

create table intervention.versions (
  id uuid default gen_random_uuid() not null,
  intervention_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  eligibility_rule_version_id uuid not null,
  channel_policy jsonb not null,
  content_template jsonb not null,
  cooldown interval,
  priority integer not null,
  published_at timestamptz,
  constraint pk_intervention_versions primary key (id),
  constraint uq_intervention_versions_intervention_definition_id_a923a1eb unique (intervention_definition_id, version_number)
);

create table intervention.instances (
  id uuid default gen_random_uuid() not null,
  intervention_version_id uuid not null,
  entrepreneur_id uuid not null,
  journey_instance_id uuid,
  trigger_event_id uuid,
  status text not null,
  eligible_at timestamptz not null,
  scheduled_at timestamptz,
  sent_at timestamptz,
  completed_at timestamptz,
  suppression_reason text,
  aggregate_version bigint default 0 not null,
  constraint pk_intervention_instances primary key (id)
);

create table intervention.delivery_attempts (
  id uuid default gen_random_uuid() not null,
  intervention_instance_id uuid not null,
  channel text not null,
  provider text not null,
  attempt_number integer not null,
  status text not null,
  external_message_id text,
  requested_at timestamptz not null,
  delivered_at timestamptz,
  opened_at timestamptz,
  failure_code text,
  failure_details jsonb not null,
  constraint pk_intervention_delivery_attempts primary key (id),
  constraint uq_intervention_delivery_attempts_intervention_inst_8b753efd unique (intervention_instance_id, channel, attempt_number)
);

create table intervention.responses (
  id uuid default gen_random_uuid() not null,
  intervention_instance_id uuid not null,
  response_type text not null,
  response_value jsonb not null,
  source_event_id uuid not null,
  responded_at timestamptz not null,
  constraint pk_intervention_responses primary key (id)
);
-- END 20260708220558_m05_engagement_intervention

-- BEGIN 20260708220623_m06_eventing_integration
-- Remote SQL SHA-256: 7ae07bf05f8d07214839523e4c81e6f4474137d7c0d361ef8c163b447147cef1
-- Plataforma Estímulo — M06 — canonical events, transactional outbox and external integrations
-- Generated from the approved v0.2 baseline. Do not edit a migration after it has been applied.
set lock_timeout = '5s';
set statement_timeout = '5min';

create table eventing.event_schemas (
  id uuid default gen_random_uuid() not null,
  event_name text not null,
  event_version integer not null,
  schema_uri text not null,
  schema_document jsonb not null,
  schema_hash text not null,
  status text not null,
  published_at timestamptz not null,
  constraint pk_eventing_event_schemas primary key (id),
  constraint uq_eventing_event_schemas_event_name_event_version unique (event_name, event_version),
  constraint uq_eventing_event_schemas_schema_hash unique (schema_hash)
);

create table eventing.events (
  event_id uuid default gen_random_uuid() not null,
  event_name text not null,
  event_version integer not null,
  occurred_at timestamptz not null,
  received_at timestamptz default now() not null,
  producer text not null,
  subject_type text not null,
  subject_id uuid,
  actor_type text not null,
  actor_id uuid,
  organization_id uuid,
  journey_instance_id uuid,
  aggregate_type text,
  aggregate_id uuid,
  aggregate_version bigint default 0,
  partition_key text not null,
  correlation_id uuid not null,
  causation_id uuid,
  traceparent text,
  evidence_nature text not null,
  privacy_class text not null,
  payload jsonb not null,
  payload_hash text not null,
  schema_id uuid not null,
  created_at timestamptz default now() not null,
  constraint pk_eventing_events primary key (event_id)
);

create table eventing.outbox (
  id uuid default gen_random_uuid() not null,
  event_id uuid default gen_random_uuid() not null,
  route_key text not null,
  status text not null,
  available_at timestamptz not null,
  claimed_at timestamptz,
  claimed_by text,
  attempt_count integer default 0 not null,
  last_error_code text,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  constraint pk_eventing_outbox primary key (id),
  constraint uq_eventing_outbox_event_id_route_key unique (event_id, route_key)
);

create table eventing.consumer_definitions (
  id uuid default gen_random_uuid() not null,
  code text not null,
  name text not null,
  status text not null,
  max_attempts integer not null,
  retry_policy jsonb not null,
  dead_letter_policy jsonb not null,
  constraint pk_eventing_consumer_definitions primary key (id),
  constraint uq_eventing_consumer_definitions_code unique (code)
);

create table eventing.consumer_inbox (
  consumer_id uuid not null,
  event_id uuid default gen_random_uuid() not null,
  status text not null,
  received_at timestamptz default now() not null,
  processing_started_at timestamptz,
  processed_at timestamptz,
  attempt_count integer default 0 not null,
  last_error_code text,
  constraint pk_eventing_consumer_inbox primary key (consumer_id, event_id)
);

create table eventing.delivery_attempts (
  id uuid default gen_random_uuid() not null,
  outbox_id uuid not null,
  consumer_id uuid not null,
  attempt_number integer not null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  error_code text,
  error_details jsonb not null,
  constraint pk_eventing_delivery_attempts primary key (id),
  constraint uq_eventing_delivery_attempts_outbox_id_consumer_id_44932c15 unique (outbox_id, consumer_id, attempt_number)
);

create table eventing.dead_letters (
  id uuid default gen_random_uuid() not null,
  event_id uuid default gen_random_uuid() not null,
  consumer_id uuid,
  source_type text not null,
  reason_code text not null,
  reason_details jsonb not null,
  status text not null,
  created_at timestamptz default now() not null,
  resolved_at timestamptz,
  resolution text,
  constraint pk_eventing_dead_letters primary key (id)
);

create table eventing.projection_checkpoints (
  projection_code text not null,
  partition_key text not null,
  last_event_id uuid,
  last_received_at timestamptz,
  projection_version bigint default 0 not null,
  updated_at timestamptz default now() not null,
  constraint pk_eventing_projection_checkpoints primary key (projection_code, partition_key)
);

create table integration.connections (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  provider text not null,
  environment text not null,
  status text not null,
  secret_reference text not null,
  configuration jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_integration_connections primary key (id),
  constraint uq_integration_connections_organization_id_provider_f7a42132 unique (organization_id, provider, environment)
);

create table integration.external_object_mappings (
  id uuid default gen_random_uuid() not null,
  connection_id uuid not null,
  internal_entity_type text not null,
  internal_entity_id uuid not null,
  external_object_type text not null,
  external_object_id text not null,
  status text not null,
  first_synced_at timestamptz not null,
  last_synced_at timestamptz not null,
  metadata jsonb not null,
  constraint pk_integration_external_object_mappings primary key (id),
  constraint uq_integration_external_object_mappings_connection__c7aca520 unique (connection_id, external_object_type, external_object_id),
  constraint uq_integration_external_object_mappings_connection__a8df7c70 unique (connection_id, internal_entity_type, internal_entity_id, external_object_type)
);

create table integration.mapping_definitions (
  id uuid default gen_random_uuid() not null,
  connection_id uuid not null,
  code text not null,
  direction text not null,
  internal_entity_type text not null,
  external_object_type text not null,
  status text not null,
  constraint pk_integration_mapping_definitions primary key (id),
  constraint uq_integration_mapping_definitions_connection_id_code unique (connection_id, code)
);

create table integration.mapping_versions (
  id uuid default gen_random_uuid() not null,
  mapping_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  field_mappings jsonb not null,
  validation_schema jsonb not null,
  published_at timestamptz not null,
  content_hash text not null,
  constraint pk_integration_mapping_versions primary key (id),
  constraint uq_integration_mapping_versions_mapping_definition__48dd9ae1 unique (mapping_definition_id, version_number)
);

create table integration.sync_jobs (
  id uuid default gen_random_uuid() not null,
  connection_id uuid not null,
  mapping_version_id uuid not null,
  source_event_id uuid,
  operation text not null,
  internal_entity_type text not null,
  internal_entity_id uuid not null,
  idempotency_key text not null,
  status text not null,
  scheduled_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  external_object_id text,
  attempt_count integer default 0 not null,
  last_error_code text,
  constraint pk_integration_sync_jobs primary key (id),
  constraint uq_integration_sync_jobs_idempotency_key unique (idempotency_key)
);

create table integration.sync_attempts (
  id uuid default gen_random_uuid() not null,
  sync_job_id uuid not null,
  attempt_number integer not null,
  status text not null,
  request_hash text not null,
  response_status integer,
  response_reference text,
  started_at timestamptz not null,
  finished_at timestamptz,
  error_code text,
  error_details jsonb not null,
  constraint pk_integration_sync_attempts primary key (id),
  constraint uq_integration_sync_attempts_sync_job_id_attempt_number unique (sync_job_id, attempt_number)
);

create table integration.conflicts (
  id uuid default gen_random_uuid() not null,
  connection_id uuid not null,
  internal_entity_type text not null,
  internal_entity_id uuid not null,
  external_object_type text not null,
  external_object_id text,
  field_name text,
  internal_value_hash text,
  external_value_hash text,
  status text not null,
  detected_at timestamptz not null,
  resolved_at timestamptz,
  resolution text,
  constraint pk_integration_conflicts primary key (id)
);

create table integration.reconciliation_runs (
  id uuid default gen_random_uuid() not null,
  connection_id uuid not null,
  scope jsonb not null,
  status text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  summary jsonb not null,
  constraint pk_integration_reconciliation_runs primary key (id)
);

create table integration.reconciliation_items (
  id uuid default gen_random_uuid() not null,
  run_id uuid not null,
  internal_entity_type text not null,
  internal_entity_id uuid,
  external_object_type text not null,
  external_object_id text,
  status text not null,
  difference_summary jsonb not null,
  action_taken text,
  constraint pk_integration_reconciliation_items primary key (id)
);

create table integration.webhook_receipts (
  id uuid default gen_random_uuid() not null,
  connection_id uuid not null,
  provider_event_id text,
  received_at timestamptz default now() not null,
  signature_status text not null,
  replay_status text not null,
  payload_hash text not null,
  payload_object_reference text,
  status text not null,
  normalized_event_id uuid,
  rejection_reason text,
  constraint pk_integration_webhook_receipts primary key (id),
  constraint uq_integration_webhook_receipts_connection_id_provi_d62a0602 unique (connection_id, provider_event_id),
  constraint uq_integration_webhook_receipts_connection_id_payload_hash unique (connection_id, payload_hash)
);
-- END 20260708220623_m06_eventing_integration

-- BEGIN 20260708220646_m07_intelligence_governance
-- Remote SQL SHA-256: a7d38985210f460913a90579a828453bd6d6c3ee0d80bb774e07598d961b4f7b
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
-- END 20260708220646_m07_intelligence_governance

-- BEGIN 20260708220719_m08a_enable_rls
-- Remote SQL SHA-256: 9c6de9fcf70bca1da6b3949f7955968ff6f257a27dbcf6c0bf9acde94641afd1
set lock_timeout = '5s';
set statement_timeout = '5min';

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
-- END 20260708220719_m08a_enable_rls

-- BEGIN 20260708220755_m08b_harden_trigger_functions
-- Remote SQL SHA-256: ad4360c6a1c02e27f196e1a2e4075d1fbadb46c542863ffa200e52b829f17710
create or replace function governance.set_updated_at() returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create or replace function governance.reject_mutation() returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'table %.% is append-only', tg_table_schema, tg_table_name;
end
$$;
-- END 20260708220755_m08b_harden_trigger_functions

-- BEGIN 20260708221428_m08c_foreign_keys_part_1
-- Remote SQL SHA-256: eb21882015dd49e168eb68f4c4d115e8da465f456068f1043e426ca3a5916d8a
set lock_timeout = '5s';
set statement_timeout = '5min';

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
-- END 20260708221428_m08c_foreign_keys_part_1

-- BEGIN 20260708221457_m08c_foreign_keys_part_2
-- Remote SQL SHA-256: b1ebab75a01f1fb12f43832a56f4e0bad934857e8e3fcc204b46bd9da7e8c2f0
set lock_timeout = '5s';
set statement_timeout = '5min';

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
-- END 20260708221457_m08c_foreign_keys_part_2

-- BEGIN 20260708221522_m08c_foreign_keys_part_3
-- Remote SQL SHA-256: 1a9c24a07f933bd03eb445e687dfe53e23da20ea9ad4ece03203333c9a26f7c6
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
-- END 20260708221522_m08c_foreign_keys_part_3

-- BEGIN 20260708221551_m08d_integrity_indexes_triggers
-- Remote SQL SHA-256: 330fb16615e12da05acaed982a5fe0097c99b5438924c885aed94d5c1575c5da
set lock_timeout = '5s';
set statement_timeout = '5min';

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

create unique index uq_iam_global_role_code on iam.role_definitions(code) where organization_id is null;
create unique index uq_iam_org_role_code on iam.role_definitions(organization_id, code) where organization_id is not null;
create unique index uq_orchestration_enrollment_scope on orchestration.enrollments(entrepreneur_id, coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid), journey_version_id, coalesce(cohort_id, '00000000-0000-0000-0000-000000000000'::uuid));
create unique index uq_engagement_point_balance_scope on engagement.point_balance_projections(entrepreneur_id, coalesce(journey_instance_id, '00000000-0000-0000-0000-000000000000'::uuid));
create unique index uq_engagement_streak_scope on engagement.streak_projections(entrepreneur_id, coalesce(journey_instance_id, '00000000-0000-0000-0000-000000000000'::uuid), streak_type);
create unique index uq_eventing_aggregate_version on eventing.events(aggregate_type, aggregate_id, aggregate_version) where aggregate_id is not null and aggregate_version is not null;
create unique index uq_integration_provider_event on integration.webhook_receipts(connection_id, provider_event_id) where provider_event_id is not null;

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
create trigger trg_diagnostics_responses_append_only before update or delete on diagnostics.responses for each row execute function governance.reject_mutation();
create trigger trg_engagement_point_ledger_append_only before update or delete on engagement.point_ledger for each row execute function governance.reject_mutation();
create trigger trg_eventing_events_append_only before update or delete on eventing.events for each row execute function governance.reject_mutation();
create trigger trg_eventing_delivery_attempts_append_only before update or delete on eventing.delivery_attempts for each row execute function governance.reject_mutation();
create trigger trg_integration_sync_attempts_append_only before update or delete on integration.sync_attempts for each row execute function governance.reject_mutation();
create trigger trg_governance_consent_records_append_only before update or delete on governance.consent_records for each row execute function governance.reject_mutation();
create trigger trg_governance_audit_log_append_only before update or delete on governance.audit_log for each row execute function governance.reject_mutation();
-- END 20260708221551_m08d_integrity_indexes_triggers

-- BEGIN 20260708221622_m08e_identity_authorization
-- Remote SQL SHA-256: db0ef63b122e574d7faa8c745bf5fb46441306825f377c32385fef4d8cc8a5db
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
-- END 20260708221622_m08e_identity_authorization

-- BEGIN 20260708221643_m08f_rls_identity_core
-- Remote SQL SHA-256: 16dfed0e72dd6911192c62653094403932f5e682f8a45e83e50de2de0d419049
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
-- END 20260708221643_m08f_rls_identity_core

-- BEGIN 20260708221703_m08g_rls_journey_diagnostics
-- Remote SQL SHA-256: 7ae226a69937dc86c74d4bc16fff499167ef7179dc12b064c811728fcd3e847b
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
-- END 20260708221703_m08g_rls_journey_diagnostics

-- BEGIN 20260708221724_m08h_rls_assessment_engagement_intervention
-- Remote SQL SHA-256: b7f48db0ef41065fe3e5a203a397591d308b385471b9fe980eab9ed1b122b560
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
-- END 20260708221724_m08h_rls_assessment_engagement_intervention

-- BEGIN 20260708221743_m08i_rls_integration_intelligence_governance
-- Remote SQL SHA-256: e8f4bc7978ab888a8b78f182662a44172cdcc3639861b0c8141ac978944b789d
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
-- END 20260708221743_m08i_rls_integration_intelligence_governance

-- BEGIN 20260708221802_m08j_transactional_outbox_privileges
-- Remote SQL SHA-256: 5fe3f65c6222ce593581b4d97760bd77114d657ad3e029e7e569bcd0ce25cbc8
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
  v_payload_hash := encode(digest(convert_to(coalesce(p_payload, '{}'::jsonb)::text, 'UTF8'), 'sha256'), 'hex');

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

revoke all on all tables in schema eventing, integration, intelligence, governance from public;
revoke all on all functions in schema app_private from public;
revoke all on function iam.resolve_external_identity(text, text, text, text, boolean, text) from public;
revoke all on function iam.link_external_identity(uuid, text, text, text, text, boolean, text) from public;
-- END 20260708221802_m08j_transactional_outbox_privileges

-- BEGIN 20260708221848_m08k_runtime_roles_and_grants
-- Remote SQL SHA-256: 737264369069bfefe5914fc0ca3b27443911ae721adcf4e08b86996ce908f0dd
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime nologin nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_worker') then
    create role app_worker nologin nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_readonly') then
    create role app_readonly nologin nobypassrls;
  end if;
end $$;

grant usage on schema app_private, iam, core, catalog, orchestration, diagnostics, assessment, engagement, intervention to app_runtime;
grant select on all tables in schema catalog to app_runtime;
grant select, insert, update, delete on iam.user_accounts, iam.external_identities, iam.organizations, iam.organization_memberships, iam.membership_roles to app_runtime;
grant select, insert, update, delete on core.entrepreneurs, core.businesses, core.business_memberships, core.file_objects to app_runtime;
grant select, insert, update, delete on orchestration.enrollments, orchestration.journey_instances, orchestration.path_assignments, orchestration.step_instances, orchestration.activity_sessions, orchestration.progress_projections, orchestration.personalization_decisions to app_runtime;
grant select, insert, update, delete on diagnostics.sessions, diagnostics.responses, diagnostics.results, diagnostics.dimension_results, diagnostics.segment_assignments, diagnostics.archetype_assignments to app_runtime;
grant select, insert, update, delete on assessment.attempts, assessment.responses, assessment.results, assessment.submissions, assessment.submission_evidence, assessment.reviews, assessment.review_scores to app_runtime;
grant select, insert, update, delete on engagement.point_ledger, engagement.point_balance_projections, engagement.badge_awards, engagement.certificate_issuances, engagement.streak_projections to app_runtime;
grant select, insert, update, delete on intervention.instances, intervention.delivery_attempts, intervention.responses to app_runtime;
grant execute on all functions in schema app_private to app_runtime;
grant execute on function iam.resolve_external_identity(text,text,text,text,boolean,text) to app_runtime;

grant usage on schema app_private, iam, core, catalog, orchestration, diagnostics, assessment, engagement, intervention, eventing, integration, intelligence, governance to app_worker;
grant select, insert, update, delete on all tables in schema iam, core, catalog, orchestration, diagnostics, assessment, engagement, intervention, eventing, integration, intelligence, governance to app_worker;
grant execute on all functions in schema app_private, iam, eventing to app_worker;

grant usage on schema catalog, reporting to app_readonly;
grant select on all tables in schema catalog, reporting to app_readonly;
-- END 20260708221848_m08k_runtime_roles_and_grants

-- BEGIN 20260708221922_m08l_test_executor_role_membership
-- Remote SQL SHA-256: e41d21398a23274c8ca82871e1ca80b8c18279410182a03b22deafef9425aec9
grant app_runtime to postgres;
grant app_worker to postgres;
grant app_readonly to postgres;
-- END 20260708221922_m08l_test_executor_role_membership

-- BEGIN 20260708222008_m08m_fix_pgcrypto_schema_qualification
-- Remote SQL SHA-256: 40742b7d1fff809b59c18f7b946ca3f379fe67ef6f96631de97ae2dce676279e
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
-- END 20260708222008_m08m_fix_pgcrypto_schema_qualification

-- BEGIN 20260708222033_m08n_grant_pgcrypto_digest_to_worker
-- Remote SQL SHA-256: 29ec9039107a8a0bad8dd51f2da38cc31b18388b35c41bebda251089e26b01e8
grant usage on schema extensions to app_worker;
grant execute on function extensions.digest(bytea, text) to app_worker;
-- END 20260708222033_m08n_grant_pgcrypto_digest_to_worker

-- BEGIN 20260708222345_m08o_split_all_policies_by_command
-- Remote SQL SHA-256: db578e51bbe6fa7c175e50a880fde000703b96e4870ef2cc1682f54d7d4eb5db
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
-- END 20260708222345_m08o_split_all_policies_by_command

-- BEGIN 20260708222355_m08p_cover_unindexed_foreign_keys
-- Remote SQL SHA-256: 5c9d3b4adca307754e9d923f0e6fe43d486f5ec7dfad4df36a511a3ef3394f3e
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
-- END 20260708222355_m08p_cover_unindexed_foreign_keys

-- BEGIN 20260708223937_m09_storage_lifecycle
-- Remote SQL SHA-256: 7f0d6033bdc9de4cd6ad38d45868a7f60cc474504098508a6a25ff9293564ce8
-- M09 — Provider-neutral file lifecycle, upload intents, quarantine and scan state.
-- The storage schema is intentionally treated as read-only. Binary operations
-- must be performed through the provider API by an ObjectStorageProvider adapter.

set lock_timeout = '5s';
set statement_timeout = '5min';

alter table core.file_objects drop constraint if exists uq_core_file_objects_sha256_size_bytes;
create index if not exists ix_core_file_objects_sha256_size_bytes on core.file_objects (sha256, size_bytes);

alter table core.file_objects
  add column if not exists upload_intent_id uuid,
  add column if not exists created_by_user_account_id uuid,
  add column if not exists original_filename text,
  add column if not exists provider_object_version text,
  add column if not exists etag text,
  add column if not exists verified_at timestamptz,
  add column if not exists quarantined_at timestamptz,
  add column if not exists scan_completed_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table core.file_upload_profiles (
  code text primary key,
  description text not null,
  allowed_mime_types text[] not null,
  allowed_extensions text[] not null,
  max_size_bytes bigint not null,
  retention_class text not null,
  requires_malware_scan boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_core_file_upload_profiles_code check (code ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  constraint ck_core_file_upload_profiles_mime_types check (cardinality(allowed_mime_types) > 0),
  constraint ck_core_file_upload_profiles_extensions check (cardinality(allowed_extensions) > 0),
  constraint ck_core_file_upload_profiles_max_size check (max_size_bytes > 0),
  constraint ck_core_file_upload_profiles_status check (status in ('active','disabled'))
);

comment on table core.file_upload_profiles is 'Environment-independent upload policy. Physical provider and bucket remain adapter configuration.';

create table core.file_upload_intents (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null,
  requested_by_user_account_id uuid not null,
  requested_by_entrepreneur_id uuid,
  upload_profile_code text not null,
  storage_provider text not null,
  bucket text not null,
  object_key text not null,
  original_filename text not null,
  expected_content_type text not null,
  max_size_bytes bigint not null,
  retention_class text not null,
  status text not null default 'pending_upload',
  expires_at timestamptz not null,
  uploaded_at timestamptz,
  confirmed_at timestamptz,
  aborted_at timestamptz,
  file_object_id uuid,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_core_file_upload_intents_provider_object unique (storage_provider, bucket, object_key),
  constraint uq_core_file_upload_intents_file_object unique (file_object_id),
  constraint ck_core_file_upload_intents_status check (status in ('pending_upload','uploaded','confirmed','aborted','expired','rejected')),
  constraint ck_core_file_upload_intents_size check (max_size_bytes > 0),
  constraint ck_core_file_upload_intents_expiry check (expires_at > created_at)
);

comment on table core.file_upload_intents is 'Short-lived application authorization for one immutable object key. Provider signed URLs may live longer; expired intents are never accepted.';

create table core.file_security_scans (
  id uuid primary key default gen_random_uuid(),
  file_object_id uuid not null,
  scanner_provider text not null,
  scanner_version text,
  scan_status text not null,
  threats jsonb not null default '[]'::jsonb,
  status_reasons jsonb not null default '[]'::jsonb,
  provider_reference text,
  started_at timestamptz,
  completed_at timestamptz not null default now(),
  source_event_id uuid,
  created_at timestamptz not null default now(),
  constraint ck_core_file_security_scans_status check (scan_status in ('clean','infected','unsupported','access_denied','failed','manual_review')),
  constraint ck_core_file_security_scans_dates check (started_at is null or completed_at >= started_at)
);

comment on table core.file_security_scans is 'Append-only normalized scan outcomes. Provider-specific result payloads are reduced to governed fields.';

alter table core.file_objects
  add constraint fk_core_file_objects_upload_intent_id foreign key (upload_intent_id) references core.file_upload_intents(id),
  add constraint fk_core_file_objects_created_by_user_account_id foreign key (created_by_user_account_id) references iam.user_accounts(id),
  add constraint uq_core_file_objects_upload_intent_id unique (upload_intent_id),
  add constraint ck_core_file_objects_sha256 check (sha256 ~ '^[a-f0-9]{64}$'),
  add constraint ck_core_file_objects_security_status check (security_status in ('quarantined','scan_pending','release_pending','clean','infected','manual_review','rejected','deleted'));

alter table core.file_upload_intents
  add constraint fk_core_file_upload_intents_owner_organization_id foreign key (owner_organization_id) references iam.organizations(id),
  add constraint fk_core_file_upload_intents_requested_by_user_account_id foreign key (requested_by_user_account_id) references iam.user_accounts(id),
  add constraint fk_core_file_upload_intents_requested_by_entrepreneur_id foreign key (requested_by_entrepreneur_id) references core.entrepreneurs(id),
  add constraint fk_core_file_upload_intents_upload_profile_code foreign key (upload_profile_code) references core.file_upload_profiles(code),
  add constraint fk_core_file_upload_intents_file_object_id foreign key (file_object_id) references core.file_objects(id);

alter table core.file_security_scans
  add constraint fk_core_file_security_scans_file_object_id foreign key (file_object_id) references core.file_objects(id),
  add constraint fk_core_file_security_scans_source_event_id foreign key (source_event_id) references eventing.events(event_id);

create index ix_core_file_upload_intents_requester_status on core.file_upload_intents (requested_by_user_account_id, status, created_at desc);
create index ix_core_file_upload_intents_expires_at_pending on core.file_upload_intents (expires_at) where status = 'pending_upload';
create index ix_core_file_upload_intents_owner_org_status on core.file_upload_intents (owner_organization_id, status, created_at desc);
create index ix_core_file_security_scans_file_completed on core.file_security_scans (file_object_id, completed_at desc);
create index ix_core_file_objects_created_by_status on core.file_objects (created_by_user_account_id, security_status, created_at desc);

create trigger trg_core_file_upload_profiles_updated_at before update on core.file_upload_profiles for each row execute function governance.set_updated_at();
create trigger trg_core_file_upload_intents_updated_at before update on core.file_upload_intents for each row execute function governance.set_updated_at();
create trigger trg_core_file_security_scans_append_only before update or delete on core.file_security_scans for each row execute function governance.reject_mutation();

insert into core.file_upload_profiles(code, description, allowed_mime_types, allowed_extensions, max_size_bytes, retention_class, requires_malware_scan, status)
values ('e12_storage_proof','Technical proof only; not a product upload policy',array['text/plain','application/pdf','image/png','image/jpeg'],array['txt','pdf','png','jpg','jpeg'],5242880,'test_ephemeral',true,'active')
on conflict (code) do update set description=excluded.description, allowed_mime_types=excluded.allowed_mime_types, allowed_extensions=excluded.allowed_extensions, max_size_bytes=excluded.max_size_bytes, retention_class=excluded.retention_class, requires_malware_scan=excluded.requires_malware_scan, status=excluded.status;

create or replace function app_private.safe_object_filename(p_filename text)
returns text language plpgsql immutable security invoker set search_path = pg_catalog as $$
declare v_name text;
begin
  v_name := regexp_replace(coalesce(p_filename, ''), '^.*[\\/]', '');
  v_name := lower(trim(v_name));
  v_name := regexp_replace(v_name, '[^a-z0-9._-]+', '-', 'g');
  v_name := regexp_replace(v_name, '(^[-._]+|[-._]+$)', '', 'g');
  if length(v_name) = 0 then v_name := 'file.bin'; end if;
  return left(v_name, 120);
end; $$;

create or replace function app_private.can_access_file_upload_intent(p_intent_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select app_private.is_trusted_worker()
      or exists (select 1 from core.file_upload_intents i where i.id=p_intent_id and (i.requested_by_user_account_id=app_private.current_user_account_id() or app_private.has_permission('file.manage',i.owner_organization_id,'file_upload_intent',i.id)));
$$;

create or replace function app_private.can_manage_file_upload_intent(p_intent_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select app_private.is_trusted_worker()
      or exists (select 1 from core.file_upload_intents i where i.id=p_intent_id and app_private.has_permission('file.manage',i.owner_organization_id,'file_upload_intent',i.id));
$$;

create or replace function app_private.can_access_file_object(p_file_object_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select app_private.is_trusted_worker()
      or exists (select 1 from core.file_objects f where f.id=p_file_object_id and f.created_by_user_account_id=app_private.current_user_account_id())
      or exists (select 1 from assessment.submission_evidence se join assessment.submissions s on s.id=se.submission_id where se.file_object_id=p_file_object_id and s.entrepreneur_id=app_private.current_entrepreneur_id())
      or exists (select 1 from core.file_objects f where f.id=p_file_object_id and app_private.has_permission('file.manage',f.owner_organization_id,'file_object',f.id));
$$;

alter table core.file_upload_profiles enable row level security;
alter table core.file_upload_intents enable row level security;
alter table core.file_security_scans enable row level security;

create policy file_upload_profiles_read_runtime on core.file_upload_profiles for select to app_runtime, app_worker using (status='active' or app_private.is_trusted_worker());
create policy file_upload_profiles_worker_insert on core.file_upload_profiles for insert to app_worker with check (app_private.is_trusted_worker());
create policy file_upload_profiles_worker_update on core.file_upload_profiles for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy file_upload_profiles_worker_delete on core.file_upload_profiles for delete to app_worker using (app_private.is_trusted_worker());
create policy file_upload_intents_select_authorized on core.file_upload_intents for select to app_runtime, app_worker using (app_private.can_access_file_upload_intent(id));
create policy file_upload_intents_insert_authorized on core.file_upload_intents for insert to app_runtime, app_worker with check (app_private.is_trusted_worker() or requested_by_user_account_id=app_private.current_user_account_id());
create policy file_upload_intents_update_authorized on core.file_upload_intents for update to app_runtime, app_worker using (app_private.can_access_file_upload_intent(id)) with check (app_private.can_access_file_upload_intent(id));
create policy file_upload_intents_delete_worker on core.file_upload_intents for delete to app_worker using (app_private.is_trusted_worker());
create policy file_security_scans_select_authorized on core.file_security_scans for select to app_runtime, app_worker using (app_private.can_access_file_object(file_object_id));
create policy file_security_scans_insert_worker on core.file_security_scans for insert to app_worker with check (app_private.is_trusted_worker());

create or replace function public.file_create_upload_intent(
  p_provider text,p_issuer text,p_subject text,p_email_normalized text,p_email_verified boolean,p_claims_fingerprint text,
  p_owner_organization_id uuid,p_requested_by_entrepreneur_id uuid,p_upload_profile_code text,p_storage_provider text,p_bucket text,
  p_original_filename text,p_expected_content_type text,p_ttl_seconds integer default 900
) returns table(intent_id uuid,bucket text,object_key text,expected_content_type text,max_size_bytes bigint,expires_at timestamptz)
language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_account_id uuid; v_self_entrepreneur_id uuid; v_profile core.file_upload_profiles%rowtype;
  v_intent_id uuid:=gen_random_uuid(); v_safe_name text; v_extension text; v_authorized boolean:=false;
begin
  if p_ttl_seconds < 60 or p_ttl_seconds > 7200 then raise exception 'invalid_upload_intent_ttl' using errcode='22023'; end if;
  if p_storage_provider not in ('supabase_storage','s3') then raise exception 'unsupported_storage_provider' using errcode='22023'; end if;
  if p_bucket is null or length(trim(p_bucket))=0 then raise exception 'bucket_required' using errcode='22023'; end if;
  v_account_id:=iam.resolve_external_identity(p_provider,p_issuer,p_subject,p_email_normalized,p_email_verified,p_claims_fingerprint);
  perform app_private.set_request_context(v_account_id,p_owner_organization_id,'file-upload-intent','user');
  select * into v_profile from core.file_upload_profiles where code=p_upload_profile_code and status='active';
  if not found then raise exception 'upload_profile_not_found' using errcode='P0002'; end if;
  select id into v_self_entrepreneur_id from core.entrepreneurs where user_account_id=v_account_id and status='active' limit 1;
  if p_requested_by_entrepreneur_id is not null and p_requested_by_entrepreneur_id is distinct from v_self_entrepreneur_id then raise exception 'entrepreneur_identity_mismatch' using errcode='28000'; end if;
  v_authorized:=app_private.has_permission('file.manage',p_owner_organization_id,'organization',p_owner_organization_id);
  if not v_authorized and v_self_entrepreneur_id is not null then
    select exists(select 1 from orchestration.enrollments e join catalog.journey_versions jv on jv.id=e.journey_version_id join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where e.entrepreneur_id=v_self_entrepreneur_id and jd.owner_organization_id=p_owner_organization_id and e.status in ('assigned','active','paused','completed')) into v_authorized;
  end if;
  if not v_authorized then raise exception 'file_upload_not_authorized' using errcode='28000'; end if;
  if not lower(trim(p_expected_content_type))=any(v_profile.allowed_mime_types) then raise exception 'content_type_not_allowed' using errcode='22023'; end if;
  v_safe_name:=app_private.safe_object_filename(p_original_filename);
  v_extension:=lower(regexp_replace(v_safe_name,'^.*\.',''));
  if v_extension=v_safe_name or not v_extension=any(v_profile.allowed_extensions) then raise exception 'file_extension_not_allowed' using errcode='22023'; end if;
  insert into core.file_upload_intents(id,owner_organization_id,requested_by_user_account_id,requested_by_entrepreneur_id,upload_profile_code,storage_provider,bucket,object_key,original_filename,expected_content_type,max_size_bytes,retention_class,status,expires_at)
  values(v_intent_id,p_owner_organization_id,v_account_id,coalesce(p_requested_by_entrepreneur_id,v_self_entrepreneur_id),v_profile.code,p_storage_provider,trim(p_bucket),'quarantine/'||p_owner_organization_id::text||'/'||v_account_id::text||'/'||v_intent_id::text||'/'||v_safe_name,v_safe_name,lower(trim(p_expected_content_type)),v_profile.max_size_bytes,v_profile.retention_class,'pending_upload',now()+make_interval(secs=>p_ttl_seconds));
  return query select i.id,i.bucket,i.object_key,i.expected_content_type,i.max_size_bytes,i.expires_at from core.file_upload_intents i where i.id=v_intent_id;
end; $$;

create or replace function public.file_get_upload_intent(p_provider text,p_issuer text,p_subject text,p_email_normalized text,p_email_verified boolean,p_claims_fingerprint text,p_intent_id uuid)
returns table(intent_id uuid,owner_organization_id uuid,upload_profile_code text,storage_provider text,bucket text,object_key text,expected_content_type text,max_size_bytes bigint,expires_at timestamptz,status text)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_account_id uuid; v_org_id uuid;
begin
  v_account_id:=iam.resolve_external_identity(p_provider,p_issuer,p_subject,p_email_normalized,p_email_verified,p_claims_fingerprint);
  select i.owner_organization_id into v_org_id from core.file_upload_intents i where i.id=p_intent_id;
  if v_org_id is null then raise exception 'upload_intent_not_found' using errcode='P0002'; end if;
  perform app_private.set_request_context(v_account_id,v_org_id,'file-upload-confirm','user');
  if not app_private.can_access_file_upload_intent(p_intent_id) then raise exception 'file_upload_not_authorized' using errcode='28000'; end if;
  return query select i.id,i.owner_organization_id,i.upload_profile_code,i.storage_provider,i.bucket,i.object_key,i.expected_content_type,i.max_size_bytes,i.expires_at,i.status from core.file_upload_intents i where i.id=p_intent_id;
end; $$;

create or replace function public.file_abort_upload_intent(p_intent_id uuid,p_failure_code text)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$ declare v_count integer; begin update core.file_upload_intents set status='aborted',aborted_at=now(),failure_code=left(coalesce(p_failure_code,'unknown'),120) where id=p_intent_id and status='pending_upload'; get diagnostics v_count=row_count; return v_count=1; end; $$;

create or replace function public.file_confirm_upload(
  p_provider text,p_issuer text,p_subject text,p_email_normalized text,p_email_verified boolean,p_claims_fingerprint text,
  p_intent_id uuid,p_actual_content_type text,p_actual_size_bytes bigint,p_sha256 text,p_provider_object_version text,p_etag text,p_metadata jsonb default '{}'::jsonb
) returns table(file_object_id uuid,security_status text,bucket text,object_key text,sha256 text,size_bytes bigint)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_account_id uuid; v_intent core.file_upload_intents%rowtype; v_file_id uuid:=gen_random_uuid();
begin
  if p_actual_size_bytes<0 then raise exception 'invalid_file_size' using errcode='22023'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'invalid_sha256' using errcode='22023'; end if;
  v_account_id:=iam.resolve_external_identity(p_provider,p_issuer,p_subject,p_email_normalized,p_email_verified,p_claims_fingerprint);
  select * into v_intent from core.file_upload_intents where id=p_intent_id for update;
  if not found then raise exception 'upload_intent_not_found' using errcode='P0002'; end if;
  perform app_private.set_request_context(v_account_id,v_intent.owner_organization_id,'file-upload-confirm','user');
  if v_intent.requested_by_user_account_id<>v_account_id and not app_private.has_permission('file.manage',v_intent.owner_organization_id,'file_upload_intent',v_intent.id) then raise exception 'file_upload_not_authorized' using errcode='28000'; end if;
  if v_intent.status<>'pending_upload' then raise exception 'upload_intent_not_pending' using errcode='55000'; end if;
  if v_intent.expires_at<=now() then update core.file_upload_intents set status='expired',failure_code='intent_expired' where id=v_intent.id; raise exception 'upload_intent_expired' using errcode='55000'; end if;
  if lower(trim(p_actual_content_type))<>v_intent.expected_content_type then update core.file_upload_intents set status='rejected',failure_code='content_type_mismatch' where id=v_intent.id; raise exception 'content_type_mismatch' using errcode='22023'; end if;
  if p_actual_size_bytes>v_intent.max_size_bytes then update core.file_upload_intents set status='rejected',failure_code='file_too_large' where id=v_intent.id; raise exception 'file_too_large' using errcode='22023'; end if;
  insert into core.file_objects(id,owner_organization_id,storage_provider,bucket,object_key,content_type,size_bytes,sha256,security_status,retention_class,upload_intent_id,created_by_user_account_id,original_filename,provider_object_version,etag,verified_at,quarantined_at,metadata)
  values(v_file_id,v_intent.owner_organization_id,v_intent.storage_provider,v_intent.bucket,v_intent.object_key,lower(trim(p_actual_content_type)),p_actual_size_bytes,p_sha256,'quarantined',v_intent.retention_class,v_intent.id,v_account_id,v_intent.original_filename,p_provider_object_version,p_etag,now(),now(),coalesce(p_metadata,'{}'::jsonb));
  update core.file_upload_intents set status='confirmed',uploaded_at=now(),confirmed_at=now(),file_object_id=v_file_id where id=v_intent.id;
  return query select f.id,f.security_status,f.bucket,f.object_key,f.sha256,f.size_bytes from core.file_objects f where f.id=v_file_id;
end; $$;

create or replace function public.file_record_scan_result(p_file_object_id uuid,p_scanner_provider text,p_scanner_version text,p_scan_status text,p_threats jsonb,p_status_reasons jsonb,p_provider_reference text,p_started_at timestamptz,p_completed_at timestamptz)
returns table(file_object_id uuid,source_bucket text,source_object_key text,target_object_key text,next_security_status text)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_file core.file_objects%rowtype; v_next text; v_target text;
begin
  if p_scan_status not in ('clean','infected','unsupported','access_denied','failed','manual_review') then raise exception 'invalid_scan_status' using errcode='22023'; end if;
  select * into v_file from core.file_objects where id=p_file_object_id for update;
  if not found then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  if v_file.security_status not in ('quarantined','scan_pending','manual_review') then raise exception 'file_not_scannable' using errcode='55000'; end if;
  insert into core.file_security_scans(file_object_id,scanner_provider,scanner_version,scan_status,threats,status_reasons,provider_reference,started_at,completed_at)
  values(p_file_object_id,trim(p_scanner_provider),nullif(trim(p_scanner_version),''),p_scan_status,coalesce(p_threats,'[]'::jsonb),coalesce(p_status_reasons,'[]'::jsonb),nullif(trim(p_provider_reference),''),p_started_at,coalesce(p_completed_at,now()));
  v_next:=case p_scan_status when 'clean' then 'release_pending' when 'infected' then 'infected' else 'manual_review' end;
  if p_scan_status='clean' then v_target:=regexp_replace(v_file.object_key,'^quarantine/','protected/'); if v_target=v_file.object_key then raise exception 'file_not_in_quarantine_prefix' using errcode='55000'; end if; end if;
  update core.file_objects set security_status=v_next,scan_completed_at=coalesce(p_completed_at,now()) where id=p_file_object_id;
  return query select v_file.id,v_file.bucket,v_file.object_key,v_target,v_next;
end; $$;

create or replace function public.file_complete_release(p_file_object_id uuid,p_target_object_key text,p_provider_object_version text,p_etag text)
returns table(file_object_id uuid,security_status text,bucket text,object_key text)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_file core.file_objects%rowtype; v_expected text;
begin
  select * into v_file from core.file_objects where id=p_file_object_id for update;
  if not found then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  if v_file.security_status<>'release_pending' then raise exception 'file_not_release_pending' using errcode='55000'; end if;
  v_expected:=regexp_replace(v_file.object_key,'^quarantine/','protected/');
  if p_target_object_key<>v_expected then raise exception 'invalid_release_target' using errcode='22023'; end if;
  update core.file_objects set object_key=p_target_object_key,provider_object_version=coalesce(p_provider_object_version,provider_object_version),etag=coalesce(p_etag,etag),security_status='clean',released_at=now() where id=p_file_object_id;
  return query select f.id,f.security_status,f.bucket,f.object_key from core.file_objects f where f.id=p_file_object_id;
end; $$;

create or replace function public.file_get_download_descriptor(p_provider text,p_issuer text,p_subject text,p_email_normalized text,p_email_verified boolean,p_claims_fingerprint text,p_file_object_id uuid)
returns table(file_object_id uuid,storage_provider text,bucket text,object_key text,content_type text,size_bytes bigint,sha256 text)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_account_id uuid; v_org_id uuid;
begin
  v_account_id:=iam.resolve_external_identity(p_provider,p_issuer,p_subject,p_email_normalized,p_email_verified,p_claims_fingerprint);
  select owner_organization_id into v_org_id from core.file_objects where id=p_file_object_id;
  if v_org_id is null then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  perform app_private.set_request_context(v_account_id,v_org_id,'file-download-intent','user');
  if not app_private.can_access_file_object(p_file_object_id) then raise exception 'file_download_not_authorized' using errcode='28000'; end if;
  return query select f.id,f.storage_provider,f.bucket,f.object_key,f.content_type,f.size_bytes,f.sha256 from core.file_objects f where f.id=p_file_object_id and f.security_status='clean' and f.deleted_at is null;
  if not found then raise exception 'file_not_downloadable' using errcode='55000'; end if;
end; $$;

revoke all on function public.file_create_upload_intent(text,text,text,text,boolean,text,uuid,uuid,text,text,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.file_get_upload_intent(text,text,text,text,boolean,text,uuid) from public,anon,authenticated;
revoke all on function public.file_abort_upload_intent(uuid,text) from public,anon,authenticated;
revoke all on function public.file_confirm_upload(text,text,text,text,boolean,text,uuid,text,bigint,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.file_record_scan_result(uuid,text,text,text,jsonb,jsonb,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.file_complete_release(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.file_get_download_descriptor(text,text,text,text,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.file_create_upload_intent(text,text,text,text,boolean,text,uuid,uuid,text,text,text,text,text,integer) to service_role;
grant execute on function public.file_get_upload_intent(text,text,text,text,boolean,text,uuid) to service_role;
grant execute on function public.file_abort_upload_intent(uuid,text) to service_role;
grant execute on function public.file_confirm_upload(text,text,text,text,boolean,text,uuid,text,bigint,text,text,text,jsonb) to service_role;
grant execute on function public.file_record_scan_result(uuid,text,text,text,jsonb,jsonb,text,timestamptz,timestamptz) to service_role;
grant execute on function public.file_complete_release(uuid,text,text,text) to service_role;
grant execute on function public.file_get_download_descriptor(text,text,text,text,boolean,text,uuid) to service_role;

grant select on core.file_upload_profiles to app_runtime;
grant select,insert,update on core.file_upload_intents to app_runtime;
grant select on core.file_security_scans to app_runtime;
grant select,insert,update,delete on core.file_upload_profiles,core.file_upload_intents,core.file_security_scans to app_worker;
grant execute on function app_private.safe_object_filename(text) to app_runtime,app_worker;
grant execute on function app_private.can_access_file_upload_intent(uuid) to app_runtime,app_worker;
grant execute on function app_private.can_manage_file_upload_intent(uuid) to app_runtime,app_worker;
-- END 20260708223937_m09_storage_lifecycle

-- BEGIN 20260708224117_m09a_enable_pg_net_for_storage_proof
-- Remote SQL SHA-256: 720ec83cb404dd730aac48a345a1c23e26773a93a221da0f686c24bb208f46a9
create extension if not exists pg_net with schema extensions;
-- END 20260708224117_m09a_enable_pg_net_for_storage_proof

-- BEGIN 20260708224236_m09b_enable_http_for_storage_proof
-- Remote SQL SHA-256: b5b79f616c8cc09827b263ca33c134a193821285b414e16488b6bd533cd7480b
create extension if not exists http with schema extensions;
-- END 20260708224236_m09b_enable_http_for_storage_proof

-- BEGIN 20260708224455_m09c_remove_proof_http_extensions
-- Remote SQL SHA-256: dccc897da942e079038b31c0f2aae10e58fe6f859bcf11ef812835aba9f27d57
drop extension if exists http;
drop extension if exists pg_net;
-- END 20260708224455_m09c_remove_proof_http_extensions

-- BEGIN 20260708224520_m09d_cover_storage_foreign_keys
-- Remote SQL SHA-256: 78e8e84263973af7ea7e83c40906493a9dc34fdefbc797ebf0dd8c56da8e7293
create index if not exists ix_core_file_security_scans_source_event_id on core.file_security_scans(source_event_id);
create index if not exists ix_core_file_upload_intents_entrepreneur_id on core.file_upload_intents(requested_by_entrepreneur_id);
create index if not exists ix_core_file_upload_intents_profile_code on core.file_upload_intents(upload_profile_code);
-- END 20260708224520_m09d_cover_storage_foreign_keys

-- BEGIN 20260708230247_m10a_enable_pgmq
-- Remote SQL SHA-256: 1b4e9c677d47ebe58edbcd0c920bd8ee2712f2953cc0ab28fe98cf52a5989d24
create extension if not exists pgmq;
-- END 20260708230247_m10a_enable_pgmq

-- BEGIN 20260708230607_m10b_queue_schema
-- Remote SQL SHA-256: 5f5bb7178e4192d462b0bc269bcd5eae383a24dedad9af13ce88b8e4223e98f6
-- Plataforma Estímulo — M10 — provider-neutral asynchronous jobs and PGMQ test adapter
-- Supabase test environment: PGMQ. AWS production target: SQS Standard + DLQ.
-- Application semantics are deliberately at-least-once and consumers must be idempotent.

set lock_timeout = '5s';
set statement_timeout = '5min';

create extension if not exists pgmq;

create table eventing.queue_definitions (
  code text primary key,
  provider text not null,
  provider_queue_name text not null,
  provider_dead_letter_queue_name text not null,
  message_schema_version integer not null default 1,
  visibility_timeout_seconds integer not null,
  max_receive_count integer not null,
  max_batch_size integer not null,
  retention_seconds integer not null,
  retry_policy jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_eventing_queue_definitions_provider_queue unique (provider, provider_queue_name),
  constraint ck_eventing_queue_definitions_code check (code ~ '^[a-z][a-z0-9_]{1,62}$'),
  constraint ck_eventing_queue_definitions_provider check (provider in ('pgmq','sqs')),
  constraint ck_eventing_queue_definitions_message_version check (message_schema_version > 0),
  constraint ck_eventing_queue_definitions_visibility check (visibility_timeout_seconds between 1 and 43200),
  constraint ck_eventing_queue_definitions_receive_count check (max_receive_count between 1 and 1000),
  constraint ck_eventing_queue_definitions_batch_size check (max_batch_size between 1 and 10),
  constraint ck_eventing_queue_definitions_retention check (retention_seconds between 60 and 1209600),
  constraint ck_eventing_queue_definitions_status check (status in ('active','paused','disabled'))
);

create table eventing.queue_jobs (
  id uuid primary key default gen_random_uuid(),
  queue_code text not null,
  job_type text not null,
  job_version integer not null default 1,
  deduplication_key text not null,
  source_event_id uuid,
  organization_id uuid,
  subject_type text,
  subject_id uuid,
  payload jsonb not null,
  payload_hash text not null,
  status text not null default 'created',
  provider text not null,
  provider_queue_name text not null,
  provider_message_id text,
  available_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  max_attempts integer not null,
  last_error_code text,
  last_error_details jsonb not null default '{}'::jsonb,
  enqueued_at timestamptz,
  last_received_at timestamptz,
  completed_at timestamptz,
  dead_lettered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_eventing_queue_jobs_deduplication unique (queue_code, deduplication_key),
  constraint ck_eventing_queue_jobs_job_type check (job_type ~ '^[a-z][a-z0-9_.-]{2,119}$'),
  constraint ck_eventing_queue_jobs_job_version check (job_version > 0),
  constraint ck_eventing_queue_jobs_deduplication_key check (length(deduplication_key) between 1 and 240),
  constraint ck_eventing_queue_jobs_payload_hash check (payload_hash ~ '^[a-f0-9]{64}$'),
  constraint ck_eventing_queue_jobs_status check (status in ('created','queued','in_flight','retry_scheduled','completed','dead_lettered','cancelled')),
  constraint ck_eventing_queue_jobs_attempt_count check (attempt_count >= 0),
  constraint ck_eventing_queue_jobs_max_attempts check (max_attempts > 0)
);

create unique index uq_eventing_queue_jobs_provider_message
  on eventing.queue_jobs(provider, provider_queue_name, provider_message_id)
  where provider_message_id is not null;

create table eventing.queue_receipts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  queue_code text not null,
  provider_message_id text not null,
  worker_id text not null,
  receive_count integer not null,
  received_at timestamptz not null default now(),
  visibility_deadline timestamptz not null,
  status text not null default 'in_flight',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ck_eventing_queue_receipts_worker_id check (length(trim(worker_id)) between 1 and 160),
  constraint ck_eventing_queue_receipts_receive_count check (receive_count > 0),
  constraint ck_eventing_queue_receipts_visibility check (visibility_deadline >= received_at),
  constraint ck_eventing_queue_receipts_status check (status in ('in_flight','acked','released','expired','dead_lettered','superseded'))
);

create table eventing.queue_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  receipt_id uuid not null,
  attempt_number integer not null,
  worker_id text not null,
  started_at timestamptz not null,
  visibility_deadline timestamptz not null,
  finished_at timestamptz,
  outcome text not null default 'processing',
  error_code text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint uq_eventing_queue_attempts_receipt unique (receipt_id),
  constraint ck_eventing_queue_attempts_number check (attempt_number > 0),
  constraint ck_eventing_queue_attempts_outcome check (outcome in ('processing','succeeded','retry_scheduled','visibility_expired','dead_lettered','duplicate_suppressed','failed')),
  constraint ck_eventing_queue_attempts_dates check (finished_at is null or finished_at >= started_at)
);

create table eventing.queue_dead_letters (
  id uuid primary key default gen_random_uuid(),
  job_id uuid,
  source_queue_code text not null,
  provider_source_message_id text,
  provider_dead_letter_message_id text,
  receive_count integer not null,
  reason_code text not null,
  reason_details jsonb not null default '{}'::jsonb,
  message_snapshot jsonb not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  redriven_at timestamptz,
  resolved_at timestamptz,
  resolution text,
  constraint ck_eventing_queue_dead_letters_receive_count check (receive_count >= 0),
  constraint ck_eventing_queue_dead_letters_status check (status in ('open','redriven','resolved','discarded'))
);

create unique index uq_eventing_queue_dead_letters_open_job
  on eventing.queue_dead_letters(job_id)
  where job_id is not null and status = 'open';

alter table eventing.queue_jobs
  add constraint fk_eventing_queue_jobs_queue_code foreign key (queue_code) references eventing.queue_definitions(code),
  add constraint fk_eventing_queue_jobs_source_event_id foreign key (source_event_id) references eventing.events(event_id),
  add constraint fk_eventing_queue_jobs_organization_id foreign key (organization_id) references iam.organizations(id);

alter table eventing.queue_receipts
  add constraint fk_eventing_queue_receipts_job_id foreign key (job_id) references eventing.queue_jobs(id),
  add constraint fk_eventing_queue_receipts_queue_code foreign key (queue_code) references eventing.queue_definitions(code);

alter table eventing.queue_attempts
  add constraint fk_eventing_queue_attempts_job_id foreign key (job_id) references eventing.queue_jobs(id),
  add constraint fk_eventing_queue_attempts_receipt_id foreign key (receipt_id) references eventing.queue_receipts(id);

alter table eventing.queue_dead_letters
  add constraint fk_eventing_queue_dead_letters_job_id foreign key (job_id) references eventing.queue_jobs(id),
  add constraint fk_eventing_queue_dead_letters_source_queue_code foreign key (source_queue_code) references eventing.queue_definitions(code);

create index ix_eventing_queue_jobs_status_available on eventing.queue_jobs(queue_code, status, available_at, created_at);
create index ix_eventing_queue_jobs_subject on eventing.queue_jobs(subject_type, subject_id, created_at desc);
create index ix_eventing_queue_jobs_source_event_id on eventing.queue_jobs(source_event_id);
create index ix_eventing_queue_jobs_organization_id on eventing.queue_jobs(organization_id);
create index ix_eventing_queue_receipts_job_status on eventing.queue_receipts(job_id, status, visibility_deadline desc);
create index ix_eventing_queue_receipts_worker_status on eventing.queue_receipts(worker_id, status, received_at desc);
create index ix_eventing_queue_receipts_queue_code on eventing.queue_receipts(queue_code);
create index ix_eventing_queue_attempts_job_started on eventing.queue_attempts(job_id, started_at desc);
create index ix_eventing_queue_dead_letters_queue_status on eventing.queue_dead_letters(source_queue_code, status, created_at);

create trigger trg_eventing_queue_definitions_updated_at before update on eventing.queue_definitions for each row execute function governance.set_updated_at();
create trigger trg_eventing_queue_jobs_updated_at before update on eventing.queue_jobs for each row execute function governance.set_updated_at();
create trigger trg_eventing_queue_attempts_append_only before delete on eventing.queue_attempts for each row execute function governance.reject_mutation();

alter table core.file_objects add column if not exists scan_job_id uuid;
alter table core.file_security_scans add column if not exists queue_job_id uuid;

alter table core.file_objects
  add constraint fk_core_file_objects_scan_job_id foreign key (scan_job_id) references eventing.queue_jobs(id),
  add constraint uq_core_file_objects_scan_job_id unique (scan_job_id);

alter table core.file_security_scans
  add constraint fk_core_file_security_scans_queue_job_id foreign key (queue_job_id) references eventing.queue_jobs(id),
  add constraint uq_core_file_security_scans_queue_job_id unique (queue_job_id);

create index ix_core_file_security_scans_queue_job_id on core.file_security_scans(queue_job_id);

do $$
begin
  if not exists (select 1 from pgmq.list_queues() where queue_name = 'estimulo_file_scan_jobs') then
    perform pgmq.create('estimulo_file_scan_jobs');
  end if;
  if not exists (select 1 from pgmq.list_queues() where queue_name = 'estimulo_file_scan_dlq') then
    perform pgmq.create('estimulo_file_scan_dlq');
  end if;
end $$;

insert into eventing.queue_definitions(
  code, provider, provider_queue_name, provider_dead_letter_queue_name,
  message_schema_version, visibility_timeout_seconds, max_receive_count,
  max_batch_size, retention_seconds, retry_policy, status
) values (
  'file_scan', 'pgmq', 'estimulo_file_scan_jobs', 'estimulo_file_scan_dlq',
  1, 120, 5, 10, 1209600,
  '{"strategy":"exponential","base_seconds":15,"maximum_seconds":900,"jitter":"full"}'::jsonb,
  'active'
) on conflict (code) do update set
  provider = excluded.provider,
  provider_queue_name = excluded.provider_queue_name,
  provider_dead_letter_queue_name = excluded.provider_dead_letter_queue_name,
  message_schema_version = excluded.message_schema_version,
  visibility_timeout_seconds = excluded.visibility_timeout_seconds,
  max_receive_count = excluded.max_receive_count,
  max_batch_size = excluded.max_batch_size,
  retention_seconds = excluded.retention_seconds,
  retry_policy = excluded.retry_policy,
  status = excluded.status;
-- END 20260708230607_m10b_queue_schema

-- BEGIN 20260708230651_m10c_queue_publish_deadletter
-- Remote SQL SHA-256: a66415c99a4066518459941b7f32ca53091416d946ece09a5aeef870d1000b9f
create or replace function eventing.queue_job_envelope(p_job_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'envelopeVersion', qd.message_schema_version,
    'jobId', j.id,
    'queueCode', j.queue_code,
    'jobType', j.job_type,
    'jobVersion', j.job_version,
    'deduplicationKey', j.deduplication_key,
    'sourceEventId', j.source_event_id,
    'organizationId', j.organization_id,
    'subjectType', j.subject_type,
    'subjectId', j.subject_id,
    'enqueuedAt', coalesce(j.enqueued_at, j.created_at),
    'payload', j.payload
  )
  from eventing.queue_jobs j
  join eventing.queue_definitions qd on qd.code = j.queue_code
  where j.id = p_job_id;
$$;

create or replace function eventing.enqueue_job(
  p_queue_code text,
  p_job_type text,
  p_job_version integer,
  p_deduplication_key text,
  p_source_event_id uuid,
  p_organization_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_payload jsonb,
  p_delay_seconds integer default 0
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_job_id uuid;
  v_message_id bigint;
  v_payload_hash text;
  v_existing_status text;
begin
  if p_job_version < 1 then raise exception 'invalid_job_version' using errcode='22023'; end if;
  if p_delay_seconds < 0 or p_delay_seconds > 900 then raise exception 'invalid_job_delay' using errcode='22023'; end if;
  if p_job_type is null or p_job_type !~ '^[a-z][a-z0-9_.-]{2,119}$' then raise exception 'invalid_job_type' using errcode='22023'; end if;
  if p_deduplication_key is null or length(p_deduplication_key) not between 1 and 240 then raise exception 'invalid_deduplication_key' using errcode='22023'; end if;

  select * into v_definition
  from eventing.queue_definitions
  where code = p_queue_code and status = 'active'
  for share;
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;

  v_payload_hash := encode(extensions.digest(convert_to(coalesce(p_payload,'{}'::jsonb)::text,'UTF8'),'sha256'),'hex');

  insert into eventing.queue_jobs(
    queue_code, job_type, job_version, deduplication_key,
    source_event_id, organization_id, subject_type, subject_id,
    payload, payload_hash, status, provider, provider_queue_name,
    available_at, max_attempts
  ) values (
    v_definition.code, p_job_type, p_job_version, p_deduplication_key,
    p_source_event_id, p_organization_id, p_subject_type, p_subject_id,
    coalesce(p_payload,'{}'::jsonb), v_payload_hash, 'created',
    v_definition.provider, v_definition.provider_queue_name,
    now() + make_interval(secs => p_delay_seconds), v_definition.max_receive_count
  ) on conflict (queue_code, deduplication_key) do nothing
  returning id into v_job_id;

  if v_job_id is null then
    select id, status into v_job_id, v_existing_status
    from eventing.queue_jobs
    where queue_code = p_queue_code and deduplication_key = p_deduplication_key;
    if v_existing_status = 'cancelled' then
      raise exception 'deduplicated_job_cancelled' using errcode='55000';
    end if;
    return v_job_id;
  end if;

  if v_definition.provider <> 'pgmq' then
    raise exception 'queue_provider_not_available_in_test_environment' using errcode='0A000';
  end if;

  select send into v_message_id
  from pgmq.send(
    v_definition.provider_queue_name,
    eventing.queue_job_envelope(v_job_id),
    jsonb_build_object(
      'job_id', v_job_id,
      'job_type', p_job_type,
      'deduplication_key', p_deduplication_key,
      'payload_hash', v_payload_hash
    ),
    p_delay_seconds
  ) limit 1;

  if v_message_id is null then raise exception 'queue_publish_failed' using errcode='58000'; end if;

  update eventing.queue_jobs
     set status='queued', provider_message_id=v_message_id::text,
         enqueued_at=now(), available_at=now()+make_interval(secs=>p_delay_seconds)
   where id=v_job_id;

  return v_job_id;
end;
$$;

create or replace function eventing.dead_letter_provider_message(
  p_queue_code text,
  p_job_id uuid,
  p_provider_message_id text,
  p_receive_count integer,
  p_reason_code text,
  p_reason_details jsonb,
  p_message_snapshot jsonb
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_dlq_message_id bigint;
  v_dead_letter_id uuid;
  v_archived boolean;
begin
  select * into v_definition from eventing.queue_definitions where code=p_queue_code for share;
  if not found then raise exception 'queue_definition_not_found' using errcode='P0002'; end if;
  if v_definition.provider <> 'pgmq' then raise exception 'queue_provider_not_available_in_test_environment' using errcode='0A000'; end if;

  select send into v_dlq_message_id
  from pgmq.send(
    v_definition.provider_dead_letter_queue_name,
    jsonb_build_object(
      'deadLetterVersion',1,
      'sourceQueueCode',p_queue_code,
      'sourceProviderMessageId',p_provider_message_id,
      'receiveCount',greatest(coalesce(p_receive_count,0),0),
      'reasonCode',left(coalesce(p_reason_code,'unknown'),120),
      'reasonDetails',coalesce(p_reason_details,'{}'::jsonb),
      'failedAt',now(),
      'message',coalesce(p_message_snapshot,'{}'::jsonb)
    )
  ) limit 1;

  if v_dlq_message_id is null then raise exception 'dead_letter_publish_failed' using errcode='58000'; end if;

  if p_provider_message_id is not null and p_provider_message_id ~ '^[0-9]+$' then
    select pgmq.archive(v_definition.provider_queue_name,p_provider_message_id::bigint) into v_archived;
  end if;

  insert into eventing.queue_dead_letters(
    job_id, source_queue_code, provider_source_message_id,
    provider_dead_letter_message_id, receive_count, reason_code,
    reason_details, message_snapshot, status
  ) values (
    p_job_id, p_queue_code, p_provider_message_id,
    v_dlq_message_id::text, greatest(coalesce(p_receive_count,0),0),
    left(coalesce(p_reason_code,'unknown'),120),
    coalesce(p_reason_details,'{}'::jsonb), coalesce(p_message_snapshot,'{}'::jsonb), 'open'
  ) on conflict (job_id) where job_id is not null and status='open'
  do update set
    provider_source_message_id=excluded.provider_source_message_id,
    provider_dead_letter_message_id=excluded.provider_dead_letter_message_id,
    receive_count=excluded.receive_count,
    reason_code=excluded.reason_code,
    reason_details=excluded.reason_details,
    message_snapshot=excluded.message_snapshot
  returning id into v_dead_letter_id;

  if p_job_id is not null then
    update eventing.queue_jobs
       set status='dead_lettered', dead_lettered_at=now(),
           last_error_code=left(coalesce(p_reason_code,'unknown'),120),
           last_error_details=coalesce(p_reason_details,'{}'::jsonb),
           attempt_count=greatest(attempt_count,coalesce(p_receive_count,0))
     where id=p_job_id;
  end if;

  return v_dead_letter_id;
end;
$$;
-- END 20260708230651_m10c_queue_publish_deadletter

-- BEGIN 20260708230712_m10d_queue_receive
-- Remote SQL SHA-256: ade1a65c27b61bf803096dc5806be9ed704b79ad8f91ed9677cbd86157aaa97d
create or replace function eventing.receive_jobs(
  p_queue_code text,
  p_worker_id text,
  p_batch_size integer default null,
  p_visibility_timeout_seconds integer default null
) returns table(
  receipt_handle uuid,
  job_id uuid,
  job_type text,
  job_version integer,
  receive_count integer,
  visibility_deadline timestamptz,
  enqueued_at timestamptz,
  payload jsonb,
  message_headers jsonb
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_message pgmq.message_record;
  v_job eventing.queue_jobs%rowtype;
  v_receipt_id uuid;
  v_batch_size integer;
  v_visibility integer;
  v_job_id uuid;
  v_attempt_id uuid;
begin
  if p_worker_id is null or length(trim(p_worker_id)) not between 1 and 160 then raise exception 'invalid_worker_id' using errcode='22023'; end if;
  select * into v_definition from eventing.queue_definitions where code=p_queue_code and status='active' for share;
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;
  if v_definition.provider <> 'pgmq' then raise exception 'queue_provider_not_available_in_test_environment' using errcode='0A000'; end if;
  v_batch_size := least(greatest(coalesce(p_batch_size,v_definition.max_batch_size),1),v_definition.max_batch_size);
  v_visibility := least(greatest(coalesce(p_visibility_timeout_seconds,v_definition.visibility_timeout_seconds),1),43200);

  for v_message in
    select * from pgmq.read(v_definition.provider_queue_name,v_visibility,v_batch_size)
  loop
    begin
      v_job_id := nullif(v_message.message->>'jobId','')::uuid;
    exception when others then
      v_job_id := null;
    end;

    if v_job_id is null then
      perform eventing.dead_letter_provider_message(
        p_queue_code,null,v_message.msg_id::text,v_message.read_ct,
        'invalid_job_envelope','{"field":"jobId"}'::jsonb,v_message.message
      );
      continue;
    end if;

    select * into v_job from eventing.queue_jobs where id=v_job_id for update;
    if not found then
      perform eventing.dead_letter_provider_message(
        p_queue_code,null,v_message.msg_id::text,v_message.read_ct,
        'orphan_provider_message',jsonb_build_object('jobId',v_job_id),v_message.message
      );
      continue;
    end if;

    update eventing.queue_receipts r
       set status='expired', completed_at=now()
     where r.job_id=v_job.id and r.status='in_flight' and r.visibility_deadline<=now();
    update eventing.queue_attempts a
       set outcome='visibility_expired', finished_at=now(), error_code=coalesce(a.error_code,'visibility_timeout')
     where a.job_id=v_job.id and a.outcome='processing'
       and exists (select 1 from eventing.queue_receipts r where r.id=a.receipt_id and r.status='expired');

    if v_job.status='completed' then
      perform pgmq.archive(v_definition.provider_queue_name,v_message.msg_id);
      continue;
    end if;
    if v_job.status='dead_lettered' then
      perform pgmq.archive(v_definition.provider_queue_name,v_message.msg_id);
      continue;
    end if;

    if v_message.read_ct > v_job.max_attempts then
      perform eventing.dead_letter_provider_message(
        p_queue_code,v_job.id,v_message.msg_id::text,v_message.read_ct,
        'max_receive_count_exceeded',jsonb_build_object('maxReceiveCount',v_job.max_attempts),v_message.message
      );
      continue;
    end if;

    v_receipt_id := gen_random_uuid();
    insert into eventing.queue_receipts(
      id,job_id,queue_code,provider_message_id,worker_id,
      receive_count,received_at,visibility_deadline,status
    ) values (
      v_receipt_id,v_job.id,p_queue_code,v_message.msg_id::text,trim(p_worker_id),
      v_message.read_ct,now(),v_message.vt,'in_flight'
    );

    insert into eventing.queue_attempts(
      job_id,receipt_id,attempt_number,worker_id,started_at,
      visibility_deadline,outcome,details
    ) values (
      v_job.id,v_receipt_id,v_message.read_ct,trim(p_worker_id),now(),
      v_message.vt,'processing',jsonb_build_object('providerMessageId',v_message.msg_id)
    ) returning id into v_attempt_id;

    update eventing.queue_jobs
       set status='in_flight', attempt_count=greatest(attempt_count,v_message.read_ct),
           last_received_at=now(), last_error_code=null, last_error_details='{}'::jsonb
     where id=v_job.id;

    receipt_handle := v_receipt_id;
    job_id := v_job.id;
    job_type := v_job.job_type;
    job_version := v_job.job_version;
    receive_count := v_message.read_ct;
    visibility_deadline := v_message.vt;
    enqueued_at := v_message.enqueued_at;
    payload := v_job.payload;
    message_headers := coalesce(v_message.headers,'{}'::jsonb);
    return next;
  end loop;
end;
$$;
-- END 20260708230712_m10d_queue_receive

-- BEGIN 20260708230740_m10e_queue_lifecycle
-- Remote SQL SHA-256: 5fc6f06cedde66ce423d2a8e98f3ab381a2a430fe54333b9d86f4a82f6cc8d02
create or replace function eventing.extend_job_visibility(
  p_receipt_handle uuid,
  p_worker_id text,
  p_visibility_timeout_seconds integer
) returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_receipt eventing.queue_receipts%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_message pgmq.message_record;
begin
  if p_visibility_timeout_seconds < 0 or p_visibility_timeout_seconds > 43200 then raise exception 'invalid_visibility_timeout' using errcode='22023'; end if;
  select * into v_receipt from eventing.queue_receipts where id=p_receipt_handle for update;
  if not found or v_receipt.worker_id<>trim(p_worker_id) or v_receipt.status<>'in_flight' then raise exception 'receipt_not_owned_or_inactive' using errcode='55000'; end if;
  select * into v_definition from eventing.queue_definitions where code=v_receipt.queue_code;
  select * into v_message from pgmq.set_vt(v_definition.provider_queue_name,v_receipt.provider_message_id::bigint,p_visibility_timeout_seconds) limit 1;
  if v_message.msg_id is null then raise exception 'provider_message_not_found' using errcode='P0002'; end if;
  update eventing.queue_receipts set visibility_deadline=v_message.vt where id=v_receipt.id;
  update eventing.queue_attempts set visibility_deadline=v_message.vt where receipt_id=v_receipt.id and outcome='processing';
  return v_message.vt;
end;
$$;

create or replace function eventing.ack_job(
  p_receipt_handle uuid,
  p_worker_id text,
  p_result_details jsonb default '{}'::jsonb
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_receipt eventing.queue_receipts%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_archived boolean;
begin
  select * into v_receipt from eventing.queue_receipts where id=p_receipt_handle for update;
  if not found then return false; end if;
  if v_receipt.worker_id<>trim(p_worker_id) then return false; end if;
  if v_receipt.status='acked' then return true; end if;
  if v_receipt.status<>'in_flight' then return false; end if;
  select * into v_definition from eventing.queue_definitions where code=v_receipt.queue_code;
  select pgmq.archive(v_definition.provider_queue_name,v_receipt.provider_message_id::bigint) into v_archived;
  if not coalesce(v_archived,false) then
    if exists(select 1 from eventing.queue_jobs where id=v_receipt.job_id and status='completed') then return true; end if;
    raise exception 'provider_ack_failed' using errcode='58000';
  end if;
  update eventing.queue_receipts set status='acked',completed_at=now() where id=v_receipt.id;
  update eventing.queue_attempts set outcome='succeeded',finished_at=now(),details=details||coalesce(p_result_details,'{}'::jsonb) where receipt_id=v_receipt.id and outcome='processing';
  update eventing.queue_jobs set status='completed',completed_at=now(),last_error_code=null,last_error_details='{}'::jsonb where id=v_receipt.job_id;
  return true;
end;
$$;

create or replace function eventing.dead_letter_job(
  p_receipt_handle uuid,
  p_worker_id text,
  p_reason_code text,
  p_reason_details jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_receipt eventing.queue_receipts%rowtype;
  v_job eventing.queue_jobs%rowtype;
  v_dead_letter_id uuid;
begin
  select * into v_receipt from eventing.queue_receipts where id=p_receipt_handle for update;
  if not found or v_receipt.worker_id<>trim(p_worker_id) or v_receipt.status<>'in_flight' then raise exception 'receipt_not_owned_or_inactive' using errcode='55000'; end if;
  select * into v_job from eventing.queue_jobs where id=v_receipt.job_id for update;
  v_dead_letter_id := eventing.dead_letter_provider_message(
    v_receipt.queue_code,v_job.id,v_receipt.provider_message_id,v_receipt.receive_count,
    p_reason_code,p_reason_details,eventing.queue_job_envelope(v_job.id)
  );
  update eventing.queue_receipts set status='dead_lettered',completed_at=now() where id=v_receipt.id;
  update eventing.queue_attempts set outcome='dead_lettered',finished_at=now(),error_code=left(coalesce(p_reason_code,'unknown'),120),details=details||coalesce(p_reason_details,'{}'::jsonb) where receipt_id=v_receipt.id and outcome='processing';
  return v_dead_letter_id;
end;
$$;

create or replace function eventing.retry_job(
  p_receipt_handle uuid,
  p_worker_id text,
  p_error_code text,
  p_delay_seconds integer,
  p_error_details jsonb default '{}'::jsonb
) returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_receipt eventing.queue_receipts%rowtype;
  v_job eventing.queue_jobs%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_message pgmq.message_record;
begin
  if p_delay_seconds < 0 or p_delay_seconds > 43200 then raise exception 'invalid_retry_delay' using errcode='22023'; end if;
  select * into v_receipt from eventing.queue_receipts where id=p_receipt_handle for update;
  if not found or v_receipt.worker_id<>trim(p_worker_id) or v_receipt.status<>'in_flight' then raise exception 'receipt_not_owned_or_inactive' using errcode='55000'; end if;
  select * into v_job from eventing.queue_jobs where id=v_receipt.job_id for update;
  if v_receipt.receive_count >= v_job.max_attempts then
    perform eventing.dead_letter_job(p_receipt_handle,p_worker_id,'max_receive_count_exceeded',coalesce(p_error_details,'{}'::jsonb)||jsonb_build_object('lastErrorCode',p_error_code));
    return 'dead_lettered';
  end if;
  select * into v_definition from eventing.queue_definitions where code=v_receipt.queue_code;
  select * into v_message from pgmq.set_vt(v_definition.provider_queue_name,v_receipt.provider_message_id::bigint,p_delay_seconds) limit 1;
  if v_message.msg_id is null then raise exception 'provider_retry_failed' using errcode='58000'; end if;
  update eventing.queue_receipts set status='released',completed_at=now(),visibility_deadline=v_message.vt where id=v_receipt.id;
  update eventing.queue_attempts set outcome='retry_scheduled',finished_at=now(),error_code=left(coalesce(p_error_code,'unknown'),120),details=details||coalesce(p_error_details,'{}'::jsonb) where receipt_id=v_receipt.id and outcome='processing';
  update eventing.queue_jobs set status='retry_scheduled',available_at=v_message.vt,last_error_code=left(coalesce(p_error_code,'unknown'),120),last_error_details=coalesce(p_error_details,'{}'::jsonb) where id=v_job.id;
  return 'retry_scheduled';
end;
$$;

create or replace function eventing.redrive_dead_letter(
  p_dead_letter_id uuid,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_dead eventing.queue_dead_letters%rowtype;
  v_job eventing.queue_jobs%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_new_message_id bigint;
  v_archived boolean;
begin
  select * into v_dead from eventing.queue_dead_letters where id=p_dead_letter_id for update;
  if not found then raise exception 'dead_letter_not_found' using errcode='P0002'; end if;
  if v_dead.status<>'open' then raise exception 'dead_letter_not_open' using errcode='55000'; end if;
  if v_dead.job_id is null then raise exception 'orphan_dead_letter_not_redrivable' using errcode='55000'; end if;
  select * into v_job from eventing.queue_jobs where id=v_dead.job_id for update;
  select * into v_definition from eventing.queue_definitions where code=v_dead.source_queue_code;
  select send into v_new_message_id from pgmq.send(v_definition.provider_queue_name,eventing.queue_job_envelope(v_job.id)) limit 1;
  if v_new_message_id is null then raise exception 'redrive_publish_failed' using errcode='58000'; end if;
  if v_dead.provider_dead_letter_message_id ~ '^[0-9]+$' then
    select pgmq.archive(v_definition.provider_dead_letter_queue_name,v_dead.provider_dead_letter_message_id::bigint) into v_archived;
  end if;
  update eventing.queue_jobs set status='queued',provider_message_id=v_new_message_id::text,attempt_count=0,available_at=now(),enqueued_at=now(),dead_lettered_at=null,last_error_code=null,last_error_details='{}'::jsonb where id=v_job.id;
  update eventing.queue_dead_letters set status='redriven',redriven_at=now(),resolution=left(coalesce(p_reason,'manual_redrive'),500) where id=v_dead.id;
  return v_job.id;
end;
$$;

create or replace function eventing.queue_metrics(p_queue_code text)
returns table(
  queue_code text,
  provider text,
  provider_queue_name text,
  visible_or_in_flight_messages bigint,
  total_messages bigint,
  oldest_message_age_seconds integer,
  open_dead_letters bigint,
  in_flight_receipts bigint,
  captured_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_metrics pgmq.metrics_result;
begin
  select * into v_definition from eventing.queue_definitions where code=p_queue_code;
  if not found then raise exception 'queue_definition_not_found' using errcode='P0002'; end if;
  select * into v_metrics from pgmq.metrics(v_definition.provider_queue_name);
  return query select
    v_definition.code,v_definition.provider,v_definition.provider_queue_name,
    v_metrics.queue_length,v_metrics.total_messages,v_metrics.oldest_msg_age_sec,
    (select count(*) from eventing.queue_dead_letters d where d.source_queue_code=v_definition.code and d.status='open'),
    (select count(*) from eventing.queue_receipts r where r.queue_code=v_definition.code and r.status='in_flight' and r.visibility_deadline>now()),
    now();
end;
$$;
-- END 20260708230740_m10e_queue_lifecycle

-- BEGIN 20260708230837_m10f_file_scan_integration
-- Remote SQL SHA-256: 6753dde95e3c828f9a0fe22099c709ac6eba76857c8c5a949a6f07697c49684b
create or replace function public.file_confirm_upload(
  p_provider text,
  p_issuer text,
  p_subject text,
  p_email_normalized text,
  p_email_verified boolean,
  p_claims_fingerprint text,
  p_intent_id uuid,
  p_actual_content_type text,
  p_actual_size_bytes bigint,
  p_sha256 text,
  p_provider_object_version text,
  p_etag text,
  p_metadata jsonb default '{}'::jsonb
) returns table(
  file_object_id uuid,
  security_status text,
  bucket text,
  object_key text,
  sha256 text,
  size_bytes bigint
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_account_id uuid;
  v_intent core.file_upload_intents%rowtype;
  v_profile core.file_upload_profiles%rowtype;
  v_file_id uuid := gen_random_uuid();
  v_job_id uuid;
  v_security_status text;
begin
  if p_actual_size_bytes < 0 then raise exception 'invalid_file_size' using errcode='22023'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'invalid_sha256' using errcode='22023'; end if;

  v_account_id := iam.resolve_external_identity(
    p_provider, p_issuer, p_subject, p_email_normalized,
    p_email_verified, p_claims_fingerprint
  );

  select * into v_intent from core.file_upload_intents where id=p_intent_id for update;
  if not found then raise exception 'upload_intent_not_found' using errcode='P0002'; end if;
  select * into v_profile from core.file_upload_profiles where code=v_intent.upload_profile_code;
  if not found then raise exception 'upload_profile_not_found' using errcode='P0002'; end if;

  perform app_private.set_request_context(v_account_id, v_intent.owner_organization_id, 'file-upload-confirm', 'user');
  if v_intent.requested_by_user_account_id <> v_account_id
     and not app_private.has_permission('file.manage', v_intent.owner_organization_id, 'file_upload_intent', v_intent.id) then
    raise exception 'file_upload_not_authorized' using errcode='28000';
  end if;
  if v_intent.status <> 'pending_upload' then raise exception 'upload_intent_not_pending' using errcode='55000'; end if;
  if v_intent.expires_at <= now() then
    update core.file_upload_intents set status='expired', failure_code='intent_expired' where id=v_intent.id;
    raise exception 'upload_intent_expired' using errcode='55000';
  end if;
  if lower(trim(p_actual_content_type)) <> v_intent.expected_content_type then
    update core.file_upload_intents set status='rejected', failure_code='content_type_mismatch' where id=v_intent.id;
    raise exception 'content_type_mismatch' using errcode='22023';
  end if;
  if p_actual_size_bytes > v_intent.max_size_bytes then
    update core.file_upload_intents set status='rejected', failure_code='file_too_large' where id=v_intent.id;
    raise exception 'file_too_large' using errcode='22023';
  end if;

  v_security_status := case when v_profile.requires_malware_scan then 'scan_pending' else 'release_pending' end;

  insert into core.file_objects(
    id, owner_organization_id, storage_provider, bucket, object_key,
    content_type, size_bytes, sha256, security_status, retention_class,
    upload_intent_id, created_by_user_account_id, original_filename,
    provider_object_version, etag, verified_at, quarantined_at, metadata
  ) values (
    v_file_id, v_intent.owner_organization_id, v_intent.storage_provider,
    v_intent.bucket, v_intent.object_key, lower(trim(p_actual_content_type)),
    p_actual_size_bytes, p_sha256, v_security_status, v_intent.retention_class,
    v_intent.id, v_account_id, v_intent.original_filename,
    p_provider_object_version, p_etag, now(), now(), coalesce(p_metadata,'{}'::jsonb)
  );

  if v_profile.requires_malware_scan then
    v_job_id := eventing.enqueue_job(
      'file_scan',
      'file.malware_scan.requested',
      1,
      'file_scan:' || v_file_id::text || ':' || p_sha256,
      null,
      v_intent.owner_organization_id,
      'file_object',
      v_file_id,
      jsonb_build_object(
        'fileObjectId',v_file_id,
        'uploadProfileCode',v_intent.upload_profile_code,
        'storageProvider',v_intent.storage_provider,
        'bucket',v_intent.bucket,
        'objectKey',v_intent.object_key,
        'contentType',lower(trim(p_actual_content_type)),
        'sizeBytes',p_actual_size_bytes,
        'sha256',p_sha256,
        'retentionClass',v_intent.retention_class
      ),
      0
    );
    update core.file_objects set scan_job_id=v_job_id where id=v_file_id;
  end if;

  update core.file_upload_intents
     set status='confirmed', uploaded_at=now(), confirmed_at=now(), file_object_id=v_file_id
   where id=v_intent.id;

  return query
  select f.id, f.security_status, f.bucket, f.object_key, f.sha256, f.size_bytes
  from core.file_objects f where f.id=v_file_id;
end;
$$;

create or replace function public.file_apply_scan_result(
  p_queue_job_id uuid,
  p_file_object_id uuid,
  p_scanner_provider text,
  p_scanner_version text,
  p_scan_status text,
  p_threats jsonb,
  p_status_reasons jsonb,
  p_provider_reference text,
  p_started_at timestamptz,
  p_completed_at timestamptz
) returns table(
  file_object_id uuid,
  source_bucket text,
  source_object_key text,
  target_object_key text,
  next_security_status text,
  already_applied boolean
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_file core.file_objects%rowtype;
  v_job eventing.queue_jobs%rowtype;
  v_next text;
  v_target text;
  v_existing boolean;
begin
  if p_scan_status not in ('clean','infected','unsupported','access_denied','failed','manual_review') then raise exception 'invalid_scan_status' using errcode='22023'; end if;
  select * into v_job from eventing.queue_jobs where id=p_queue_job_id;
  if not found or v_job.job_type<>'file.malware_scan.requested' or v_job.subject_id is distinct from p_file_object_id then raise exception 'scan_job_file_mismatch' using errcode='22023'; end if;
  select * into v_file from core.file_objects where id=p_file_object_id for update;
  if not found then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  if v_file.scan_job_id is distinct from p_queue_job_id then raise exception 'file_scan_job_mismatch' using errcode='22023'; end if;

  select exists(select 1 from core.file_security_scans where queue_job_id=p_queue_job_id) into v_existing;
  if v_existing then
    v_target := case when v_file.security_status in ('release_pending','clean') then regexp_replace(v_file.object_key,'^quarantine/','protected/') else null end;
    return query select v_file.id,v_file.bucket,v_file.object_key,v_target,v_file.security_status,true;
    return;
  end if;

  if v_file.security_status not in ('quarantined','scan_pending','manual_review') then raise exception 'file_not_scannable' using errcode='55000'; end if;

  insert into core.file_security_scans(
    file_object_id,queue_job_id,scanner_provider,scanner_version,scan_status,
    threats,status_reasons,provider_reference,started_at,completed_at
  ) values (
    p_file_object_id,p_queue_job_id,trim(p_scanner_provider),nullif(trim(p_scanner_version),''),p_scan_status,
    coalesce(p_threats,'[]'::jsonb),coalesce(p_status_reasons,'[]'::jsonb),nullif(trim(p_provider_reference),''),p_started_at,coalesce(p_completed_at,now())
  );

  v_next := case p_scan_status when 'clean' then 'release_pending' when 'infected' then 'infected' else 'manual_review' end;
  if p_scan_status='clean' then
    v_target:=regexp_replace(v_file.object_key,'^quarantine/','protected/');
    if v_target=v_file.object_key then raise exception 'file_not_in_quarantine_prefix' using errcode='55000'; end if;
  end if;
  update core.file_objects set security_status=v_next,scan_completed_at=coalesce(p_completed_at,now()) where id=p_file_object_id;
  return query select v_file.id,v_file.bucket,v_file.object_key,v_target,v_next,false;
end;
$$;

revoke execute on function public.file_record_scan_result(uuid,text,text,text,jsonb,jsonb,text,timestamptz,timestamptz) from service_role;
-- END 20260708230837_m10f_file_scan_integration

-- BEGIN 20260708230901_m10g_queue_rpc_security
-- Remote SQL SHA-256: adc3a2b26cb8c0082242fe46b089e3d93d2c733e3e82a9501f85894cc3c8ce23
create or replace function public.queue_receive_jobs(p_queue_code text,p_worker_id text,p_batch_size integer default null,p_visibility_timeout_seconds integer default null)
returns table(receipt_handle uuid,job_id uuid,job_type text,job_version integer,receive_count integer,visibility_deadline timestamptz,enqueued_at timestamptz,payload jsonb,message_headers jsonb)
language sql security definer set search_path=pg_catalog as $$
  select * from eventing.receive_jobs(p_queue_code,p_worker_id,p_batch_size,p_visibility_timeout_seconds);
$$;

create or replace function public.queue_extend_visibility(p_receipt_handle uuid,p_worker_id text,p_visibility_timeout_seconds integer)
returns timestamptz language sql security definer set search_path=pg_catalog as $$
  select eventing.extend_job_visibility(p_receipt_handle,p_worker_id,p_visibility_timeout_seconds);
$$;

create or replace function public.queue_ack_job(p_receipt_handle uuid,p_worker_id text,p_result_details jsonb default '{}'::jsonb)
returns boolean language sql security definer set search_path=pg_catalog as $$
  select eventing.ack_job(p_receipt_handle,p_worker_id,p_result_details);
$$;

create or replace function public.queue_retry_job(p_receipt_handle uuid,p_worker_id text,p_error_code text,p_delay_seconds integer,p_error_details jsonb default '{}'::jsonb)
returns text language sql security definer set search_path=pg_catalog as $$
  select eventing.retry_job(p_receipt_handle,p_worker_id,p_error_code,p_delay_seconds,p_error_details);
$$;

create or replace function public.queue_dead_letter_job(p_receipt_handle uuid,p_worker_id text,p_reason_code text,p_reason_details jsonb default '{}'::jsonb)
returns uuid language sql security definer set search_path=pg_catalog as $$
  select eventing.dead_letter_job(p_receipt_handle,p_worker_id,p_reason_code,p_reason_details);
$$;

create or replace function public.queue_redrive_dead_letter(p_dead_letter_id uuid,p_reason text)
returns uuid language sql security definer set search_path=pg_catalog as $$
  select eventing.redrive_dead_letter(p_dead_letter_id,p_reason);
$$;

create or replace function public.queue_get_metrics(p_queue_code text)
returns table(queue_code text,provider text,provider_queue_name text,visible_or_in_flight_messages bigint,total_messages bigint,oldest_message_age_seconds integer,open_dead_letters bigint,in_flight_receipts bigint,captured_at timestamptz)
language sql security definer set search_path=pg_catalog as $$
  select * from eventing.queue_metrics(p_queue_code);
$$;

alter table eventing.queue_definitions enable row level security;
alter table eventing.queue_jobs enable row level security;
alter table eventing.queue_receipts enable row level security;
alter table eventing.queue_attempts enable row level security;
alter table eventing.queue_dead_letters enable row level security;

create policy queue_definitions_worker_select on eventing.queue_definitions for select to app_worker using (app_private.is_trusted_worker());
create policy queue_definitions_worker_insert on eventing.queue_definitions for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_definitions_worker_update on eventing.queue_definitions for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_definitions_worker_delete on eventing.queue_definitions for delete to app_worker using (app_private.is_trusted_worker());
create policy queue_jobs_worker_select on eventing.queue_jobs for select to app_worker using (app_private.is_trusted_worker());
create policy queue_jobs_worker_insert on eventing.queue_jobs for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_jobs_worker_update on eventing.queue_jobs for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_jobs_worker_delete on eventing.queue_jobs for delete to app_worker using (app_private.is_trusted_worker());
create policy queue_receipts_worker_select on eventing.queue_receipts for select to app_worker using (app_private.is_trusted_worker());
create policy queue_receipts_worker_insert on eventing.queue_receipts for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_receipts_worker_update on eventing.queue_receipts for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_receipts_worker_delete on eventing.queue_receipts for delete to app_worker using (app_private.is_trusted_worker());
create policy queue_attempts_worker_select on eventing.queue_attempts for select to app_worker using (app_private.is_trusted_worker());
create policy queue_attempts_worker_insert on eventing.queue_attempts for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_attempts_worker_update on eventing.queue_attempts for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_dead_letters_worker_select on eventing.queue_dead_letters for select to app_worker using (app_private.is_trusted_worker());
create policy queue_dead_letters_worker_insert on eventing.queue_dead_letters for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_dead_letters_worker_update on eventing.queue_dead_letters for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_dead_letters_worker_delete on eventing.queue_dead_letters for delete to app_worker using (app_private.is_trusted_worker());

revoke all on all tables in schema pgmq from public,anon,authenticated;
revoke all on all functions in schema pgmq from public,anon,authenticated;
revoke all on eventing.queue_definitions,eventing.queue_jobs,eventing.queue_receipts,eventing.queue_attempts,eventing.queue_dead_letters from public,anon,authenticated;

grant usage on schema pgmq to app_worker;
grant select,insert,update,delete on all tables in schema pgmq to app_worker;
grant execute on all functions in schema pgmq to app_worker;
grant select,insert,update,delete on eventing.queue_definitions,eventing.queue_jobs,eventing.queue_receipts,eventing.queue_attempts,eventing.queue_dead_letters to app_worker;
grant execute on function eventing.queue_job_envelope(uuid) to app_worker;
grant execute on function eventing.enqueue_job(text,text,integer,text,uuid,uuid,text,uuid,jsonb,integer) to app_worker;
grant execute on function eventing.dead_letter_provider_message(text,uuid,text,integer,text,jsonb,jsonb) to app_worker;
grant execute on function eventing.receive_jobs(text,text,integer,integer) to app_worker;
grant execute on function eventing.extend_job_visibility(uuid,text,integer) to app_worker;
grant execute on function eventing.ack_job(uuid,text,jsonb) to app_worker;
grant execute on function eventing.retry_job(uuid,text,text,integer,jsonb) to app_worker;
grant execute on function eventing.dead_letter_job(uuid,text,text,jsonb) to app_worker;
grant execute on function eventing.redrive_dead_letter(uuid,text) to app_worker;
grant execute on function eventing.queue_metrics(text) to app_worker;

revoke all on function public.file_apply_scan_result(uuid,uuid,text,text,text,jsonb,jsonb,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.queue_receive_jobs(text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.queue_extend_visibility(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.queue_ack_job(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.queue_retry_job(uuid,text,text,integer,jsonb) from public,anon,authenticated;
revoke all on function public.queue_dead_letter_job(uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.queue_redrive_dead_letter(uuid,text) from public,anon,authenticated;
revoke all on function public.queue_get_metrics(text) from public,anon,authenticated;

grant execute on function public.file_apply_scan_result(uuid,uuid,text,text,text,jsonb,jsonb,text,timestamptz,timestamptz) to service_role;
grant execute on function public.queue_receive_jobs(text,text,integer,integer) to service_role;
grant execute on function public.queue_extend_visibility(uuid,text,integer) to service_role;
grant execute on function public.queue_ack_job(uuid,text,jsonb) to service_role;
grant execute on function public.queue_retry_job(uuid,text,text,integer,jsonb) to service_role;
grant execute on function public.queue_dead_letter_job(uuid,text,text,jsonb) to service_role;
grant execute on function public.queue_redrive_dead_letter(uuid,text) to service_role;
grant execute on function public.queue_get_metrics(text) to service_role;
-- END 20260708230901_m10g_queue_rpc_security

-- BEGIN 20260708231057_m10h_queue_enqueue_rpc
-- Remote SQL SHA-256: a6ddc71c097585d7e10051b55860c2e89f678921e11d6f6547f1d1eb3494de6f
create or replace function public.queue_enqueue_job(
  p_queue_code text,
  p_job_type text,
  p_job_version integer,
  p_deduplication_key text,
  p_source_event_id uuid,
  p_organization_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_payload jsonb,
  p_delay_seconds integer default 0
) returns uuid
language sql security definer set search_path=pg_catalog as $$
  select eventing.enqueue_job(
    p_queue_code,p_job_type,p_job_version,p_deduplication_key,
    p_source_event_id,p_organization_id,p_subject_type,p_subject_id,p_payload,p_delay_seconds
  );
$$;
revoke all on function public.queue_enqueue_job(text,text,integer,text,uuid,uuid,text,uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.queue_enqueue_job(text,text,integer,text,uuid,uuid,text,uuid,jsonb,integer) to service_role;
-- END 20260708231057_m10h_queue_enqueue_rpc

-- BEGIN 20260708231628_m10i_enable_http_for_worker_proof
-- Remote SQL SHA-256: b5b79f616c8cc09827b263ca33c134a193821285b414e16488b6bd533cd7480b
create extension if not exists http with schema extensions;
-- END 20260708231628_m10i_enable_http_for_worker_proof

-- BEGIN 20260708232000_m10j_cleanup_worker_runtime_proof
-- Remote SQL SHA-256: b6ff5f22abf727ea4a8e49922b7e263c4c96fad4bf5bff9bb0789f797fd7cfb7
alter table core.file_security_scans disable trigger trg_core_file_security_scans_append_only;
alter table eventing.queue_attempts disable trigger trg_eventing_queue_attempts_append_only;

delete from core.file_security_scans
where queue_job_id = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

update core.file_objects
set scan_job_id = null
where id = 'b6125abc-9d7d-4a78-b51c-2a80d6c5a48a'::uuid;

delete from core.file_objects
where id = 'b6125abc-9d7d-4a78-b51c-2a80d6c5a48a'::uuid;

delete from eventing.queue_attempts
where job_id = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

delete from eventing.queue_receipts
where job_id = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

delete from eventing.queue_dead_letters
where job_id = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

delete from eventing.queue_jobs
where id = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

delete from pgmq.a_estimulo_file_scan_jobs
where (message->>'jobId')::uuid = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

delete from pgmq.a_estimulo_file_scan_dlq
where nullif(message->'message'->>'jobId','')::uuid = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

delete from iam.organizations
where id = '9896ecee-a1f6-48d5-a75c-7702060ed679'::uuid;

alter table core.file_security_scans enable trigger trg_core_file_security_scans_append_only;
alter table eventing.queue_attempts enable trigger trg_eventing_queue_attempts_append_only;

drop extension if exists http;
-- END 20260708232000_m10j_cleanup_worker_runtime_proof

-- BEGIN 20260708233706_m11a_enable_scheduler_extensions
-- Remote SQL SHA-256: 3a7f5431ac718b1d4854073c083529c17edd62eede70763d5c00699b00a347ff
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
-- END 20260708233706_m11a_enable_scheduler_extensions

-- BEGIN 20260708233810_m11b_worker_schedule_tables
-- Remote SQL SHA-256: c8ea568d18f724d62b9a0032baa8a73caf7181c76bd398f38e28a8d7894395a3
set lock_timeout = '5s';
set statement_timeout = '5min';

create table eventing.worker_schedules (
  code text primary key,
  queue_code text not null references eventing.queue_definitions(code),
  worker_function_name text not null,
  schedule_expression text not null,
  batch_size integer not null,
  visibility_timeout_seconds integer not null,
  max_parallel_invocations integer not null,
  token_ttl_seconds integer not null default 90,
  http_timeout_milliseconds integer not null default 5000,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_worker_schedules_code check (code ~ '^[a-z][a-z0-9_]{2,62}$'),
  constraint ck_worker_schedules_function check (worker_function_name ~ '^[a-z][a-z0-9-]{2,62}$'),
  constraint ck_worker_schedules_batch check (batch_size between 1 and 10),
  constraint ck_worker_schedules_visibility check (visibility_timeout_seconds between 30 and 43200),
  constraint ck_worker_schedules_parallel check (max_parallel_invocations between 1 and 32),
  constraint ck_worker_schedules_token_ttl check (token_ttl_seconds between 30 and 600),
  constraint ck_worker_schedules_http_timeout check (http_timeout_milliseconds between 1000 and 30000),
  constraint ck_worker_schedules_status check (status in ('active','paused','disabled'))
);

create table eventing.worker_dispatch_tokens (
  id uuid primary key default gen_random_uuid(),
  schedule_code text not null references eventing.worker_schedules(code),
  queue_code text not null references eventing.queue_definitions(code),
  token_hash text not null unique,
  intended_worker_id text not null,
  status text not null default 'pending',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claimed_by text,
  http_request_id bigint unique,
  http_status_code integer,
  http_error text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ck_worker_dispatch_hash check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint ck_worker_dispatch_worker check (length(trim(intended_worker_id)) between 1 and 160),
  constraint ck_worker_dispatch_status check (status in ('pending','claimed','expired','failed','revoked')),
  constraint ck_worker_dispatch_expiry check (expires_at > issued_at),
  constraint ck_worker_dispatch_http_status check (http_status_code is null or http_status_code between 100 and 599)
);

create index ix_worker_dispatch_status_expiry on eventing.worker_dispatch_tokens(status,expires_at);
create index ix_worker_dispatch_queue_status on eventing.worker_dispatch_tokens(queue_code,status,issued_at desc);

create trigger trg_worker_schedules_updated_at before update on eventing.worker_schedules for each row execute function governance.set_updated_at();
-- END 20260708233810_m11b_worker_schedule_tables

-- BEGIN 20260708233826_m11c_observability_tables
-- Remote SQL SHA-256: 71063d5d267dc69feeab106c0d95509b987f6c39136323ef4c5011182e349981
create table eventing.scheduler_runs (
  id uuid primary key default gen_random_uuid(),
  scheduler_name text not null,
  queue_code text references eventing.queue_definitions(code),
  run_kind text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ck_scheduler_runs_name check (length(trim(scheduler_name)) between 1 and 120),
  constraint ck_scheduler_runs_kind check (run_kind in ('dispatch','reconcile','metrics','alerts','cleanup','proof')),
  constraint ck_scheduler_runs_status check (status in ('running','succeeded','skipped','failed')),
  constraint ck_scheduler_runs_dates check (completed_at is null or completed_at >= started_at)
);

create table eventing.queue_metric_snapshots (
  id bigint generated always as identity primary key,
  queue_code text not null references eventing.queue_definitions(code),
  captured_at timestamptz not null default now(),
  queue_length bigint not null,
  total_messages bigint not null,
  oldest_message_age_seconds integer,
  open_dead_letters bigint not null,
  in_flight_receipts bigint not null,
  expired_receipts_5m bigint not null,
  dispatch_failures_5m bigint not null,
  cron_failures_5m bigint not null,
  scan_pending_count bigint not null,
  release_pending_count bigint not null,
  oldest_scan_pending_age_seconds integer,
  jobs_by_status jsonb not null default '{}'::jsonb,
  constraint ck_queue_metric_snapshots_nonnegative check (
    queue_length >= 0 and total_messages >= 0 and open_dead_letters >= 0 and
    in_flight_receipts >= 0 and expired_receipts_5m >= 0 and
    dispatch_failures_5m >= 0 and cron_failures_5m >= 0 and
    scan_pending_count >= 0 and release_pending_count >= 0
  )
);

create table eventing.queue_alert_policies (
  id uuid primary key default gen_random_uuid(),
  queue_code text not null references eventing.queue_definitions(code),
  alert_code text not null,
  metric_code text not null,
  warning_threshold numeric not null,
  critical_threshold numeric not null,
  evaluation_window_seconds integer not null default 300,
  status text not null default 'active',
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_queue_alert_policies_code unique (queue_code,alert_code),
  constraint ck_queue_alert_policies_code check (alert_code ~ '^[a-z][a-z0-9_]{2,80}$'),
  constraint ck_queue_alert_policies_metric check (metric_code in (
    'queue_length','oldest_message_age_seconds','open_dead_letters',
    'expired_receipts_5m','dispatch_failures_5m','cron_failures_5m',
    'oldest_scan_pending_age_seconds'
  )),
  constraint ck_queue_alert_policies_thresholds check (warning_threshold >= 0 and critical_threshold >= warning_threshold),
  constraint ck_queue_alert_policies_window check (evaluation_window_seconds between 30 and 86400),
  constraint ck_queue_alert_policies_status check (status in ('active','disabled'))
);

create table eventing.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  queue_code text not null,
  alert_code text not null,
  severity text not null,
  status text not null default 'open',
  current_value numeric not null,
  warning_threshold numeric not null,
  critical_threshold numeric not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrence_count integer not null default 1,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_operational_alerts_policy foreign key (queue_code,alert_code) references eventing.queue_alert_policies(queue_code,alert_code),
  constraint ck_operational_alerts_severity check (severity in ('warning','critical')),
  constraint ck_operational_alerts_status check (status in ('open','acknowledged','resolved')),
  constraint ck_operational_alerts_occurrences check (occurrence_count > 0)
);

create unique index uq_operational_alerts_active on eventing.operational_alerts(queue_code,alert_code) where status in ('open','acknowledged');
create index ix_scheduler_runs_queue_started on eventing.scheduler_runs(queue_code,started_at desc);
create index ix_queue_metric_snapshots_queue_captured on eventing.queue_metric_snapshots(queue_code,captured_at desc);
create index ix_operational_alerts_queue_status on eventing.operational_alerts(queue_code,status,last_seen_at desc);

create trigger trg_queue_alert_policies_updated_at before update on eventing.queue_alert_policies for each row execute function governance.set_updated_at();
create trigger trg_operational_alerts_updated_at before update on eventing.operational_alerts for each row execute function governance.set_updated_at();
-- END 20260708233826_m11c_observability_tables

-- BEGIN 20260708233840_m11d_observability_rls_grants
-- Remote SQL SHA-256: f781c2fd93a69adfef38f0d9c2ab94348e936407812a790ecffb9e66564dc1b6
alter table eventing.worker_schedules enable row level security;
alter table eventing.worker_dispatch_tokens enable row level security;
alter table eventing.scheduler_runs enable row level security;
alter table eventing.queue_metric_snapshots enable row level security;
alter table eventing.queue_alert_policies enable row level security;
alter table eventing.operational_alerts enable row level security;

create policy worker_schedules_worker_select on eventing.worker_schedules for select to app_worker using (app_private.is_trusted_worker());
create policy worker_schedules_worker_insert on eventing.worker_schedules for insert to app_worker with check (app_private.is_trusted_worker());
create policy worker_schedules_worker_update on eventing.worker_schedules for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy worker_schedules_worker_delete on eventing.worker_schedules for delete to app_worker using (app_private.is_trusted_worker());

create policy worker_dispatch_worker_select on eventing.worker_dispatch_tokens for select to app_worker using (app_private.is_trusted_worker());
create policy worker_dispatch_worker_insert on eventing.worker_dispatch_tokens for insert to app_worker with check (app_private.is_trusted_worker());
create policy worker_dispatch_worker_update on eventing.worker_dispatch_tokens for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy worker_dispatch_worker_delete on eventing.worker_dispatch_tokens for delete to app_worker using (app_private.is_trusted_worker());

create policy scheduler_runs_worker_select on eventing.scheduler_runs for select to app_worker using (app_private.is_trusted_worker());
create policy scheduler_runs_worker_insert on eventing.scheduler_runs for insert to app_worker with check (app_private.is_trusted_worker());
create policy scheduler_runs_worker_update on eventing.scheduler_runs for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy scheduler_runs_worker_delete on eventing.scheduler_runs for delete to app_worker using (app_private.is_trusted_worker());

create policy queue_metrics_worker_select on eventing.queue_metric_snapshots for select to app_worker using (app_private.is_trusted_worker());
create policy queue_metrics_worker_insert on eventing.queue_metric_snapshots for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_metrics_worker_delete on eventing.queue_metric_snapshots for delete to app_worker using (app_private.is_trusted_worker());

create policy queue_alert_policies_worker_select on eventing.queue_alert_policies for select to app_worker using (app_private.is_trusted_worker());
create policy queue_alert_policies_worker_insert on eventing.queue_alert_policies for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_alert_policies_worker_update on eventing.queue_alert_policies for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_alert_policies_worker_delete on eventing.queue_alert_policies for delete to app_worker using (app_private.is_trusted_worker());

create policy operational_alerts_worker_select on eventing.operational_alerts for select to app_worker using (app_private.is_trusted_worker());
create policy operational_alerts_worker_insert on eventing.operational_alerts for insert to app_worker with check (app_private.is_trusted_worker());
create policy operational_alerts_worker_update on eventing.operational_alerts for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy operational_alerts_worker_delete on eventing.operational_alerts for delete to app_worker using (app_private.is_trusted_worker());

grant select,insert,update,delete on eventing.worker_schedules,eventing.worker_dispatch_tokens,eventing.scheduler_runs,eventing.queue_metric_snapshots,eventing.queue_alert_policies,eventing.operational_alerts to app_worker;
grant usage,select on sequence eventing.queue_metric_snapshots_id_seq to app_worker;
-- END 20260708233840_m11d_observability_rls_grants

-- BEGIN 20260708233850_m11e_scheduler_alert_seed
-- Remote SQL SHA-256: f59a95a36f58258658d8cd0703eb023856afe66462c3fbe22e381a8c31c10336
insert into eventing.worker_schedules(
  code,queue_code,worker_function_name,schedule_expression,batch_size,
  visibility_timeout_seconds,max_parallel_invocations,token_ttl_seconds,
  http_timeout_milliseconds,status
) values (
  'file_scan_worker','file_scan','file-scan-worker','30 seconds',5,120,4,90,5000,'active'
) on conflict (code) do update set
  queue_code=excluded.queue_code,
  worker_function_name=excluded.worker_function_name,
  schedule_expression=excluded.schedule_expression,
  batch_size=excluded.batch_size,
  visibility_timeout_seconds=excluded.visibility_timeout_seconds,
  max_parallel_invocations=excluded.max_parallel_invocations,
  token_ttl_seconds=excluded.token_ttl_seconds,
  http_timeout_milliseconds=excluded.http_timeout_milliseconds,
  status=excluded.status;

insert into eventing.queue_alert_policies(
  queue_code,alert_code,metric_code,warning_threshold,critical_threshold,
  evaluation_window_seconds,status,description
) values
 ('file_scan','queue_backlog','queue_length',20,100,300,'active','Mensagens ativas acumuladas na fila.'),
 ('file_scan','queue_age','oldest_message_age_seconds',120,300,300,'active','Idade da mensagem mais antiga acima do objetivo operacional.'),
 ('file_scan','dead_letters_open','open_dead_letters',1,5,300,'active','Dead letters abertas exigem investigação.'),
 ('file_scan','visibility_expirations','expired_receipts_5m',3,10,300,'active','Receipts expirados sugerem workers lentos ou interrompidos.'),
 ('file_scan','dispatch_failures','dispatch_failures_5m',1,3,300,'active','Falhas recentes ao invocar workers.'),
 ('file_scan','cron_failures','cron_failures_5m',1,3,300,'active','Falhas recentes dos jobs pg_cron da plataforma.'),
 ('file_scan','scan_pending_age','oldest_scan_pending_age_seconds',300,900,300,'active','Arquivo aguardando scan por tempo excessivo.')
on conflict (queue_code,alert_code) do update set
 metric_code=excluded.metric_code,
 warning_threshold=excluded.warning_threshold,
 critical_threshold=excluded.critical_threshold,
 evaluation_window_seconds=excluded.evaluation_window_seconds,
 status=excluded.status,
 description=excluded.description;
-- END 20260708233850_m11e_scheduler_alert_seed

-- BEGIN 20260708233907_m11f_dispatch_token_functions
-- Remote SQL SHA-256: b32c753d1ef9770bda6cd51f4cef2e956bb91b67a27241f80a30af1783991a25
create or replace function eventing.issue_worker_dispatch_token(
  p_schedule_code text,
  p_worker_id text
) returns table(token_id uuid,raw_token text)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_schedule eventing.worker_schedules%rowtype;
  v_token text;
  v_hash text;
begin
  select * into v_schedule
  from eventing.worker_schedules
  where code=p_schedule_code and status='active'
  for share;
  if not found then raise exception 'worker_schedule_not_active' using errcode='P0002'; end if;
  if p_worker_id is null or length(trim(p_worker_id)) not between 1 and 160 then
    raise exception 'invalid_worker_id' using errcode='22023';
  end if;

  v_token := encode(extensions.gen_random_bytes(32),'hex');
  v_hash := encode(extensions.digest(convert_to(v_token,'UTF8'),'sha256'),'hex');

  insert into eventing.worker_dispatch_tokens(
    schedule_code,queue_code,token_hash,intended_worker_id,status,issued_at,expires_at
  ) values (
    v_schedule.code,v_schedule.queue_code,v_hash,trim(p_worker_id),'pending',now(),
    now()+make_interval(secs=>v_schedule.token_ttl_seconds)
  ) returning id into token_id;

  raw_token := v_token;
  return next;
end;
$$;

create or replace function public.queue_claim_dispatch_token(
  p_raw_token text,
  p_worker_id text
) returns table(
  schedule_code text,
  queue_code text,
  batch_size integer,
  visibility_timeout_seconds integer
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_hash text;
  v_token eventing.worker_dispatch_tokens%rowtype;
  v_schedule eventing.worker_schedules%rowtype;
begin
  if p_raw_token is null or p_raw_token !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_dispatch_token' using errcode='28000';
  end if;
  if p_worker_id is null or length(trim(p_worker_id)) not between 1 and 160 then
    raise exception 'invalid_worker_id' using errcode='22023';
  end if;

  v_hash := encode(extensions.digest(convert_to(p_raw_token,'UTF8'),'sha256'),'hex');
  select * into v_token
  from eventing.worker_dispatch_tokens
  where token_hash=v_hash
  for update;

  if not found or v_token.status<>'pending' or v_token.expires_at<=now() then
    raise exception 'dispatch_token_unavailable' using errcode='28000';
  end if;
  if v_token.intended_worker_id<>trim(p_worker_id) then
    raise exception 'dispatch_token_worker_mismatch' using errcode='28000';
  end if;

  select * into v_schedule from eventing.worker_schedules
  where code=v_token.schedule_code and status='active';
  if not found then raise exception 'worker_schedule_not_active' using errcode='55000'; end if;

  update eventing.worker_dispatch_tokens
  set status='claimed',claimed_at=now(),claimed_by=trim(p_worker_id)
  where id=v_token.id;

  return query select v_schedule.code,v_schedule.queue_code,v_schedule.batch_size,v_schedule.visibility_timeout_seconds;
end;
$$;

revoke all on function public.queue_claim_dispatch_token(text,text) from public,anon,authenticated;
grant execute on function public.queue_claim_dispatch_token(text,text) to service_role;
grant execute on function eventing.issue_worker_dispatch_token(text,text) to app_worker;
-- END 20260708233907_m11f_dispatch_token_functions

-- BEGIN 20260708233930_m11g_worker_dispatcher
-- Remote SQL SHA-256: 78be4b254d0095a4f07e63180ccd08659564e504f85ebb5e0e7f85e6596d4318
create or replace function eventing.dispatch_worker_schedule(p_schedule_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_schedule eventing.worker_schedules%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_metrics pgmq.metrics_result;
  v_run_id uuid;
  v_project_url text;
  v_publishable_key text;
  v_active_receipts integer;
  v_pending_dispatches integer;
  v_available_messages bigint;
  v_available_slots integer;
  v_invocations integer;
  v_worker_id text;
  v_token_id uuid;
  v_raw_token text;
  v_request_id bigint;
  v_dispatched integer := 0;
  i integer;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('worker-dispatch:'||p_schedule_code,0)) then
    return jsonb_build_object('status','skipped','reason','dispatcher_locked');
  end if;

  insert into eventing.scheduler_runs(scheduler_name,queue_code,run_kind,status)
  select 'worker-dispatch:'||s.code,s.queue_code,'dispatch','running'
  from eventing.worker_schedules s where s.code=p_schedule_code
  returning id into v_run_id;

  select * into v_schedule from eventing.worker_schedules
  where code=p_schedule_code and status='active'
  for share;
  if not found then
    if v_run_id is not null then
      update eventing.scheduler_runs set status='skipped',completed_at=now(),details='{"reason":"schedule_not_active"}'::jsonb where id=v_run_id;
    end if;
    return jsonb_build_object('status','skipped','reason','schedule_not_active');
  end if;

  select * into v_definition from eventing.queue_definitions
  where code=v_schedule.queue_code and status='active';
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;
  if v_definition.provider<>'pgmq' then raise exception 'dispatcher_provider_not_supported' using errcode='0A000'; end if;

  select * into v_metrics from pgmq.metrics(v_definition.provider_queue_name);
  select count(*) into v_active_receipts
  from eventing.queue_receipts r
  where r.queue_code=v_schedule.queue_code and r.status='in_flight' and r.visibility_deadline>now();
  select count(*) into v_pending_dispatches
  from eventing.worker_dispatch_tokens t
  where t.schedule_code=v_schedule.code and t.status='pending' and t.expires_at>now();

  v_available_messages := greatest(coalesce(v_metrics.queue_length,0)-v_active_receipts,0);
  v_available_slots := greatest(v_schedule.max_parallel_invocations-v_active_receipts-v_pending_dispatches,0);
  v_invocations := least(
    v_available_slots,
    case when v_available_messages=0 then 0
         else ((v_available_messages+v_schedule.batch_size-1)/v_schedule.batch_size)::integer end
  );

  if v_invocations=0 then
    update eventing.scheduler_runs
    set status='skipped',completed_at=now(),details=jsonb_build_object(
      'reason','no_dispatch_capacity_or_messages','queueLength',coalesce(v_metrics.queue_length,0),
      'activeReceipts',v_active_receipts,'pendingDispatches',v_pending_dispatches
    ) where id=v_run_id;
    return jsonb_build_object('status','skipped','invocations',0,'queueLength',coalesce(v_metrics.queue_length,0));
  end if;

  select decrypted_secret into v_project_url
  from vault.decrypted_secrets where name='estimulo_project_url' limit 1;
  select decrypted_secret into v_publishable_key
  from vault.decrypted_secrets where name='estimulo_publishable_key' limit 1;
  if v_project_url is null or v_publishable_key is null then
    raise exception 'scheduler_vault_configuration_missing' using errcode='55000';
  end if;

  for i in 1..v_invocations loop
    v_worker_id := left(v_schedule.code||'-'||replace(gen_random_uuid()::text,'-',''),160);
    select token_id,raw_token into v_token_id,v_raw_token
    from eventing.issue_worker_dispatch_token(v_schedule.code,v_worker_id);

    v_request_id := net.http_post(
      url := rtrim(v_project_url,'/')||'/functions/v1/'||v_schedule.worker_function_name,
      body := jsonb_build_object('dispatchToken',v_raw_token,'workerId',v_worker_id),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer '||v_publishable_key,
        'apikey',v_publishable_key,
        'x-request-id',v_token_id::text
      ),
      timeout_milliseconds := v_schedule.http_timeout_milliseconds
    );

    update eventing.worker_dispatch_tokens set http_request_id=v_request_id where id=v_token_id;
    v_dispatched := v_dispatched+1;
  end loop;

  update eventing.scheduler_runs
  set status='succeeded',completed_at=now(),details=jsonb_build_object(
    'queueLength',coalesce(v_metrics.queue_length,0),'activeReceipts',v_active_receipts,
    'pendingDispatches',v_pending_dispatches,'requestedInvocations',v_invocations,
    'dispatchedInvocations',v_dispatched
  ) where id=v_run_id;

  return jsonb_build_object('status','succeeded','invocations',v_dispatched,'queueLength',coalesce(v_metrics.queue_length,0));
exception when others then
  if v_run_id is not null then
    update eventing.scheduler_runs
    set status='failed',completed_at=now(),details=jsonb_build_object('sqlstate',sqlstate,'message',sqlerrm)
    where id=v_run_id;
  end if;
  raise;
end;
$$;

create or replace function eventing.dispatch_active_workers()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  r record;
  v_results jsonb := '[]'::jsonb;
begin
  for r in select code from eventing.worker_schedules where status='active' order by code loop
    v_results := v_results || jsonb_build_array(eventing.dispatch_worker_schedule(r.code));
  end loop;
  return v_results;
end;
$$;

grant execute on function eventing.dispatch_worker_schedule(text) to app_worker;
grant execute on function eventing.dispatch_active_workers() to app_worker;
-- END 20260708233930_m11g_worker_dispatcher

-- BEGIN 20260708234002_m11h_idempotent_worker_recovery
-- Remote SQL SHA-256: 93662e9018fff757e89af171c778029c21882e99efaf40f7c7913bb242ee5fad
create or replace function public.file_get_scan_job_state(
  p_queue_job_id uuid,
  p_file_object_id uuid
) returns table(
  file_object_id uuid,
  queue_job_id uuid,
  security_status text,
  scan_applied boolean,
  scan_status text,
  source_bucket text,
  source_object_key text,
  target_object_key text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_file core.file_objects%rowtype;
  v_scan core.file_security_scans%rowtype;
begin
  select * into v_file from core.file_objects where id=p_file_object_id;
  if not found then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  if v_file.scan_job_id is distinct from p_queue_job_id then
    raise exception 'file_scan_job_mismatch' using errcode='22023';
  end if;

  select * into v_scan
  from core.file_security_scans
  where queue_job_id=p_queue_job_id
  order by completed_at desc
  limit 1;

  return query select
    v_file.id,
    p_queue_job_id,
    v_file.security_status,
    found,
    case when found then v_scan.scan_status else null end,
    v_file.bucket,
    v_file.object_key,
    case
      when v_file.object_key like 'quarantine/%' then regexp_replace(v_file.object_key,'^quarantine/','protected/')
      when v_file.object_key like 'protected/%' then v_file.object_key
      else null
    end;
end;
$$;

create or replace function eventing.ack_job(
  p_receipt_handle uuid,
  p_worker_id text,
  p_result_details jsonb default '{}'::jsonb
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_receipt eventing.queue_receipts%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_archived boolean;
  v_outcome text;
begin
  select * into v_receipt from eventing.queue_receipts where id=p_receipt_handle for update;
  if not found then return false; end if;
  if v_receipt.worker_id<>trim(p_worker_id) then return false; end if;
  if v_receipt.status='acked' then return true; end if;
  if v_receipt.status<>'in_flight' then return false; end if;

  select * into v_definition from eventing.queue_definitions where code=v_receipt.queue_code;
  select pgmq.archive(v_definition.provider_queue_name,v_receipt.provider_message_id::bigint) into v_archived;
  if not coalesce(v_archived,false) then
    if exists(select 1 from eventing.queue_jobs where id=v_receipt.job_id and status='completed') then return true; end if;
    raise exception 'provider_ack_failed' using errcode='58000';
  end if;

  v_outcome := case
    when lower(coalesce(p_result_details->>'duplicateSuppressed','false'))='true' then 'duplicate_suppressed'
    else 'succeeded'
  end;

  update eventing.queue_receipts set status='acked',completed_at=now() where id=v_receipt.id;
  update eventing.queue_attempts
  set outcome=v_outcome,finished_at=now(),details=details||coalesce(p_result_details,'{}'::jsonb)
  where receipt_id=v_receipt.id and outcome='processing';
  update eventing.queue_jobs
  set status='completed',completed_at=now(),last_error_code=null,last_error_details='{}'::jsonb
  where id=v_receipt.job_id;
  return true;
end;
$$;

revoke all on function public.file_get_scan_job_state(uuid,uuid) from public,anon,authenticated;
grant execute on function public.file_get_scan_job_state(uuid,uuid) to service_role;
-- END 20260708234002_m11h_idempotent_worker_recovery

-- BEGIN 20260708234024_m11i_queue_reconciliation_helpers
-- Remote SQL SHA-256: 94cc24e56d31603e72e299114a085079a31e98a92a7518c12d2ee1cd4082a327
create or replace function eventing.provider_message_exists(
  p_queue_name text,
  p_provider_message_id text
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_exists boolean := false;
begin
  if p_queue_name is null or p_queue_name !~ '^[a-z0-9_]+$' then
    raise exception 'invalid_provider_queue_name' using errcode='22023';
  end if;
  if p_provider_message_id is null or p_provider_message_id !~ '^[0-9]+$' then
    return false;
  end if;
  execute format('select exists(select 1 from pgmq.%I where msg_id=$1)','q_'||p_queue_name)
    into v_exists using p_provider_message_id::bigint;
  return coalesce(v_exists,false);
end;
$$;

create or replace function eventing.republish_job(p_job_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_job eventing.queue_jobs%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_message_id bigint;
begin
  select * into v_job from eventing.queue_jobs where id=p_job_id for update;
  if not found then raise exception 'queue_job_not_found' using errcode='P0002'; end if;
  if v_job.status in ('completed','dead_lettered','cancelled') then
    raise exception 'queue_job_not_republishable' using errcode='55000';
  end if;
  if exists(select 1 from eventing.queue_receipts where job_id=v_job.id and status='in_flight' and visibility_deadline>now()) then
    raise exception 'queue_job_has_active_receipt' using errcode='55000';
  end if;

  select * into v_definition from eventing.queue_definitions where code=v_job.queue_code and status='active';
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;
  if v_definition.provider<>'pgmq' then raise exception 'queue_provider_not_supported' using errcode='0A000'; end if;

  select send into v_message_id
  from pgmq.send(
    v_definition.provider_queue_name,
    eventing.queue_job_envelope(v_job.id),
    jsonb_build_object(
      'job_id',v_job.id,
      'job_type',v_job.job_type,
      'deduplication_key',v_job.deduplication_key,
      'payload_hash',v_job.payload_hash,
      'reconciled',true
    ),
    0
  ) limit 1;
  if v_message_id is null then raise exception 'queue_republish_failed' using errcode='58000'; end if;

  update eventing.queue_jobs
  set status='queued',provider_message_id=v_message_id::text,available_at=now(),enqueued_at=coalesce(enqueued_at,now())
  where id=v_job.id;
  return v_message_id::text;
end;
$$;

grant execute on function eventing.provider_message_exists(text,text) to app_worker;
grant execute on function eventing.republish_job(uuid) to app_worker;
-- END 20260708234024_m11i_queue_reconciliation_helpers

-- BEGIN 20260708234034_m11j_dispatch_response_reconciliation
-- Remote SQL SHA-256: 0798681010fa95ba9e8ae9c0314b9472284bc1e7d2f6e3c556c38bf8d6c9b7cb
create or replace function eventing.reconcile_dispatch_requests()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_expired integer := 0;
  v_responses integer := 0;
  v_failed integer := 0;
begin
  update eventing.worker_dispatch_tokens
  set status='expired'
  where status='pending' and expires_at<=now();
  get diagnostics v_expired = row_count;

  with responses as (
    select t.id,r.status_code,r.error_msg,r.timed_out,r.created
    from eventing.worker_dispatch_tokens t
    join net._http_response r on r.id=t.http_request_id
    where t.http_request_id is not null and t.responded_at is null
  )
  update eventing.worker_dispatch_tokens t
  set http_status_code=r.status_code,
      http_error=left(coalesce(r.error_msg,case when r.timed_out then 'http_timeout' else null end),1000),
      responded_at=r.created,
      status=case
        when t.status='pending' and (r.timed_out or r.error_msg is not null or r.status_code<200 or r.status_code>=300) then 'failed'
        else t.status
      end
  from responses r
  where t.id=r.id;
  get diagnostics v_responses = row_count;

  select count(*) into v_failed
  from eventing.worker_dispatch_tokens
  where responded_at>=now()-interval '5 minutes'
    and (http_status_code<200 or http_status_code>=300 or http_error is not null);

  return jsonb_build_object('expiredTokens',v_expired,'responsesRecorded',v_responses,'recentFailures',v_failed);
end;
$$;

grant execute on function eventing.reconcile_dispatch_requests() to app_worker;
-- END 20260708234034_m11j_dispatch_response_reconciliation

-- BEGIN 20260708234100_m11k_queue_reconciliation
-- Remote SQL SHA-256: 3078c4db66af24831cc99ff8e4bc0c83d6b8832e38770ad8b1d205897f1884a8
create or replace function eventing.reconcile_queue_system(p_queue_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_run_id uuid;
  v_expired_receipts integer := 0;
  v_expired_attempts integer := 0;
  v_released_jobs integer := 0;
  v_republished integer := 0;
  v_archived_terminal integer := 0;
  v_orphans integer := 0;
  v_scan_jobs_created integer := 0;
  v_job record;
  v_provider record;
  v_file record;
  v_provider_job_id uuid;
  v_new_job_id uuid;
  v_archived boolean;
  v_uuid_pattern constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
begin
  if not pg_try_advisory_xact_lock(hashtextextended('queue-reconcile:'||p_queue_code,0)) then
    return jsonb_build_object('status','skipped','reason','reconciler_locked');
  end if;

  select * into v_definition from eventing.queue_definitions where code=p_queue_code and status='active';
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;
  if v_definition.provider<>'pgmq' then raise exception 'reconciler_provider_not_supported' using errcode='0A000'; end if;

  insert into eventing.scheduler_runs(scheduler_name,queue_code,run_kind,status)
  values('queue-reconcile:'||p_queue_code,p_queue_code,'reconcile','running')
  returning id into v_run_id;

  update eventing.queue_receipts
  set status='expired',completed_at=now()
  where queue_code=p_queue_code and status='in_flight' and visibility_deadline<=now();
  get diagnostics v_expired_receipts = row_count;

  update eventing.queue_attempts a
  set outcome='visibility_expired',finished_at=now(),error_code=coalesce(error_code,'visibility_timeout')
  where a.outcome='processing'
    and exists(select 1 from eventing.queue_receipts r where r.id=a.receipt_id and r.queue_code=p_queue_code and r.status='expired');
  get diagnostics v_expired_attempts = row_count;

  update eventing.queue_jobs j
  set status='retry_scheduled',available_at=now(),last_error_code=coalesce(last_error_code,'visibility_timeout')
  where j.queue_code=p_queue_code and j.status='in_flight'
    and not exists(select 1 from eventing.queue_receipts r where r.job_id=j.id and r.status='in_flight' and r.visibility_deadline>now());
  get diagnostics v_released_jobs = row_count;

  for v_job in
    select j.id,j.provider_message_id,j.status
    from eventing.queue_jobs j
    where j.queue_code=p_queue_code
      and j.status in ('created','queued','retry_scheduled','in_flight')
      and not exists(select 1 from eventing.queue_receipts r where r.job_id=j.id and r.status='in_flight' and r.visibility_deadline>now())
    order by j.created_at
    limit 100
  loop
    if not eventing.provider_message_exists(v_definition.provider_queue_name,v_job.provider_message_id) then
      perform eventing.republish_job(v_job.id);
      v_republished := v_republished+1;
    end if;
  end loop;

  for v_job in
    select j.id,j.provider_message_id
    from eventing.queue_jobs j
    where j.queue_code=p_queue_code and j.status in ('completed','dead_lettered','cancelled')
      and j.provider_message_id is not null
    order by j.updated_at
    limit 100
  loop
    if eventing.provider_message_exists(v_definition.provider_queue_name,v_job.provider_message_id) then
      select pgmq.archive(v_definition.provider_queue_name,v_job.provider_message_id::bigint) into v_archived;
      if coalesce(v_archived,false) then v_archived_terminal:=v_archived_terminal+1; end if;
    end if;
  end loop;

  for v_provider in execute format(
    'select msg_id,read_ct,message from pgmq.%I order by msg_id limit 100',
    'q_'||v_definition.provider_queue_name
  )
  loop
    v_provider_job_id := null;
    if coalesce(v_provider.message->>'jobId','') ~ v_uuid_pattern then
      v_provider_job_id := (v_provider.message->>'jobId')::uuid;
    end if;
    if v_provider_job_id is null or not exists(select 1 from eventing.queue_jobs where id=v_provider_job_id and queue_code=p_queue_code) then
      perform eventing.dead_letter_provider_message(
        p_queue_code,null,v_provider.msg_id::text,v_provider.read_ct,
        case when v_provider_job_id is null then 'invalid_job_envelope' else 'orphan_provider_message' end,
        jsonb_build_object('reconciled',true),v_provider.message
      );
      v_orphans:=v_orphans+1;
    end if;
  end loop;

  if p_queue_code='file_scan' then
    for v_file in
      select f.id,f.owner_organization_id,f.storage_provider,f.bucket,f.object_key,
             f.content_type,f.size_bytes,f.sha256,f.retention_class,
             coalesce(i.upload_profile_code,'unknown') as upload_profile_code
      from core.file_objects f
      left join core.file_upload_intents i on i.id=f.upload_intent_id
      where f.security_status='scan_pending' and f.scan_job_id is null and f.deleted_at is null
      order by f.created_at
      limit 100
      for update of f skip locked
    loop
      v_new_job_id := eventing.enqueue_job(
        'file_scan','file.malware_scan.requested',1,
        'file_scan:'||v_file.id::text||':'||v_file.sha256,
        null,v_file.owner_organization_id,'file_object',v_file.id,
        jsonb_build_object(
          'fileObjectId',v_file.id,'uploadProfileCode',v_file.upload_profile_code,
          'storageProvider',v_file.storage_provider,'bucket',v_file.bucket,
          'objectKey',v_file.object_key,'contentType',v_file.content_type,
          'sizeBytes',v_file.size_bytes,'sha256',v_file.sha256,
          'retentionClass',v_file.retention_class,'reconciled',true
        ),0
      );
      update core.file_objects set scan_job_id=v_new_job_id where id=v_file.id;
      v_scan_jobs_created:=v_scan_jobs_created+1;
    end loop;
  end if;

  update eventing.scheduler_runs
  set status='succeeded',completed_at=now(),details=jsonb_build_object(
    'expiredReceipts',v_expired_receipts,'expiredAttempts',v_expired_attempts,
    'releasedJobs',v_released_jobs,'republishedJobs',v_republished,
    'archivedTerminalMessages',v_archived_terminal,'orphanMessages',v_orphans,
    'scanJobsCreated',v_scan_jobs_created
  ) where id=v_run_id;

  return jsonb_build_object(
    'status','succeeded','expiredReceipts',v_expired_receipts,
    'republishedJobs',v_republished,'orphanMessages',v_orphans,
    'scanJobsCreated',v_scan_jobs_created
  );
exception when others then
  if v_run_id is not null then
    update eventing.scheduler_runs set status='failed',completed_at=now(),details=jsonb_build_object('sqlstate',sqlstate,'message',sqlerrm) where id=v_run_id;
  end if;
  raise;
end;
$$;

grant execute on function eventing.reconcile_queue_system(text) to app_worker;
-- END 20260708234100_m11k_queue_reconciliation

-- BEGIN 20260708234123_m11l_queue_metrics_alerts
-- Remote SQL SHA-256: 2b65f7d82d2cfebce73726cd98f4cdca05285737a8cbfd22a2b19bfa56d22846
create or replace function eventing.capture_queue_metrics(p_queue_code text)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_metrics pgmq.metrics_result;
  v_snapshot_id bigint;
  v_jobs_by_status jsonb;
  v_open_dead_letters bigint;
  v_in_flight bigint;
  v_expired_5m bigint;
  v_dispatch_failures_5m bigint;
  v_cron_failures_5m bigint;
  v_scan_pending bigint := 0;
  v_release_pending bigint := 0;
  v_oldest_scan_age integer;
begin
  select * into v_definition from eventing.queue_definitions where code=p_queue_code;
  if not found then raise exception 'queue_definition_not_found' using errcode='P0002'; end if;
  if v_definition.provider<>'pgmq' then raise exception 'metrics_provider_not_supported' using errcode='0A000'; end if;
  select * into v_metrics from pgmq.metrics(v_definition.provider_queue_name);

  select coalesce(jsonb_object_agg(status,cnt),'{}'::jsonb) into v_jobs_by_status
  from (select status,count(*) as cnt from eventing.queue_jobs where queue_code=p_queue_code group by status) s;
  select count(*) into v_open_dead_letters from eventing.queue_dead_letters where source_queue_code=p_queue_code and status='open';
  select count(*) into v_in_flight from eventing.queue_receipts where queue_code=p_queue_code and status='in_flight' and visibility_deadline>now();
  select count(*) into v_expired_5m from eventing.queue_receipts where queue_code=p_queue_code and status='expired' and completed_at>=now()-interval '5 minutes';
  select count(*) into v_dispatch_failures_5m
  from eventing.worker_dispatch_tokens
  where queue_code=p_queue_code and responded_at>=now()-interval '5 minutes'
    and (http_status_code<200 or http_status_code>=300 or http_error is not null);
  select count(*) into v_cron_failures_5m
  from cron.job_run_details d join cron.job j on j.jobid=d.jobid
  where j.jobname like 'estimulo-%' and d.start_time>=now()-interval '5 minutes'
    and d.status not in ('succeeded','running');

  if p_queue_code='file_scan' then
    select count(*),
           count(*) filter (where security_status='release_pending'),
           extract(epoch from now()-min(created_at) filter (where security_status='scan_pending'))::integer
    into v_scan_pending,v_release_pending,v_oldest_scan_age
    from core.file_objects
    where security_status in ('scan_pending','release_pending') and deleted_at is null;
    v_scan_pending := v_scan_pending-v_release_pending;
  end if;

  insert into eventing.queue_metric_snapshots(
    queue_code,captured_at,queue_length,total_messages,oldest_message_age_seconds,
    open_dead_letters,in_flight_receipts,expired_receipts_5m,dispatch_failures_5m,
    cron_failures_5m,scan_pending_count,release_pending_count,
    oldest_scan_pending_age_seconds,jobs_by_status
  ) values (
    p_queue_code,now(),coalesce(v_metrics.queue_length,0),coalesce(v_metrics.total_messages,0),v_metrics.oldest_msg_age_sec,
    v_open_dead_letters,v_in_flight,v_expired_5m,v_dispatch_failures_5m,
    v_cron_failures_5m,v_scan_pending,v_release_pending,v_oldest_scan_age,v_jobs_by_status
  ) returning id into v_snapshot_id;
  return v_snapshot_id;
end;
$$;

create or replace function eventing.evaluate_queue_alerts(p_queue_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_snapshot eventing.queue_metric_snapshots%rowtype;
  v_policy eventing.queue_alert_policies%rowtype;
  v_value numeric;
  v_severity text;
  v_opened integer := 0;
  v_resolved integer := 0;
begin
  select * into v_snapshot from eventing.queue_metric_snapshots
  where queue_code=p_queue_code order by captured_at desc limit 1;
  if not found then raise exception 'queue_metric_snapshot_not_found' using errcode='P0002'; end if;

  for v_policy in select * from eventing.queue_alert_policies where queue_code=p_queue_code and status='active' order by alert_code loop
    v_value := case v_policy.metric_code
      when 'queue_length' then v_snapshot.queue_length
      when 'oldest_message_age_seconds' then coalesce(v_snapshot.oldest_message_age_seconds,0)
      when 'open_dead_letters' then v_snapshot.open_dead_letters
      when 'expired_receipts_5m' then v_snapshot.expired_receipts_5m
      when 'dispatch_failures_5m' then v_snapshot.dispatch_failures_5m
      when 'cron_failures_5m' then v_snapshot.cron_failures_5m
      when 'oldest_scan_pending_age_seconds' then coalesce(v_snapshot.oldest_scan_pending_age_seconds,0)
      else 0 end;

    if v_value>=v_policy.warning_threshold then
      v_severity := case when v_value>=v_policy.critical_threshold then 'critical' else 'warning' end;
      insert into eventing.operational_alerts(
        queue_code,alert_code,severity,status,current_value,warning_threshold,
        critical_threshold,first_seen_at,last_seen_at,occurrence_count,details
      ) values (
        p_queue_code,v_policy.alert_code,v_severity,'open',v_value,
        v_policy.warning_threshold,v_policy.critical_threshold,now(),now(),1,
        jsonb_build_object('metricCode',v_policy.metric_code,'snapshotId',v_snapshot.id,'description',v_policy.description)
      ) on conflict (queue_code,alert_code) where status in ('open','acknowledged')
      do update set
        severity=excluded.severity,current_value=excluded.current_value,
        warning_threshold=excluded.warning_threshold,critical_threshold=excluded.critical_threshold,
        last_seen_at=now(),occurrence_count=eventing.operational_alerts.occurrence_count+1,
        details=excluded.details;
      v_opened:=v_opened+1;
    else
      update eventing.operational_alerts
      set status='resolved',resolved_at=now(),last_seen_at=now(),current_value=v_value
      where queue_code=p_queue_code and alert_code=v_policy.alert_code and status in ('open','acknowledged');
      v_resolved:=v_resolved+case when found then 1 else 0 end;
    end if;
  end loop;

  return jsonb_build_object('evaluatedAt',now(),'activeOrUpdated',v_opened,'resolved',v_resolved);
end;
$$;

create or replace function eventing.capture_and_evaluate_queue(p_queue_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_snapshot_id bigint; v_alerts jsonb;
begin
  v_snapshot_id:=eventing.capture_queue_metrics(p_queue_code);
  v_alerts:=eventing.evaluate_queue_alerts(p_queue_code);
  return jsonb_build_object('snapshotId',v_snapshot_id,'alerts',v_alerts);
end;
$$;

grant execute on function eventing.capture_queue_metrics(text) to app_worker;
grant execute on function eventing.evaluate_queue_alerts(text) to app_worker;
grant execute on function eventing.capture_and_evaluate_queue(text) to app_worker;
-- END 20260708234123_m11l_queue_metrics_alerts

-- BEGIN 20260708234311_m11m_operational_status_cleanup
-- Remote SQL SHA-256: 3f12b04a9e2fb1f0a9c556be866df35a0c5d458289142c2a26b6e068fe27575e
create or replace function public.queue_get_operational_status(p_queue_code text)
returns jsonb
language sql
security definer
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'queueCode',p_queue_code,
    'latestSnapshot',(
      select to_jsonb(s) from eventing.queue_metric_snapshots s
      where s.queue_code=p_queue_code order by s.captured_at desc limit 1
    ),
    'activeAlerts',coalesce((
      select jsonb_agg(to_jsonb(a) order by a.severity desc,a.first_seen_at)
      from eventing.operational_alerts a
      where a.queue_code=p_queue_code and a.status in ('open','acknowledged')
    ),'[]'::jsonb),
    'workerSchedules',coalesce((
      select jsonb_agg(to_jsonb(w) order by w.code)
      from eventing.worker_schedules w where w.queue_code=p_queue_code
    ),'[]'::jsonb),
    'recentSchedulerRuns',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.started_at desc)
      from (
        select * from eventing.scheduler_runs r
        where r.queue_code=p_queue_code order by r.started_at desc limit 20
      ) x
    ),'[]'::jsonb)
  );
$$;

create or replace function public.queue_acknowledge_alert(p_alert_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_count integer;
begin
  update eventing.operational_alerts
  set status='acknowledged',acknowledged_at=now()
  where id=p_alert_id and status='open';
  get diagnostics v_count=row_count;
  return v_count=1;
end;
$$;

create or replace function eventing.cleanup_scheduler_history()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_tokens integer;
  v_runs integer;
  v_metrics integer;
  v_cron integer;
begin
  delete from eventing.worker_dispatch_tokens
  where created_at<now()-interval '2 days' and status in ('claimed','expired','failed','revoked');
  get diagnostics v_tokens=row_count;
  delete from eventing.scheduler_runs where created_at<now()-interval '30 days';
  get diagnostics v_runs=row_count;
  delete from eventing.queue_metric_snapshots where captured_at<now()-interval '30 days';
  get diagnostics v_metrics=row_count;
  delete from cron.job_run_details where start_time<now()-interval '30 days';
  get diagnostics v_cron=row_count;
  return jsonb_build_object('dispatchTokens',v_tokens,'schedulerRuns',v_runs,'metricSnapshots',v_metrics,'cronRuns',v_cron);
end;
$$;

revoke all on function public.queue_get_operational_status(text) from public,anon,authenticated;
revoke all on function public.queue_acknowledge_alert(uuid) from public,anon,authenticated;
grant execute on function public.queue_get_operational_status(text) to service_role;
grant execute on function public.queue_acknowledge_alert(uuid) to service_role;
grant execute on function eventing.cleanup_scheduler_history() to app_worker;
-- END 20260708234311_m11m_operational_status_cleanup

-- BEGIN 20260708234404_m11n_activate_continuous_scheduler
-- Remote SQL SHA-256: b573e89c076431115cfa8f7cf19c721cc5cf62fcbf1b4c5d83d0610ed78db377
select cron.schedule(
  'estimulo-file-scan-dispatch',
  '30 seconds',
  $$select eventing.dispatch_worker_schedule('file_scan_worker');$$
);

select cron.schedule(
  'estimulo-queue-reconcile',
  '* * * * *',
  $$select eventing.reconcile_dispatch_requests(); select eventing.reconcile_queue_system('file_scan');$$
);

select cron.schedule(
  'estimulo-queue-metrics-alerts',
  '* * * * *',
  $$select eventing.capture_and_evaluate_queue('file_scan');$$
);

select cron.schedule(
  'estimulo-scheduler-history-cleanup',
  '17 3 * * *',
  $$select eventing.cleanup_scheduler_history();$$
);
-- END 20260708234404_m11n_activate_continuous_scheduler

-- BEGIN 20260708234709_m11o_cleanup_concurrency_proof
-- Remote SQL SHA-256: 5f167778143ececb975340f18d97048164a3914faefeb917950574ed0a9265b6
alter table eventing.queue_attempts disable trigger trg_eventing_queue_attempts_append_only;

create temporary table m11_proof_jobs on commit drop as
select id from eventing.queue_jobs
where payload->>'proofRunId'='45f88548-9fe0-4eab-9e8d-081ce9b7bace';

create temporary table m11_proof_workers on commit drop as
select distinct r.worker_id
from eventing.queue_receipts r join m11_proof_jobs j on j.id=r.job_id;

delete from eventing.worker_dispatch_tokens
where claimed_by in (select worker_id from m11_proof_workers);

delete from eventing.queue_attempts
where job_id in (select id from m11_proof_jobs);

delete from eventing.queue_receipts
where job_id in (select id from m11_proof_jobs);

delete from eventing.queue_dead_letters
where job_id in (select id from m11_proof_jobs);

delete from eventing.queue_jobs
where id in (select id from m11_proof_jobs);

delete from pgmq.q_estimulo_file_scan_jobs
where message->'payload'->>'proofRunId'='45f88548-9fe0-4eab-9e8d-081ce9b7bace';

delete from pgmq.a_estimulo_file_scan_jobs
where message->'payload'->>'proofRunId'='45f88548-9fe0-4eab-9e8d-081ce9b7bace';

delete from pgmq.q_estimulo_file_scan_dlq
where message->'message'->'payload'->>'proofRunId'='45f88548-9fe0-4eab-9e8d-081ce9b7bace';

delete from pgmq.a_estimulo_file_scan_dlq
where message->'message'->'payload'->>'proofRunId'='45f88548-9fe0-4eab-9e8d-081ce9b7bace';

delete from eventing.queue_metric_snapshots
where queue_code='file_scan' and open_dead_letters>0
  and captured_at>=timestamp with time zone '2026-07-08 23:44:30+00';

alter table eventing.queue_attempts enable trigger trg_eventing_queue_attempts_append_only;
-- END 20260708234709_m11o_cleanup_concurrency_proof

-- BEGIN 20260708234933_m11p_fix_scan_state_ambiguity
-- Remote SQL SHA-256: c92e4200412ba6260c1c9493e03c00724cf2d1bb56c740d58e62656cc4d4ec44
create or replace function public.file_get_scan_job_state(
  p_queue_job_id uuid,
  p_file_object_id uuid
) returns table(
  file_object_id uuid,
  queue_job_id uuid,
  security_status text,
  scan_applied boolean,
  scan_status text,
  source_bucket text,
  source_object_key text,
  target_object_key text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_file core.file_objects%rowtype;
  v_scan core.file_security_scans%rowtype;
  v_scan_found boolean := false;
begin
  select * into v_file from core.file_objects f where f.id=p_file_object_id;
  if not found then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  if v_file.scan_job_id is distinct from p_queue_job_id then
    raise exception 'file_scan_job_mismatch' using errcode='22023';
  end if;

  select s.* into v_scan
  from core.file_security_scans s
  where s.queue_job_id=p_queue_job_id
  order by s.completed_at desc
  limit 1;
  v_scan_found := found;

  return query select
    v_file.id,
    p_queue_job_id,
    v_file.security_status,
    v_scan_found,
    case when v_scan_found then v_scan.scan_status else null end,
    v_file.bucket,
    v_file.object_key,
    case
      when v_file.object_key like 'quarantine/%' then regexp_replace(v_file.object_key,'^quarantine/','protected/')
      when v_file.object_key like 'protected/%' then v_file.object_key
      else null
    end;
end;
$$;
-- END 20260708234933_m11p_fix_scan_state_ambiguity

-- BEGIN 20260708235115_m11q_cover_scheduler_foreign_keys
-- Remote SQL SHA-256: 43c3d96ea7a3646451f459a6f0d4f2287c4ec53bf1fd543d27e1ca75f8e1431a
create index if not exists ix_eventing_worker_schedules_queue_code
  on eventing.worker_schedules(queue_code);
create index if not exists ix_eventing_worker_dispatch_tokens_schedule_code
  on eventing.worker_dispatch_tokens(schedule_code);
-- END 20260708235115_m11q_cover_scheduler_foreign_keys

-- BEGIN 20260709000740_m12a_privacy_governance_catalogs
-- Remote SQL SHA-256: e6e9dd447c08c3a4979db5d6d8442c0e5e19b323b014fd48725eb055f08e412b
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
-- END 20260709000740_m12a_privacy_governance_catalogs

-- BEGIN 20260709000855_m12b_privacy_rights_retention
-- Remote SQL SHA-256: ab50dced63ffcf96cdd94277e001c04b9c9e3fa0c7611cdb2a4a461ef089629e
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

create trigger trg_privacy_requests_updated_at before update on governance.privacy_requests for each row execute function governance.set_updated_at();

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

create index ix_privacy_requests_status_due on governance.privacy_requests(status,due_at);
create index ix_privacy_request_events_request on governance.privacy_request_events(privacy_request_id,occurred_at);
create index ix_legal_holds_status_period on governance.legal_holds(status,effective_from,effective_until);
create index ix_legal_hold_targets_reference on governance.legal_hold_targets(target_type,target_reference);
create index ix_retention_runs_policy_status on governance.retention_runs(retention_policy_id,status,created_at desc);
create index ix_retention_actions_status on governance.retention_actions(status,created_at);

create trigger trg_legal_holds_updated_at before update on governance.legal_holds for each row execute function governance.set_updated_at();
create trigger trg_privacy_request_events_append_only before update or delete on governance.privacy_request_events for each row execute function governance.reject_mutation();
-- END 20260709000855_m12b_privacy_rights_retention

-- BEGIN 20260709000921_m12c_security_operations_registry
-- Remote SQL SHA-256: d12b9c81b69097e1d6b015de3275cb2adfcbe0a50f4071b055c165cbcc00bafb
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

create index ix_security_incidents_status_severity on governance.security_incidents(status,severity,detected_at desc);
create index ix_security_incident_events_incident on governance.security_incident_events(security_incident_id,occurred_at);
create index ix_secret_inventory_due on governance.secret_inventory(status,next_rotation_due_at);
create index ix_access_reviews_environment_status on governance.access_reviews(environment,status,period_end desc);
create index ix_backup_restore_tests_environment_status on governance.backup_restore_tests(environment,status,created_at desc);
create index ix_readiness_environment_status on governance.production_readiness_controls(environment,status,blocking);

create trigger trg_security_incidents_updated_at before update on governance.security_incidents for each row execute function governance.set_updated_at();
create trigger trg_secret_inventory_updated_at before update on governance.secret_inventory for each row execute function governance.set_updated_at();
create trigger trg_readiness_controls_updated_at before update on governance.production_readiness_controls for each row execute function governance.set_updated_at();
create trigger trg_security_incident_events_append_only before update or delete on governance.security_incident_events for each row execute function governance.reject_mutation();
-- END 20260709000921_m12c_security_operations_registry

-- BEGIN 20260709000947_m12d_log_redaction_and_consent_evidence
-- Remote SQL SHA-256: 1bde842a58aff3d1f56ac469e3f2103f1b7ce11d819fdc6a27c5373963ae6520
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
    select coalesce(jsonb_agg(governance.redact_jsonb(value)),'[]'::jsonb) into v_result from jsonb_array_elements(p_value);
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

alter table governance.purposes
  add constraint ck_governance_purposes_status check (status in ('draft','under_review','approved','active','suspended','retired')),
  add constraint ck_governance_purposes_approval check ((status in ('approved','active','suspended','retired'))=(approved_at is not null));

create trigger trg_audit_log_redact before insert on governance.audit_log for each row execute function governance.redact_jsonb_column('details');
create trigger trg_privacy_request_events_redact before insert on governance.privacy_request_events for each row execute function governance.redact_jsonb_column('details');
create trigger trg_retention_actions_redact before insert or update on governance.retention_actions for each row execute function governance.redact_jsonb_column('details');
create trigger trg_security_incident_events_redact before insert on governance.security_incident_events for each row execute function governance.redact_jsonb_column('details');
create trigger trg_processing_activities_redact before insert or update on governance.processing_activities for each row execute function governance.redact_jsonb_column('limitations');
create trigger trg_eventing_events_redact before insert or update on eventing.events for each row execute function governance.redact_jsonb_column('payload');
create trigger trg_eventing_queue_jobs_redact before insert or update on eventing.queue_jobs for each row execute function governance.redact_jsonb_column('payload');
create trigger trg_eventing_queue_jobs_error_redact before insert or update on eventing.queue_jobs for each row execute function governance.redact_jsonb_column('last_error_details');
create trigger trg_eventing_queue_attempts_redact before insert or update on eventing.queue_attempts for each row execute function governance.redact_jsonb_column('details');
create trigger trg_eventing_queue_dead_letters_reason_redact before insert or update on eventing.queue_dead_letters for each row execute function governance.redact_jsonb_column('reason_details');
create trigger trg_eventing_queue_dead_letters_message_redact before insert or update on eventing.queue_dead_letters for each row execute function governance.redact_jsonb_column('message_snapshot');
create trigger trg_eventing_scheduler_runs_redact before insert or update on eventing.scheduler_runs for each row execute function governance.redact_jsonb_column('details');
create trigger trg_eventing_operational_alerts_redact before insert or update on eventing.operational_alerts for each row execute function governance.redact_jsonb_column('details');

comment on function governance.redact_jsonb(jsonb) is 'Defense-in-depth redaction for secret-like JSON keys before persistence. It does not replace payload minimization or schema validation.';
-- END 20260709000947_m12d_log_redaction_and_consent_evidence

-- BEGIN 20260709001026_m12e_privacy_incident_readiness_workflows
-- Remote SQL SHA-256: 85d4598f1aed0bd615a3c332e8498eabb19b99acaf3f215d939ebe42f884f8d1
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

create trigger trg_retention_actions_legal_hold before insert or update on governance.retention_actions for each row execute function governance.enforce_retention_legal_hold();

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
    nullif(app_private.current_request_id(),'')::uuid,governance.redact_jsonb(coalesce(p_details,'{}'::jsonb)),p_privacy_class
  ) returning id into v_id;
  return v_id;
exception when invalid_text_representation then
  insert into governance.audit_log(
    occurred_at,actor_user_account_id,organization_id,action,resource_type,resource_id,request_id,details,privacy_class
  ) values (
    now(),coalesce(p_actor_user_account_id,app_private.current_user_account_id()),
    coalesce(p_organization_id,app_private.current_organization_id()),p_action,p_resource_type,p_resource_id,
    null,governance.redact_jsonb(coalesce(p_details,'{}'::jsonb)),p_privacy_class
  ) returning id into v_id;
  return v_id;
end;
$$;

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
  if p_request_reference is null or length(trim(p_request_reference))<3 then raise exception 'request_reference_required' using errcode='22023'; end if;
  if p_entrepreneur_id is not null and not exists(select 1 from core.entrepreneurs where id=p_entrepreneur_id) then raise exception 'entrepreneur_not_found' using errcode='P0002'; end if;
  insert into governance.privacy_requests(
    entrepreneur_id,request_type,status,requested_at,due_at,request_reference,
    requester_type,identity_verification_status,intake_channel,scope
  ) values (
    p_entrepreneur_id,p_request_type,'received',now(),p_due_at,trim(p_request_reference),
    p_requester_type,'pending',p_intake_channel,governance.redact_jsonb(coalesce(p_scope,'{}'::jsonb))
  ) returning id into v_id;
  insert into governance.privacy_request_events(privacy_request_id,event_type,to_status,details)
  values(v_id,'received','received',jsonb_build_object('channel',p_intake_channel));
  perform governance.write_audit_entry('privacy_request.created','privacy_request',v_id,jsonb_build_object('requestType',p_request_type),'personal');
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
  select status into v_old_status from governance.privacy_requests where id=p_privacy_request_id for update;
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
  perform governance.write_audit_entry('privacy_request.status_changed','privacy_request',p_privacy_request_id,jsonb_build_object('from',v_old_status,'to',p_to_status,'eventType',p_event_type),'personal');
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
declare v_purpose governance.purposes%rowtype; v_previous uuid; v_id uuid;
begin
  select * into v_purpose from governance.purposes where code=p_purpose_code and status in ('approved','active');
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
    v_previous,v_purpose.policy_document_id,p_consent_text_hash,coalesce(p_presented_data_categories,'{}'::text[]),
    governance.redact_jsonb(coalesce(p_collection_context,'{}'::jsonb)),p_expires_at
  ) returning id into v_id;
  perform governance.write_audit_entry('consent.decision_recorded','consent_record',v_id,jsonb_build_object('purposeCode',p_purpose_code,'status',p_status),'personal');
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
  insert into governance.security_incident_events(security_incident_id,event_type,actor_user_account_id,details)
  values(v_id,'detected',app_private.current_user_account_id(),jsonb_build_object('severity',p_severity));
  perform governance.write_audit_entry('security_incident.opened','security_incident',v_id,jsonb_build_object('severity',p_severity),'confidential');
  return v_id;
end;
$$;

create or replace function public.security_record_incident_event(
  p_security_incident_id uuid,p_event_type text,p_to_status text,p_details jsonb default '{}'::jsonb,p_evidence_reference text default null
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
  insert into governance.security_incident_events(security_incident_id,event_type,actor_user_account_id,details,evidence_reference)
  values(p_security_incident_id,p_event_type,app_private.current_user_account_id(),governance.redact_jsonb(coalesce(p_details,'{}'::jsonb)),p_evidence_reference);
  perform governance.write_audit_entry('security_incident.status_changed','security_incident',p_security_incident_id,jsonb_build_object('to',p_to_status,'eventType',p_event_type),'confidential');
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
-- END 20260709001026_m12e_privacy_incident_readiness_workflows

-- BEGIN 20260709001113_m12f_internal_rls_and_default_privileges
-- Remote SQL SHA-256: b16c89986b8aad67c328f34c2edac23d99cbbfa07064cedd58dd327838a33fa5
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
-- END 20260709001113_m12f_internal_rls_and_default_privileges

-- BEGIN 20260709001215_m12g_governance_catalog_and_readiness_seed
-- Remote SQL SHA-256: 628e9a1a6e50bb0c0fc46c430223caf4f56a9f9c7c43d96dc062b3be2fb5809e
alter table governance.processing_activities
  add column if not exists ripd_policy_document_id uuid references governance.policy_documents(id),
  add column if not exists legitimate_interest_assessment_document_id uuid references governance.policy_documents(id);

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

create trigger trg_processing_activity_activation before insert or update on governance.processing_activities for each row execute function governance.guard_processing_activity_activation();

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
on conflict(code) do update set name=excluded.name,law_reference=excluded.law_reference,data_scope=excluded.data_scope,requires_consent=excluded.requires_consent,description=excluded.description,status=excluded.status;

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
on conflict(code) do update set rank=excluded.rank,name=excluded.name,is_personal_data=excluded.is_personal_data,is_sensitive_personal_data=excluded.is_sensitive_personal_data,description=excluded.description,handling_rules=excluded.handling_rules,status=excluded.status;

insert into governance.purposes(code,name,description,status,legal_basis_reference,requires_consent,owner_role)
values
 ('platform_service_delivery','Prestação da plataforma de capacitação','Operar autenticação, matrícula, progressão, avaliações, suporte e emissão de credenciais.','draft',null,false,'product_owner'),
 ('learning_personalization','Personalização da aprendizagem','Adaptar conteúdos, sequência e intervenções para melhorar a experiência e aplicação do aprendizado.','draft',null,false,'learning_product_owner'),
 ('security_fraud_prevention','Segurança e prevenção a fraude','Proteger contas, arquivos, infraestrutura e integridade da plataforma.','draft',null,false,'security_owner'),
 ('program_evaluation_research','Avaliação de programa e pesquisa','Medir efetividade, qualidade e impacto da capacitação com minimização e agregação.','draft',null,false,'research_owner'),
 ('crm_operational_sync','Sincronização operacional com CRM','Sincronizar apenas fatos aprovados necessários ao acompanhamento do programa.','draft',null,false,'crm_integration_owner'),
 ('behavioral_intelligence_experimental','Inteligência comportamental experimental','Investigar sinais comportamentais da jornada em ambiente controlado, sem efeito em decisão de crédito.','draft',null,false,'behavioral_intelligence_owner'),
 ('credit_decision_support_future','Apoio futuro a decisões de crédito','Uso futuro e condicionado de sinais validados para suporte a decisões de crédito, vedado até aprovação específica.','draft',null,false,'credit_governance_owner')
on conflict(code) do update set name=excluded.name,description=excluded.description,owner_role=excluded.owner_role;

insert into governance.retention_policies(code,data_class,store_reference,retention_interval,deletion_action,legal_hold_supported,status,effective_from,version,trigger_type,trigger_reference,anonymization_spec)
values
 ('participant_identity_draft','personal','iam.user_accounts,core.entrepreneurs',null,'manual_review',true,'draft',current_date,1,'relationship_ended','Define after legal approval','{}'::jsonb),
 ('learning_events_draft','personal','eventing.events',null,'anonymize',true,'draft',current_date,1,'purpose_completed','Define after analytics and legal approval','{"preserve_aggregate":true}'::jsonb),
 ('behavioral_features_draft','behavioral_profile','intelligence.feature_values,intelligence.score_results',null,'delete',true,'draft',current_date,1,'purpose_completed','No production score retention until governance approval','{}'::jsonb),
 ('uploaded_evidence_draft','personal','core.file_objects,storage',null,'delete',true,'draft',current_date,1,'purpose_completed','Define by upload profile and legal need','{}'::jsonb),
 ('security_audit_draft','confidential','governance.audit_log,eventing operational logs',null,'archive_restricted',true,'draft',current_date,1,'legal_deadline','Define from security, audit and legal requirements','{}'::jsonb)
on conflict(code) do update set data_class=excluded.data_class,store_reference=excluded.store_reference,deletion_action=excluded.deletion_action,legal_hold_supported=excluded.legal_hold_supported,trigger_type=excluded.trigger_type,trigger_reference=excluded.trigger_reference,anonymization_spec=excluded.anonymization_spec;

insert into governance.processing_activities(
  code,name,description,purpose_id,legal_basis_code,status,data_subject_categories,processing_operations,
  recipient_categories,international_transfer,automated_decision,profiling,credit_decision_use,high_risk,ripd_required,owner_role,limitations
)
select x.code,x.name,x.description,p.id,null,'draft',x.subjects,x.operations,x.recipients,false,x.automated,x.profiling,x.credit_use,x.high_risk,x.ripd,x.owner_role,x.limitations
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
on conflict(code) do update set name=excluded.name,description=excluded.description,limitations=excluded.limitations,owner_role=excluded.owner_role;

insert into governance.processing_parties(code,party_name,party_role,country_code,contract_status,security_review_status,status,notes)
values
 ('estimulo_controller','Estímulo','controller','BR','pending','pending','draft','Formal controller identification and scope require institutional confirmation.'),
 ('supabase_test_provider','Supabase test environment provider','infrastructure_provider',null,'not_assessed','pending','draft','Test environment only; region, DPA and transfer assessment pending.'),
 ('aws_production_provider','AWS production environment provider','infrastructure_provider',null,'not_assessed','pending','draft','Production target; account, region, contracts and controls pending.'),
 ('hubspot_crm_provider','HubSpot CRM provider','operator',null,'not_assessed','not_assessed','draft','Actual connection, fields, region, contract and transfer assessment pending.')
on conflict(code) do update set party_name=excluded.party_name,party_role=excluded.party_role,notes=excluded.notes;

insert into governance.secret_inventory(secret_code,environment,provider,storage_reference,purpose,owner_role,rotation_policy,maximum_age_days,status,notes)
values
 ('SUPABASE_SERVICE_ROLE_KEY','test','local_environment','Supabase Edge Function managed environment','Backend privileged access for test Edge Functions.','security_owner','on_demand',null,'active','Value is never stored in governance tables or repository.'),
 ('SCHEDULER_PROJECT_URL','test','supabase_vault','vault:estimulo_project_url','Scheduler target URL.','platform_owner','immutable_public',null,'active','Public configuration, inventoried for change control.'),
 ('SCHEDULER_PUBLISHABLE_KEY','test','supabase_vault','vault:estimulo_publishable_key','Gateway key for scheduled Edge Function invocation; dispatch authorization still requires one-time token.','platform_owner','on_demand',null,'active','Publishable key is not treated as sole authorization.')
on conflict(secret_code) do update set storage_reference=excluded.storage_reference,purpose=excluded.purpose,notes=excluded.notes;

insert into governance.production_readiness_controls(environment,control_code,control_domain,title,description,blocking,status,evidence_reference,owner_role,verified_at)
values
 ('production','INTERNAL_RLS_COMPLETE','security','RLS interno completo','Todas as tabelas internas possuem RLS e não há privilégios diretos para anon/authenticated.',true,'passed','migration:m12f_internal_rls_and_default_privileges','database_security_owner',now()),
 ('production','LOG_REDACTION_ACTIVE','observability','Redaction de logs ativa','Campos com aparência de segredo são redigidos antes da persistência.',true,'passed','migration:m12d_log_redaction_and_consent_evidence','security_owner',now()),
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
on conflict(environment,control_code) do update set title=excluded.title,description=excluded.description,blocking=excluded.blocking,owner_role=excluded.owner_role,
  status=case when governance.production_readiness_controls.status='passed' then 'passed' else excluded.status end,
  evidence_reference=coalesce(governance.production_readiness_controls.evidence_reference,excluded.evidence_reference),
  verified_at=coalesce(governance.production_readiness_controls.verified_at,excluded.verified_at);
-- END 20260709001215_m12g_governance_catalog_and_readiness_seed

-- BEGIN 20260709001254_m12h_cover_governance_foreign_keys
-- Remote SQL SHA-256: 37a67fa2d401dd4912bbdb2ad967ab559e82cb3a739a260cfaace73c56ec7070
do $$
declare
  r record;
  v_columns text;
  v_index_name text;
begin
  for r in
    select c.oid as constraint_oid,c.conname,c.conrelid,n.nspname,cl.relname,c.conkey
    from pg_constraint c
    join pg_class cl on cl.oid=c.conrelid
    join pg_namespace n on n.oid=cl.relnamespace
    where c.contype='f'
      and n.nspname in ('iam','core','catalog','orchestration','diagnostics','assessment','engagement','intervention','eventing','integration','intelligence','governance','reporting')
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
-- END 20260709001254_m12h_cover_governance_foreign_keys

-- BEGIN 20260709001355_m12i_payload_redaction_hash_integrity
-- Remote SQL SHA-256: 2437fd3a252a3739d9082b4a36cf3c9c1fbddcc8a00982c4bbc52aca35cff7ca
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

drop trigger if exists trg_eventing_events_redact on eventing.events;
drop trigger if exists trg_eventing_queue_jobs_redact on eventing.queue_jobs;
create trigger trg_eventing_events_redact_hash before insert or update of payload on eventing.events for each row execute function governance.redact_payload_and_hash();
create trigger trg_eventing_queue_jobs_redact_hash before insert or update of payload on eventing.queue_jobs for each row execute function governance.redact_payload_and_hash();

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
  update eventing.queue_jobs set status='queued',provider_message_id=v_message_id::text,enqueued_at=now(),available_at=now()+make_interval(secs=>p_delay_seconds) where id=v_job_id;
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
-- END 20260709001355_m12i_payload_redaction_hash_integrity

-- BEGIN 20260709001438_m12j_fix_purpose_updated_at
-- Remote SQL SHA-256: c043fc40e6b1ba42fc24b5c055f99c9b7b1b68951267c36fca4f7d579f9a828c
alter table governance.purposes add column if not exists updated_at timestamptz not null default now();
-- END 20260709001438_m12j_fix_purpose_updated_at

-- BEGIN 20260709001551_m12k_complete_internal_rls
-- Remote SQL SHA-256: babb6e3aef5c11212ff22e7bf3be0b8f4f786883f83f1c61e494258c50fbd7ef
do $$
declare
  r record;
  v_runtime_select boolean;
begin
  for r in
    select c.oid,n.nspname,c.relname
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind='r'
      and n.nspname in ('iam','core','catalog','orchestration','diagnostics','assessment','engagement','intervention','eventing','integration','intelligence','governance','reporting')
      and not c.relrowsecurity
    order by n.nspname,c.relname
  loop
    v_runtime_select:=has_table_privilege('app_runtime',r.oid,'SELECT');
    execute format('alter table %I.%I enable row level security',r.nspname,r.relname);
    if has_table_privilege('app_worker',r.oid,'SELECT') and not exists(select 1 from pg_policies where schemaname=r.nspname and tablename=r.relname and policyname='m12_worker_select') then
      execute format('create policy m12_worker_select on %I.%I for select to app_worker using (app_private.is_trusted_worker())',r.nspname,r.relname);
    end if;
    if has_table_privilege('app_worker',r.oid,'INSERT') and not exists(select 1 from pg_policies where schemaname=r.nspname and tablename=r.relname and policyname='m12_worker_insert') then
      execute format('create policy m12_worker_insert on %I.%I for insert to app_worker with check (app_private.is_trusted_worker())',r.nspname,r.relname);
    end if;
    if has_table_privilege('app_worker',r.oid,'UPDATE') and not exists(select 1 from pg_policies where schemaname=r.nspname and tablename=r.relname and policyname='m12_worker_update') then
      execute format('create policy m12_worker_update on %I.%I for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker())',r.nspname,r.relname);
    end if;
    if has_table_privilege('app_worker',r.oid,'DELETE') and not exists(select 1 from pg_policies where schemaname=r.nspname and tablename=r.relname and policyname='m12_worker_delete') then
      execute format('create policy m12_worker_delete on %I.%I for delete to app_worker using (app_private.is_trusted_worker())',r.nspname,r.relname);
    end if;
    if v_runtime_select and not exists(select 1 from pg_policies where schemaname=r.nspname and tablename=r.relname and policyname='m12_runtime_select') then
      execute format('create policy m12_runtime_select on %I.%I for select to app_runtime using (true)',r.nspname,r.relname);
    end if;
  end loop;
end $$;

update governance.production_readiness_controls
set evidence_reference='migrations:m12f_internal_rls_and_default_privileges,m12k_complete_internal_rls',verified_at=now()
where environment='production' and control_code='INTERNAL_RLS_COMPLETE' and status='passed';
-- END 20260709001551_m12k_complete_internal_rls

-- BEGIN 20260709001702_m12l_processing_assets_and_parties
-- Remote SQL SHA-256: 14d70bca5f2ecb2c86b077aa57fde9981172d3ff32aa05fbbb6091075180390b
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
-- END 20260709001702_m12l_processing_assets_and_parties

-- BEGIN 20260709015643_m00_extensions_schemas_context
-- Remote SQL SHA-256: 1a8bf965c41f2a58c83ffdd00323b528d05e33c0750b9cd4b4dff3fec25db497
-- Plataforma Estímulo — M00 — extensions, schemas and provider-neutral request context
-- Generated from the approved v0.2 baseline. Do not edit a migration after it has been applied.
set lock_timeout = '5s';
set statement_timeout = '5min';

-- Plataforma Estímulo — modelo físico executável v0.2
-- PostgreSQL-compatible and provider-neutral.
-- Supabase is used for local/test; the same migrations target Amazon RDS PostgreSQL.

create extension if not exists pgcrypto;

create schema if not exists iam;

create schema if not exists core;

create schema if not exists catalog;

create schema if not exists orchestration;

create schema if not exists diagnostics;

create schema if not exists assessment;

create schema if not exists engagement;

create schema if not exists intervention;

create schema if not exists eventing;

create schema if not exists integration;

create schema if not exists intelligence;

create schema if not exists governance;

create schema if not exists reporting;

create or replace function governance.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create or replace function governance.reject_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'table %.% is append-only', tg_table_schema, tg_table_name;
end
$$;

create schema if not exists app_private;

revoke all on schema app_private from public;

create or replace function app_private.set_request_context(
  p_user_account_id uuid,
  p_organization_id uuid,
  p_request_id text,
  p_actor_type text default 'user'
) returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if p_request_id is null or length(trim(p_request_id)) = 0 then
    raise exception 'request_id_required' using errcode = '22023';
  end if;
  if p_actor_type not in ('user', 'operator', 'worker', 'system') then
    raise exception 'invalid_actor_type' using errcode = '22023';
  end if;
  perform set_config('app.user_account_id', coalesce(p_user_account_id::text, ''), true);
  perform set_config('app.organization_id', coalesce(p_organization_id::text, ''), true);
  perform set_config('app.request_id', trim(p_request_id), true);
  perform set_config('app.actor_type', p_actor_type, true);
end;
$$;

create or replace function app_private.current_user_account_id()
returns uuid
language sql stable security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.user_account_id', true), '')::uuid;
$$;

create or replace function app_private.current_organization_id()
returns uuid
language sql stable security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.organization_id', true), '')::uuid;
$$;

create or replace function app_private.current_request_id()
returns text
language sql stable security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.request_id', true), '');
$$;

create or replace function app_private.current_actor_type()
returns text
language sql stable security invoker
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.actor_type', true), '');
$$;

create or replace function iam.current_user_account_id()
returns uuid
language sql stable security invoker
set search_path = pg_catalog, app_private
as $$
  select app_private.current_user_account_id();
$$;
-- END 20260709015643_m00_extensions_schemas_context

-- BEGIN 20260709025331_e14_create_migration_history_export_rpc
-- Remote SQL SHA-256: 6b5adffa542620aefacd84f7246a1c6382c73f6d7eacc2f625980ec7321d6d46
create or replace function public.e14_export_migration_history(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, supabase_migrations
as $$
declare
  result jsonb;
begin
  if p_token is distinct from 'Qw08Dq8M0Ax1FC8D0H6wbkZu1JdnLCoFPRCtYF0mZwA' then
    raise exception 'invalid export token' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'version', version,
        'name', name,
        'statements', statements,
        'created_by', created_by,
        'idempotency_key', idempotency_key,
        'rollback', rollback
      ) order by version
    ),
    '[]'::jsonb
  )
  into result
  from supabase_migrations.schema_migrations;

  return result;
end
$$;

revoke all on function public.e14_export_migration_history(text) from public;
grant execute on function public.e14_export_migration_history(text) to anon;
-- END 20260709025331_e14_create_migration_history_export_rpc

-- BEGIN 20260709025423_e14_drop_migration_history_export_rpc
-- Remote SQL SHA-256: f2ffefeb7cb4335e701ad2f8c150edd0f2ae4e3d4f6dd4bf4988b5476e7ccf5f
revoke all on function public.e14_export_migration_history(text) from public, anon, authenticated;
drop function if exists public.e14_export_migration_history(text);
-- END 20260709025423_e14_drop_migration_history_export_rpc

-- BEGIN 20260709025512_e14_create_service_only_migration_export_rpc
-- Remote SQL SHA-256: 7c20fd2a3cfffb3231ba2157415c074006f8d5c957d66e94dbbefbab7bcab2a9
create or replace function public.e14_export_migration_history_v2()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, supabase_migrations
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'version', version,
        'name', name,
        'statements', statements,
        'created_by', created_by,
        'idempotency_key', idempotency_key,
        'rollback', rollback
      ) order by version
    ),
    '[]'::jsonb
  )
  from supabase_migrations.schema_migrations;
$$;

revoke all on function public.e14_export_migration_history_v2() from public, anon, authenticated;
grant execute on function public.e14_export_migration_history_v2() to service_role;
-- END 20260709025512_e14_create_service_only_migration_export_rpc

-- BEGIN 20260709025917_e14_drop_service_only_migration_export_rpc
-- Remote SQL SHA-256: d705fb553c1c289c5e5233bed073fb525da03db14649dc5e36afeda658ed1c22
revoke all on function public.e14_export_migration_history_v2() from public, anon, authenticated, service_role;
drop function if exists public.e14_export_migration_history_v2();
-- END 20260709025917_e14_drop_service_only_migration_export_rpc

-- BEGIN 20260709030140_e14_harden_governance_trigger_search_path
-- Remote SQL SHA-256: 49aa81dd7ab3311d54915110e13292bfac7b5e6e41eae14cb330697d753b5df1
alter function governance.set_updated_at() set search_path = pg_catalog;
alter function governance.reject_mutation() set search_path = pg_catalog;
-- END 20260709030140_e14_harden_governance_trigger_search_path
