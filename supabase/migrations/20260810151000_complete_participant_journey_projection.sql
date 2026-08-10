set lock_timeout = '5s';
set statement_timeout = '5min';

-- Keep participant progress derived from exactly one current assignment per path.
-- A journey may legitimately expose more than one path/track at the same time.
create or replace function app_private.refresh_participant_journey_progress(
  p_journey_instance_id uuid
) returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_total integer := 0;
  v_completed integer := 0;
  v_ratio numeric := 0;
begin
  with ranked_assignments as (
    select
      assignment.id,
      assignment.path_template_id,
      row_number() over (
        partition by assignment.path_template_id
        order by
          case assignment.status when 'active' then 0 when 'completed' then 1 else 2 end,
          assignment.created_at desc,
          assignment.id desc
      ) as assignment_rank
    from orchestration.path_assignments assignment
    where assignment.journey_instance_id = p_journey_instance_id
      and (
        assignment.status = 'completed'
        or (
          assignment.status = 'active'
          and assignment.valid_from <= now()
          and (assignment.valid_until is null or assignment.valid_until > now())
        )
      )
  ), selected_assignments as (
    select id
    from ranked_assignments
    where assignment_rank = 1
  )
  select
    count(*) filter (where path_step.is_required)::integer,
    count(*) filter (where path_step.is_required and step_instance.status = 'completed')::integer
  into v_total, v_completed
  from selected_assignments assignment
  join orchestration.step_instances step_instance
    on step_instance.path_assignment_id = assignment.id
  join orchestration.path_steps path_step
    on path_step.id = step_instance.path_step_id;

  v_total := coalesce(v_total, 0);
  v_completed := coalesce(v_completed, 0);
  v_ratio := case when v_total > 0 then v_completed::numeric / v_total::numeric else 0 end;

  insert into orchestration.progress_projections(
    journey_instance_id,
    completed_required_steps,
    total_required_steps,
    completion_ratio,
    current_step_id,
    last_activity_at,
    projection_version,
    updated_at
  ) values (
    p_journey_instance_id,
    v_completed,
    v_total,
    v_ratio,
    null,
    null,
    1,
    now()
  )
  on conflict (journey_instance_id) do update set
    completed_required_steps = excluded.completed_required_steps,
    total_required_steps = excluded.total_required_steps,
    completion_ratio = excluded.completion_ratio,
    projection_version = orchestration.progress_projections.projection_version + 1,
    updated_at = now()
  where orchestration.progress_projections.completed_required_steps is distinct from excluded.completed_required_steps
     or orchestration.progress_projections.total_required_steps is distinct from excluded.total_required_steps
     or orchestration.progress_projections.completion_ratio is distinct from excluded.completion_ratio;
end;
$$;

