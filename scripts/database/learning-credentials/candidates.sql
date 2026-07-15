\set ON_ERROR_STOP on

create or replace function app_private.learning_badge_candidates(
  p_context jsonb
) returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
declare
  v_badges jsonb:='[]'::jsonb;
  v_record record;
  v_award_id uuid;
  v_entrepreneur_id uuid:=(p_context->>'entrepreneur_id')::uuid;
  v_journey_instance_id uuid:=(p_context->>'journey_instance_id')::uuid;
  v_journey_version_id uuid:=(p_context->>'journey_version_id')::uuid;
  v_step_instance_id uuid:=(p_context->>'step_instance_id')::uuid;
  v_step_activity_version_id uuid:=(p_context->>'step_activity_version_id')::uuid;
begin
  if v_step_instance_id is not null then
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where bv.status='published' and bd.status='active'
        and app_private.credential_rule_matches(
          bv.criteria_rule_version_id,'activity',v_journey_version_id,
          v_step_activity_version_id,(p_context->>'step_completed')::boolean,
          true,(p_context->>'step_assessment_passed')::boolean
        )
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','activity',
        'step_instance_id',v_step_instance_id,'rule_version_id',v_record.criteria_rule_version_id
      ));
    end loop;
  end if;

  if p_context->>'journey_status'='completed' then
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where bv.status='published' and bd.status='active'
        and app_private.credential_rule_matches(
          bv.criteria_rule_version_id,'journey',v_journey_version_id,null,true,
          (p_context->>'required_steps_completed')::boolean,
          (p_context->>'required_assessments_passed')::boolean
        )
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','journey','step_instance_id',null,
        'rule_version_id',v_record.criteria_rule_version_id
      ));
    end loop;
  end if;

  return v_badges;
end;
$$;

create or replace function app_private.learning_certificate_candidates(
  p_context jsonb
) returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
declare
  v_certificates jsonb:='[]'::jsonb;
  v_record record;
  v_issuance_id uuid;
  v_verification_code text;
  v_expires_at timestamptz;
  v_journey_instance_id uuid:=(p_context->>'journey_instance_id')::uuid;
  v_journey_version_id uuid:=(p_context->>'journey_version_id')::uuid;
begin
  if p_context->>'journey_status'<>'completed' then return v_certificates; end if;

  for v_record in
    select cv.id,cv.requirements_rule_version_id,cv.validity_policy,cd.name
    from engagement.certificate_versions cv
    join engagement.certificate_definitions cd on cd.id=cv.certificate_definition_id
    where cv.status='published' and cd.status='active'
      and cv.journey_version_id=v_journey_version_id
      and app_private.credential_rule_matches(
        cv.requirements_rule_version_id,'journey',v_journey_version_id,null,true,
        (p_context->>'required_steps_completed')::boolean,
        (p_context->>'required_assessments_passed')::boolean
      )
    order by cv.id
  loop
    v_issuance_id:=app_private.e14_deterministic_uuid(
      'certificate-issuance:'||v_journey_instance_id::text||':'||v_record.id::text
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
  return v_certificates;
end;
$$;

revoke all on function app_private.learning_badge_candidates(jsonb)
  from public,anon,authenticated;
revoke all on function app_private.learning_certificate_candidates(jsonb)
  from public,anon,authenticated;
