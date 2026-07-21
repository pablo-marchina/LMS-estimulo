set lock_timeout = '5s';
set statement_timeout = '5min';

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
  if v_entrepreneur_id is null then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;

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
  if v_journey is null then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;

  with selected_assignment as (
    select assignment.id,assignment.path_template_id,assignment.status,template.name as path_name
    from orchestration.path_assignments assignment
    join orchestration.path_templates template on template.id=assignment.path_template_id
    where assignment.journey_instance_id=p_journey_instance_id
    order by
      case assignment.status when 'active' then 0 when 'completed' then 1 else 2 end,
      assignment.created_at desc,
      assignment.id desc
    limit 1
  ), step_rows as (
    select
      coalesce(module.id::text,'unassigned') as module_key,
      module.id as module_id,
      coalesce(module.title,'Atividades da jornada') as module_title,
      coalesce(module.description,'Atividades disponíveis no caminho personalizado desta jornada.') as module_description,
      coalesce(module.position,100000) as module_position,
      module.estimated_minutes as module_estimated_minutes,
      coalesce(module.metadata,'{}'::jsonb) as module_metadata,
      assignment.path_name,
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
    from selected_assignment assignment
    join orchestration.step_instances step_instance on step_instance.path_assignment_id=assignment.id
    join orchestration.path_steps path_step on path_step.id=step_instance.path_step_id
    join catalog.activity_versions activity_version on activity_version.id=step_instance.activity_version_id
    left join catalog.module_activities module_activity on module_activity.activity_version_id=activity_version.id
    left join catalog.modules module on module.id=module_activity.module_id
  ), module_rows as (
    select
      module_key,module_id,module_title,module_description,module_position,module_estimated_minutes,module_metadata,path_name,
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
    group by module_key,module_id,module_title,module_description,module_position,module_estimated_minutes,module_metadata,path_name
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'module_key',module_key,
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
  ) order by module_position,module_key),'[]'::jsonb)
  into v_modules
  from module_rows;

  return v_journey || jsonb_build_object('modules',coalesce(v_modules,'[]'::jsonb));
end;
$$;
