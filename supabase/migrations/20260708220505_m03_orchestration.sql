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
