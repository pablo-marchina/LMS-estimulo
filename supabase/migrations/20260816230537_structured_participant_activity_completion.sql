create or replace function public.complete_participant_activity(
  p_actor_user_account_id uuid,
  p_step_instance_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  v_journey_instance_id uuid;
  v_path_assignment_id uuid;
  v_activity_version_id uuid;
  v_organization_id uuid;
  v_step_status text;
  v_step_version bigint;
  v_journey_version bigint;
  v_event_id uuid;
begin
  select assignment.journey_instance_id,assignment.id,step.activity_version_id,definition.owner_organization_id,step.status,step.aggregate_version
    into v_journey_instance_id,v_path_assignment_id,v_activity_version_id,v_organization_id,v_step_status,v_step_version
  from orchestration.step_instances step
  join orchestration.path_assignments assignment on assignment.id=step.path_assignment_id
  join orchestration.journey_instances instance on instance.id=assignment.journey_instance_id
  join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions journey_version on journey_version.id=enrollment.journey_version_id
  join catalog.journey_definitions definition on definition.id=journey_version.journey_definition_id
  where step.id=p_step_instance_id
    and enrollment.entrepreneur_id=v_entrepreneur_id
  for update of step;

  if v_journey_instance_id is null then raise exception 'ACTIVITY_NOT_FOUND' using errcode='P0002'; end if;
  if v_step_status='completed' then
    return jsonb_build_object('step_instance_id',p_step_instance_id,'journey_instance_id',v_journey_instance_id,'status','completed','changed',false);
  end if;
  if v_step_status not in ('available','in_progress') then raise exception 'ACTIVITY_NOT_AVAILABLE' using errcode='55000'; end if;

  if exists(
    select 1
    from catalog.content_assets asset
    left join orchestration.activity_asset_progress progress
      on progress.content_asset_id=asset.id and progress.step_instance_id=p_step_instance_id
    where asset.activity_version_id=v_activity_version_id
      and asset.is_required
      and progress.completed_at is null
  ) then
    return jsonb_build_object('step_instance_id',p_step_instance_id,'journey_instance_id',v_journey_instance_id,'status','blocked','code','REQUIRED_CONTENT_INCOMPLETE','changed',false);
  end if;

  if exists(select 1 from assessment.assessment_specs spec where spec.activity_version_id=v_activity_version_id)
     and not exists(select 1 from assessment.attempts attempt where attempt.step_instance_id=p_step_instance_id and attempt.status='passed')
  then
    return jsonb_build_object('step_instance_id',p_step_instance_id,'journey_instance_id',v_journey_instance_id,'status','blocked','code','ASSESSMENT_NOT_PASSED','changed',false);
  end if;

  if exists(select 1 from assessment.practice_specs practice where practice.activity_version_id=v_activity_version_id) then
    return jsonb_build_object('step_instance_id',p_step_instance_id,'journey_instance_id',v_journey_instance_id,'status','blocked','code','PRACTICE_COMPLETION_MANAGED_BY_REVIEW','changed',false);
  end if;

  update orchestration.step_instances
     set status='completed',completed_at=coalesce(completed_at,now()),aggregate_version=aggregate_version+1,updated_at=now()
   where id=p_step_instance_id and status in ('available','in_progress')
   returning aggregate_version into v_step_version;

  if v_step_version is null then
    return jsonb_build_object('step_instance_id',p_step_instance_id,'journey_instance_id',v_journey_instance_id,'status','completed','changed',false);
  end if;

  perform app_private.e14_complete_path_state(v_path_assignment_id);
  select aggregate_version into v_journey_version from orchestration.journey_instances where id=v_journey_instance_id for update;
  perform app_private.e14_complete_journey_state(v_journey_instance_id,v_journey_version);
  perform app_private.e14_complete_progress(v_journey_instance_id);

  v_event_id:=app_private.e14_command_event_id('complete_participant_activity',p_actor_user_account_id,p_step_instance_id,v_key);
  perform app_private.e14_append_event(
    v_event_id,'learning.activity.completed','step',p_step_instance_id,'user_account',p_actor_user_account_id,
    v_organization_id,v_journey_instance_id,'step',p_step_instance_id,v_step_version,v_event_id,v_event_id,
    jsonb_build_object('completion_source','participant_confirmation')
  );

  return jsonb_build_object('step_instance_id',p_step_instance_id,'journey_instance_id',v_journey_instance_id,'status','completed','changed',true);
end;
$function$;
