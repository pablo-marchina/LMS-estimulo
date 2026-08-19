create or replace function public.record_activity_asset_progress(
  p_actor_user_account_id uuid,
  p_step_instance_id uuid,
  p_content_asset_id uuid,
  p_position_seconds numeric,
  p_duration_seconds numeric,
  p_completed boolean,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  v_journey_instance_id uuid;
  v_path_step_id uuid;
  v_activity_version_id uuid;
  v_organization_id uuid;
  v_asset_type text;
  v_asset_required boolean:=false;
  v_existing orchestration.activity_asset_progress%rowtype;
  v_progress orchestration.activity_asset_progress%rowtype;
  v_requested_position numeric:=greatest(0,coalesce(p_position_seconds,0));
  v_watched numeric:=0;
  v_duration numeric;
  v_max_advance numeric:=10;
  v_ratio numeric:=0;
  v_required_count integer:=0;
  v_completed_required_count integer:=0;
  v_step_version bigint;
  v_event_id uuid;
begin
  select assignment.journey_instance_id,step.path_step_id,step.activity_version_id,definition.owner_organization_id,
         asset.asset_type,asset.is_required
    into v_journey_instance_id,v_path_step_id,v_activity_version_id,v_organization_id,v_asset_type,v_asset_required
  from orchestration.step_instances step
  join orchestration.path_assignments assignment on assignment.id=step.path_assignment_id
  join orchestration.journey_instances instance on instance.id=assignment.journey_instance_id
  join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions journey_version on journey_version.id=enrollment.journey_version_id
  join catalog.journey_definitions definition on definition.id=journey_version.journey_definition_id
  join catalog.content_assets asset on asset.id=p_content_asset_id and asset.activity_version_id=step.activity_version_id
  where step.id=p_step_instance_id
    and enrollment.entrepreneur_id=v_entrepreneur_id
    and step.status in ('available','in_progress','completed')
  for update of step;
  if v_journey_instance_id is null then raise exception 'ACTIVITY_ASSET_NOT_FOUND' using errcode='P0002'; end if;

  select * into v_existing
  from orchestration.activity_asset_progress
  where step_instance_id=p_step_instance_id and content_asset_id=p_content_asset_id
  for update;

  v_duration:=case
    when v_existing.id is not null and v_existing.duration_seconds is not null and coalesce(p_duration_seconds,0)>0
      then greatest(v_existing.duration_seconds,p_duration_seconds)
    when v_existing.id is not null and v_existing.duration_seconds is not null
      then v_existing.duration_seconds
    else nullif(p_duration_seconds,0)
  end;

  if lower(coalesce(v_asset_type,'')) in ('video','audio') then
    if v_asset_required and v_duration is not null then
      v_duration:=greatest(v_duration,30);
    end if;

    if v_existing.id is null then
      v_watched:=least(v_requested_position,10);
    else
      v_max_advance:=least(10,greatest(1,extract(epoch from (now()-v_existing.updated_at))+2));
      v_watched:=greatest(
        coalesce(v_existing.watched_seconds,0),
        least(v_requested_position,coalesce(v_existing.watched_seconds,0)+v_max_advance)
      );
    end if;

    v_ratio:=case
      when coalesce(v_duration,0)>0 then least(1,greatest(0,v_watched/v_duration))
      else 0
    end;
  else
    v_watched:=v_requested_position;
    v_ratio:=case
      when coalesce(p_completed,false) then 1
      when coalesce(v_duration,0)>0 then least(1,greatest(0,v_watched/v_duration))
      else 0
    end;
  end if;

  insert into orchestration.activity_asset_progress(
    step_instance_id,content_asset_id,watched_seconds,duration_seconds,completion_ratio,completed_at,aggregate_version,created_at,updated_at
  ) values(
    p_step_instance_id,p_content_asset_id,v_watched,v_duration,v_ratio,
    case when v_ratio>=0.9 then now() else null end,0,now(),now()
  )
  on conflict(step_instance_id,content_asset_id) do update set
    watched_seconds=greatest(orchestration.activity_asset_progress.watched_seconds,excluded.watched_seconds),
    duration_seconds=case
      when orchestration.activity_asset_progress.duration_seconds is null then excluded.duration_seconds
      when excluded.duration_seconds is null then orchestration.activity_asset_progress.duration_seconds
      else greatest(orchestration.activity_asset_progress.duration_seconds,excluded.duration_seconds)
    end,
    completion_ratio=greatest(orchestration.activity_asset_progress.completion_ratio,excluded.completion_ratio),
    completed_at=coalesce(orchestration.activity_asset_progress.completed_at,case when excluded.completion_ratio>=0.9 then now() else null end),
    aggregate_version=orchestration.activity_asset_progress.aggregate_version+1,
    updated_at=now()
  returning * into v_progress;

  update orchestration.progress_projections
     set current_step_id=v_path_step_id,last_activity_at=now(),projection_version=projection_version+1,updated_at=now()
   where journey_instance_id=v_journey_instance_id;

  select count(*)::integer,
         count(*) filter(where progress.completed_at is not null)::integer
    into v_required_count,v_completed_required_count
  from catalog.content_assets asset
  left join orchestration.activity_asset_progress progress
    on progress.content_asset_id=asset.id and progress.step_instance_id=p_step_instance_id
  where asset.activity_version_id=v_activity_version_id and asset.is_required;

  if v_required_count>0
     and v_required_count=v_completed_required_count
     and not exists(select 1 from assessment.assessment_specs spec where spec.activity_version_id=v_activity_version_id)
     and not exists(select 1 from assessment.practice_specs practice where practice.activity_version_id=v_activity_version_id)
  then
    update orchestration.step_instances
       set status='completed',completed_at=coalesce(completed_at,now()),aggregate_version=aggregate_version+1,updated_at=now()
     where id=p_step_instance_id and status in ('available','in_progress')
     returning aggregate_version into v_step_version;

    if v_step_version is not null then
      perform app_private.e14_complete_progress(v_journey_instance_id);
      v_event_id:=app_private.e14_command_event_id('complete_activity_from_assets',p_actor_user_account_id,p_step_instance_id,v_key);
      perform app_private.e14_append_event(
        v_event_id,
        'learning.activity.completed',
        'step',
        p_step_instance_id,
        'user_account',
        p_actor_user_account_id,
        v_organization_id,
        v_journey_instance_id,
        'step',
        p_step_instance_id,
        v_step_version,
        v_event_id,
        v_event_id,
        jsonb_build_object('completion_source','required_assets','content_asset_id',p_content_asset_id)
      );
    end if;
  end if;

  return jsonb_build_object(
    'request_id',app_private.e14_command_event_id('record_activity_asset_progress',p_actor_user_account_id,p_step_instance_id,v_key),
    'idempotency_key',v_key,
    'replayed',false,
    'data',jsonb_build_object(
      'step_instance_id',v_progress.step_instance_id,
      'content_asset_id',v_progress.content_asset_id,
      'watched_seconds',v_progress.watched_seconds,
      'duration_seconds',v_progress.duration_seconds,
      'completion_ratio',v_progress.completion_ratio,
      'completed',v_progress.completed_at is not null,
      'aggregate_version',v_progress.aggregate_version,
      'lesson_completed',v_step_version is not null
    )
  );
end;
$function$;
