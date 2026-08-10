set lock_timeout = '5s';
set statement_timeout = '5min';

-- A journey instance can legitimately have more than one path assignment (one per
-- published track). The participant outline used to select only one assignment,
-- which hid the remaining tracks and their lessons.
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
  where entrepreneur.user_account_id=p_actor_user_account_id
    and entrepreneur.status='active';

  if v_entrepreneur_id is null then
    raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002';
  end if;

  select jsonb_build_object(
    'journey_instance_id',instance.id,
    'journey_status',instance.status,
    'journey_aggregate_version',instance.aggregate_version,
    'journey_version_id',version.id,
    'journey_title',version.title,
    'journey_description',version.description,
    'journey_version_number',version.version_number,
    'progress',coalesce(progress.completion_ratio,0),
    'completed_required_steps',coalesce(progress.completed_required_steps,0),
    'total_required_steps',coalesce(progress.total_required_steps,0)
  )
  into v_journey
  from orchestration.journey_instances instance
  join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions version on version.id=enrollment.journey_version_id
  left join orchestration.progress_projections progress on progress.journey_instance_id=instance.id
  where instance.id=p_journey_instance_id
    and enrollment.entrepreneur_id=v_entrepreneur_id;

  if v_journey is null then
    raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002';
  end if;

  with ranked_assignments as (
    select
      assignment.id,
      assignment.path_template_id,
      assignment.status,
      assignment.created_at,
      template.name as path_name,
      coalesce(template.position,100000) as path_position,
      row_number() over (
        partition by assignment.path_template_id
        order by
          case assignment.status when 'active' then 0 when 'completed' then 1 else 2 end,
          assignment.created_at desc,
          assignment.id desc
      ) as assignment_rank
    from orchestration.path_assignments assignment
    join orchestration.path_templates template on template.id=assignment.path_template_id
    where assignment.journey_instance_id=p_journey_instance_id
      and assignment.status in ('active','completed')
  ), selected_assignments as (
    select id,path_template_id,status,path_name,path_position
    from ranked_assignments
    where assignment_rank=1
  ), step_rows as (
    select
      assignment.path_template_id,
      assignment.path_position,
      assignment.path_name,
      coalesce(module.id::text,'unassigned') as raw_module_key,
      module.id as module_id,
      coalesce(module.title,assignment.path_name,'Atividades da jornada') as module_title,
      coalesce(module.description,'Atividades disponíveis nesta trilha da jornada.') as module_description,
      coalesce(module.position,100000) as module_position,
      module.estimated_minutes as module_estimated_minutes,
      coalesce(module.metadata,'{}'::jsonb) as module_metadata,
      step_instance.id as step_instance_id,
      step_instance.status as step_status,
      step_instance.aggregate_version as step_aggregate_version,
      step_instance.available_at,
      step_instance.started_at,
      step_instance.completed_at,
      path_step.code as step_code,
      path_step.is_required,
      coalesce(module_activity.position,path_step.position_hint,100000) as step_position,
      coalesce(path_step.metadata,'{}'::jsonb) as step_metadata,
      activity_version.id as activity_version_id,
      activity_version.title as activity_title,
      activity_version.description as activity_description,
      activity_version.activity_type,
      activity_version.estimated_minutes
    from selected_assignments assignment
    join orchestration.step_instances step_instance on step_instance.path_assignment_id=assignment.id
    join orchestration.path_steps path_step on path_step.id=step_instance.path_step_id
    join catalog.activity_versions activity_version on activity_version.id=step_instance.activity_version_id
    left join catalog.module_activities module_activity on module_activity.activity_version_id=activity_version.id
    left join catalog.modules module on module.id=module_activity.module_id
  ), module_rows as (
    select
      path_template_id,path_position,path_name,raw_module_key,module_id,module_title,module_description,
      module_position,module_estimated_minutes,module_metadata,
      count(*)::integer as activity_count,
      count(*) filter(where step_status='completed')::integer as completed_count,
      jsonb_agg(jsonb_build_object(
        'step_instance_id',step_instance_id,
        'step_status',step_status,
        'step_aggregate_version',step_aggregate_version,
        'available_at',available_at,
        'started_at',started_at,
        'completed_at',completed_at,
        'step_code',step_code,
        'is_required',is_required,
        'position',step_position,
        'metadata',step_metadata,
        'activity_version_id',activity_version_id,
        'activity_title',activity_title,
        'activity_description',activity_description,
        'activity_type',activity_type,
        'estimated_minutes',estimated_minutes,
        'can_open',step_status in ('available','in_progress'),
        'can_start',step_status='available'
      ) order by step_position,step_instance_id) as activities
    from step_rows
    group by path_template_id,path_position,path_name,raw_module_key,module_id,module_title,module_description,
      module_position,module_estimated_minutes,module_metadata
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'module_key',path_template_id::text||':'||raw_module_key,
    'module_id',module_id,
    'module_title',module_title,
    'module_description',module_description,
    'module_position',module_position,
    'estimated_minutes',module_estimated_minutes,
    'metadata',module_metadata,
    'path_name',path_name,
    'activity_count',activity_count,
    'completed_count',completed_count,
    'activities',activities
  ) order by path_position,module_position,path_template_id,raw_module_key),'[]'::jsonb)
  into v_modules
  from module_rows;

  return v_journey||jsonb_build_object('modules',coalesce(v_modules,'[]'::jsonb));
end;
$$;

