begin;

alter table assessment.ai_grading_provider_settings enable row level security;
alter table assessment.ai_grading_provider_settings force row level security;

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
  v_ciphertext bytea;
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'assessment.review') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if jsonb_typeof(coalesce(p_payload,'{}'::jsonb))<>'object' then raise exception 'PAYLOAD_INVALID' using errcode='22023'; end if;
  if v_endpoint !~ '^https://[^[:space:]]+$' or v_endpoint ~* '^https://([^/@]+@)?(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|\[?::1)' or v_endpoint ~ '@' then
    raise exception 'AI_GRADING_ENDPOINT_INVALID' using errcode='22023';
  end if;
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
  values(p_organization_id,encode(extensions.gen_random_bytes(32),'hex'))
  on conflict(organization_id) do nothing;
  select encryption_key into v_secret from app_private.ai_grading_secret_keys where organization_id=p_organization_id;

  if v_api_key is null then
    select api_key_ciphertext,api_key_last_four into v_ciphertext,v_last_four
    from assessment.ai_grading_provider_settings where organization_id=p_organization_id;
    if not found then raise exception 'AI_GRADING_API_KEY_REQUIRED' using errcode='22023'; end if;
  else
    v_ciphertext:=extensions.pgp_sym_encrypt(v_api_key,v_secret);
    v_last_four:=right(v_api_key,4);
  end if;

  insert into assessment.ai_grading_provider_settings(
    organization_id,provider_name,endpoint_url,model_name,api_style,api_key_ciphertext,api_key_last_four,status,metadata,updated_by
  ) values (
    p_organization_id,v_provider,v_endpoint,v_model,'openai_chat_completions',
    v_ciphertext,v_last_four,v_status,coalesce(p_payload->'metadata','{}'::jsonb),p_actor_user_account_id
  )
  on conflict(organization_id) do update set
    provider_name=excluded.provider_name,
    endpoint_url=excluded.endpoint_url,
    model_name=excluded.model_name,
    api_style=excluded.api_style,
    api_key_ciphertext=excluded.api_key_ciphertext,
    api_key_last_four=excluded.api_key_last_four,
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

revoke all on function public.save_ai_grading_provider(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_ai_grading_provider(uuid,uuid,jsonb,text) to service_role;

commit;
