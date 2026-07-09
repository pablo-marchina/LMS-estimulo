-- remote migration 20260709051056: m13a_e14_command_foundation
-- Plataforma Estímulo — E14 Step 4 — command foundation, immutability and internal fixture
set lock_timeout = '5s';
set statement_timeout = '5min';

create or replace function app_private.e14_request_hash(p_payload jsonb)
returns text
language sql
immutable
security definer
set search_path = pg_catalog
as $$
  select encode(extensions.digest(convert_to(coalesce(p_payload, '{}'::jsonb)::text, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function app_private.e14_deterministic_uuid(p_value text)
returns uuid
language plpgsql
immutable
security definer
set search_path = pg_catalog
as $$
declare
  v_hex text;
begin
  if p_value is null or length(trim(p_value)) = 0 then
    raise exception 'DETERMINISTIC_UUID_INPUT_REQUIRED' using errcode = '22023';
  end if;
  v_hex := encode(extensions.digest(convert_to(trim(p_value), 'UTF8'), 'sha256'), 'hex');
  v_hex := substr(v_hex, 1, 12) || '5' || substr(v_hex, 14, 3) || 'a' || substr(v_hex, 18, 15);
  return (
    substr(v_hex, 1, 8) || '-' || substr(v_hex, 9, 4) || '-' || substr(v_hex, 13, 4) || '-' ||
    substr(v_hex, 17, 4) || '-' || substr(v_hex, 21, 12)
  )::uuid;
end;
$$;

create or replace function app_private.e14_command_event_id(
  p_command text,
  p_actor_id uuid,
  p_target_id uuid,
  p_idempotency_key text
) returns uuid
language sql
immutable
security definer
set search_path = pg_catalog
as $$
  select app_private.e14_deterministic_uuid(
    'e14|' || trim(p_command) || '|' || coalesce(p_actor_id::text, '-') || '|' ||
    coalesce(p_target_id::text, '-') || '|' || trim(p_idempotency_key)
  );
$$;

create or replace function app_private.e14_child_event_id(
  p_command_event_id uuid,
  p_event_name text,
  p_ordinal integer
) returns uuid
language sql
immutable
security definer
set search_path = pg_catalog
as $$
  select app_private.e14_deterministic_uuid(
    'e14-child|' || p_command_event_id::text || '|' || trim(p_event_name) || '|' || p_ordinal::text
  );
$$;

create or replace function app_private.e14_assert_idempotency(
  p_event_id uuid,
  p_request_hash text
) returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_stored_hash text;
begin
  select e.payload ->> 'request_hash'
    into v_stored_hash
    from eventing.events e
   where e.event_id = p_event_id;

  if not found then
    return false;
  end if;
  if v_stored_hash is distinct from p_request_hash then
    raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = 'P0001';
  end if;
  return true;
end;
$$;

create or replace function app_private.e14_actor_has_permission(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_permission_code text
) returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
      from iam.organization_memberships om
      join iam.membership_roles mr on mr.membership_id = om.id
      join iam.role_definitions rd on rd.id = mr.role_id
      join iam.role_permissions rp on rp.role_id = rd.id
      join iam.permission_definitions pd on pd.id = rp.permission_id
     where om.user_account_id = p_actor_user_account_id
       and om.organization_id = p_organization_id
       and om.status = 'active'
       and rd.status = 'active'
       and om.valid_from <= now()
       and (om.valid_until is null or om.valid_until > now())
       and mr.valid_from <= now()
       and (mr.valid_until is null or mr.valid_until > now())
       and pd.code = p_permission_code
       and coalesce(mr.scope @> '{"all": true}'::jsonb, false)
  );
$$;

create or replace function app_private.e14_entrepreneur_for_account(p_user_account_id uuid)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select e.id
    from core.entrepreneurs e
   where e.user_account_id = p_user_account_id
     and e.status = 'active'
   limit 1;
$$;

create or replace function app_private.e14_event_schema_id(p_event_name text)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select es.id
    from eventing.event_schemas es
   where es.event_name = p_event_name
     and es.event_version = 1
     and es.status = 'published';
$$;

create or replace function app_private.e14_append_event(
  p_event_id uuid,
  p_event_name text,
  p_subject_type text,
  p_subject_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_organization_id uuid,
  p_journey_instance_id uuid,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_aggregate_version bigint,
  p_correlation_id uuid,
  p_causation_id uuid,
  p_payload jsonb
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_schema_id uuid;
begin
  v_schema_id := app_private.e14_event_schema_id(p_event_name);
  if v_schema_id is null then
    raise exception 'EVENT_SCHEMA_NOT_FOUND:%', p_event_name using errcode = 'P0001';
  end if;

  return eventing.append_event(
    p_event_id,
    p_event_name,
    1,
    now(),
    'estimulo.e14.application',
    p_subject_type,
    p_subject_id,
    p_actor_type,
    p_actor_id,
    p_organization_id,
    p_journey_instance_id,
    p_aggregate_type,
    p_aggregate_id,
    coalesce(p_aggregate_version, 0),
    coalesce(p_organization_id::text, 'e14-internal'),
    p_correlation_id,
    p_causation_id,
    null,
    'observed',
    'internal',
    coalesce(p_payload, '{}'::jsonb),
    v_schema_id,
    array['e14.domain-events']::text[]
  );
end;
$$;

create or replace function app_private.e14_reject_published_row_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.status = 'published' then
    raise exception 'PUBLISHED_VERSION_IMMUTABLE' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function app_private.e14_reject_published_diagnostic_child()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_version_id uuid;
  v_status text;
begin
  if tg_table_name = 'dimensions' then
    v_version_id := coalesce(new.diagnostic_version_id, old.diagnostic_version_id);
  elsif tg_table_name = 'items' then
    v_version_id := coalesce(new.diagnostic_version_id, old.diagnostic_version_id);
  else
    select i.diagnostic_version_id into v_version_id
      from diagnostics.items i
     where i.id = coalesce(new.item_id, old.item_id);
  end if;

  select dv.status into v_status from diagnostics.diagnostic_versions dv where dv.id = v_version_id;
  if v_status = 'published' then
    raise exception 'PUBLISHED_DIAGNOSTIC_IMMUTABLE' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function app_private.e14_reject_published_assessment_child()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_activity_version_id uuid;
  v_status text;
begin
  if tg_table_name = 'assessment_specs' then
    v_activity_version_id := coalesce(new.activity_version_id, old.activity_version_id);
  elsif tg_table_name = 'questions' then
    v_activity_version_id := coalesce(new.activity_version_id, old.activity_version_id);
  else
    select q.activity_version_id into v_activity_version_id
      from assessment.questions q
     where q.id = coalesce(new.question_id, old.question_id);
  end if;

  select av.status into v_status from catalog.activity_versions av where av.id = v_activity_version_id;
  if v_status = 'published' then
    raise exception 'PUBLISHED_ASSESSMENT_IMMUTABLE' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

