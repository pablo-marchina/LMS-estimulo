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