-- Return all current paths for the participant instead of silently selecting a
-- single path assignment. Each path is rendered as one participant module and
-- keeps the path presentation metadata used by the Admin journey builder.
create or replace function public.get_participant_journey_outline(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_entrepreneur_id uuid;
  v_journey jsonb;
  v_modules jsonb;
begin
  select entrepreneur.id
  into v_entrepreneur_id
  from core.entrepreneurs entrepreneur
  join iam.user_accounts account on account.id = entrepreneur.user_account_id
  where entrepreneur.user_account_id = p_actor_user_account_id
    and entrepreneur.status = 'active'
    and account.status = 'active';

  if v_entrepreneur_id is null then
    raise exception 'PARTICIPANT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'journey_instance_id', instance.id,
    'journey_status', instance.status,
    'journey_aggregate_version', instance.aggregate_version,
    'journey_version_id', version.id,
    'journey_title', version.title,
    'journey_description', version.description,
    'journey_version_number', version.version_number,
    'presentation', coalesce(version.configuration->'presentation', '{}'::jsonb),
    'progress', coalesce(progress.completion_ratio, 0),
    'completed_required_steps', coalesce(progress.completed_required_steps, 0),
    'total_required_steps', coalesce(progress.total_required_steps, 0)
  )
  into v_journey
  from orchestration.journey_instances instance
  join orchestration.enrollments enrollment on enrollment.id = instance.enrollment_id
  join catalog.journey_versions version on version.id = enrollment.journey_version_id
  left join orchestration.progress_projections progress on progress.journey_instance_id = instance.id
  where instance.id = p_journey_instance_id
    and enrollment.entrepreneur_id = v_entrepreneur_id;

  if v_journey is null then
    raise exception 'JOURNEY_NOT_FOUND' using errcode = 'P0002';
  end if;

  with ranked_assignments as (
    select
      assignment.id,
      assignment.path_template_id,
      assignment.status,
      assignment.created_at,
      row_number() over (
        partition by assignment.path_template_id
        order by
          case assignment.status when 'active' then 0 when 'completed' then 1 else 2 end,
          assignment.created_at desc,
          assignment.id desc
      ) as assignment_rank
    from orchestration.path_assignments assignment
    where assignment.journey_instance_id = p_journey_instance_id
      and (
        assignment.status = 'completed'
        or (
          assignment.status = 'active'
          and assignment.valid_from <= now()
          and (assignment.valid_until is null or assignment.valid_until > now())
        )
      )
  ), selected_assignments as (
    select id, path_template_id, status, created_at
    from ranked_assignments
    where assignment_rank = 1
  ), ordered_assignments as (
    select
      assignment.id,
      assignment.path_template_id,
      assignment.status,
      template.name as path_name,
      template.description as path_description,
      template.is_required as path_required,
      coalesce(template.presentation, '{}'::jsonb) as path_presentation,
      row_number() over (
        order by template.is_default desc, lower(template.name), template.id
      )::integer as path_position
    from selected_assignments assignment
    join orchestration.path_templates template on template.id = assignment.path_template_id
  ), step_rows as (
    select
      assignment.id as path_assignment_id,
      assignment.path_template_id,
      assignment.path_name,
      assignment.path_description,
      assignment.path_required,
      assignment.path_presentation,
      assignment.path_position,
      step_instance.id as step_instance_id,
      step_instance.status as step_status,
      step_instance.aggregate_version as step_aggregate_version,
      step_instance.available_at,
      step_instance.started_at,
      step_instance.completed_at,
      path_step.code as step_code,
      path_step.is_required,
      path_step.position_hint as step_position,
      coalesce(path_step.metadata, '{}'::jsonb) as step_metadata,
      activity_version.id as activity_version_id,
      activity_version.title as activity_title,
      activity_version.description as activity_description,
      activity_version.activity_type,
      activity_version.estimated_minutes
    from ordered_assignments assignment
    join orchestration.step_instances step_instance
      on step_instance.path_assignment_id = assignment.id
    join orchestration.path_steps path_step
      on path_step.id = step_instance.path_step_id
     and path_step.path_template_id = assignment.path_template_id
    join catalog.activity_versions activity_version
      on activity_version.id = step_instance.activity_version_id
  ), module_rows as (
    select
      path_template_id,
      path_name,
      path_description,
      path_required,
      path_presentation,
      path_position,
      count(*)::integer as activity_count,
      count(*) filter (where step_status = 'completed')::integer as completed_count,
      coalesce(sum(estimated_minutes), 0)::integer as estimated_minutes,
      jsonb_agg(
        jsonb_build_object(
          'step_instance_id', step_instance_id,
          'step_status', step_status,
          'step_aggregate_version', step_aggregate_version,
          'available_at', available_at,
          'started_at', started_at,
          'completed_at', completed_at,
          'step_code', step_code,
          'is_required', is_required,
          'position', step_position,
          'metadata', step_metadata,
          'activity_version_id', activity_version_id,
          'activity_title', activity_title,
          'activity_description', activity_description,
          'activity_type', activity_type,
          'estimated_minutes', estimated_minutes,
          'can_open', step_status in ('available', 'in_progress'),
          'can_start', step_status = 'available'
        ) order by step_position, step_instance_id
      ) as activities
    from step_rows
    group by
      path_template_id,
      path_name,
      path_description,
      path_required,
      path_presentation,
      path_position
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'module_key', path_template_id::text,
      'module_id', null,
      'module_title', path_name,
      'module_description', coalesce(path_description, 'Atividades disponíveis nesta trilha da jornada.'),
      'module_position', path_position,
      'estimated_minutes', estimated_minutes,
      'metadata', path_presentation || jsonb_build_object('is_required', path_required),
      'path_name', path_name,
      'activity_count', activity_count,
      'completed_count', completed_count,
      'activities', activities
    ) order by path_position, path_template_id
  ), '[]'::jsonb)
  into v_modules
  from module_rows;

  return v_journey || jsonb_build_object('modules', coalesce(v_modules, '[]'::jsonb));
end;
$$;

