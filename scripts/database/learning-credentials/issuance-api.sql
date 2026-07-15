\set ON_ERROR_STOP on

create or replace function public.issue_learning_credentials(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid,
  p_step_instance_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql
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
  v_required_steps_completed boolean:=false;
  v_required_assessments_passed boolean:=false;
  v_step_activity_version_id uuid;
  v_step_completed boolean:=false;
  v_step_assessment_passed boolean:=false;
  v_request_hash text;
  v_event_id uuid;
  v_existing_payload jsonb;
  v_badges jsonb:='[]'::jsonb;
  v_certificates jsonb:='[]'::jsonb;
  v_result jsonb;
  v_award_id uuid;
  v_issuance_id uuid;
  v_verification_code text;
  v_expires_at timestamptz;
  v_record record;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);

  select
    en.entrepreneur_id,
    app_private.journey_owner_organization_id(ji.id),
    en.journey_version_id,
    ji.status,
    jv.title,
    coalesce(e.preferred_name,e.legal_name,split_part(ua.email_normalized,'@',1),'Participante')
  into
    v_entrepreneur_id,v_organization_id,v_journey_version_id,v_journey_status,
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

  select
    count(*) filter(where ps.is_required),
    count(*) filter(where ps.is_required and si.status='completed'),
    coalesce(bool_and(
      case
        when ps.is_required and asp.activity_version_id is not null then exists(
          select 1
          from assessment.attempts a
          join assessment.results r on r.attempt_id=a.id
          where a.step_instance_id=si.id and r.passed
        )
        else true
      end
    ),true)
  into v_required_total,v_required_completed,v_required_assessments_passed
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.path_steps ps on ps.id=si.path_step_id
  left join assessment.assessment_specs asp on asp.activity_version_id=si.activity_version_id
  where pa.journey_instance_id=p_journey_instance_id;

  v_required_steps_completed:=v_required_total>0 and v_required_completed=v_required_total;

  if p_step_instance_id is not null then
    select
      si.activity_version_id,
      si.status='completed',
      case
        when asp.activity_version_id is null then true
        else exists(
          select 1
          from assessment.attempts a
          join assessment.results r on r.attempt_id=a.id
          where a.step_instance_id=si.id and r.passed
        )
      end
    into v_step_activity_version_id,v_step_completed,v_step_assessment_passed
    from orchestration.step_instances si
    join orchestration.path_assignments pa on pa.id=si.path_assignment_id
    left join assessment.assessment_specs asp on asp.activity_version_id=si.activity_version_id
    where si.id=p_step_instance_id and pa.journey_instance_id=p_journey_instance_id;

    if v_step_activity_version_id is null then
      raise exception 'CREDENTIAL_STEP_NOT_FOUND' using errcode='P0002';
    end if;
  end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'journey_instance_id',p_journey_instance_id,'step_instance_id',p_step_instance_id
  ));
  v_event_id:=app_private.e14_command_event_id(
    'issue_learning_credentials',p_actor_user_account_id,p_journey_instance_id,p_idempotency_key
  );

  select payload into v_existing_payload from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_payload->>'request_hash'<>v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505';
    end if;
    return jsonb_build_object(
      'request_id',v_event_id,'idempotency_key',p_idempotency_key,
      'replayed',true,'data',v_existing_payload->'result'
    );
  end if;

  if p_step_instance_id is not null then
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where bv.status='published' and bd.status='active'
        and app_private.credential_rule_matches(
          bv.criteria_rule_version_id,'activity',v_journey_version_id,
          v_step_activity_version_id,v_step_completed,true,v_step_assessment_passed
        )
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||p_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','activity',
        'step_instance_id',p_step_instance_id,'rule_version_id',v_record.criteria_rule_version_id
      ));
    end loop;
  end if;

  if v_journey_status='completed' then
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where bv.status='published' and bd.status='active'
        and app_private.credential_rule_matches(
          bv.criteria_rule_version_id,'journey',v_journey_version_id,null,
          true,v_required_steps_completed,v_required_assessments_passed
        )
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||p_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','journey','step_instance_id',null,
        'rule_version_id',v_record.criteria_rule_version_id
      ));
    end loop;

    for v_record in
      select cv.id,cv.requirements_rule_version_id,cv.validity_policy,cd.name
      from engagement.certificate_versions cv
      join engagement.certificate_definitions cd on cd.id=cv.certificate_definition_id
      where cv.status='published' and cd.status='active'
        and cv.journey_version_id=v_journey_version_id
        and app_private.credential_rule_matches(
          cv.requirements_rule_version_id,'journey',v_journey_version_id,null,
          true,v_required_steps_completed,v_required_assessments_passed
        )
      order by cv.id
    loop
      v_issuance_id:=app_private.e14_deterministic_uuid(
        'certificate-issuance:'||p_journey_instance_id::text||':'||v_record.id::text
      );
      v_verification_code:='EST-'||upper(substr(
        app_private.e14_request_hash(jsonb_build_object('certificate_issuance_id',v_issuance_id)),1,20
      ));
      v_expires_at:=null;
      if coalesce(v_record.validity_policy->>'expires_after_days','') ~ '^[1-9][0-9]*$' then
        v_expires_at:=clock_timestamp()+make_interval(
          days=>(v_record.validity_policy->>'expires_after_days')::integer
        );
      end if;
      v_certificates:=v_certificates||jsonb_build_array(jsonb_build_object(
        'issuance_id',v_issuance_id,'certificate_version_id',v_record.id,
        'name',v_record.name,'verification_code',v_verification_code,
        'expires_at',v_expires_at,'rule_version_id',v_record.requirements_rule_version_id
      ));
    end loop;
  end if;

  v_result:=jsonb_build_object(
    'journey_instance_id',p_journey_instance_id,'step_instance_id',p_step_instance_id,
    'journey_completed',v_journey_status='completed',
    'required_steps_completed',v_required_steps_completed,
    'required_assessments_passed',v_required_assessments_passed,
    'badges',v_badges,'certificates',v_certificates
  );

  perform app_private.e14_append_event(
    v_event_id,'learning.credentials.issued','journey_instance',p_journey_instance_id,
    'user_account',p_actor_user_account_id,v_organization_id,p_journey_instance_id,
    'credential_issue',v_event_id,1,v_event_id,null,
    jsonb_build_object(
      'journey_instance_id',p_journey_instance_id,'step_instance_id',p_step_instance_id,
      'request_hash',v_request_hash,'result',v_result
    )
  );

  insert into engagement.badge_awards(
    id,entrepreneur_id,journey_instance_id,badge_version_id,source_event_id,
    evidence_snapshot,awarded_at
  )
  select
    (item->>'award_id')::uuid,v_entrepreneur_id,p_journey_instance_id,
    (item->>'badge_version_id')::uuid,v_event_id,
    jsonb_build_object(
      'scope',item->>'scope','step_instance_id',item->'step_instance_id',
      'rule_version_id',item->>'rule_version_id','journey_status',v_journey_status,
      'required_steps_completed',v_required_steps_completed,
      'required_assessments_passed',v_required_assessments_passed
    ),clock_timestamp()
  from jsonb_array_elements(v_badges) item
  on conflict (entrepreneur_id,journey_instance_id,badge_version_id) do nothing;

  insert into engagement.certificate_issuances(
    id,entrepreneur_id,journey_instance_id,certificate_version_id,verification_code,
    display_name_snapshot,requirement_snapshot,source_event_id,status,issued_at,expires_at
  )
  select
    (item->>'issuance_id')::uuid,v_entrepreneur_id,p_journey_instance_id,
    (item->>'certificate_version_id')::uuid,item->>'verification_code',v_display_name,
    jsonb_build_object(
      'journey_title',v_journey_title,'journey_status',v_journey_status,
      'required_steps_completed',v_required_steps_completed,
      'required_assessments_passed',v_required_assessments_passed,
      'rule_version_id',item->>'rule_version_id'
    ),v_event_id,'active',clock_timestamp(),(item->>'expires_at')::timestamptz
  from jsonb_array_elements(v_certificates) item
  on conflict (journey_instance_id,certificate_version_id) do nothing;

  return jsonb_build_object(
    'request_id',v_event_id,'idempotency_key',p_idempotency_key,
    'replayed',false,'data',v_result
  );
end;
$$;

revoke all on function public.issue_learning_credentials(uuid,uuid,uuid,text)
  from public,anon,authenticated;
grant execute on function public.issue_learning_credentials(uuid,uuid,uuid,text)
  to service_role,app_worker;
