\set ON_ERROR_STOP on

create or replace function app_private.learning_credential_context(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid,
  p_step_instance_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
declare
  v_actor_entrepreneur_id uuid;
  v_entrepreneur_id uuid;
  v_organization_id uuid;
  v_journey_version_id uuid;
  v_journey_status text;
  v_journey_title text;
  v_display_name text;
  v_required_total integer:=0;
  v_required_completed integer:=0;
  v_required_assessments_passed boolean:=false;
  v_step_activity_version_id uuid;
  v_step_completed boolean:=false;
  v_step_assessment_passed boolean:=false;
begin
  select en.entrepreneur_id,app_private.journey_owner_organization_id(ji.id),
    en.journey_version_id,ji.status,jv.title,
    coalesce(e.preferred_name,e.legal_name,split_part(ua.email_normalized,'@',1),'Participante')
  into v_entrepreneur_id,v_organization_id,v_journey_version_id,v_journey_status,
    v_journey_title,v_display_name
  from orchestration.journey_instances ji
  join orchestration.enrollments en on en.id=ji.enrollment_id
  join catalog.journey_versions jv on jv.id=en.journey_version_id
  join core.entrepreneurs e on e.id=en.entrepreneur_id
  join iam.user_accounts ua on ua.id=e.user_account_id
  where ji.id=p_journey_instance_id;

  if v_entrepreneur_id is null or v_organization_id is null then
    raise exception 'CREDENTIAL_JOURNEY_NOT_FOUND' using errcode='P0002';
  end if;

  v_actor_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_actor_entrepreneur_id is null or v_actor_entrepreneur_id<>v_entrepreneur_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select count(*) filter(where ps.is_required),
    count(*) filter(where ps.is_required and si.status='completed'),
    coalesce(bool_and(case
      when ps.is_required and asp.activity_version_id is not null then exists(
        select 1 from assessment.attempts a
        join assessment.results r on r.attempt_id=a.id
        where a.step_instance_id=si.id and r.passed
      ) else true end),true)
  into v_required_total,v_required_completed,v_required_assessments_passed
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.path_steps ps on ps.id=si.path_step_id
  left join assessment.assessment_specs asp on asp.activity_version_id=si.activity_version_id
  where pa.journey_instance_id=p_journey_instance_id;

  if p_step_instance_id is not null then
    select si.activity_version_id,si.status='completed',case
      when asp.activity_version_id is null then true
      else exists(
        select 1 from assessment.attempts a
        join assessment.results r on r.attempt_id=a.id
        where a.step_instance_id=si.id and r.passed
      ) end
    into v_step_activity_version_id,v_step_completed,v_step_assessment_passed
    from orchestration.step_instances si
    join orchestration.path_assignments pa on pa.id=si.path_assignment_id
    left join assessment.assessment_specs asp on asp.activity_version_id=si.activity_version_id
    where si.id=p_step_instance_id and pa.journey_instance_id=p_journey_instance_id;
    if v_step_activity_version_id is null then
      raise exception 'CREDENTIAL_STEP_NOT_FOUND' using errcode='P0002';
    end if;
  end if;

  return jsonb_build_object(
    'entrepreneur_id',v_entrepreneur_id,'organization_id',v_organization_id,
    'journey_instance_id',p_journey_instance_id,'journey_version_id',v_journey_version_id,
    'journey_status',v_journey_status,'journey_title',v_journey_title,
    'display_name',v_display_name,
    'required_steps_completed',v_required_total>0 and v_required_completed=v_required_total,
    'required_assessments_passed',v_required_assessments_passed,
    'step_instance_id',p_step_instance_id,'step_activity_version_id',v_step_activity_version_id,
    'step_completed',v_step_completed,'step_assessment_passed',v_step_assessment_passed
  );
end;
$$;

revoke all on function app_private.learning_credential_context(uuid,uuid,uuid)
  from public,anon,authenticated;
