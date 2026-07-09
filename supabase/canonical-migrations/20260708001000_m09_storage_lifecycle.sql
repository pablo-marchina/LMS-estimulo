-- M09 — Provider-neutral file lifecycle, upload intents, quarantine and scan state.
-- The storage schema is intentionally treated as read-only. Binary operations
-- must be performed through the provider API by an ObjectStorageProvider adapter.

set lock_timeout = '5s';
set statement_timeout = '5min';

-- -------------------------------------------------------------------------
-- Core file model corrections and extensions.
-- -------------------------------------------------------------------------
alter table core.file_objects
  drop constraint if exists uq_core_file_objects_sha256_size_bytes;

create index if not exists ix_core_file_objects_sha256_size_bytes
  on core.file_objects (sha256, size_bytes);

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

comment on table core.file_upload_profiles is
  'Environment-independent upload policy. Physical provider and bucket remain adapter configuration.';

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
  constraint ck_core_file_upload_intents_status check (
    status in ('pending_upload','uploaded','confirmed','aborted','expired','rejected')
  ),
  constraint ck_core_file_upload_intents_size check (max_size_bytes > 0),
  constraint ck_core_file_upload_intents_expiry check (expires_at > created_at)
);

comment on table core.file_upload_intents is
  'Short-lived application authorization for one immutable object key. Provider signed URLs may live longer; expired intents are never accepted.';

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
  constraint ck_core_file_security_scans_status check (
    scan_status in ('clean','infected','unsupported','access_denied','failed','manual_review')
  ),
  constraint ck_core_file_security_scans_dates check (
    started_at is null or completed_at >= started_at
  )
);

comment on table core.file_security_scans is
  'Append-only normalized scan outcomes. Provider-specific result payloads are reduced to governed fields.';

alter table core.file_objects
  add constraint fk_core_file_objects_upload_intent_id
    foreign key (upload_intent_id) references core.file_upload_intents(id),
  add constraint fk_core_file_objects_created_by_user_account_id
    foreign key (created_by_user_account_id) references iam.user_accounts(id),
  add constraint uq_core_file_objects_upload_intent_id unique (upload_intent_id),
  add constraint ck_core_file_objects_sha256 check (sha256 ~ '^[a-f0-9]{64}$'),
  add constraint ck_core_file_objects_security_status check (
    security_status in ('quarantined','scan_pending','release_pending','clean','infected','manual_review','rejected','deleted')
  );

alter table core.file_upload_intents
  add constraint fk_core_file_upload_intents_owner_organization_id
    foreign key (owner_organization_id) references iam.organizations(id),
  add constraint fk_core_file_upload_intents_requested_by_user_account_id
    foreign key (requested_by_user_account_id) references iam.user_accounts(id),
  add constraint fk_core_file_upload_intents_requested_by_entrepreneur_id
    foreign key (requested_by_entrepreneur_id) references core.entrepreneurs(id),
  add constraint fk_core_file_upload_intents_upload_profile_code
    foreign key (upload_profile_code) references core.file_upload_profiles(code),
  add constraint fk_core_file_upload_intents_file_object_id
    foreign key (file_object_id) references core.file_objects(id);

alter table core.file_security_scans
  add constraint fk_core_file_security_scans_file_object_id
    foreign key (file_object_id) references core.file_objects(id),
  add constraint fk_core_file_security_scans_source_event_id
    foreign key (source_event_id) references eventing.events(event_id);

create index ix_core_file_upload_intents_requester_status
  on core.file_upload_intents (requested_by_user_account_id, status, created_at desc);
create index ix_core_file_upload_intents_expires_at_pending
  on core.file_upload_intents (expires_at) where status = 'pending_upload';
create index ix_core_file_upload_intents_owner_org_status
  on core.file_upload_intents (owner_organization_id, status, created_at desc);
create index ix_core_file_upload_intents_entrepreneur_id
  on core.file_upload_intents (requested_by_entrepreneur_id);