revoke all on function public.get_participant_journey_outline(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_participant_journey_outline(uuid, uuid)
  to postgres, service_role, app_worker;

-- Materialize every lesson when an assignment is created after its path steps.
-- The existing path-step trigger handles the opposite order (lessons edited or
-- added after a live assignment already exists).
create or replace function app_private.sync_path_assignment_step_instances()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status <> 'active'
     or not exists (
       select 1
       from orchestration.journey_instances journey
       where journey.id = new.journey_instance_id
         and journey.status in ('available', 'in_progress')
     ) then
    return new;
  end if;

  insert into orchestration.step_instances(
    id,
    path_assignment_id,
    path_step_id,
    activity_version_id,
    status,
    available_at,
    aggregate_version,
    created_at,
    updated_at
  )
  select
    app_private.e14_deterministic_uuid('step-instance|' || new.id::text || '|' || step.id::text),
    new.id,
    step.id,
    step.activity_version_id,
    case when not exists (
      select 1
      from orchestration.path_steps previous_step
      left join orchestration.step_instances previous_instance
        on previous_instance.path_assignment_id = new.id
       and previous_instance.path_step_id = previous_step.id
      where previous_step.path_template_id = new.path_template_id
        and previous_step.is_required
        and (previous_step.position_hint, previous_step.id) < (step.position_hint, step.id)
        and coalesce(previous_instance.status, 'locked') <> 'completed'
    ) then 'available' else 'locked' end,
    case when not exists (
      select 1
      from orchestration.path_steps previous_step
      left join orchestration.step_instances previous_instance
        on previous_instance.path_assignment_id = new.id
       and previous_instance.path_step_id = previous_step.id
      where previous_step.path_template_id = new.path_template_id
        and previous_step.is_required
        and (previous_step.position_hint, previous_step.id) < (step.position_hint, step.id)
        and coalesce(previous_instance.status, 'locked') <> 'completed'
    ) then now() else null end,
    0,
    now(),
    now()
  from orchestration.path_steps step
  where step.path_template_id = new.path_template_id
  on conflict (path_assignment_id, path_step_id) do update set
    activity_version_id = excluded.activity_version_id,
    updated_at = now()
  where orchestration.step_instances.status in ('locked', 'available')
    and orchestration.step_instances.started_at is null;

  perform app_private.refresh_participant_journey_progress(new.journey_instance_id);
  return new;
end;
$$;

drop trigger if exists trg_sync_path_assignment_step_instances on orchestration.path_assignments;
create trigger trg_sync_path_assignment_step_instances
after insert or update of status, path_template_id, valid_from, valid_until
on orchestration.path_assignments
for each row execute function app_private.sync_path_assignment_step_instances();

-- Repair assignments that predate the trigger without overwriting started or
-- completed participant progress.
insert into orchestration.step_instances(
  id,
  path_assignment_id,
  path_step_id,
  activity_version_id,
  status,
  available_at,
  aggregate_version,
  created_at,
  updated_at
)
select
  app_private.e14_deterministic_uuid('step-instance|' || assignment.id::text || '|' || step.id::text),
  assignment.id,
  step.id,
  step.activity_version_id,
  case when not exists (
    select 1
    from orchestration.path_steps previous_step
    left join orchestration.step_instances previous_instance
      on previous_instance.path_assignment_id = assignment.id
     and previous_instance.path_step_id = previous_step.id
    where previous_step.path_template_id = step.path_template_id
      and previous_step.is_required
      and (previous_step.position_hint, previous_step.id) < (step.position_hint, step.id)
      and coalesce(previous_instance.status, 'locked') <> 'completed'
  ) then 'available' else 'locked' end,
  case when not exists (
    select 1
    from orchestration.path_steps previous_step
    left join orchestration.step_instances previous_instance
      on previous_instance.path_assignment_id = assignment.id
     and previous_instance.path_step_id = previous_step.id
    where previous_step.path_template_id = step.path_template_id
      and previous_step.is_required
      and (previous_step.position_hint, previous_step.id) < (step.position_hint, step.id)
      and coalesce(previous_instance.status, 'locked') <> 'completed'
  ) then now() else null end,
  0,
  now(),
  now()
from orchestration.path_assignments assignment
join orchestration.journey_instances journey
  on journey.id = assignment.journey_instance_id
join orchestration.path_steps step
  on step.path_template_id = assignment.path_template_id
where assignment.status = 'active'
  and journey.status in ('available', 'in_progress')
on conflict (path_assignment_id, path_step_id) do nothing;

-- Recalculate existing live journeys after the backfill. The helper deduplicates
-- repeated assignments for the same path so totals match the participant outline.
do $$
declare
  v_journey_instance_id uuid;
begin
  for v_journey_instance_id in
    select distinct assignment.journey_instance_id
    from orchestration.path_assignments assignment
    join orchestration.journey_instances journey
      on journey.id = assignment.journey_instance_id
    where assignment.status in ('active', 'completed')
      and journey.status in ('available', 'in_progress', 'completed')
  loop
    perform app_private.refresh_participant_journey_progress(v_journey_instance_id);
  end loop;
end;
$$;
