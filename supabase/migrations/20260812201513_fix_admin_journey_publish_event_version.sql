-- Fix journey publication event version collisions.
-- save_admin_journey and publish_admin_journey_version append to the same
-- journey_version aggregate. Publication must therefore allocate the next
-- aggregate version under the canonical aggregate lock instead of hardcoding 1.

create or replace function public.publish_admin_journey_version(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_journey_version_id uuid,
  p_expected_content_hash text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text;
  v_request jsonb;
  v_request_hash text;
  v_event_id uuid;
  v_replayed boolean;
  v_journey catalog.journey_versions%rowtype;
  v_owner_organization_id uuid;
  v_path_count integer;
  v_step_count integer;
  v_activity_count integer;
  v_published_activity_count integer;
  v_rule_count integer;
  v_badge_count integer;
  v_aggregate_version bigint;
begin
  v_key := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request := jsonb_build_object(
    'organization_id', p_organization_id,
    'journey_version_id', p_journey_version_id,
    'expected_content_hash', p_expected_content_hash
  );
  v_request_hash := app_private.e14_request_hash(v_request);
  v_event_id := app_private.e14_command_event_id(
    'publish_admin_journey_version',
    p_actor_user_account_id,
    p_journey_version_id,
    v_key
  );

  perform pg_advisory_xact_lock(
    hashtextextended('publish_admin_journey_version|' || p_journey_version_id::text, 0)
  );

  v_replayed := app_private.e14_assert_idempotency(v_event_id, v_request_hash);
  if v_replayed then
    select * into v_journey
    from catalog.journey_versions
    where id = p_journey_version_id;

    return jsonb_build_object(
      'request_id', v_event_id,
      'idempotency_key', v_key,
      'replayed', true,
      'data', jsonb_build_object(
        'journey_version_id', v_journey.id,
        'status', v_journey.status,
        'published_at', v_journey.published_at,
        'content_hash', v_journey.content_hash
      )
    );
  end if;

  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'journey.definition.publish'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_journey
  from catalog.journey_versions
  where id = p_journey_version_id
  for update;

  if not found then
    raise exception 'JOURNEY_NOT_FOUND' using errcode = 'P0002';
  end if;

  select owner_organization_id into v_owner_organization_id
  from catalog.journey_definitions
  where id = v_journey.journey_definition_id;

  if v_owner_organization_id is distinct from p_organization_id then
    raise exception 'JOURNEY_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_journey.status = 'published' then
    raise exception 'INVALID_STATE_ALREADY_PUBLISHED' using errcode = 'P0001';
  end if;

  if v_journey.status <> 'draft' then
    raise exception 'INVALID_STATE_NOT_DRAFT' using errcode = 'P0001';
  end if;

  if v_journey.content_hash is distinct from p_expected_content_hash then
    raise exception 'CONTENT_HASH_CONFLICT' using errcode = 'P0001';
  end if;

  select count(*) into v_path_count
  from orchestration.path_templates pt
  where pt.journey_version_id = p_journey_version_id
    and pt.status = 'draft';

  select count(*) into v_step_count
  from orchestration.path_steps ps
  join orchestration.path_templates pt on pt.id = ps.path_template_id
  where pt.journey_version_id = p_journey_version_id;

  select count(*) into v_activity_count
  from orchestration.path_steps ps
  join orchestration.path_templates pt on pt.id = ps.path_template_id
  join catalog.activity_versions av on av.id = ps.activity_version_id
  join catalog.activity_definitions ad on ad.id = av.activity_definition_id
  where pt.journey_version_id = p_journey_version_id
    and ad.owner_organization_id = p_organization_id
    and av.status in ('draft', 'published');

  if v_path_count < 1 or v_step_count < 1 or v_activity_count <> v_step_count then
    raise exception 'JOURNEY_GRAPH_INCOMPLETE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from orchestration.path_templates pt
    where pt.journey_version_id = p_journey_version_id
      and not exists (
        select 1 from orchestration.path_steps ps where ps.path_template_id = pt.id
      )
  ) then
    raise exception 'EMPTY_PATH_TEMPLATE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from orchestration.path_templates pt
    where pt.journey_version_id = p_journey_version_id
    group by pt.position
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_PATH_POSITION' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from orchestration.path_steps ps
    join orchestration.path_templates pt on pt.id = ps.path_template_id
    where pt.journey_version_id = p_journey_version_id
    group by ps.path_template_id, ps.position_hint
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_STEP_POSITION' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from assessment.questions q
    join orchestration.path_steps ps on ps.activity_version_id = q.activity_version_id
    join orchestration.path_templates pt on pt.id = ps.path_template_id
    where pt.journey_version_id = p_journey_version_id
      and (
        (select count(*) from assessment.answer_options ao where ao.question_id = q.id) < 2
        or (select count(*) from assessment.answer_options ao where ao.question_id = q.id and ao.is_correct) <> 1
      )
  ) then
    raise exception 'ASSESSMENT_OPTIONS_INVALID' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from catalog.activity_versions av
    join orchestration.path_steps ps on ps.activity_version_id = av.id
    join orchestration.path_templates pt on pt.id = ps.path_template_id
    where pt.journey_version_id = p_journey_version_id
      and av.activity_type = 'practice'
      and not exists (
        select 1
        from assessment.practice_specs practice
        where practice.activity_version_id = av.id
      )
  ) then
    raise exception 'PRACTICE_SPEC_REQUIRED' using errcode = 'P0001';
  end if;

  update catalog.activity_versions av
  set status = 'published',
      published_at = coalesce(av.published_at, now())
  where av.status = 'draft'
    and av.id in (
      select ps.activity_version_id
      from orchestration.path_steps ps
      join orchestration.path_templates pt on pt.id = ps.path_template_id
      where pt.journey_version_id = p_journey_version_id
    );
  get diagnostics v_published_activity_count = row_count;

  update orchestration.rule_versions rv
  set status = 'published',
      published_at = coalesce(rv.published_at, now())
  where rv.status = 'draft'
    and rv.language = 'credential-v1'
    and rv.expression->>'scope' = 'path'
    and rv.expression->>'path_template_id' in (
      select pt.id::text
      from orchestration.path_templates pt
      where pt.journey_version_id = p_journey_version_id
    )
    and exists (
      select 1
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id = bv.badge_definition_id
      where bv.criteria_rule_version_id = rv.id
        and bd.owner_organization_id = p_organization_id
    );
  get diagnostics v_rule_count = row_count;

  update engagement.badge_versions bv
  set status = 'published',
      published_at = coalesce(bv.published_at, now())
  where bv.status = 'draft'
    and bv.criteria_rule_version_id in (
      select rv.id
      from orchestration.rule_versions rv
      where rv.language = 'credential-v1'
        and rv.expression->>'scope' = 'path'
        and rv.expression->>'path_template_id' in (
          select pt.id::text
          from orchestration.path_templates pt
          where pt.journey_version_id = p_journey_version_id
        )
    );
  get diagnostics v_badge_count = row_count;

  update orchestration.path_templates
  set status = 'published'
  where journey_version_id = p_journey_version_id
    and status = 'draft';

  update catalog.journey_versions
  set status = 'published',
      published_at = now()
  where id = p_journey_version_id
  returning * into v_journey;

  -- Use the same aggregate lock as save_admin_journey so concurrent saves and
  -- publishes cannot allocate the same event version.
  perform app_private.e14_lock_scope('journey_version|' || p_journey_version_id::text);

  select coalesce(max(aggregate_version), 0) + 1
  into v_aggregate_version
  from eventing.events
  where aggregate_type = 'journey_version'
    and aggregate_id = p_journey_version_id;

  perform app_private.e14_append_event(
    v_event_id,
    'catalog.journey_version.published',
    'admin_journey_publish',
    p_journey_version_id,
    'user_account',
    p_actor_user_account_id,
    p_organization_id,
    null,
    'journey_version',
    p_journey_version_id,
    v_aggregate_version,
    v_event_id,
    null,
    jsonb_build_object(
      'request_hash', v_request_hash,
      'idempotency_key', v_key,
      'content_hash', v_journey.content_hash,
      'path_count', v_path_count,
      'step_count', v_step_count,
      'published_activity_count', v_published_activity_count,
      'published_rule_count', v_rule_count,
      'published_badge_count', v_badge_count
    )
  );

  return jsonb_build_object(
    'request_id', v_event_id,
    'idempotency_key', v_key,
    'replayed', false,
    'data', jsonb_build_object(
      'journey_version_id', v_journey.id,
      'status', v_journey.status,
      'published_at', v_journey.published_at,
      'content_hash', v_journey.content_hash,
      'path_count', v_path_count,
      'step_count', v_step_count
    )
  );
end;
$function$;
