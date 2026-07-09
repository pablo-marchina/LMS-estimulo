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