create index ix_core_file_upload_intents_profile_code
  on core.file_upload_intents (upload_profile_code);
create index ix_core_file_security_scans_file_completed
  on core.file_security_scans (file_object_id, completed_at desc);
create index ix_core_file_security_scans_source_event_id
  on core.file_security_scans (source_event_id);
create index ix_core_file_objects_created_by_status
  on core.file_objects (created_by_user_account_id, security_status, created_at desc);

create trigger trg_core_file_upload_profiles_updated_at
before update on core.file_upload_profiles
for each row execute function governance.set_updated_at();

create trigger trg_core_file_upload_intents_updated_at
before update on core.file_upload_intents
for each row execute function governance.set_updated_at();

create trigger trg_core_file_security_scans_append_only
before update or delete on core.file_security_scans
for each row execute function governance.reject_mutation();

-- The only active profile in this technical proof is explicitly non-product.
-- Product profiles must be approved separately before use.
insert into core.file_upload_profiles(
  code, description, allowed_mime_types, allowed_extensions,
  max_size_bytes, retention_class, requires_malware_scan, status
) values (
  'e12_storage_proof',
  'Technical proof only; not a product upload policy',
  array['text/plain','application/pdf','image/png','image/jpeg'],
  array['txt','pdf','png','jpg','jpeg'],
  5242880,
  'test_ephemeral',
  true,
  'active'
) on conflict (code) do update set
  description = excluded.description,
  allowed_mime_types = excluded.allowed_mime_types,
  allowed_extensions = excluded.allowed_extensions,
  max_size_bytes = excluded.max_size_bytes,
  retention_class = excluded.retention_class,
  requires_malware_scan = excluded.requires_malware_scan,
  status = excluded.status;

-- -------------------------------------------------------------------------
-- Authorization helpers.
-- -------------------------------------------------------------------------
create or replace function app_private.safe_object_filename(p_filename text)
returns text
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  v_name text;
begin
  v_name := regexp_replace(coalesce(p_filename, ''), '^.*[\\/]', '');
  v_name := lower(trim(v_name));
  v_name := regexp_replace(v_name, '[^a-z0-9._-]+', '-', 'g');
  v_name := regexp_replace(v_name, '(^[-._]+|[-._]+$)', '', 'g');
  if length(v_name) = 0 then
    v_name := 'file.bin';
  end if;
  return left(v_name, 120);
end;
$$;

