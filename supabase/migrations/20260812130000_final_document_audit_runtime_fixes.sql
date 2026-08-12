begin;

-- Reuse retired themes instead of failing the unique constraints when an admin
-- recreates the same business classification (for example, Contabilidade).
create or replace function public.save_admin_extension(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_resource_type text,
  p_payload jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_hash text:=app_private.e14_request_hash(jsonb_build_object('resource_type',p_resource_type,'payload',p_payload,'organization_id',p_organization_id));
  v_existing experience.extension_commands%rowtype;
  v_configuration jsonb;
  v_configuration_id uuid;
  v_count bigint;
  v_result jsonb;
  v_library_version_id uuid;
  v_archetype_ids uuid[];
  v_theme_id uuid;
begin
  if p_resource_type='theme' then
    if not (app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage')
      or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.content.manage')) then
      raise exception 'FORBIDDEN' using errcode='42501';
    end if;
    select * into v_existing from experience.extension_commands
    where actor_user_account_id=p_actor_user_account_id and command_scope='admin:'||p_resource_type and idempotency_key=v_key;
    if found then
      if v_existing.request_hash<>v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
      return v_existing.result||jsonb_build_object('replayed',true);
    end if;
    v_theme_id:=nullif(p_payload->>'id','')::uuid;
    if v_theme_id is null then
      select id into v_theme_id
      from catalog.themes
      where owner_organization_id=p_organization_id
        and (lower(code)=lower(btrim(p_payload->>'code')) or lower(name)=lower(btrim(p_payload->>'name')))
      order by (status='active') desc,updated_at desc nulls last,created_at desc
      limit 1 for update;
    end if;
    if v_theme_id is null then
      insert into catalog.themes(owner_organization_id,code,name,description,visual_metadata,status,created_by)
      values(p_organization_id,lower(btrim(p_payload->>'code')),btrim(p_payload->>'name'),nullif(btrim(p_payload->>'description'),''),
        coalesce(p_payload->'visual_metadata','{}'::jsonb),coalesce(nullif(p_payload->>'status',''),'active'),p_actor_user_account_id)
      returning id into v_theme_id;
    else
      update catalog.themes set
        code=lower(btrim(p_payload->>'code')),
        name=btrim(p_payload->>'name'),
        description=nullif(btrim(p_payload->>'description'),''),
        visual_metadata=coalesce(p_payload->'visual_metadata','{}'::jsonb),
        status=coalesce(nullif(p_payload->>'status',''),'active'),
        updated_at=now()
      where id=v_theme_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'THEME_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    v_result:=jsonb_build_object('id',v_theme_id,'status','saved');
    insert into experience.extension_commands(actor_user_account_id,organization_id,command_scope,idempotency_key,request_hash,result)
    values(p_actor_user_account_id,p_organization_id,'admin:'||p_resource_type,v_key,v_hash,v_result);
    perform governance.write_audit_entry('admin_extension_theme','platform_extension',v_theme_id,
      jsonb_build_object('resource_type','theme','result',v_result),'internal',p_organization_id,p_actor_user_account_id);
    return v_result||jsonb_build_object('replayed',false);
  end if;

  if p_resource_type='library_archetypes_set' then
    if not app_private.estimulo_staff_can_view(p_actor_user_account_id,p_organization_id)
      and not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.manage') then
      raise exception 'FORBIDDEN' using errcode='42501';
    end if;
    v_library_version_id:=nullif(p_payload->>'library_item_version_id','')::uuid;
    if v_library_version_id is null or not exists(
      select 1 from catalog.library_item_versions version
      join catalog.library_items item on item.id=version.library_item_id
      where version.id=v_library_version_id and item.owner_organization_id=p_organization_id
    ) then raise exception 'LIBRARY_CONTENT_NOT_FOUND' using errcode='P0002'; end if;
    select coalesce(array_agg(distinct value::uuid),'{}'::uuid[]) into v_archetype_ids
    from jsonb_array_elements_text(coalesce(p_payload->'archetype_definition_ids','[]'::jsonb)) value;
    if exists(select 1 from unnest(v_archetype_ids) archetype_id where not exists(
      select 1 from diagnostics.archetype_definitions definition
      where definition.id=archetype_id and definition.owner_organization_id=p_organization_id and definition.status='active'
    )) then raise exception 'INVALID_LIBRARY_ARCHETYPE' using errcode='22023'; end if;
    select * into v_existing from experience.extension_commands
    where actor_user_account_id=p_actor_user_account_id and command_scope='admin:'||p_resource_type and idempotency_key=v_key;
    if found then
      if v_existing.request_hash<>v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
      return v_existing.result||jsonb_build_object('replayed',true);
    end if;
    delete from catalog.library_item_archetype_links where library_item_version_id=v_library_version_id;
    insert into catalog.library_item_archetype_links(library_item_version_id,archetype_definition_id,created_by)
    select v_library_version_id,archetype_id,p_actor_user_account_id from unnest(v_archetype_ids) archetype_id;
    v_result:=jsonb_build_object('library_item_version_id',v_library_version_id,'archetype_definition_ids',to_jsonb(v_archetype_ids),'archetype_count',cardinality(v_archetype_ids));
    insert into experience.extension_commands(actor_user_account_id,organization_id,command_scope,idempotency_key,request_hash,result)
    values(p_actor_user_account_id,p_organization_id,'admin:'||p_resource_type,v_key,v_hash,v_result);
    perform governance.write_audit_entry('admin_extension_'||p_resource_type,'library_item_version',v_library_version_id,v_result,'internal',p_organization_id,p_actor_user_account_id);
    return v_result||jsonb_build_object('replayed',false);
  end if;

  if p_resource_type not in ('behavior_score_configuration','behavior_recalculate') then
    return public.save_admin_extension_before_behavior_configuration(p_actor_user_account_id,p_organization_id,p_resource_type,p_payload,p_idempotency_key);
  end if;
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'participant.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  select * into v_existing from experience.extension_commands
  where actor_user_account_id=p_actor_user_account_id and command_scope='admin:'||p_resource_type and idempotency_key=v_key;
  if found then
    if v_existing.request_hash<>v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return v_existing.result||jsonb_build_object('replayed',true);
  end if;
  if p_resource_type='behavior_score_configuration' then
    v_configuration:=app_private.validate_behavior_score_configuration(p_payload->'configuration');
    insert into intelligence.behavior_score_configurations(owner_organization_id,configuration,status,updated_by)
    values(p_organization_id,v_configuration,'active',p_actor_user_account_id)
    on conflict(owner_organization_id) do update set configuration=excluded.configuration,status='active',updated_by=excluded.updated_by,updated_at=now()
    returning id into v_configuration_id;
    insert into intelligence.behavior_score_configuration_history(configuration_id,owner_organization_id,configuration,changed_by)
    values(v_configuration_id,p_organization_id,v_configuration,p_actor_user_account_id);
    v_count:=app_private.recalculate_behavior_scores(p_organization_id,null);
    v_result:=jsonb_build_object('configuration_id',v_configuration_id,'configuration',v_configuration,'recalculated',v_count);
  else
    v_count:=app_private.recalculate_behavior_scores(p_organization_id,null);
    v_result:=jsonb_build_object('recalculated',v_count);
  end if;
  insert into experience.extension_commands(actor_user_account_id,organization_id,command_scope,idempotency_key,request_hash,result)
  values(p_actor_user_account_id,p_organization_id,'admin:'||p_resource_type,v_key,v_hash,v_result);
  perform governance.write_audit_entry('admin_extension_'||p_resource_type,'behavior_score_configuration',coalesce(v_configuration_id,p_organization_id),v_result,'internal',p_organization_id,p_actor_user_account_id);
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

-- Public-safe support settings used by /ajuda. Arbitrary metadata is never exposed.
create or replace function public.get_public_platform_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'platform_name',s.platform_name,
    'support_phone',s.support_phone,
    'support_whatsapp',s.support_whatsapp,
    'support_email',s.support_email,
    'support_hours',s.support_hours,
    'institutional_links',coalesce(s.institutional_links,'[]'::jsonb),
    'footer_text',s.footer_text,
    'community_whatsapp_url',(
      select link->>'url'
      from jsonb_array_elements(coalesce(s.institutional_links,'[]'::jsonb)) link
      where lower(coalesce(link->>'label','')) like '%comunidade%'
        and coalesce(link->>'url','') ~ '^https://'
      limit 1
    )
  ) into v_result
  from iam.organizations o
  left join experience.platform_settings s on s.organization_id=o.id
  where o.slug='estimulo' and o.status='active'
  limit 1;
  return coalesce(v_result,jsonb_build_object('institutional_links','[]'::jsonb));
end;
$function$;
revoke all on function public.get_public_platform_settings() from public;
grant execute on function public.get_public_platform_settings() to anon,authenticated,service_role;

-- Reward artwork follows the same private-object lifecycle used by banners.
insert into core.file_upload_profiles(code,description,allowed_mime_types,allowed_extensions,max_size_bytes,retention_class,status)
values('reward_image_v1','Imagem de catálogo para recompensas',array['image/png','image/jpeg','image/webp'],array['png','jpg','jpeg','webp'],4194304,'reward_image','active')
on conflict(code) do update set
  description=excluded.description,
  allowed_mime_types=excluded.allowed_mime_types,
  allowed_extensions=excluded.allowed_extensions,
  max_size_bytes=excluded.max_size_bytes,
  retention_class=excluded.retention_class,
  status='active',
  updated_at=now();

create or replace function public.create_reward_image_upload_intent(
  p_actor_user_account_id uuid,p_organization_id uuid,p_original_filename text,p_expected_content_type text,
  p_storage_provider text,p_bucket text,p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path=pg_catalog
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_profile core.file_upload_profiles%rowtype;
  v_filename text:=app_private.safe_object_filename(p_original_filename);
  v_type text:=lower(btrim(p_expected_content_type));
  v_ext text;
  v_intent_id uuid:=app_private.e14_deterministic_uuid('reward-image-intent:'||p_actor_user_account_id::text||':'||v_key);
  v_event_id uuid:=app_private.e14_command_event_id('create_reward_image_upload_intent',p_actor_user_account_id,v_intent_id,v_key);
  v_snapshot jsonb; v_hash text;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into v_profile from core.file_upload_profiles where code='reward_image_v1' and status='active';
  if not found or not v_type=any(v_profile.allowed_mime_types) then raise exception 'REWARD_IMAGE_TYPE_NOT_ALLOWED' using errcode='22023'; end if;
  v_ext:=lower(split_part(v_filename,'.',cardinality(string_to_array(v_filename,'.'))));
  if not v_ext=any(v_profile.allowed_extensions) then raise exception 'REWARD_IMAGE_EXTENSION_NOT_ALLOWED' using errcode='22023'; end if;
  v_hash:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'filename',v_filename,'content_type',v_type));
  if app_private.e14_assert_idempotency(v_event_id,v_hash) then
    select payload->'result' into v_snapshot from eventing.events where event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_snapshot);
  end if;
  insert into core.file_upload_intents(id,owner_organization_id,requested_by_user_account_id,upload_profile_code,storage_provider,bucket,object_key,original_filename,expected_content_type,max_size_bytes,retention_class,status,expires_at)
  values(v_intent_id,p_organization_id,p_actor_user_account_id,v_profile.code,p_storage_provider,btrim(p_bucket),'private/'||p_organization_id::text||'/reward-images/'||v_intent_id::text||'/'||v_filename,v_filename,v_type,v_profile.max_size_bytes,v_profile.retention_class,'pending_upload',now()+interval '30 minutes');
  select jsonb_build_object('upload_intent_id',id,'bucket',bucket,'object_key',object_key,'original_filename',original_filename,'expected_content_type',expected_content_type,'max_size_bytes',max_size_bytes)
  into v_snapshot from core.file_upload_intents where id=v_intent_id;
  perform app_private.e14_append_event(v_event_id,'engagement.reward_image.upload_requested','reward_image_upload',v_intent_id,'user_account',p_actor_user_account_id,p_organization_id,null,'file_upload_intent',v_intent_id,1,v_event_id,null,jsonb_build_object('request_hash',v_hash,'result',v_snapshot));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_snapshot);
