begin;

insert into eventing.event_schemas(
  event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select
  'engagement.social.shared',
  1,
  'urn:estimulo:event:engagement.social.shared:1',
  v.document,
  encode(extensions.digest(convert_to(v.document::text,'UTF8'),'sha256'),'hex'),
  'published',
  now()
from (select jsonb_build_object(
  'type','object',
  'required',jsonb_build_array('entity_type','entity_id','channel','captured_at'),
  'properties',jsonb_build_object(
    'entity_type',jsonb_build_object('type','string'),
    'entity_id',jsonb_build_object('type','string'),
    'channel',jsonb_build_object('type','string'),
    'captured_at',jsonb_build_object('type','string')
  )
) document) v
where not exists (
  select 1 from eventing.event_schemas s
  where s.event_name='engagement.social.shared' and s.event_version=1
);

create or replace function app_private.record_participant_social_share(
  p_actor_user_account_id uuid,
  p_payload jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path='pg_catalog'
as $$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_entrepreneur_id uuid:=app_private.extension_entrepreneur(p_actor_user_account_id);
  v_organization_id uuid:=app_private.extension_default_organization();
  v_hash text:=app_private.e14_request_hash(jsonb_build_object('action','social_share','payload',p_payload));
  v_existing experience.extension_commands%rowtype;
  v_event_id uuid:=app_private.e14_command_event_id('social_share',p_actor_user_account_id,v_organization_id,v_key);
  v_behavior_event_id uuid:=app_private.e14_deterministic_uuid('social-share-behavior:'||v_event_id::text);
  v_social_schema_id uuid;
  v_behavior_schema_id uuid;
  v_entity_type text:=left(coalesce(nullif(btrim(p_payload->>'entity_type'),''),'content'),100);
  v_entity_id text:=left(coalesce(nullif(btrim(p_payload->>'entity_id'),''),'unknown'),200);
  v_channel text:=left(coalesce(nullif(btrim(p_payload->>'channel'),''),'share'),80);
  v_captured_at timestamptz:=coalesce(nullif(p_payload->>'captured_at','')::timestamptz,now());
  v_result jsonb;
begin
  if not exists(select 1 from iam.user_accounts u where u.id=p_actor_user_account_id and u.status='active') then
    raise exception 'ACTOR_NOT_FOUND' using errcode='P0002';
  end if;
  if v_entrepreneur_id is null then raise exception 'PARTICIPANT_PROFILE_REQUIRED' using errcode='42501'; end if;
  if jsonb_typeof(coalesce(p_payload,'{}'::jsonb))<>'object' then raise exception 'PAYLOAD_INVALID' using errcode='22023'; end if;

  select * into v_existing from experience.extension_commands
  where actor_user_account_id=p_actor_user_account_id and command_scope='participant:social_share' and idempotency_key=v_key;
  if found then
    if v_existing.request_hash<>v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return v_existing.result||jsonb_build_object('replayed',true);
  end if;

  select id into v_social_schema_id from eventing.event_schemas
  where event_name='engagement.social.shared' and event_version=1 and status='published';
  select id into v_behavior_schema_id from eventing.event_schemas
  where event_name='behavior.interaction.recorded' and event_version=1 and status='published';
  if v_social_schema_id is null or v_behavior_schema_id is null then raise exception 'EVENT_SCHEMA_NOT_FOUND' using errcode='P0002'; end if;

  perform eventing.append_event(
    v_behavior_event_id,'behavior.interaction.recorded',1,v_captured_at,
    'participant_web','entrepreneur',v_entrepreneur_id,'user_account',p_actor_user_account_id,v_organization_id,
    nullif(p_payload->>'journey_instance_id','')::uuid,'behavior_interaction',v_entrepreneur_id,0,
    v_entrepreneur_id::text,v_behavior_event_id,null,null,'observed','internal',
    jsonb_build_object(
      'interaction_type','social_share','schema_version',1,'captured_at',v_captured_at::text,
      'session_id',nullif(p_payload->>'session_id',''),'entity_type',v_entity_type,
      'entity_id',v_entity_id,'properties',coalesce(p_payload->'properties','{}'::jsonb)||jsonb_build_object('channel',v_channel)
    ),v_behavior_schema_id,array['behavior.analytics','etl.behavior']::text[]
  );

  perform eventing.append_event(
    v_event_id,'engagement.social.shared',1,v_captured_at,
    'participant_web','entrepreneur',v_entrepreneur_id,'user_account',p_actor_user_account_id,v_organization_id,
    nullif(p_payload->>'journey_instance_id','')::uuid,'social_share',v_entrepreneur_id,0,
    v_entrepreneur_id::text,v_event_id,null,null,'completed','internal',
    jsonb_build_object('entity_type',v_entity_type,'entity_id',v_entity_id,'channel',v_channel,'captured_at',v_captured_at::text),
    v_social_schema_id,array['engagement.points','behavior.analytics']::text[]
  );

  v_result:=jsonb_build_object('event_id',v_event_id,'recorded',true,'entity_type',v_entity_type,'entity_id',v_entity_id,'channel',v_channel);
  insert into experience.extension_commands(actor_user_account_id,organization_id,command_scope,idempotency_key,request_hash,result)
  values(p_actor_user_account_id,v_organization_id,'participant:social_share',v_key,v_hash,v_result);
  return v_result||jsonb_build_object('replayed',false);
end;
$$;

create or replace function public.perform_participant_extension(
  p_actor_user_account_id uuid,
  p_action text,
  p_payload jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path='pg_catalog'
as $$
begin
  if p_action='social_share' then
    return app_private.record_participant_social_share(p_actor_user_account_id,p_payload,p_idempotency_key);
  end if;
  return public.perform_participant_extension_before_continuous_behavior_score(
    p_actor_user_account_id,p_action,p_payload,p_idempotency_key
  );
end;
$$;

revoke all on function app_private.record_participant_social_share(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function app_private.record_participant_social_share(uuid,jsonb,text) to service_role;

commit;