create or replace function app_private.can_access_file_upload_intent(p_intent_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select app_private.is_trusted_worker()
      or exists (
        select 1
        from core.file_upload_intents i
        where i.id = p_intent_id
          and (
            i.requested_by_user_account_id = app_private.current_user_account_id()
            or app_private.has_permission('file.manage', i.owner_organization_id, 'file_upload_intent', i.id)
          )
      );
$$;

create or replace function app_private.can_manage_file_upload_intent(p_intent_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $$
  select app_private.is_trusted_worker()
      or exists (
        select 1
        from core.file_upload_intents i
        where i.id = p_intent_id
          and app_private.has_permission('file.manage', i.owner_organization_id, 'file_upload_intent', i.id)
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
        from core.file_objects f
        where f.id = p_file_object_id
          and f.created_by_user_account_id = app_private.current_user_account_id()
      )
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

-- -------------------------------------------------------------------------
-- RLS for provider-neutral metadata. Binary authorization remains in the API.
-- -------------------------------------------------------------------------
alter table core.file_upload_profiles enable row level security;
alter table core.file_upload_intents enable row level security;
alter table core.file_security_scans enable row level security;

create policy file_upload_profiles_read_runtime on core.file_upload_profiles
for select to app_runtime, app_worker
using (status = 'active' or app_private.is_trusted_worker());

create policy file_upload_profiles_worker_insert on core.file_upload_profiles
for insert to app_worker with check (app_private.is_trusted_worker());
create policy file_upload_profiles_worker_update on core.file_upload_profiles
for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy file_upload_profiles_worker_delete on core.file_upload_profiles
for delete to app_worker using (app_private.is_trusted_worker());

create policy file_upload_intents_select_authorized on core.file_upload_intents
for select to app_runtime, app_worker
using (app_private.can_access_file_upload_intent(id));
create policy file_upload_intents_insert_authorized on core.file_upload_intents
for insert to app_runtime, app_worker
with check (
  app_private.is_trusted_worker()
  or requested_by_user_account_id = app_private.current_user_account_id()
);
create policy file_upload_intents_update_authorized on core.file_upload_intents
for update to app_runtime, app_worker
using (app_private.can_access_file_upload_intent(id))
with check (app_private.can_access_file_upload_intent(id));
create policy file_upload_intents_delete_worker on core.file_upload_intents
for delete to app_worker using (app_private.is_trusted_worker());

create policy file_security_scans_select_authorized on core.file_security_scans
for select to app_runtime, app_worker
using (app_private.can_access_file_object(file_object_id));
create policy file_security_scans_insert_worker on core.file_security_scans
for insert to app_worker with check (app_private.is_trusted_worker());

-- -------------------------------------------------------------------------
-- Service-only RPC boundary used by the Edge Function. No application table
-- is exposed in public; only narrow commands/descriptors are exposed.
-- -------------------------------------------------------------------------
create or replace function public.file_create_upload_intent(
  p_provider text,
  p_issuer text,
  p_subject text,
  p_email_normalized text,
  p_email_verified boolean,
  p_claims_fingerprint text,
  p_owner_organization_id uuid,
  p_requested_by_entrepreneur_id uuid,
  p_upload_profile_code text,
  p_storage_provider text,
  p_bucket text,
  p_original_filename text,
  p_expected_content_type text,
  p_ttl_seconds integer default 900
) returns table(
  intent_id uuid,
  bucket text,
  object_key text,
  expected_content_type text,
  max_size_bytes bigint,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_account_id uuid;
  v_self_entrepreneur_id uuid;
  v_profile core.file_upload_profiles%rowtype;
  v_intent_id uuid := gen_random_uuid();
  v_safe_name text;
  v_extension text;
  v_authorized boolean := false;
begin
  if p_ttl_seconds < 60 or p_ttl_seconds > 7200 then
    raise exception 'invalid_upload_intent_ttl' using errcode = '22023';
  end if;
  if p_storage_provider not in ('supabase_storage','s3') then
    raise exception 'unsupported_storage_provider' using errcode = '22023';
  end if;
  if p_bucket is null or length(trim(p_bucket)) = 0 then
    raise exception 'bucket_required' using errcode = '22023';
  end if;

  v_account_id := iam.resolve_external_identity(
    p_provider, p_issuer, p_subject, p_email_normalized,
    p_email_verified, p_claims_fingerprint
  );

  perform app_private.set_request_context(v_account_id, p_owner_organization_id, 'file-upload-intent', 'user');

  select * into v_profile
  from core.file_upload_profiles
  where code = p_upload_profile_code and status = 'active';
  if not found then
    raise exception 'upload_profile_not_found' using errcode = 'P0002';
  end if;

  select id into v_self_entrepreneur_id
  from core.entrepreneurs
  where user_account_id = v_account_id and status = 'active'
  limit 1;

  if p_requested_by_entrepreneur_id is not null
     and p_requested_by_entrepreneur_id is distinct from v_self_entrepreneur_id then
    raise exception 'entrepreneur_identity_mismatch' using errcode = '28000';
  end if;

  v_authorized := app_private.has_permission(
    'file.manage', p_owner_organization_id, 'organization', p_owner_organization_id
  );

  if not v_authorized and v_self_entrepreneur_id is not null then
    select exists (
      select 1
      from orchestration.enrollments e
      join catalog.journey_versions jv on jv.id = e.journey_version_id
      join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
      where e.entrepreneur_id = v_self_entrepreneur_id
        and jd.owner_organization_id = p_owner_organization_id
        and e.status in ('assigned','active','paused','completed')
    ) into v_authorized;
  end if;

  if not v_authorized then
    raise exception 'file_upload_not_authorized' using errcode = '28000';
  end if;

  if not lower(trim(p_expected_content_type)) = any(v_profile.allowed_mime_types) then
    raise exception 'content_type_not_allowed' using errcode = '22023';
  end if;

  v_safe_name := app_private.safe_object_filename(p_original_filename);
  v_extension := lower(regexp_replace(v_safe_name, '^.*\.', ''));
  if v_extension = v_safe_name or not v_extension = any(v_profile.allowed_extensions) then
    raise exception 'file_extension_not_allowed' using errcode = '22023';
  end if;

  insert into core.file_upload_intents(
    id, owner_organization_id, requested_by_user_account_id,
    requested_by_entrepreneur_id, upload_profile_code, storage_provider,
    bucket, object_key, original_filename, expected_content_type,
    max_size_bytes, retention_class, status, expires_at
  ) values (
    v_intent_id, p_owner_organization_id, v_account_id,
    coalesce(p_requested_by_entrepreneur_id, v_self_entrepreneur_id),
    v_profile.code, p_storage_provider, trim(p_bucket),
    'quarantine/' || p_owner_organization_id::text || '/' || v_account_id::text || '/' || v_intent_id::text || '/' || v_safe_name,
    v_safe_name, lower(trim(p_expected_content_type)),
    v_profile.max_size_bytes, v_profile.retention_class,
    'pending_upload', now() + make_interval(secs => p_ttl_seconds)
  );

  return query
  select i.id, i.bucket, i.object_key, i.expected_content_type,
         i.max_size_bytes, i.expires_at
  from core.file_upload_intents i where i.id = v_intent_id;
end;
$$;

create or replace function public.file_get_upload_intent(
  p_provider text,
  p_issuer text,
  p_subject text,
  p_email_normalized text,
  p_email_verified boolean,
  p_claims_fingerprint text,
  p_intent_id uuid
) returns table(
  intent_id uuid,
  owner_organization_id uuid,
  upload_profile_code text,
  storage_provider text,
  bucket text,
  object_key text,
  expected_content_type text,
  max_size_bytes bigint,
  expires_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_account_id uuid;
  v_org_id uuid;
begin
  v_account_id := iam.resolve_external_identity(
    p_provider, p_issuer, p_subject, p_email_normalized,
    p_email_verified, p_claims_fingerprint
  );
  select i.owner_organization_id into v_org_id
  from core.file_upload_intents i where i.id = p_intent_id;
  if v_org_id is null then raise exception 'upload_intent_not_found' using errcode='P0002'; end if;
  perform app_private.set_request_context(v_account_id, v_org_id, 'file-upload-confirm', 'user');
  if not app_private.can_access_file_upload_intent(p_intent_id) then
    raise exception 'file_upload_not_authorized' using errcode='28000';
  end if;
  return query
  select i.id, i.owner_organization_id, i.upload_profile_code,
         i.storage_provider, i.bucket, i.object_key,
         i.expected_content_type, i.max_size_bytes, i.expires_at, i.status
  from core.file_upload_intents i where i.id = p_intent_id;
end;
$$;

create or replace function public.file_abort_upload_intent(
  p_intent_id uuid,
  p_failure_code text
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  update core.file_upload_intents
     set status='aborted', aborted_at=now(), failure_code=left(coalesce(p_failure_code,'unknown'),120)
   where id=p_intent_id and status='pending_upload';
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

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
  v_file_id uuid := gen_random_uuid();
begin
  if p_actual_size_bytes < 0 then raise exception 'invalid_file_size' using errcode='22023'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'invalid_sha256' using errcode='22023'; end if;

  v_account_id := iam.resolve_external_identity(
    p_provider, p_issuer, p_subject, p_email_normalized,
    p_email_verified, p_claims_fingerprint
  );

  select * into v_intent from core.file_upload_intents where id=p_intent_id for update;
  if not found then raise exception 'upload_intent_not_found' using errcode='P0002'; end if;
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

  insert into core.file_objects(
    id, owner_organization_id, storage_provider, bucket, object_key,
    content_type, size_bytes, sha256, security_status, retention_class,
    upload_intent_id, created_by_user_account_id, original_filename,
    provider_object_version, etag, verified_at, quarantined_at, metadata
  ) values (
    v_file_id, v_intent.owner_organization_id, v_intent.storage_provider,
    v_intent.bucket, v_intent.object_key, lower(trim(p_actual_content_type)),
    p_actual_size_bytes, p_sha256, 'quarantined', v_intent.retention_class,
    v_intent.id, v_account_id, v_intent.original_filename,
    p_provider_object_version, p_etag, now(), now(), coalesce(p_metadata,'{}'::jsonb)
  );

  update core.file_upload_intents
     set status='confirmed', uploaded_at=now(), confirmed_at=now(), file_object_id=v_file_id
   where id=v_intent.id;

  return query
  select f.id, f.security_status, f.bucket, f.object_key, f.sha256, f.size_bytes
  from core.file_objects f where f.id=v_file_id;
end;
$$;

create or replace function public.file_record_scan_result(
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
  next_security_status text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_file core.file_objects%rowtype;
  v_next text;
  v_target text;
begin
  if p_scan_status not in ('clean','infected','unsupported','access_denied','failed','manual_review') then
    raise exception 'invalid_scan_status' using errcode='22023';
  end if;
  select * into v_file from core.file_objects where id=p_file_object_id for update;
  if not found then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  if v_file.security_status not in ('quarantined','scan_pending','manual_review') then
    raise exception 'file_not_scannable' using errcode='55000';
  end if;

  insert into core.file_security_scans(
    file_object_id, scanner_provider, scanner_version, scan_status,
    threats, status_reasons, provider_reference, started_at, completed_at
  ) values (
    p_file_object_id, trim(p_scanner_provider), nullif(trim(p_scanner_version),''), p_scan_status,
    coalesce(p_threats,'[]'::jsonb), coalesce(p_status_reasons,'[]'::jsonb),
    nullif(trim(p_provider_reference),''), p_started_at, coalesce(p_completed_at,now())
  );

  v_next := case p_scan_status
    when 'clean' then 'release_pending'
    when 'infected' then 'infected'
    else 'manual_review'
  end;
  if p_scan_status='clean' then
    v_target := regexp_replace(v_file.object_key, '^quarantine/', 'protected/');
    if v_target = v_file.object_key then raise exception 'file_not_in_quarantine_prefix' using errcode='55000'; end if;
  end if;

  update core.file_objects
     set security_status=v_next, scan_completed_at=coalesce(p_completed_at,now())
   where id=p_file_object_id;

  return query select v_file.id, v_file.bucket, v_file.object_key, v_target, v_next;
end;
$$;

create or replace function public.file_complete_release(
  p_file_object_id uuid,
  p_target_object_key text,
  p_provider_object_version text,
  p_etag text
) returns table(
  file_object_id uuid,
  security_status text,
  bucket text,
  object_key text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_file core.file_objects%rowtype;
  v_expected text;
begin
  select * into v_file from core.file_objects where id=p_file_object_id for update;
  if not found then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  if v_file.security_status <> 'release_pending' then raise exception 'file_not_release_pending' using errcode='55000'; end if;
  v_expected := regexp_replace(v_file.object_key, '^quarantine/', 'protected/');
  if p_target_object_key <> v_expected then raise exception 'invalid_release_target' using errcode='22023'; end if;

  update core.file_objects
     set object_key=p_target_object_key,
         provider_object_version=coalesce(p_provider_object_version,provider_object_version),
         etag=coalesce(p_etag,etag),
         security_status='clean', released_at=now()
   where id=p_file_object_id;

  return query
  select f.id, f.security_status, f.bucket, f.object_key
  from core.file_objects f where f.id=p_file_object_id;
end;
$$;

create or replace function public.file_get_download_descriptor(
  p_provider text,
  p_issuer text,
  p_subject text,
  p_email_normalized text,
  p_email_verified boolean,
  p_claims_fingerprint text,
  p_file_object_id uuid
) returns table(
  file_object_id uuid,
  storage_provider text,
  bucket text,
  object_key text,
  content_type text,
  size_bytes bigint,
  sha256 text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_account_id uuid;
  v_org_id uuid;
begin
  v_account_id := iam.resolve_external_identity(
    p_provider, p_issuer, p_subject, p_email_normalized,
    p_email_verified, p_claims_fingerprint
  );
  select owner_organization_id into v_org_id from core.file_objects where id=p_file_object_id;
  if v_org_id is null then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  perform app_private.set_request_context(v_account_id, v_org_id, 'file-download-intent', 'user');
  if not app_private.can_access_file_object(p_file_object_id) then
    raise exception 'file_download_not_authorized' using errcode='28000';
  end if;
  return query
  select f.id, f.storage_provider, f.bucket, f.object_key,
         f.content_type, f.size_bytes, f.sha256
  from core.file_objects f
  where f.id=p_file_object_id and f.security_status='clean' and f.deleted_at is null;
  if not found then raise exception 'file_not_downloadable' using errcode='55000'; end if;
end;
$$;

-- Service-role RPCs are not callable by browser roles.
revoke all on function public.file_create_upload_intent(text,text,text,text,boolean,text,uuid,uuid,text,text,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.file_get_upload_intent(text,text,text,text,boolean,text,uuid) from public, anon, authenticated;
revoke all on function public.file_abort_upload_intent(uuid,text) from public, anon, authenticated;
revoke all on function public.file_confirm_upload(text,text,text,text,boolean,text,uuid,text,bigint,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.file_record_scan_result(uuid,text,text,text,jsonb,jsonb,text,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function public.file_complete_release(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.file_get_download_descriptor(text,text,text,text,boolean,text,uuid) from public, anon, authenticated;

grant execute on function public.file_create_upload_intent(text,text,text,text,boolean,text,uuid,uuid,text,text,text,text,text,integer) to service_role;
grant execute on function public.file_get_upload_intent(text,text,text,text,boolean,text,uuid) to service_role;
grant execute on function public.file_abort_upload_intent(uuid,text) to service_role;
grant execute on function public.file_confirm_upload(text,text,text,text,boolean,text,uuid,text,bigint,text,text,text,jsonb) to service_role;
grant execute on function public.file_record_scan_result(uuid,text,text,text,jsonb,jsonb,text,timestamptz,timestamptz) to service_role;
grant execute on function public.file_complete_release(uuid,text,text,text) to service_role;
grant execute on function public.file_get_download_descriptor(text,text,text,text,boolean,text,uuid) to service_role;

-- Runtime/worker grants for internal API implementations and tests.
grant select on core.file_upload_profiles to app_runtime;
grant select, insert, update on core.file_upload_intents to app_runtime;
grant select on core.file_security_scans to app_runtime;
grant select, insert, update, delete on core.file_upload_profiles, core.file_upload_intents, core.file_security_scans to app_worker;
grant execute on function app_private.safe_object_filename(text) to app_runtime, app_worker;
grant execute on function app_private.can_access_file_upload_intent(uuid) to app_runtime, app_worker;
grant execute on function app_private.can_manage_file_upload_intent(uuid) to app_runtime, app_worker;
