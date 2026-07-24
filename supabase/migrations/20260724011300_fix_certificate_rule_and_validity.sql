-- Align the OpenAI certificate rule with the existing credential-v1 evaluator
-- and support the guided month-based validity configured by administrators.

update orchestration.rule_versions rv
set language='credential-v1',
    expression=jsonb_build_object(
      'scope','journey',
      'journey_version_id',jv.id,
      'requires_completed_status',true,
      'requires_required_steps_completed',true,
      'requires_passed_assessment',true
    ),
    content_hash=app_private.e14_request_hash(jsonb_build_object(
      'scope','journey',
      'journey_version_id',jv.id,
      'requires_completed_status',true,
      'requires_required_steps_completed',true,
      'requires_passed_assessment',true
    ))
from orchestration.rule_definitions rd,
     catalog.journey_versions jv
join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
where rv.rule_definition_id=rd.id
  and rd.code='cred_openai_journey_complete'
  and jd.code='capacitacao_ia_mei_openai'
  and jv.status='published';

create or replace function app_private.learning_certificate_candidates(p_context jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
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
    elsif coalesce(v_record.validity_policy->>'duration_months','') ~ '^[1-9][0-9]*$' then
      v_expires_at:=clock_timestamp()+make_interval(
        months=>(v_record.validity_policy->>'duration_months')::integer
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
$function$;
