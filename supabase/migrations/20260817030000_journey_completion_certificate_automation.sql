-- Journey completion policy + event-driven certificate issuance.
--
-- Goals:
-- 1. Every active journey version has one compatible journey-scoped credential
--    rule available to the certificate editor. Published journeys receive a
--    published rule; draft journeys receive a draft rule that is promoted when
--    the journey is published.
-- 2. The canonical journey.instance.completed event is emitted whenever a
--    journey instance transitions to completed.
-- 3. Credential issuance consumes that canonical event and delegates all
--    eligibility/idempotency decisions to public.issue_learning_credentials.

create or replace function app_private.ensure_journey_completion_rule(
  p_journey_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_owner_organization_id uuid;
  v_journey_title text;
  v_journey_status text;
  v_rule_code text;
  v_rule_definition_id uuid;
  v_rule_version_id uuid;
  v_rule_version_status text;
  v_next_version integer;
  v_expression jsonb;
  v_input_schema jsonb := '{}'::jsonb;
  v_output_schema jsonb := '{}'::jsonb;
  v_content_hash text;
begin
  if p_journey_version_id is null then
    raise exception 'JOURNEY_VERSION_ID_REQUIRED' using errcode = '22023';
  end if;

  select
    jd.owner_organization_id,
    jv.title,
    jv.status
  into
    v_owner_organization_id,
    v_journey_title,
    v_journey_status
  from catalog.journey_versions jv
  join catalog.journey_definitions jd
    on jd.id = jv.journey_definition_id
  where jv.id = p_journey_version_id;

  if not found then
    raise exception 'JOURNEY_VERSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_journey_status not in ('draft', 'published') then
    return null;
  end if;

  perform app_private.e14_lock_scope(
    'journey-completion-rule:' || p_journey_version_id::text
  );

  select rv.id
  into v_rule_version_id
  from orchestration.rule_versions rv
  join orchestration.rule_definitions rd
    on rd.id = rv.rule_definition_id
  where rd.owner_organization_id = v_owner_organization_id
    and rd.rule_type = 'credential'
    and rd.status = 'active'
    and rv.status = 'published'
    and rv.language = 'credential-v1'
    and rv.expression->>'scope' = 'journey'
    and rv.expression->>'journey_version_id' = p_journey_version_id::text
  order by rv.version_number desc, rv.created_at desc
  limit 1;

  if v_rule_version_id is not null then
    return v_rule_version_id;
  end if;

  v_rule_code :=
    'journey_completion_' || replace(p_journey_version_id::text, '-', '_');

  select rd.id
  into v_rule_definition_id
  from orchestration.rule_definitions rd
  where rd.owner_organization_id = v_owner_organization_id
    and rd.code = v_rule_code
  limit 1;

  if v_rule_definition_id is null then
    insert into orchestration.rule_definitions (
      owner_organization_id,
      code,
      rule_type,
      name,
      status
    )
    values (
      v_owner_organization_id,
      v_rule_code,
      'credential',
      'Conclusão da jornada: ' || v_journey_title,
      'active'
    )
    on conflict (owner_organization_id, code) do nothing
    returning id into v_rule_definition_id;

    if v_rule_definition_id is null then
      select rd.id
      into v_rule_definition_id
      from orchestration.rule_definitions rd
      where rd.owner_organization_id = v_owner_organization_id
        and rd.code = v_rule_code
      limit 1;
    end if;
  else
    update orchestration.rule_definitions
    set
      name = 'Conclusão da jornada: ' || v_journey_title,
      status = 'active'
    where id = v_rule_definition_id;
  end if;

  select rv.id, rv.status
  into v_rule_version_id, v_rule_version_status
  from orchestration.rule_versions rv
  where rv.rule_definition_id = v_rule_definition_id
    and rv.language = 'credential-v1'
    and rv.status in ('draft', 'published')
    and rv.expression->>'managed_by' = 'journey_completion_policy_v1'
    and rv.expression->>'journey_version_id' = p_journey_version_id::text
  order by rv.version_number desc, rv.created_at desc
  limit 1;

  if v_rule_version_id is not null then
    if v_journey_status = 'published'
       and v_rule_version_status = 'draft' then
      update orchestration.rule_versions
      set
        status = 'published',
        published_at = coalesce(published_at, clock_timestamp())
      where id = v_rule_version_id;
    end if;

    return v_rule_version_id;
  end if;

  select coalesce(max(rv.version_number), 0) + 1
  into v_next_version
  from orchestration.rule_versions rv
  where rv.rule_definition_id = v_rule_definition_id;

  v_expression := jsonb_build_object(
    'scope', 'journey',
    'journey_version_id', p_journey_version_id::text,
    'requires_completed_status', true,
    'requires_required_steps_completed', true,
    'requires_passed_assessment', true,
    'managed_by', 'journey_completion_policy_v1',
    'managed_revision', v_next_version
  );

  v_content_hash := app_private.e14_request_hash(
    jsonb_build_object(
      'language', 'credential-v1',
      'expression', v_expression,
      'input_schema', v_input_schema,
      'output_schema', v_output_schema
    )
  );

  insert into orchestration.rule_versions (
    rule_definition_id,
    version_number,
    status,
    language,
    expression,
    input_schema,
    output_schema,
    published_at,
    content_hash
  )
  values (
    v_rule_definition_id,
    v_next_version,
    case when v_journey_status = 'published' then 'published' else 'draft' end,
    'credential-v1',
    v_expression,
    v_input_schema,
    v_output_schema,
    case when v_journey_status = 'published' then clock_timestamp() else null end,
    v_content_hash
  )
  returning id into v_rule_version_id;

  return v_rule_version_id;
end;
$function$;

revoke all on function app_private.ensure_journey_completion_rule(uuid) from public;
revoke all on function app_private.ensure_journey_completion_rule(uuid) from anon, authenticated;

create or replace function app_private.sync_journey_completion_rule()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if new.status in ('draft', 'published') then
    perform app_private.ensure_journey_completion_rule(new.id);
  end if;
  return new;
end;
$function$;

revoke all on function app_private.sync_journey_completion_rule() from public;
revoke all on function app_private.sync_journey_completion_rule() from anon, authenticated;

drop trigger if exists trg_sync_journey_completion_rule
  on catalog.journey_versions;
create trigger trg_sync_journey_completion_rule
after insert or update on catalog.journey_versions
for each row
execute function app_private.sync_journey_completion_rule();

do $block$
declare
  v_journey_version_id uuid;
begin
  for v_journey_version_id in
    select jv.id
    from catalog.journey_versions jv
    where jv.status in ('draft', 'published')
    order by jv.id
  loop
    perform app_private.ensure_journey_completion_rule(v_journey_version_id);
  end loop;
end;
$block$;

create or replace function app_private.emit_journey_instance_completed_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_entrepreneur_id uuid;
  v_actor_user_account_id uuid;
  v_journey_version_id uuid;
  v_organization_id uuid;
  v_completed_at timestamptz;
  v_actor_type text;
  v_actor_id uuid;
  v_event_id uuid;
begin
  select en.entrepreneur_id, e.user_account_id, en.journey_version_id
  into v_entrepreneur_id, v_actor_user_account_id, v_journey_version_id
  from orchestration.enrollments en
  join core.entrepreneurs e
    on e.id = en.entrepreneur_id
  where en.id = new.enrollment_id;

  if v_entrepreneur_id is null or v_journey_version_id is null then
    raise exception 'JOURNEY_COMPLETION_CONTEXT_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_organization_id := app_private.journey_owner_organization_id(new.id);
  v_completed_at := coalesce(
    new.fully_completed_at,
    new.base_completed_at,
    new.ended_at,
    new.updated_at,
    clock_timestamp()
  );

  v_actor_type := case
    when v_actor_user_account_id is not null then 'user_account'
    else 'entrepreneur'
  end;
  v_actor_id := coalesce(v_actor_user_account_id, v_entrepreneur_id);

  v_event_id := app_private.e14_deterministic_uuid(
    'journey.instance.completed:' || new.id::text || ':' || new.aggregate_version::text
  );

  if not exists (
    select 1
    from eventing.events ev
    where ev.event_id = v_event_id
  ) then
    perform app_private.e14_append_event(
      v_event_id,
      'journey.instance.completed',
      'journey_instance',
      new.id,
      v_actor_type,
      v_actor_id,
      v_organization_id,
      new.id,
      'journey_instance',
      new.id,
      null,
      v_event_id,
      null,
      jsonb_build_object(
        'journey_version_id', v_journey_version_id,
        'journey_aggregate_version', new.aggregate_version,
        'completed_at', v_completed_at,
        'completion_source', 'journey_state_transition'
      )
    );
  end if;

  return new;
end;
$function$;

revoke all on function app_private.emit_journey_instance_completed_event() from public;
revoke all on function app_private.emit_journey_instance_completed_event() from anon, authenticated;

drop trigger if exists trg_emit_journey_instance_completed_event
  on orchestration.journey_instances;
create trigger trg_emit_journey_instance_completed_event
after update of status on orchestration.journey_instances
for each row
when (old.status is distinct from new.status and new.status = 'completed')
execute function app_private.emit_journey_instance_completed_event();

create or replace function app_private.issue_credentials_from_journey_completed_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_actor_user_account_id uuid;
begin
  select e.user_account_id
  into v_actor_user_account_id
  from orchestration.journey_instances ji
  join orchestration.enrollments en
    on en.id = ji.enrollment_id
  join core.entrepreneurs e
    on e.id = en.entrepreneur_id
  where ji.id = new.journey_instance_id;

  if v_actor_user_account_id is null then
    return new;
  end if;

  perform public.issue_learning_credentials(
    v_actor_user_account_id,
    new.journey_instance_id,
    null,
    'journey-completed-event-v1:' || new.event_id::text
  );

  return new;
end;
$function$;

revoke all on function app_private.issue_credentials_from_journey_completed_event() from public;
revoke all on function app_private.issue_credentials_from_journey_completed_event() from anon, authenticated;

drop trigger if exists trg_issue_credentials_on_journey_completed_event
  on eventing.events;
create trigger trg_issue_credentials_on_journey_completed_event
after insert on eventing.events
for each row
when (new.event_name = 'journey.instance.completed')
execute function app_private.issue_credentials_from_journey_completed_event();

comment on function app_private.ensure_journey_completion_rule(uuid) is
  'Ensures the canonical journey-scoped credential rule used by certificate issuance. Existing published compatible rules are preserved.';
comment on function app_private.emit_journey_instance_completed_event() is
  'Emits journey.instance.completed exactly when a journey instance transitions to completed without consuming the journey aggregate version slot already owned by the command flow.';
comment on function app_private.issue_credentials_from_journey_completed_event() is
  'Consumes journey.instance.completed and delegates idempotent badge/certificate issuance to issue_learning_credentials.';
