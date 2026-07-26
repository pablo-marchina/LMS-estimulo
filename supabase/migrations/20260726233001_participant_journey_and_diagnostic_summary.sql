create or replace function app_private.e14_state_step(a uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
  select jsonb_build_object(
    'step_instance_id',si.id,
    'status',si.status,
    'aggregate_version',si.aggregate_version,
    'version_id',si.activity_version_id,
    'accepted_sections',coalesce(ac.accepted_observation_count,0),
    'session_id',ac.id
  )
  from orchestration.path_assignments pa
  join orchestration.step_instances si on si.path_assignment_id=pa.id
  join orchestration.path_steps ps on ps.id=si.path_step_id
  left join lateral (
    select session.id,session.accepted_observation_count
    from orchestration.activity_sessions session
    where session.step_instance_id=si.id
    order by session.started_at desc,session.id desc
    limit 1
  ) ac on true
  where pa.journey_instance_id=a
  order by
    case si.status
      when 'in_progress' then 0
      when 'available' then 1
      when 'completed' then 2
      when 'locked' then 3
      else 4
    end,
    ps.position_hint,
    si.available_at desc nulls last,
    si.id
  limit 1
$function$;

create or replace function public.get_participant_diagnostic_summary(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid;
  v_summary jsonb;
begin
  select entrepreneur.id into v_entrepreneur_id
  from core.entrepreneurs entrepreneur
  join iam.user_accounts account on account.id=entrepreneur.user_account_id
  where entrepreneur.user_account_id=p_actor_user_account_id
    and entrepreneur.status='active'
    and account.status='active';
  if v_entrepreneur_id is null then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;

  with selected_session as (
    select session.id,session.diagnostic_version_id,session.completed_at
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
    'diagnostic_name',definition.name,
    'completed_at',session.completed_at,
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
  join diagnostics.diagnostic_definitions definition on definition.id=version.diagnostic_definition_id;

  return coalesce(v_summary,jsonb_build_object('diagnostic_name',null,'completed_at',null,'dimensions','[]'::jsonb));
end;
$function$;

revoke execute on function app_private.e14_state_step(uuid) from public,anon,authenticated;
revoke execute on function public.get_participant_diagnostic_summary(uuid) from public,anon,authenticated;
grant execute on function public.get_participant_diagnostic_summary(uuid) to service_role;
