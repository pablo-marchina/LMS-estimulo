create or replace function app_private.record_participant_behavior_event(
  p_actor_user_account_id uuid,
  p_payload jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_entrepreneur_id uuid := app_private.extension_entrepreneur(p_actor_user_account_id);
  v_organization_id uuid := app_private.extension_default_organization();
  v_hash text := app_private.e14_request_hash(jsonb_build_object('action','behavior_event','payload',p_payload));
  v_existing experience.extension_commands%rowtype;
  v_event_id uuid := app_private.e14_command_event_id('behavior_event',p_actor_user_account_id,v_organization_id,v_key);
  v_schema_id uuid;
  v_captured_at timestamptz;
  v_result jsonb;
begin
  if not exists(select 1 from iam.user_accounts u where u.id=p_actor_user_account_id and u.status='active') then
    raise exception 'ACTOR_NOT_FOUND' using errcode='P0002';
  end if;
  if v_entrepreneur_id is null then
    raise exception 'PARTICIPANT_PROFILE_REQUIRED' using errcode='42501';
  end if;
  if jsonb_typeof(coalesce(p_payload,'{}'::jsonb))<>'object' then
    raise exception 'PAYLOAD_INVALID' using errcode='22023';
  end if;
  if p_payload->>'interaction_type' !~ '^[a-z][a-z0-9_.-]{1,99}$' then
    raise exception 'BEHAVIOR_EVENT_TYPE_INVALID' using errcode='22023';
  end if;
  if jsonb_typeof(coalesce(p_payload->'properties','{}'::jsonb))<>'object' then
    raise exception 'BEHAVIOR_EVENT_PROPERTIES_INVALID' using errcode='22023';
  end if;

  begin
    v_captured_at := coalesce(nullif(p_payload->>'captured_at','')::timestamptz,now());
  exception when others then
    raise exception 'BEHAVIOR_EVENT_CAPTURED_AT_INVALID' using errcode='22023';
  end;

  select * into v_existing
  from experience.extension_commands
  where actor_user_account_id=p_actor_user_account_id
    and command_scope='participant:behavior_event'
    and idempotency_key=v_key;
  if found then
    if v_existing.request_hash<>v_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505';
    end if;
    return v_existing.result||jsonb_build_object('replayed',true);
  end if;

  select id into v_schema_id
  from eventing.event_schemas
  where event_name='behavior.interaction.recorded'
    and event_version=1
    and status='published';
  if v_schema_id is null then
    raise exception 'EVENT_SCHEMA_NOT_FOUND' using errcode='P0002';
  end if;

  perform eventing.append_event(
    v_event_id,'behavior.interaction.recorded',1,v_captured_at,
    'participant_web','entrepreneur',v_entrepreneur_id,'user_account',p_actor_user_account_id,v_organization_id,
    nullif(p_payload->>'journey_instance_id','')::uuid,'behavior_interaction',v_event_id,0,
    v_entrepreneur_id::text,v_event_id,null,null,'observed','internal',
    jsonb_build_object(
      'interaction_type',p_payload->>'interaction_type','schema_version',1,'captured_at',v_captured_at::text,
      'session_id',nullif(p_payload->>'session_id',''),'entity_type',nullif(p_payload->>'entity_type',''),
      'entity_id',nullif(p_payload->>'entity_id',''),'properties',coalesce(p_payload->'properties','{}'::jsonb)
    ),v_schema_id,array['behavior.analytics','etl.behavior']::text[]
  );

  v_result:=jsonb_build_object('event_id',v_event_id,'recorded',true);
  insert into experience.extension_commands(
    actor_user_account_id,organization_id,command_scope,idempotency_key,request_hash,result
  ) values (
    p_actor_user_account_id,v_organization_id,'participant:behavior_event',v_key,v_hash,v_result
  );

  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function app_private.record_participant_behavior_event(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function app_private.record_participant_behavior_event(uuid,jsonb,text) to service_role;

create or replace function public.perform_participant_extension(
  p_actor_user_account_id uuid,
  p_action text,
  p_payload jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
begin
  if p_action='social_share' then
    return app_private.record_participant_social_share(p_actor_user_account_id,p_payload,p_idempotency_key);
  end if;
  if p_action='behavior_event' then
    return app_private.record_participant_behavior_event(p_actor_user_account_id,p_payload,p_idempotency_key);
  end if;
  return public.perform_participant_extension_before_continuous_behavior_score(
    p_actor_user_account_id,p_action,p_payload,p_idempotency_key
  );
end;
$function$;

revoke all on function public.perform_participant_extension(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.perform_participant_extension(uuid,text,jsonb,text) to service_role;
