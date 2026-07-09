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
