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
  v_context jsonb;
  v_request_hash text;
  v_event_id uuid;
  v_existing_payload jsonb;
  v_badges jsonb;
  v_certificates jsonb;
  v_result jsonb;
  v_entrepreneur_id uuid;
  v_organization_id uuid;
  v_display_name text;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_context:=app_private.learning_credential_context(
    p_actor_user_account_id,p_journey_instance_id,p_step_instance_id
  );
  v_entrepreneur_id:=(v_context->>'entrepreneur_id')::uuid;
  v_organization_id:=(v_context->>'organization_id')::uuid;
  v_display_name:=v_context->>'display_name';

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

  v_badges:=app_private.learning_badge_candidates(v_context);
  v_certificates:=app_private.learning_certificate_candidates(v_context);
  v_result:=jsonb_build_object(
    'journey_instance_id',p_journey_instance_id,'step_instance_id',p_step_instance_id,
    'journey_completed',v_context->>'journey_status'='completed',
    'required_steps_completed',(v_context->>'required_steps_completed')::boolean,
    'required_assessments_passed',(v_context->>'required_assessments_passed')::boolean,
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
      'rule_version_id',item->>'rule_version_id',
      'journey_status',v_context->>'journey_status',
      'required_steps_completed',(v_context->>'required_steps_completed')::boolean,
      'required_assessments_passed',(v_context->>'required_assessments_passed')::boolean
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
      'journey_title',v_context->>'journey_title',
      'journey_status',v_context->>'journey_status',
      'required_steps_completed',(v_context->>'required_steps_completed')::boolean,
      'required_assessments_passed',(v_context->>'required_assessments_passed')::boolean,
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
