-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708221622
-- Remote name: m08e_identity_authorization
-- Remote SQL SHA-256: db0ef63b122e574d7faa8c745bf5fb46441306825f377c32385fef4d8cc8a5db
-- Do not edit after reconciliation; corrections require a new migration.

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
