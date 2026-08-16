-- Keep participant diagnostic presentation synchronized with the active principal
-- diagnostic while preserving the historical answers and dimension scores from the
-- participant's completed session. Also respect the explicit admin track position
-- in the participant journey outline.

create or replace function public.get_participant_diagnostic_summary(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid;
  v_presentation_configuration jsonb;
  v_summary jsonb;
begin
  select entrepreneur.id into v_entrepreneur_id
  from core.entrepreneurs entrepreneur
  join iam.user_accounts account on account.id=entrepreneur.user_account_id
  where entrepreneur.user_account_id=p_actor_user_account_id
    and entrepreneur.status='active'
    and account.status='active';

  if v_entrepreneur_id is null then
    return jsonb_build_object(
      'participant_status','profile_required',
      'diagnostic_name',null,
      'completed_at',null,
      'result_blocks','[]'::jsonb,
      'result_content','{}'::jsonb,
      'dimensions','[]'::jsonb
    );
  end if;

  select version.configuration
  into v_presentation_configuration
  from diagnostics.diagnostic_versions version
  where version.id=app_private.e14_active_profile_diagnostic_version()
    and version.status='published'
  limit 1;

  with selected_session as (
    select session.id,session.diagnostic_version_id,session.journey_instance_id,session.completed_at
    from diagnostics.sessions session
    where session.entrepreneur_id=v_entrepreneur_id and session.status='completed'
    order by session.completed_at desc nulls last,session.started_at desc,session.id desc
    limit 1
  ), selected_result as (
    select result.id,result.session_id
    from diagnostics.results result
    join selected_session session on session.id=result.session_id
    order by result.calculated_at desc,result.id desc
    limit 1
  ), dimension_maximums as (
    select dimension.id,
      coalesce(sum((select max(coalesce((option.value->>'score')::numeric,0))
        from diagnostics.item_options option where option.item_id=item.id)),0) maximum_score
    from diagnostics.dimensions dimension
    join selected_session session on session.diagnostic_version_id=dimension.diagnostic_version_id
    left join diagnostics.items item on item.dimension_id=dimension.id
    group by dimension.id
  )
  select jsonb_build_object(
    'participant_status','ready',
    'diagnostic_name',diagnostic_definition.name,
    'completed_at',session.completed_at,
    'result_blocks',coalesce(
      v_presentation_configuration->'result_blocks',
      version.configuration->'result_blocks',
      '[]'::jsonb
    ),
    'result_content',coalesce(
      coalesce(
        v_presentation_configuration->'result_content',
        version.configuration->'result_content'
      )->(
        select archetype_definition.code
        from diagnostics.archetype_assignments assignment
        join diagnostics.archetype_versions archetype_version
          on archetype_version.id=assignment.primary_archetype_version_id
        join diagnostics.archetype_definitions archetype_definition
          on archetype_definition.id=archetype_version.archetype_definition_id
        where assignment.entrepreneur_id=v_entrepreneur_id
          and assignment.journey_instance_id=session.journey_instance_id
        order by assignment.assigned_at desc,assignment.id desc
        limit 1
      ),
      '{}'::jsonb
    ),
    'dimensions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'code',dimension.code,
        'name',dimension.name,
        'score',dimension_result.score,
        'maximum_score',maximum.maximum_score,
        'percentage',case when maximum.maximum_score>0
          then least(100,greatest(0,round(dimension_result.score/maximum.maximum_score*100))) else 0 end,
        'answered_ratio',dimension_result.answered_ratio,
        'position',dimension.position
      ) order by dimension.position)
      from diagnostics.dimension_results dimension_result
      join diagnostics.dimensions dimension on dimension.id=dimension_result.dimension_id
      join dimension_maximums maximum on maximum.id=dimension.id
      where dimension_result.result_id=result.id
    ),'[]'::jsonb)
  ) into v_summary
  from selected_session session
  join selected_result result on result.session_id=session.id
  join diagnostics.diagnostic_versions version on version.id=session.diagnostic_version_id
  join diagnostics.diagnostic_definitions diagnostic_definition on diagnostic_definition.id=version.diagnostic_definition_id;

  return coalesce(v_summary,jsonb_build_object(
    'participant_status','ready',
    'diagnostic_name',null,
    'completed_at',null,
    'result_blocks','[]'::jsonb,
    'result_content','{}'::jsonb,
    'dimensions','[]'::jsonb
  ));
end;
$function$;

