begin;

create table if not exists app_private.ai_grading_secret_keys (
  organization_id uuid primary key references iam.organizations(id) on delete cascade,
  encryption_key text not null,
  created_at timestamptz not null default now()
);

create table if not exists assessment.ai_grading_provider_settings (
  organization_id uuid primary key references iam.organizations(id) on delete cascade,
  provider_name text not null,
  endpoint_url text not null,
  model_name text not null,
  api_style text not null default 'openai_chat_completions',
  api_key_ciphertext bytea not null,
  api_key_last_four text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  updated_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (endpoint_url ~ '^https://'),
  check (api_style in ('openai_chat_completions'))
);

revoke all on app_private.ai_grading_secret_keys from public,anon,authenticated;
revoke all on assessment.ai_grading_provider_settings from public,anon,authenticated;

create or replace function public.get_admin_ai_grading_provider(
  p_actor_user_account_id uuid,
  p_organization_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_settings assessment.ai_grading_provider_settings%rowtype;
begin
  if not app_private.extension_admin_allowed(p_actor_user_account_id,p_organization_id) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select * into v_settings
  from assessment.ai_grading_provider_settings
  where organization_id=p_organization_id;

  if not found then
    return jsonb_build_object(
      'configured',false,
      'provider_name','',
      'endpoint_url','',
      'model_name','',
      'api_style','openai_chat_completions',
      'api_key_last_four','',
      'status','inactive'
    );
  end if;

  return jsonb_build_object(
    'configured',true,
    'provider_name',v_settings.provider_name,
    'endpoint_url',v_settings.endpoint_url,
    'model_name',v_settings.model_name,
    'api_style',v_settings.api_style,
    'api_key_last_four',v_settings.api_key_last_four,
    'status',v_settings.status,
    'updated_at',v_settings.updated_at
  );
end;
$function$;

create or replace function public.save_ai_grading_provider(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_payload jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_hash text:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'payload',p_payload));
  v_existing experience.extension_commands%rowtype;
  v_secret text;
  v_api_key text:=nullif(btrim(p_payload->>'api_key'),'');
  v_endpoint text:=btrim(p_payload->>'endpoint_url');
  v_model text:=btrim(p_payload->>'model_name');
  v_provider text:=coalesce(nullif(btrim(p_payload->>'provider_name'),''),'Provedor compatível com OpenAI');
  v_status text:=coalesce(nullif(p_payload->>'status',''),'active');
  v_last_four text;
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'assessment.review') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if jsonb_typeof(coalesce(p_payload,'{}'::jsonb))<>'object' then raise exception 'PAYLOAD_INVALID' using errcode='22023'; end if;
  if v_endpoint !~ '^https://[^[:space:]]+$' or v_endpoint ~* '^https://([^/@]+@)?(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|\[?::1)' then
    raise exception 'AI_GRADING_ENDPOINT_INVALID' using errcode='22023';
  end if;
  if v_endpoint ~ '@' then raise exception 'AI_GRADING_ENDPOINT_INVALID' using errcode='22023'; end if;
  if length(v_endpoint)>500 or length(v_model)<1 or length(v_model)>200 or length(v_provider)>120 then
    raise exception 'AI_GRADING_CONFIGURATION_INVALID' using errcode='22023';
  end if;
  if v_status not in ('active','inactive') then raise exception 'AI_GRADING_STATUS_INVALID' using errcode='22023'; end if;
  if v_api_key is not null and (length(v_api_key)<8 or length(v_api_key)>2000) then
    raise exception 'AI_GRADING_API_KEY_INVALID' using errcode='22023';
  end if;

  select * into v_existing from experience.extension_commands
  where actor_user_account_id=p_actor_user_account_id
    and command_scope='admin:ai_grading_provider'
    and idempotency_key=v_key;
  if found then
    if v_existing.request_hash<>v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return v_existing.result||jsonb_build_object('replayed',true);
  end if;

  perform app_private.e14_lock_scope('ai-grading-provider|'||p_organization_id::text);
  insert into app_private.ai_grading_secret_keys(organization_id,encryption_key)
  values(p_organization_id,encode(gen_random_bytes(32),'hex'))
  on conflict(organization_id) do nothing;
  select encryption_key into v_secret from app_private.ai_grading_secret_keys where organization_id=p_organization_id;

  if not exists(select 1 from assessment.ai_grading_provider_settings where organization_id=p_organization_id) and v_api_key is null then
    raise exception 'AI_GRADING_API_KEY_REQUIRED' using errcode='22023';
  end if;

  if v_api_key is null then
    select api_key_last_four into v_last_four from assessment.ai_grading_provider_settings where organization_id=p_organization_id;
  else
    v_last_four:=right(v_api_key,4);
  end if;

  insert into assessment.ai_grading_provider_settings(
    organization_id,provider_name,endpoint_url,model_name,api_style,api_key_ciphertext,api_key_last_four,status,metadata,updated_by
  ) values (
    p_organization_id,v_provider,v_endpoint,v_model,'openai_chat_completions',
    extensions.pgp_sym_encrypt(v_api_key,v_secret),v_last_four,v_status,coalesce(p_payload->'metadata','{}'::jsonb),p_actor_user_account_id
  )
  on conflict(organization_id) do update set
    provider_name=excluded.provider_name,
    endpoint_url=excluded.endpoint_url,
    model_name=excluded.model_name,
    api_style=excluded.api_style,
    api_key_ciphertext=case when v_api_key is null then assessment.ai_grading_provider_settings.api_key_ciphertext else excluded.api_key_ciphertext end,
    api_key_last_four=case when v_api_key is null then assessment.ai_grading_provider_settings.api_key_last_four else excluded.api_key_last_four end,
    status=excluded.status,
    metadata=excluded.metadata,
    updated_by=excluded.updated_by,
    updated_at=now();

  v_result:=jsonb_build_object(
    'organization_id',p_organization_id,
    'provider_name',v_provider,
    'endpoint_url',v_endpoint,
    'model_name',v_model,
    'api_key_last_four',v_last_four,
    'status',v_status
  );
  insert into experience.extension_commands(actor_user_account_id,organization_id,command_scope,idempotency_key,request_hash,result)
  values(p_actor_user_account_id,p_organization_id,'admin:ai_grading_provider',v_key,v_hash,v_result);
  perform governance.write_audit_entry(
    'admin_ai_grading_provider_saved','ai_grading_provider',p_organization_id,
    jsonb_build_object('provider_name',v_provider,'endpoint_url',v_endpoint,'model_name',v_model,'status',v_status,'api_key_last_four',v_last_four),
    'restricted',p_organization_id,p_actor_user_account_id
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

create or replace function public.get_ai_grading_provider_runtime(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_settings assessment.ai_grading_provider_settings%rowtype;
  v_secret text;
begin
  select * into v_settings from assessment.ai_grading_provider_settings
  where organization_id=p_organization_id and status='active';
  if not found then return null; end if;
  select encryption_key into v_secret from app_private.ai_grading_secret_keys where organization_id=p_organization_id;
  if v_secret is null then raise exception 'AI_GRADING_SECRET_NOT_FOUND' using errcode='P0002'; end if;
  return jsonb_build_object(
    'provider_name',v_settings.provider_name,
    'endpoint_url',v_settings.endpoint_url,
    'model_name',v_settings.model_name,
    'api_style',v_settings.api_style,
    'api_key',extensions.pgp_sym_decrypt(v_settings.api_key_ciphertext,v_secret)
  );
end;
$function$;

create or replace function public.unpublish_admin_journey_to_draft(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_source_journey_version_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_hash text:=app_private.e14_request_hash(jsonb_build_object('source_journey_version_id',p_source_journey_version_id));
  v_event_id uuid:=app_private.e14_command_event_id('unpublish_admin_journey_to_draft',p_actor_user_account_id,p_source_journey_version_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_definition_id uuid;
  v_clone jsonb;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.publish') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  select payload->>'request_hash',payload->'result' into v_existing_hash,v_existing_result
  from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;

  perform app_private.e14_lock_scope('journey-version|'||p_source_journey_version_id::text);
  select jv.journey_definition_id into v_definition_id
  from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
  where jv.id=p_source_journey_version_id and jv.status='published' and jd.owner_organization_id=p_organization_id
  for update of jv,jd;
  if not found then raise exception 'PUBLISHED_JOURNEY_NOT_FOUND' using errcode='P0002'; end if;

  v_clone:=public.create_admin_journey_draft_from_version(
    p_actor_user_account_id,p_organization_id,p_source_journey_version_id,v_key||':clone'
  );
  perform set_config('app.admin_live_edit','on',true);
  update catalog.journey_versions set status='retired',retired_at=now()
  where id=p_source_journey_version_id and status='published';

  v_result:=jsonb_build_object(
    'source_journey_version_id',p_source_journey_version_id,
    'journey_version_id',v_clone->>'journey_version_id',
    'journey_definition_id',v_definition_id,
    'status','draft'
  );
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events where aggregate_type='journey_definition' and aggregate_id=v_definition_id;
  perform app_private.e14_append_event(
    v_event_id,'admin.journey.unpublished_to_draft','journey_definition',v_definition_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'journey_definition',v_definition_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_hash,'result',v_result)
  );
  perform governance.write_audit_entry(
    'admin_journey_unpublished_to_draft','journey_definition',v_definition_id,v_result,
    'internal',p_organization_id,p_actor_user_account_id
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

create or replace function public.delete_admin_journey_draft(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_journey_version_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_hash text:=app_private.e14_request_hash(jsonb_build_object('journey_version_id',p_journey_version_id));
  v_event_id uuid:=app_private.e14_command_event_id('delete_admin_journey_draft',p_actor_user_account_id,p_journey_version_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_definition_id uuid;
  v_has_published boolean;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  select payload->>'request_hash',payload->'result' into v_existing_hash,v_existing_result
  from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;

  perform app_private.e14_lock_scope('journey-version|'||p_journey_version_id::text);
  select jv.journey_definition_id into v_definition_id
  from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
  where jv.id=p_journey_version_id and jv.status='draft' and jd.owner_organization_id=p_organization_id
  for update of jv,jd;
  if not found then raise exception 'JOURNEY_DRAFT_NOT_FOUND' using errcode='P0002'; end if;

  select exists(select 1 from catalog.journey_versions where journey_definition_id=v_definition_id and status='published') into v_has_published;
  update catalog.journey_versions set status='retired',retired_at=now() where id=p_journey_version_id;
  if not v_has_published then
    update catalog.journey_definitions set status='retired',updated_at=now() where id=v_definition_id;
  end if;

  v_result:=jsonb_build_object('journey_version_id',p_journey_version_id,'journey_definition_id',v_definition_id,'status','retired');
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events where aggregate_type='journey_definition' and aggregate_id=v_definition_id;
  perform app_private.e14_append_event(
    v_event_id,'admin.journey.draft.deleted','journey_version',p_journey_version_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'journey_definition',v_definition_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_hash,'result',v_result)
  );
  perform governance.write_audit_entry(
    'admin_journey_draft_deleted','journey_version',p_journey_version_id,v_result,
    'internal',p_organization_id,p_actor_user_account_id
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

create or replace function public.save_admin_product_resource(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_resource_type text,
  p_payload jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
begin
  if p_resource_type='journey_retire' then
    return public.retire_admin_journey(p_actor_user_account_id,p_organization_id,nullif(p_payload->>'journey_definition_id','')::uuid,p_idempotency_key);
  end if;
  if p_resource_type='journey_unpublish_to_draft' then
    return public.unpublish_admin_journey_to_draft(p_actor_user_account_id,p_organization_id,nullif(p_payload->>'journey_version_id','')::uuid,p_idempotency_key);
  end if;
  if p_resource_type='journey_draft_delete' then
    return public.delete_admin_journey_draft(p_actor_user_account_id,p_organization_id,nullif(p_payload->>'journey_version_id','')::uuid,p_idempotency_key);
  end if;
  if p_resource_type='diagnostic_transition' then
    return public.publish_admin_diagnostic_transition(
      p_actor_user_account_id,p_organization_id,nullif(p_payload->>'diagnostic_version_id','')::uuid,
      coalesce(p_payload->'archetype_mapping','{}'::jsonb),p_idempotency_key
    );
  end if;
  return public.save_admin_product_resource_base(p_actor_user_account_id,p_organization_id,p_resource_type,p_payload,p_idempotency_key);
end;
$function$;

revoke all on function public.get_admin_ai_grading_provider(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_admin_ai_grading_provider(uuid,uuid) to service_role;
revoke all on function public.save_ai_grading_provider(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_ai_grading_provider(uuid,uuid,jsonb,text) to service_role;
revoke all on function public.get_ai_grading_provider_runtime(uuid) from public,anon,authenticated;
grant execute on function public.get_ai_grading_provider_runtime(uuid) to service_role;
revoke all on function public.unpublish_admin_journey_to_draft(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.delete_admin_journey_draft(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.save_admin_product_resource(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_admin_product_resource(uuid,uuid,text,jsonb,text) to service_role;

commit;