revoke all on function public.get_participant_journey_outline(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_participant_journey_outline(uuid,uuid) to service_role;

-- Materialize path steps whenever a path assignment becomes active. This makes
-- enrollment/publish/live-edit ordering irrelevant and keeps thumbnail metadata
-- reachable through the participant step instance.
create or replace function app_private.sync_path_assignment_step_instances()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status <> 'active'
     or new.valid_from > now()
     or (new.valid_until is not null and new.valid_until <= now())
     or not exists (
       select 1 from orchestration.journey_instances journey
       where journey.id=new.journey_instance_id
         and journey.status in ('available','in_progress')
     ) then
    return new;
  end if;

  insert into orchestration.step_instances(
    id,path_assignment_id,path_step_id,activity_version_id,status,available_at,
    aggregate_version,created_at,updated_at
  )
  select
    app_private.e14_deterministic_uuid('step-instance|'||new.id::text||'|'||step.id::text),
    new.id,
    step.id,
    step.activity_version_id,
    case when not exists (
      select 1
      from orchestration.path_steps previous_step
      left join orchestration.step_instances previous_instance
        on previous_instance.path_assignment_id=new.id
       and previous_instance.path_step_id=previous_step.id
      where previous_step.path_template_id=new.path_template_id
        and previous_step.is_required
        and (previous_step.position_hint,previous_step.id)<(step.position_hint,step.id)
        and coalesce(previous_instance.status,'locked')<>'completed'
    ) then 'available' else 'locked' end,
    case when not exists (
      select 1
      from orchestration.path_steps previous_step
      left join orchestration.step_instances previous_instance
        on previous_instance.path_assignment_id=new.id
       and previous_instance.path_step_id=previous_step.id
      where previous_step.path_template_id=new.path_template_id
        and previous_step.is_required
        and (previous_step.position_hint,previous_step.id)<(step.position_hint,step.id)
        and coalesce(previous_instance.status,'locked')<>'completed'
    ) then now() else null end,
    0,now(),now()
  from orchestration.path_steps step
  where step.path_template_id=new.path_template_id
  on conflict(path_assignment_id,path_step_id) do update set
    activity_version_id=excluded.activity_version_id,
    updated_at=now()
  where orchestration.step_instances.status in ('locked','available')
    and orchestration.step_instances.started_at is null;

  update orchestration.progress_projections projection
  set total_required_steps=greatest(1,counts.required_steps),
      projection_version=projection.projection_version+1,
      updated_at=now()
  from (
    select assignment.journey_instance_id,
           count(*) filter(where step.is_required)::integer as required_steps
    from orchestration.path_assignments assignment
    join orchestration.path_steps step on step.path_template_id=assignment.path_template_id
    where assignment.journey_instance_id=new.journey_instance_id
      and assignment.status='active'
      and assignment.valid_from<=now()
      and (assignment.valid_until is null or assignment.valid_until>now())
    group by assignment.journey_instance_id
  ) counts
  where projection.journey_instance_id=counts.journey_instance_id
    and projection.journey_instance_id=new.journey_instance_id
    and projection.total_required_steps is distinct from greatest(1,counts.required_steps);

  return new;
end;
$$;

drop trigger if exists trg_sync_path_assignment_step_instances on orchestration.path_assignments;
create trigger trg_sync_path_assignment_step_instances
after insert or update of status,path_template_id,valid_from,valid_until
on orchestration.path_assignments
for each row execute function app_private.sync_path_assignment_step_instances();

-- Repair any assignment that predates the trigger without overwriting progress.
insert into orchestration.step_instances(
  id,path_assignment_id,path_step_id,activity_version_id,status,available_at,
  aggregate_version,created_at,updated_at
)
select
  app_private.e14_deterministic_uuid('step-instance|'||assignment.id::text||'|'||step.id::text),
  assignment.id,
  step.id,
  step.activity_version_id,
  case when not exists (
    select 1
    from orchestration.path_steps previous_step
    left join orchestration.step_instances previous_instance
      on previous_instance.path_assignment_id=assignment.id
     and previous_instance.path_step_id=previous_step.id
    where previous_step.path_template_id=step.path_template_id
      and previous_step.is_required
      and (previous_step.position_hint,previous_step.id)<(step.position_hint,step.id)
      and coalesce(previous_instance.status,'locked')<>'completed'
  ) then 'available' else 'locked' end,
  case when not exists (
    select 1
    from orchestration.path_steps previous_step
    left join orchestration.step_instances previous_instance
      on previous_instance.path_assignment_id=assignment.id
     and previous_instance.path_step_id=previous_step.id
    where previous_step.path_template_id=step.path_template_id
      and previous_step.is_required
      and (previous_step.position_hint,previous_step.id)<(step.position_hint,step.id)
      and coalesce(previous_instance.status,'locked')<>'completed'
  ) then now() else null end,
  0,now(),now()
from orchestration.path_assignments assignment
join orchestration.journey_instances journey on journey.id=assignment.journey_instance_id
join orchestration.path_steps step on step.path_template_id=assignment.path_template_id
where assignment.status='active'
  and assignment.valid_from<=now()
  and (assignment.valid_until is null or assignment.valid_until>now())
  and journey.status in ('available','in_progress')
on conflict(path_assignment_id,path_step_id) do nothing;

update orchestration.progress_projections projection
set total_required_steps=greatest(1,counts.required_steps),
    projection_version=projection.projection_version+1,
    updated_at=now()
from (
  select assignment.journey_instance_id,
         count(*) filter(where step.is_required)::integer as required_steps
  from orchestration.path_assignments assignment
  join orchestration.path_steps step on step.path_template_id=assignment.path_template_id
  where assignment.status='active'
    and assignment.valid_from<=now()
    and (assignment.valid_until is null or assignment.valid_until>now())
  group by assignment.journey_instance_id
) counts
where counts.journey_instance_id=projection.journey_instance_id
  and projection.total_required_steps is distinct from greatest(1,counts.required_steps);
