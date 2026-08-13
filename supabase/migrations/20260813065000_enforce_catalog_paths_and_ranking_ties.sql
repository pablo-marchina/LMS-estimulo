begin;

-- Participant-facing catalogue journeys expose every published path as a track.
-- Diagnostic-driven journeys are adaptive and must keep their single selected path.
-- Keep this distinction in one DB invariant so enrollment, admin live-publish and
-- legacy backfill cannot drift based on which UI route happened to run first.
create or replace function app_private.sync_catalog_journey_instance_paths(
  p_journey_instance_id uuid,
  p_source text default 'catalog_path_sync'
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_journey_version_id uuid;
  v_configuration jsonb;
  v_journey_status text;
  v_template record;
  v_assignment_id uuid;
  v_existing_assignment_id uuid;
  v_paths_created integer := 0;
  v_steps_created integer := 0;
  v_rows integer := 0;
begin
  select enrollment.journey_version_id, version.configuration, instance.status
    into v_journey_version_id, v_configuration, v_journey_status
  from orchestration.journey_instances instance
  join orchestration.enrollments enrollment on enrollment.id = instance.enrollment_id
  join catalog.journey_versions version on version.id = enrollment.journey_version_id
  where instance.id = p_journey_instance_id;

  if v_journey_version_id is null then
    raise exception 'JOURNEY_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Frozen/internal diagnostic journeys choose one path after diagnosis.
  if nullif(v_configuration->>'diagnostic_version_id', '') is not null
     or coalesce((v_configuration->>'publishable_to_real_participants')::boolean, true) = false then
    return jsonb_build_object(
      'journey_instance_id', p_journey_instance_id,
      'mode', 'adaptive',
      'paths_created', 0,
      'steps_created', 0
    );
  end if;

  -- Do not retroactively change a closed historical journey.
  if v_journey_status not in ('available', 'in_progress') then
    return jsonb_build_object(
      'journey_instance_id', p_journey_instance_id,
      'mode', 'catalog',
      'closed', true,
      'paths_created', 0,
      'steps_created', 0
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended('catalog-path-sync|' || p_journey_instance_id::text, 0));

  for v_template in
    select template.id, template.position
    from orchestration.path_templates template
    where template.journey_version_id = v_journey_version_id
      and template.status = 'published'
    order by template.position, template.id
  loop
    select assignment.id
      into v_existing_assignment_id
    from orchestration.path_assignments assignment
    where assignment.journey_instance_id = p_journey_instance_id
      and assignment.path_template_id = v_template.id
      and assignment.status in ('active', 'completed')
    order by case assignment.status when 'active' then 0 else 1 end,
             assignment.created_at desc,
             assignment.id desc
    limit 1;

    v_assignment_id := coalesce(
      v_existing_assignment_id,
      app_private.e14_deterministic_uuid(p_journey_instance_id::text || v_template.id::text || ':assignment')
    );

    if v_existing_assignment_id is null then
      insert into orchestration.path_assignments(
        id, journey_instance_id, path_template_id, assignment_policy_id,
        status, reason, confidence, valid_from
      ) values (
        v_assignment_id, p_journey_instance_id, v_template.id, null,
        'active',
        jsonb_build_object('source', p_source, 'mode', 'all_published_paths'),
        1,
        now()
      )
      on conflict (id) do nothing;
      get diagnostics v_rows = row_count;
      v_paths_created := v_paths_created + v_rows;
    end if;

    insert into orchestration.step_instances(
      id, path_assignment_id, path_step_id, activity_version_id,
      status, available_at, started_at, completed_at,
      attempt_count, aggregate_version
    )
    select
      app_private.e14_deterministic_uuid(v_assignment_id::text || step.id::text),
      v_assignment_id,
      step.id,
      step.activity_version_id,
      case
        when not exists (
          select 1
          from orchestration.path_steps previous_step
          where previous_step.path_template_id = step.path_template_id
            and previous_step.is_required
            and (previous_step.position_hint, previous_step.id) < (step.position_hint, step.id)
        ) then 'available'
        else 'locked'
      end,
      case
        when not exists (
          select 1
          from orchestration.path_steps previous_step
          where previous_step.path_template_id = step.path_template_id
            and previous_step.is_required
            and (previous_step.position_hint, previous_step.id) < (step.position_hint, step.id)
        ) then now()
        else null
      end,
      null,
      null,
      0,
      0
    from orchestration.path_steps step
    where step.path_template_id = v_template.id
    order by step.position_hint, step.id
    on conflict (path_assignment_id, path_step_id) do nothing;
    get diagnostics v_rows = row_count;
    v_steps_created := v_steps_created + v_rows;
  end loop;

  perform app_private.refresh_participant_journey_progress(p_journey_instance_id);

  return jsonb_build_object(
    'journey_instance_id', p_journey_instance_id,
    'mode', 'catalog',
    'paths_created', v_paths_created,
    'steps_created', v_steps_created,
    'path_count', (
      select count(distinct assignment.path_template_id)
      from orchestration.path_assignments assignment
      join orchestration.path_templates template on template.id = assignment.path_template_id
      where assignment.journey_instance_id = p_journey_instance_id
        and template.journey_version_id = v_journey_version_id
        and template.status = 'published'
        and assignment.status in ('active', 'completed')
    ),
    'expected_path_count', (
      select count(*)
      from orchestration.path_templates template
      where template.journey_version_id = v_journey_version_id
        and template.status = 'published'
    )
  );
end;
$function$;

revoke all on function app_private.sync_catalog_journey_instance_paths(uuid, text) from public, anon, authenticated;
grant execute on function app_private.sync_catalog_journey_instance_paths(uuid, text) to postgres, service_role, app_worker;

create or replace function app_private.sync_catalog_paths_after_journey_instance_insert()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
begin
  perform app_private.sync_catalog_journey_instance_paths(new.id, 'journey_instance_created');
  return new;
end;
$function$;

create or replace function app_private.sync_catalog_paths_after_template_publish()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_instance record;
begin
  if new.status <> 'published' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;

  for v_instance in
    select instance.id
    from orchestration.journey_instances instance
    join orchestration.enrollments enrollment on enrollment.id = instance.enrollment_id
    where enrollment.journey_version_id = new.journey_version_id
      and instance.status in ('available', 'in_progress')
  loop
    perform app_private.sync_catalog_journey_instance_paths(v_instance.id, 'path_template_published');
  end loop;
  return new;
end;
$function$;

drop trigger if exists trg_sync_catalog_paths_after_journey_instance_insert on orchestration.journey_instances;
create trigger trg_sync_catalog_paths_after_journey_instance_insert
after insert on orchestration.journey_instances
for each row execute function app_private.sync_catalog_paths_after_journey_instance_insert();

drop trigger if exists trg_sync_catalog_paths_after_template_publish on orchestration.path_templates;
create trigger trg_sync_catalog_paths_after_template_publish
after insert or update of status on orchestration.path_templates
for each row execute function app_private.sync_catalog_paths_after_template_publish();

-- Backfill is intentionally part of the same invariant migration: it repairs legacy
-- open instances once, while the triggers above prevent the same drift recurring.
do $backfill$
declare
  v_instance record;
begin
  for v_instance in
    select instance.id
    from orchestration.journey_instances instance
    join orchestration.enrollments enrollment on enrollment.id = instance.enrollment_id
    join catalog.journey_versions version on version.id = enrollment.journey_version_id
    where instance.status in ('available', 'in_progress')
      and version.status = 'published'
      and nullif(version.configuration->>'diagnostic_version_id', '') is null
      and coalesce((version.configuration->>'publishable_to_real_participants')::boolean, true)
  loop
    perform app_private.sync_catalog_journey_instance_paths(v_instance.id, 'structural_backfill');
  end loop;
end;
$backfill$;

-- Ranking position is a function of points only. UUID remains a deterministic
-- display-order tiebreaker in the outer json aggregation, never in dense_rank().
do $ranking_fix$
declare
  v_oid oid;
  v_definition text;
  v_pattern text := 'dense_rank\(\)\s+over\s*\(\s*order\s+by\s+balance\.points\s+desc\s*,\s*balance\.entrepreneur_id\s*\)';
  v_matches integer;
begin
  select routine.oid into v_oid
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'get_participant_engagement_hub'
    and pg_get_function_identity_arguments(routine.oid) = 'p_actor_user_account_id uuid';

  if v_oid is null then
    raise exception 'ENGAGEMENT_HUB_FUNCTION_NOT_FOUND';
  end if;

  v_definition := pg_get_functiondef(v_oid);
  v_matches := regexp_count(v_definition, v_pattern, 1, 'i');
  if v_matches <> 2 then
    raise exception 'ENGAGEMENT_HUB_RANKING_SOURCE_UNEXPECTED: expected 2 matches, found %', v_matches;
  end if;

  v_definition := regexp_replace(
    v_definition,
    v_pattern,
    'dense_rank() over(order by balance.points desc)',
    'gi'
  );
  execute v_definition;
end;
$ranking_fix$;

-- Fail the migration if either structural invariant is not represented after DDL.
do $verify$
declare
  v_definition text;
  v_forbidden_rank_pattern text := 'dense_rank\(\)\s+over\s*\(\s*order\s+by\s+balance\.points\s+desc\s*,\s*balance\.entrepreneur_id\s*\)';
begin
  select pg_get_functiondef(routine.oid) into v_definition
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'get_participant_engagement_hub'
    and pg_get_function_identity_arguments(routine.oid) = 'p_actor_user_account_id uuid';

  if regexp_count(v_definition, v_forbidden_rank_pattern, 1, 'i') <> 0 then
    raise exception 'RANKING_TIE_BREAKER_STILL_AFFECTS_POSITION';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_sync_catalog_paths_after_journey_instance_insert'
      and not tgisinternal
  ) then
    raise exception 'CATALOG_PATH_SYNC_TRIGGER_MISSING';
  end if;
end;
$verify$;

commit;
