-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709051056
-- Remote name: m13a_e14_command_foundation
-- Remote SQL SHA-256: fbe854b2b65623c8c6beb65b5ee818342446de32d2eb89c57b4069a5e6cfc8c5
-- Do not edit after reconciliation; corrections require a new migration.

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

create or replace function app_private.e14_reject_published_path_child()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_template_id uuid;
  v_status text;
begin
  if tg_table_name = 'path_templates' then
    if tg_op = 'INSERT' then
      select jv.status into v_status from catalog.journey_versions jv where jv.id = new.journey_version_id;
      if v_status = 'published' then
        raise exception 'PUBLISHED_JOURNEY_IMMUTABLE' using errcode = '55000';
      end if;
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_template_id := coalesce(new.path_template_id, old.path_template_id);
  select pt.status into v_status from orchestration.path_templates pt where pt.id = v_template_id;
  if v_status = 'published' then
    raise exception 'PUBLISHED_PATH_IMMUTABLE' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_e14_journey_version_immutable on catalog.journey_versions;
create trigger trg_e14_journey_version_immutable before update or delete on catalog.journey_versions for each row execute function app_private.e14_reject_published_row_mutation();
drop trigger if exists trg_e14_activity_version_immutable on catalog.activity_versions;
create trigger trg_e14_activity_version_immutable before update or delete on catalog.activity_versions for each row execute function app_private.e14_reject_published_row_mutation();
drop trigger if exists trg_e14_diagnostic_version_immutable on diagnostics.diagnostic_versions;
create trigger trg_e14_diagnostic_version_immutable before update or delete on diagnostics.diagnostic_versions for each row execute function app_private.e14_reject_published_row_mutation();
drop trigger if exists trg_e14_path_template_immutable on orchestration.path_templates;
create trigger trg_e14_path_template_immutable before update or delete on orchestration.path_templates for each row execute function app_private.e14_reject_published_row_mutation();
drop trigger if exists trg_e14_point_rule_version_immutable on engagement.point_rule_versions;
create trigger trg_e14_point_rule_version_immutable before update or delete on engagement.point_rule_versions for each row execute function app_private.e14_reject_published_row_mutation();
drop trigger if exists trg_e14_rule_version_immutable on orchestration.rule_versions;
create trigger trg_e14_rule_version_immutable before update or delete on orchestration.rule_versions for each row execute function app_private.e14_reject_published_row_mutation();
drop trigger if exists trg_e14_diagnostic_dimensions_immutable on diagnostics.dimensions;
create trigger trg_e14_diagnostic_dimensions_immutable before insert or update or delete on diagnostics.dimensions for each row execute function app_private.e14_reject_published_diagnostic_child();
drop trigger if exists trg_e14_diagnostic_items_immutable on diagnostics.items;
create trigger trg_e14_diagnostic_items_immutable before insert or update or delete on diagnostics.items for each row execute function app_private.e14_reject_published_diagnostic_child();
drop trigger if exists trg_e14_diagnostic_options_immutable on diagnostics.item_options;
create trigger trg_e14_diagnostic_options_immutable before insert or update or delete on diagnostics.item_options for each row execute function app_private.e14_reject_published_diagnostic_child();
drop trigger if exists trg_e14_assessment_specs_immutable on assessment.assessment_specs;
create trigger trg_e14_assessment_specs_immutable before insert or update or delete on assessment.assessment_specs for each row execute function app_private.e14_reject_published_assessment_child();
drop trigger if exists trg_e14_assessment_questions_immutable on assessment.questions;
create trigger trg_e14_assessment_questions_immutable before insert or update or delete on assessment.questions for each row execute function app_private.e14_reject_published_assessment_child();
drop trigger if exists trg_e14_assessment_options_immutable on assessment.answer_options;
create trigger trg_e14_assessment_options_immutable before insert or update or delete on assessment.answer_options for each row execute function app_private.e14_reject_published_assessment_child();
drop trigger if exists trg_e14_path_steps_immutable on orchestration.path_steps;
create trigger trg_e14_path_steps_immutable before insert or update or delete on orchestration.path_steps for each row execute function app_private.e14_reject_published_path_child();
drop trigger if exists trg_e14_path_templates_parent_immutable on orchestration.path_templates;
create trigger trg_e14_path_templates_parent_immutable before insert on orchestration.path_templates for each row execute function app_private.e14_reject_published_path_child();

create unique index if not exists uq_e14_enrollment_logical on orchestration.enrollments (entrepreneur_id, business_id, journey_version_id, cohort_id) nulls not distinct;
create unique index if not exists uq_e14_active_diagnostic_session on diagnostics.sessions (journey_instance_id) where status = 'in_progress';
create unique index if not exists uq_e14_active_path_assignment on orchestration.path_assignments (journey_instance_id) where status = 'active';
create unique index if not exists uq_e14_active_activity_session on orchestration.activity_sessions (step_instance_id) where ended_at is null;
create unique index if not exists uq_e14_active_assessment_attempt on assessment.attempts (step_instance_id) where status = 'in_progress';
create unique index if not exists uq_e14_point_balance_scope on engagement.point_balance_projections (entrepreneur_id, journey_instance_id) nulls not distinct;

do $$
declare
  v_event_name text;
  v_schema jsonb;
begin
  foreach v_event_name in array array[
    'catalog.journey_version.published','catalog.activity_version.published','catalog.diagnostic_version.published','catalog.assessment_version.published','journey.enrollment.created','journey.enrollment.activated','journey.instance.available','journey.instance.started','diagnostic.session.started','diagnostic.response.recorded','diagnostic.session.completed','diagnostic.result.generated','personalization.uncertainty.recorded','journey.path.assigned','journey.path.started','journey.step.available','learning.activity.started','learning.activity.progressed','assessment.attempt.started','assessment.answer.recorded','assessment.attempt.submitted','assessment.attempt.scored','assessment.attempt.passed','assessment.attempt.failed','assessment.feedback.available','learning.activity.completed','engagement.points.awarded','journey.path.completed','journey.instance.completed'
  ]::text[] loop
    v_schema := jsonb_build_object('$schema','https://json-schema.org/draft/2020-12/schema','title',v_event_name,'type','object','additionalProperties',true);
    insert into eventing.event_schemas(event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at)
    values(v_event_name,1,'urn:estimulo:event:' || v_event_name || ':1',v_schema,app_private.e14_request_hash(v_schema),'published',now())
    on conflict (event_name,event_version) do nothing;
  end loop;
end $$;