end;
$function$;

create or replace function public.confirm_reward_image_upload(
  p_actor_user_account_id uuid,p_organization_id uuid,p_upload_intent_id uuid,p_actual_content_type text,p_actual_size_bytes bigint,
  p_sha256 text,p_provider_object_version text,p_etag text,p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path=pg_catalog
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_intent core.file_upload_intents%rowtype;
  v_file_id uuid:=app_private.e14_deterministic_uuid('reward-image-file:'||p_upload_intent_id::text);
  v_event_id uuid:=app_private.e14_command_event_id('confirm_reward_image_upload',p_actor_user_account_id,v_file_id,v_key);
  v_hash text; v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into v_intent from core.file_upload_intents where id=p_upload_intent_id for update;
  if not found or v_intent.owner_organization_id<>p_organization_id or v_intent.requested_by_user_account_id<>p_actor_user_account_id or v_intent.upload_profile_code<>'reward_image_v1' then raise exception 'REWARD_IMAGE_INTENT_NOT_FOUND' using errcode='P0002'; end if;
  if v_intent.status<>'pending_upload' or v_intent.expires_at<=now() or lower(btrim(p_actual_content_type))<>v_intent.expected_content_type or p_actual_size_bytes<1 or p_actual_size_bytes>v_intent.max_size_bytes or p_sha256!~'^[a-f0-9]{64}$' then raise exception 'REWARD_IMAGE_FILE_INVALID' using errcode='22023'; end if;
  v_hash:=app_private.e14_request_hash(jsonb_build_object('intent_id',p_upload_intent_id,'size',p_actual_size_bytes,'sha256',p_sha256));
  if app_private.e14_assert_idempotency(v_event_id,v_hash) then
    select payload->'result' into v_result from eventing.events where event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;
  insert into core.file_objects(id,owner_organization_id,storage_provider,bucket,object_key,content_type,size_bytes,sha256,security_status,retention_class,upload_intent_id,created_by_user_account_id,original_filename,provider_object_version,etag,verified_at,released_at,metadata)
  values(v_file_id,p_organization_id,v_intent.storage_provider,v_intent.bucket,v_intent.object_key,lower(btrim(p_actual_content_type)),p_actual_size_bytes,p_sha256,'clean',v_intent.retention_class,v_intent.id,p_actor_user_account_id,v_intent.original_filename,nullif(btrim(coalesce(p_provider_object_version,'')),''),nullif(btrim(coalesce(p_etag,'')),''),now(),now(),jsonb_build_object('category','reward_image'));
  update core.file_upload_intents set status='confirmed',uploaded_at=now(),confirmed_at=now(),file_object_id=v_file_id where id=v_intent.id;
  v_result:=jsonb_build_object('file_object_id',v_file_id,'original_filename',v_intent.original_filename,'status','clean');
  perform app_private.e14_append_event(v_event_id,'engagement.reward_image.confirmed','reward_image',v_file_id,'user_account',p_actor_user_account_id,p_organization_id,null,'file_object',v_file_id,1,v_event_id,null,jsonb_build_object('request_hash',v_hash,'result',v_result));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;

create or replace function public.abort_reward_image_upload(
  p_actor_user_account_id uuid,p_organization_id uuid,p_upload_intent_id uuid,p_failure_code text,p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path=pg_catalog
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid:=app_private.e14_command_event_id('abort_reward_image_upload',p_actor_user_account_id,p_upload_intent_id,v_key);
  v_code text:=left(coalesce(nullif(btrim(p_failure_code),''),'upload_failed'),120);
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update core.file_upload_intents set status='aborted',aborted_at=now(),failure_code=v_code,updated_at=now()
  where id=p_upload_intent_id and owner_organization_id=p_organization_id and requested_by_user_account_id=p_actor_user_account_id and upload_profile_code='reward_image_v1' and status='pending_upload';
  v_result:=jsonb_build_object('upload_intent_id',p_upload_intent_id,'status','aborted','failure_code',v_code);
  perform app_private.e14_append_event(v_event_id,'engagement.reward_image.upload_failed','reward_image_upload',p_upload_intent_id,'user_account',p_actor_user_account_id,p_organization_id,null,'file_upload_intent',p_upload_intent_id,2,v_event_id,null,jsonb_build_object('result',v_result));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;

create or replace function public.get_reward_image_download(p_actor_user_account_id uuid,p_reward_id uuid)
returns jsonb
language plpgsql stable security definer set search_path=pg_catalog
as $function$
declare
  v_reward engagement.rewards%rowtype;
  v_file core.file_objects%rowtype;
  v_allowed boolean:=false;
begin
  select * into v_reward from engagement.rewards where id=p_reward_id;
  if not found then raise exception 'REWARD_NOT_FOUND' using errcode='P0002'; end if;
  if app_private.e14_actor_has_permission(p_actor_user_account_id,v_reward.owner_organization_id,'engagement.manage') then v_allowed:=true; end if;
  if not v_allowed and v_reward.status='published'
    and (v_reward.starts_at is null or v_reward.starts_at<=now())
    and (v_reward.ends_at is null or v_reward.ends_at>now())
    and app_private.e14_entrepreneur_for_account(p_actor_user_account_id) is not null then v_allowed:=true; end if;
  if not v_allowed then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_reward.image_file_object_id is null then raise exception 'REWARD_IMAGE_NOT_FOUND' using errcode='P0002'; end if;
  select * into v_file from core.file_objects where id=v_reward.image_file_object_id and security_status='clean' and deleted_at is null;
  if not found then raise exception 'REWARD_IMAGE_NOT_AVAILABLE' using errcode='P0002'; end if;
  return jsonb_build_object('reward_id',v_reward.id,'file_object_id',v_file.id,'bucket',v_file.bucket,'object_key',v_file.object_key,'content_type',v_file.content_type,'original_filename',v_file.original_filename);
end;
$function$;

revoke all on function public.create_reward_image_upload_intent(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.confirm_reward_image_upload(uuid,uuid,uuid,text,bigint,text,text,text,text) from public,anon,authenticated;
revoke all on function public.abort_reward_image_upload(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.get_reward_image_download(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_reward_image_upload_intent(uuid,uuid,text,text,text,text,text) to postgres,service_role,app_worker;
grant execute on function public.confirm_reward_image_upload(uuid,uuid,uuid,text,bigint,text,text,text,text) to postgres,service_role,app_worker;
grant execute on function public.abort_reward_image_upload(uuid,uuid,uuid,text,text) to postgres,service_role,app_worker;
grant execute on function public.get_reward_image_download(uuid,uuid) to postgres,service_role,app_worker;

-- Align persisted CMS values with the reviewed copy. Keep all other editor fields.
update experience.interface_content
set default_value=jsonb_set(coalesce(default_value,'{}'::jsonb),'{text}',to_jsonb('👋 Olá, {{nome}}!'::text),true),
    draft_value=case when draft_value is null then null else jsonb_set(draft_value,'{text}',to_jsonb('👋 Olá, {{nome}}!'::text),true) end,
    published_value=jsonb_set(coalesce(published_value,'{}'::jsonb),'{text}',to_jsonb('👋 Olá, {{nome}}!'::text),true),
    updated_at=now()
where content_key='participant.page.overview.header.eyebrow';

update experience.interface_content
set default_value=jsonb_set(coalesce(default_value,'{}'::jsonb),'{text}',to_jsonb('Seus dados, seu progresso e as informações que personalizam sua experiência.'::text),true),
    draft_value=case when draft_value is null then null else jsonb_set(draft_value,'{text}',to_jsonb('Seus dados, seu progresso e as informações que personalizam sua experiência.'::text),true) end,
    published_value=jsonb_set(coalesce(published_value,'{}'::jsonb),'{text}',to_jsonb('Seus dados, seu progresso e as informações que personalizam sua experiência.'::text),true),
    updated_at=now()
where content_key='participant.page.perfil.header.description';

commit;