create or replace function public.get_participant_journey_outline(p_actor_user_account_id uuid, p_journey_instance_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid;
  v_journey jsonb;
  v_modules jsonb;
begin
  select entrepreneur.id into v_entrepreneur_id
  from core.entrepreneurs entrepreneur
  join iam.user_accounts account on account.id=entrepreneur.user_account_id
  where entrepreneur.user_account_id=p_actor_user_account_id and entrepreneur.status='active' and account.status='active';
  if v_entrepreneur_id is null then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;

  select jsonb_build_object(
    'journey_instance_id',instance.id,'journey_status',instance.status,'journey_aggregate_version',instance.aggregate_version,
    'journey_version_id',version.id,'journey_title',version.title,'journey_description',version.description,'journey_version_number',version.version_number,
    'presentation',coalesce(version.configuration->'presentation','{}'::jsonb),'progress',coalesce(progress.completion_ratio,0),
    'completed_required_steps',coalesce(progress.completed_required_steps,0),'total_required_steps',coalesce(progress.total_required_steps,0)
  ) into v_journey
  from orchestration.journey_instances instance
  join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions version on version.id=enrollment.journey_version_id
  left join orchestration.progress_projections progress on progress.journey_instance_id=instance.id
  where instance.id=p_journey_instance_id and enrollment.entrepreneur_id=v_entrepreneur_id;
  if v_journey is null then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;

  with ranked_assignments as (
    select assignment.id,assignment.path_template_id,assignment.status,assignment.created_at,
      row_number() over(partition by assignment.path_template_id order by case assignment.status when 'active' then 0 when 'completed' then 1 else 2 end,assignment.created_at desc,assignment.id desc) as assignment_rank
    from orchestration.path_assignments assignment
    where assignment.journey_instance_id=p_journey_instance_id
      and (assignment.status='completed' or (assignment.status='active' and assignment.valid_from<=now() and (assignment.valid_until is null or assignment.valid_until>now())))
  ), selected_assignments as (
    select id,path_template_id,status,created_at from ranked_assignments where assignment_rank=1
  ), ordered_assignments as (
    select assignment.id,assignment.path_template_id,assignment.status,template.name as path_name,template.description as path_description,
      template.is_required as path_required,coalesce(template.presentation,'{}'::jsonb) as path_presentation,
      row_number() over(order by template.position,template.id)::integer as path_position
    from selected_assignments assignment join orchestration.path_templates template on template.id=assignment.path_template_id
  ), step_rows as (
    select assignment.id as path_assignment_id,assignment.path_template_id,assignment.path_name,assignment.path_description,assignment.path_required,
      assignment.path_presentation,assignment.path_position,step_instance.id as step_instance_id,step_instance.status as step_status,
      step_instance.aggregate_version as step_aggregate_version,step_instance.available_at,step_instance.started_at,step_instance.completed_at,
      path_step.code as step_code,path_step.is_required,path_step.position_hint as step_position,
      coalesce(path_step.metadata,'{}'::jsonb)||case when thumbnail.file_object_id is not null then jsonb_build_object(
        'continue_thumbnail_file_object_id',thumbnail.file_object_id,
        'continue_thumbnail_alt',coalesce(nullif(path_step.metadata->>'continue_thumbnail_alt',''),activity_version.title)
      ) else '{}'::jsonb end as step_metadata,
      activity_version.id as activity_version_id,activity_version.title as activity_title,activity_version.description as activity_description,
      activity_version.activity_type,activity_version.estimated_minutes
    from ordered_assignments assignment
    join orchestration.step_instances step_instance on step_instance.path_assignment_id=assignment.id
    join orchestration.path_steps path_step on path_step.id=step_instance.path_step_id and path_step.path_template_id=assignment.path_template_id
    join catalog.activity_versions activity_version on activity_version.id=step_instance.activity_version_id
    left join lateral (select app_private.resolve_lesson_thumbnail_file_id(path_step.id) as file_object_id) thumbnail on true
  ), module_rows as (
    select path_template_id,path_name,path_description,path_required,path_presentation,path_position,count(*)::integer as activity_count,
      count(*) filter(where step_status='completed')::integer as completed_count,coalesce(sum(estimated_minutes),0)::integer as estimated_minutes,
      jsonb_agg(jsonb_build_object(
        'step_instance_id',step_instance_id,'step_status',step_status,'step_aggregate_version',step_aggregate_version,'available_at',available_at,
        'started_at',started_at,'completed_at',completed_at,'step_code',step_code,'is_required',is_required,'position',step_position,
        'metadata',step_metadata,'activity_version_id',activity_version_id,'activity_title',activity_title,'activity_description',activity_description,
        'activity_type',activity_type,'estimated_minutes',estimated_minutes,'can_open',step_status in ('available','in_progress'),'can_start',step_status='available'
      ) order by step_position,step_instance_id) as activities
    from step_rows
    group by path_template_id,path_name,path_description,path_required,path_presentation,path_position
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'module_key',path_template_id::text,'module_id',null,'module_title',path_name,
    'module_description',coalesce(path_description,'Atividades disponíveis nesta trilha da jornada.'),'module_position',path_position,
    'estimated_minutes',estimated_minutes,'metadata',path_presentation||jsonb_build_object('is_required',path_required),'path_name',path_name,
    'activity_count',activity_count,'completed_count',completed_count,'activities',activities
  ) order by path_position,path_template_id),'[]'::jsonb) into v_modules from module_rows;

  return v_journey||jsonb_build_object('modules',coalesce(v_modules,'[]'::jsonb));
end;
$function$;
