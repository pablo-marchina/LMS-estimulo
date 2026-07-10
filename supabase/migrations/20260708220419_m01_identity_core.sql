-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708220419
-- Remote name: m01_identity_core
-- Remote SQL SHA-256: e9676126a0a73fe1c12d776f80efccf08612989be1c7e27551229f093effe2c9
-- Do not edit after reconciliation; corrections require a new migration.

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
