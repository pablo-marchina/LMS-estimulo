-- Frente 6: independent free-library discovery and journey association, plus managed files.

insert into core.file_upload_profiles(
  code,description,allowed_mime_types,allowed_extensions,max_size_bytes,retention_class,status
) values (
  'library_content_v1',
  'Conteúdo editorial administrado da Biblioteca',
  array[
    'application/pdf','image/png','image/jpeg','image/webp','text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[],
  array['pdf','png','jpg','jpeg','webp','txt','docx']::text[],
  6291456,
  'library_content',
  'active'
) on conflict (code) do update set
  description=excluded.description,
  allowed_mime_types=excluded.allowed_mime_types,
  allowed_extensions=excluded.allowed_extensions,
  max_size_bytes=excluded.max_size_bytes,
  retention_class=excluded.retention_class,
  status='active',
  updated_at=now();

alter table catalog.library_item_versions
  add column if not exists discoverable_in_library boolean not null default true,
  add column if not exists file_object_id uuid null references core.file_objects(id);

alter table catalog.library_item_versions drop constraint if exists library_item_versions_kind;
alter table catalog.library_item_versions add constraint library_item_versions_kind
  check (content_kind in ('article','external_link','file'));

alter table catalog.library_item_versions drop constraint if exists library_item_versions_delivery;
alter table catalog.library_item_versions add constraint library_item_versions_delivery check (
  (content_kind='article' and body is not null and length(trim(body))>0 and external_url is null and file_object_id is null)
  or (content_kind='external_link' and external_url ~ '^https://[^[:space:]]+$' and body is null and file_object_id is null)
  or (content_kind='file' and file_object_id is not null and body is null and external_url is null)
);

create index if not exists library_item_versions_discovery_idx
  on catalog.library_item_versions(status,discoverable_in_library,published_at desc);

create or replace function public.create_library_upload_intent(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_original_filename text,
  p_expected_content_type text,
  p_storage_provider text,
  p_bucket text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_filename text:=app_private.safe_object_filename(p_original_filename);
  v_content_type text:=lower(btrim(coalesce(p_expected_content_type,'')));
  v_profile core.file_upload_profiles%rowtype;
  v_extension text;
  v_intent_id uuid:=app_private.e14_deterministic_uuid('library-upload-intent:'||p_actor_user_account_id::text||':'||v_key);
  v_object_key text;
  v_event_id uuid:=app_private.e14_command_event_id('create_library_upload_intent',p_actor_user_account_id,p_organization_id,v_key);
  v_request_hash text;
  v_snapshot jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if p_storage_provider not in ('supabase_storage','s3') then raise exception 'LIBRARY_STORAGE_PROVIDER_UNSUPPORTED' using errcode='22023'; end if;
  if nullif(btrim(p_bucket),'') is null then raise exception 'LIBRARY_STORAGE_BUCKET_REQUIRED' using errcode='22023'; end if;
  select * into v_profile from core.file_upload_profiles where code='library_content_v1' and status='active';
  if not found then raise exception 'LIBRARY_UPLOAD_PROFILE_NOT_FOUND' using errcode='P0002'; end if;
  if not v_content_type=any(v_profile.allowed_mime_types) then raise exception 'LIBRARY_CONTENT_TYPE_NOT_ALLOWED' using errcode='22023'; end if;
  v_extension:=lower(regexp_replace(v_filename,'^.*\\.',''));
  if v_extension=v_filename or not v_extension=any(v_profile.allowed_extensions) then
    raise exception 'LIBRARY_FILE_EXTENSION_NOT_ALLOWED' using errcode='22023';
  end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,'filename',v_filename,'content_type',v_content_type,
    'storage_provider',p_storage_provider,'bucket',btrim(p_bucket)
  ));
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select e.payload->'result' into v_snapshot from eventing.events e where e.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_snapshot);
  end if;

  v_object_key:='private/'||p_organization_id::text||'/library/'||v_intent_id::text||'/'||v_filename;
  insert into core.file_upload_intents(
    id,owner_organization_id,requested_by_user_account_id,requested_by_entrepreneur_id,
    upload_profile_code,storage_provider,bucket,object_key,original_filename,
    expected_content_type,max_size_bytes,retention_class,status,expires_at
  ) values (
    v_intent_id,p_organization_id,p_actor_user_account_id,null,v_profile.code,p_storage_provider,
    btrim(p_bucket),v_object_key,v_filename,v_content_type,v_profile.max_size_bytes,
    v_profile.retention_class,'pending_upload',now()+interval '30 minutes'
  );

  v_snapshot:=jsonb_build_object(
    'upload_intent_id',v_intent_id,'bucket',btrim(p_bucket),'object_key',v_object_key,
    'original_filename',v_filename,'expected_content_type',v_content_type,
    'max_size_bytes',v_profile.max_size_bytes,'expires_at',now()+interval '30 minutes'
  );
  perform app_private.e14_append_event(
    v_event_id,'catalog.library_file.upload_requested','library_upload_intent',v_intent_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,'file_upload_intent',v_intent_id,1,
    v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_snapshot)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_snapshot);
end;
$function$;

create or replace function public.confirm_library_upload(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_upload_intent_id uuid,
  p_actual_content_type text,
  p_actual_size_bytes bigint,
  p_sha256 text,
  p_provider_object_version text,
  p_etag text,
  p_metadata jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid:=app_private.e14_command_event_id('confirm_library_upload',p_actor_user_account_id,p_upload_intent_id,v_key);
  v_request_hash text;
  v_intent core.file_upload_intents%rowtype;
  v_file_id uuid:=app_private.e14_deterministic_uuid('library-file:'||p_upload_intent_id::text);
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if p_actual_size_bytes<1 then raise exception 'LIBRARY_FILE_SIZE_INVALID' using errcode='22023'; end if;
  if p_sha256!~'^[a-f0-9]{64}$' then raise exception 'LIBRARY_SHA256_INVALID' using errcode='22023'; end if;
  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,'upload_intent_id',p_upload_intent_id,
    'content_type',lower(btrim(p_actual_content_type)),'size_bytes',p_actual_size_bytes,
    'sha256',p_sha256,'provider_object_version',p_provider_object_version,'etag',p_etag
  ));
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;

  select * into v_intent from core.file_upload_intents
  where id=p_upload_intent_id and owner_organization_id=p_organization_id
    and requested_by_user_account_id=p_actor_user_account_id
  for update;
  if not found then raise exception 'LIBRARY_UPLOAD_INTENT_NOT_FOUND' using errcode='P0002'; end if;
  if v_intent.status<>'pending_upload' or v_intent.expires_at<=now() then raise exception 'LIBRARY_UPLOAD_INTENT_EXPIRED' using errcode='55000'; end if;
  if lower(btrim(p_actual_content_type))<>v_intent.expected_content_type then raise exception 'LIBRARY_CONTENT_TYPE_MISMATCH' using errcode='22023'; end if;
  if p_actual_size_bytes>v_intent.max_size_bytes then raise exception 'LIBRARY_FILE_TOO_LARGE' using errcode='22023'; end if;

  insert into core.file_objects(
    id,owner_organization_id,storage_provider,bucket,object_key,content_type,size_bytes,sha256,
    security_status,retention_class,upload_intent_id,created_by_user_account_id,original_filename,
    provider_object_version,etag,verified_at,quarantined_at,released_at,metadata
  ) values (
    v_file_id,p_organization_id,v_intent.storage_provider,v_intent.bucket,v_intent.object_key,
    lower(btrim(p_actual_content_type)),p_actual_size_bytes,p_sha256,'clean',v_intent.retention_class,
    v_intent.id,p_actor_user_account_id,v_intent.original_filename,nullif(btrim(p_provider_object_version),''),
    nullif(btrim(p_etag),''),now(),null,now(),coalesce(p_metadata,'{}'::jsonb)
  ) on conflict (id) do nothing;

  update core.file_upload_intents
     set status='confirmed',uploaded_at=now(),confirmed_at=now(),file_object_id=v_file_id,updated_at=now()
   where id=v_intent.id;

  v_result:=jsonb_build_object(
    'file_object_id',v_file_id,'original_filename',v_intent.original_filename,
    'content_type',lower(btrim(p_actual_content_type)),'size_bytes',p_actual_size_bytes,
    'bucket',v_intent.bucket,'object_key',v_intent.object_key,'security_status','clean'
  );
  perform app_private.e14_append_event(
    v_event_id,'catalog.library_file.upload_confirmed','library_file',v_file_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,'file_object',v_file_id,1,
    v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;

create or replace function public.abort_library_upload(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_upload_intent_id uuid,
  p_failure_code text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid:=app_private.e14_command_event_id('abort_library_upload',p_actor_user_account_id,p_upload_intent_id,v_key);
  v_code text:=left(coalesce(nullif(btrim(p_failure_code),''),'upload_failed'),120);
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update core.file_upload_intents set status='aborted',aborted_at=now(),failure_code=v_code,updated_at=now()
  where id=p_upload_intent_id and owner_organization_id=p_organization_id
    and requested_by_user_account_id=p_actor_user_account_id and status='pending_upload';
  v_result:=jsonb_build_object('upload_intent_id',p_upload_intent_id,'status','aborted','failure_code',v_code);
  perform app_private.e14_append_event(v_event_id,'catalog.library_file.upload_failed','library_upload_intent',p_upload_intent_id,'user_account',p_actor_user_account_id,p_organization_id,null,'file_upload_intent',p_upload_intent_id,1,v_event_id,null,jsonb_build_object('result',v_result));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;

-- New overload used by the Frente 6 UI. The original function remains as compatibility surface.
create or replace function public.save_library_content_draft(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_library_item_id uuid,
  p_slug text,
  p_title text,
  p_summary text,
  p_body text,
  p_content_kind text,
  p_content_format text,
  p_level text,
  p_estimated_minutes integer,
  p_source_type text,
  p_source_name text,
  p_external_url text,
  p_language_code text,
  p_topics text[],
  p_visibility text,
  p_journey_version_ids uuid[],
  p_discoverable_in_library boolean,
  p_file_object_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_item_id uuid:=coalesce(p_library_item_id,app_private.e14_deterministic_uuid('library:item:'||p_actor_user_account_id::text||':'||v_key));
  v_event_id uuid; v_request jsonb; v_request_hash text; v_result jsonb;
  v_slug text:=lower(trim(p_slug)); v_title text:=trim(p_title); v_summary text:=trim(p_summary);
  v_body text:=nullif(trim(coalesce(p_body,'')),''); v_external_url text:=nullif(trim(coalesce(p_external_url,'')),'');
  v_source_name text:=trim(p_source_name); v_language_code text:=trim(p_language_code);
  v_topics text[]:=app_private.library_normalize_topics(p_topics); v_journeys uuid[]:=coalesce(p_journey_version_ids,'{}'::uuid[]);
  v_version_id uuid; v_version_number integer; v_content_hash text; v_existing_slug text; v_has_published boolean;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_slug!~'^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'INVALID_LIBRARY_SLUG' using errcode='22023'; end if;
  if length(v_title) not between 3 and 200 then raise exception 'INVALID_LIBRARY_TITLE' using errcode='22023'; end if;
  if length(v_summary) not between 10 and 600 then raise exception 'INVALID_LIBRARY_SUMMARY' using errcode='22023'; end if;
  if p_content_kind not in ('article','external_link','file') then raise exception 'INVALID_LIBRARY_KIND' using errcode='22023'; end if;
  if p_content_format not in ('article','video','podcast','guide','tool','course','other') then raise exception 'INVALID_LIBRARY_FORMAT' using errcode='22023'; end if;
  if p_level not in ('introductory','intermediate','advanced','all') then raise exception 'INVALID_LIBRARY_LEVEL' using errcode='22023'; end if;
  if p_estimated_minutes not between 1 and 600 then raise exception 'INVALID_LIBRARY_DURATION' using errcode='22023'; end if;
  if p_source_type not in ('estimulo','partner','external') then raise exception 'INVALID_LIBRARY_SOURCE' using errcode='22023'; end if;
  if length(v_source_name) not between 2 and 120 then raise exception 'INVALID_LIBRARY_SOURCE_NAME' using errcode='22023'; end if;
  if v_language_code!~'^[a-z]{2}(?:-[A-Z]{2})?$' then raise exception 'INVALID_LIBRARY_LANGUAGE' using errcode='22023'; end if;
  if p_visibility not in ('authenticated','organization') then raise exception 'INVALID_LIBRARY_VISIBILITY' using errcode='22023'; end if;
  if cardinality(v_topics)>12 then raise exception 'TOO_MANY_LIBRARY_TOPICS' using errcode='22023'; end if;

  if p_content_kind='article' then
    if v_body is null then raise exception 'LIBRARY_BODY_REQUIRED' using errcode='22023'; end if;
    v_external_url:=null; p_file_object_id:=null;
  elsif p_content_kind='external_link' then
    if v_external_url is null or v_external_url!~'^https://[^[:space:]]+$' then raise exception 'LIBRARY_HTTPS_URL_REQUIRED' using errcode='22023'; end if;
    v_body:=null; p_file_object_id:=null;
  else
    v_body:=null; v_external_url:=null;
    if p_file_object_id is null or not exists(
      select 1 from core.file_objects f where f.id=p_file_object_id and f.owner_organization_id=p_organization_id and f.security_status='clean' and f.deleted_at is null
    ) then raise exception 'LIBRARY_FILE_NOT_AVAILABLE' using errcode='22023'; end if;
  end if;

  if exists(select 1 from unnest(v_journeys) requested(id) where not exists(
    select 1 from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
    where jv.id=requested.id and jd.owner_organization_id=p_organization_id
  )) then raise exception 'LIBRARY_JOURNEY_OUTSIDE_ORGANIZATION' using errcode='42501'; end if;

  v_request:=jsonb_build_object(
    'organization_id',p_organization_id,'library_item_id',v_item_id,'slug',v_slug,'title',v_title,'summary',v_summary,
    'body',v_body,'content_kind',p_content_kind,'content_format',p_content_format,'level',p_level,
    'estimated_minutes',p_estimated_minutes,'source_type',p_source_type,'source_name',v_source_name,
    'external_url',v_external_url,'language_code',v_language_code,'topics',to_jsonb(v_topics),
    'visibility',p_visibility,'journey_version_ids',to_jsonb(v_journeys),
    'discoverable_in_library',coalesce(p_discoverable_in_library,false),'file_object_id',p_file_object_id
  );
  v_request_hash:=app_private.e14_request_hash(v_request);
  v_event_id:=app_private.e14_command_event_id('save_library_content_draft',p_actor_user_account_id,v_item_id,v_key);
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id; return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result); end if;

  select i.slug,exists(select 1 from catalog.library_item_versions published where published.library_item_id=i.id and published.status='published')
    into v_existing_slug,v_has_published from catalog.library_items i where i.id=v_item_id for update;
  if found then
    if (select owner_organization_id from catalog.library_items where id=v_item_id)<>p_organization_id then raise exception 'FORBIDDEN' using errcode='42501'; end if;
    if v_has_published and v_existing_slug<>v_slug then raise exception 'LIBRARY_SLUG_IMMUTABLE' using errcode='22023'; end if;
    update catalog.library_items set code=v_slug,slug=v_slug,updated_at=now() where id=v_item_id;
  else
    insert into catalog.library_items(id,owner_organization_id,code,slug,status,created_by) values(v_item_id,p_organization_id,v_slug,v_slug,'active',p_actor_user_account_id);
  end if;

  select v.id,v.version_number into v_version_id,v_version_number from catalog.library_item_versions v
  where v.library_item_id=v_item_id and v.status='draft' order by v.version_number desc limit 1 for update;
  v_content_hash:=app_private.e14_request_hash(v_request-'organization_id'-'library_item_id');
  if v_version_id is null then
    select coalesce(max(version_number),0)+1 into v_version_number from catalog.library_item_versions where library_item_id=v_item_id;
    v_version_id:=app_private.e14_deterministic_uuid('library:version:'||v_item_id::text||':'||v_version_number::text);
    insert into catalog.library_item_versions(
      id,library_item_id,version_number,status,title,summary,body,content_kind,content_format,level,
      estimated_minutes,source_type,source_name,external_url,language_code,topics,visibility,
      accessibility_metadata,content_hash,created_by,discoverable_in_library,file_object_id
    ) values (
      v_version_id,v_item_id,v_version_number,'draft',v_title,v_summary,v_body,p_content_kind,p_content_format,p_level,
      p_estimated_minutes,p_source_type,v_source_name,v_external_url,v_language_code,v_topics,p_visibility,
      '{}'::jsonb,v_content_hash,p_actor_user_account_id,coalesce(p_discoverable_in_library,false),p_file_object_id
    );
  else
    update catalog.library_item_versions set
      title=v_title,summary=v_summary,body=v_body,content_kind=p_content_kind,content_format=p_content_format,
      level=p_level,estimated_minutes=p_estimated_minutes,source_type=p_source_type,source_name=v_source_name,
      external_url=v_external_url,language_code=v_language_code,topics=v_topics,visibility=p_visibility,
      accessibility_metadata='{}'::jsonb,content_hash=v_content_hash,
      discoverable_in_library=coalesce(p_discoverable_in_library,false),file_object_id=p_file_object_id
    where id=v_version_id and status='draft';
  end if;

  delete from catalog.library_item_journey_links where library_item_version_id=v_version_id;
  insert into catalog.library_item_journey_links(library_item_version_id,journey_version_id,relation_type)
    select v_version_id,id,'supplemental' from unnest(v_journeys) id on conflict do nothing;
  v_result:=jsonb_build_object(
    'library_item_id',v_item_id,'library_item_version_id',v_version_id,'version_number',v_version_number,
    'status','draft','slug',v_slug,'content_hash',v_content_hash,'journey_link_count',cardinality(v_journeys),
    'discoverable_in_library',coalesce(p_discoverable_in_library,false),'file_object_id',p_file_object_id
  );
  perform app_private.e14_append_event(v_event_id,'catalog.library_content.draft_saved','library_content',v_version_id,'user',p_actor_user_account_id,p_organization_id,null,'library_item',v_item_id,v_version_number,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;

create or replace function public.list_operator_library_content(p_actor_user_account_id uuid,p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog'
as $function$
declare v_items jsonb; v_journeys jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'library_item_id',i.id,'code',i.code,'slug',i.slug,'item_status',i.status,
    'library_item_version_id',v.id,'version_number',v.version_number,'status',v.status,
    'title',v.title,'summary',v.summary,'body',v.body,'content_kind',v.content_kind,
    'content_format',v.content_format,'level',v.level,'estimated_minutes',v.estimated_minutes,
    'source_type',v.source_type,'source_name',v.source_name,'external_url',v.external_url,
    'language_code',v.language_code,'topics',v.topics,'visibility',v.visibility,
    'discoverable_in_library',v.discoverable_in_library,'file_object_id',v.file_object_id,
    'original_filename',f.original_filename,'file_content_type',f.content_type,'file_size_bytes',f.size_bytes,
    'content_hash',v.content_hash,'published_at',v.published_at,
    'journey_version_ids',coalesce((select jsonb_agg(l.journey_version_id order by l.journey_version_id) from catalog.library_item_journey_links l where l.library_item_version_id=v.id),'[]'::jsonb)
  ) order by i.updated_at desc,v.version_number desc),'[]'::jsonb) into v_items
  from catalog.library_items i
  join catalog.library_item_versions v on v.library_item_id=i.id
  left join core.file_objects f on f.id=v.file_object_id
  where i.owner_organization_id=p_organization_id;
  select coalesce(jsonb_agg(jsonb_build_object('journey_version_id',jv.id,'title',jv.title,'version_number',jv.version_number,'status',jv.status) order by jv.title,jv.version_number desc),'[]'::jsonb) into v_journeys
  from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
  where jd.owner_organization_id=p_organization_id and jv.status in ('draft','published');
  return jsonb_build_object('organization_id',p_organization_id,'items',v_items,'journey_versions',v_journeys);
end;
$function$;

create or replace function public.list_library_content(
  p_actor_user_account_id uuid,p_query text default null,p_topic text default null,
  p_content_format text default null,p_level text default null,p_journey_version_id uuid default null,
  p_limit integer default 24,p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog'
as $function$
declare
  v_query_text text:=nullif(trim(coalesce(p_query,'')),''); v_topic text:=nullif(lower(trim(coalesce(p_topic,''))),'');
  v_format text:=nullif(trim(coalesce(p_content_format,'')),''); v_level text:=nullif(trim(coalesce(p_level,'')),'');
  v_query tsquery; v_items jsonb; v_total integer; v_topics jsonb; v_formats jsonb; v_levels jsonb;
begin
  if not app_private.library_actor_is_active(p_actor_user_account_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_limit<1 or p_limit>100 or p_offset<0 then raise exception 'INVALID_PAGINATION' using errcode='22023'; end if;
  if v_format is not null and v_format not in ('article','video','podcast','guide','tool','course','other') then raise exception 'INVALID_LIBRARY_FORMAT' using errcode='22023'; end if;
  if v_level is not null and v_level not in ('introductory','intermediate','advanced','all') then raise exception 'INVALID_LIBRARY_LEVEL' using errcode='22023'; end if;
  if v_query_text is not null then v_query:=websearch_to_tsquery('pg_catalog.portuguese'::regconfig,v_query_text); end if;
  with visible as (
    select i.id library_item_id,i.slug,i.owner_organization_id,v.id library_item_version_id,v.version_number,
      v.title,v.summary,v.content_kind,v.content_format,v.level,v.estimated_minutes,v.source_type,v.source_name,
      v.language_code,v.topics,v.visibility,v.published_at,v.file_object_id,f.original_filename,
      case when v_query is null then 0::real else ts_rank_cd(v.search_document,v_query) end rank,
      coalesce((select jsonb_agg(jsonb_build_object('journey_version_id',l.journey_version_id,'relation_type',l.relation_type,'journey_title',jv.title) order by jv.title) from catalog.library_item_journey_links l join catalog.journey_versions jv on jv.id=l.journey_version_id where l.library_item_version_id=v.id),'[]'::jsonb) journeys
    from catalog.library_items i join catalog.library_item_versions v on v.library_item_id=i.id
    left join core.file_objects f on f.id=v.file_object_id
    where i.status='active' and v.status='published' and v.discoverable_in_library
      and app_private.library_actor_can_view(p_actor_user_account_id,i.owner_organization_id,v.visibility)
      and (v_query is null or v.search_document@@v_query)
      and (v_topic is null or v_topic=any(v.topics)) and (v_format is null or v.content_format=v_format)
      and (v_level is null or v.level=v_level)
      and (p_journey_version_id is null or exists(select 1 from catalog.library_item_journey_links l where l.library_item_version_id=v.id and l.journey_version_id=p_journey_version_id))
  ), counted as (
    select visible.*,count(*) over() total_count from visible order by rank desc,published_at desc,title limit p_limit offset p_offset
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'library_item_id',library_item_id,'library_item_version_id',library_item_version_id,'slug',slug,
    'version_number',version_number,'title',title,'summary',summary,'content_kind',content_kind,
    'content_format',content_format,'level',level,'estimated_minutes',estimated_minutes,'source_type',source_type,
    'source_name',source_name,'language_code',language_code,'topics',topics,'visibility',visibility,
    'published_at',published_at,'journeys',journeys,'rank',rank,'file_object_id',file_object_id,
    'original_filename',original_filename
  ) order by rank desc,published_at desc,title),'[]'::jsonb),coalesce(max(total_count),0)::integer into v_items,v_total from counted;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_topics from (select distinct unnest(v.topics) value from catalog.library_items i join catalog.library_item_versions v on v.library_item_id=i.id where i.status='active' and v.status='published' and v.discoverable_in_library and app_private.library_actor_can_view(p_actor_user_account_id,i.owner_organization_id,v.visibility)) facets;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_formats from (select distinct v.content_format value from catalog.library_items i join catalog.library_item_versions v on v.library_item_id=i.id where i.status='active' and v.status='published' and v.discoverable_in_library and app_private.library_actor_can_view(p_actor_user_account_id,i.owner_organization_id,v.visibility)) facets;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_levels from (select distinct v.level value from catalog.library_items i join catalog.library_item_versions v on v.library_item_id=i.id where i.status='active' and v.status='published' and v.discoverable_in_library and app_private.library_actor_can_view(p_actor_user_account_id,i.owner_organization_id,v.visibility)) facets;
  return jsonb_build_object('items',v_items,'total',v_total,'limit',p_limit,'offset',p_offset,'facets',jsonb_build_object('topics',v_topics,'formats',v_formats,'levels',v_levels));
end;
$function$;

create or replace function public.get_library_content(p_actor_user_account_id uuid,p_slug text)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog'
as $function$
declare v_result jsonb; v_entrepreneur_id uuid;
begin
  if not app_private.library_actor_is_active(p_actor_user_account_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  v_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  select jsonb_build_object(
    'library_item_id',i.id,'library_item_version_id',v.id,'slug',i.slug,'version_number',v.version_number,
    'title',v.title,'summary',v.summary,'body',v.body,'content_kind',v.content_kind,'content_format',v.content_format,
    'level',v.level,'estimated_minutes',v.estimated_minutes,'source_type',v.source_type,'source_name',v.source_name,
    'language_code',v.language_code,'topics',v.topics,'visibility',v.visibility,'accessibility_metadata',v.accessibility_metadata,
    'published_at',v.published_at,'has_external_link',v.external_url is not null,'has_file',v.file_object_id is not null,
    'file_object_id',v.file_object_id,'original_filename',f.original_filename,
    'journeys',coalesce((select jsonb_agg(jsonb_build_object('journey_version_id',l.journey_version_id,'relation_type',l.relation_type,'journey_title',jv.title) order by jv.title) from catalog.library_item_journey_links l join catalog.journey_versions jv on jv.id=l.journey_version_id where l.library_item_version_id=v.id),'[]'::jsonb)
  ) into v_result
  from catalog.library_items i join catalog.library_item_versions v on v.library_item_id=i.id
  left join core.file_objects f on f.id=v.file_object_id
  where i.slug=trim(lower(p_slug)) and i.status='active' and v.status='published'
    and app_private.library_actor_can_view(p_actor_user_account_id,i.owner_organization_id,v.visibility)
    and (
      v.discoverable_in_library
      or exists(
        select 1 from catalog.library_item_journey_links l
        join orchestration.enrollments en on en.journey_version_id=l.journey_version_id
        where l.library_item_version_id=v.id and en.entrepreneur_id=v_entrepreneur_id
          and en.status in ('assigned','active','paused','completed')
      )
    )
  order by v.version_number desc limit 1;
  if v_result is null then raise exception 'LIBRARY_CONTENT_NOT_FOUND' using errcode='P0002'; end if;
  return v_result;
end;
$function$;

create or replace function public.get_library_file_download(
  p_actor_user_account_id uuid,p_library_item_version_id uuid
) returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog'
as $function$
declare v_result jsonb; v_entrepreneur_id uuid;
begin
  if not app_private.library_actor_is_active(p_actor_user_account_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  v_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  select jsonb_build_object('bucket',f.bucket,'object_key',f.object_key,'filename',coalesce(f.original_filename,'conteudo'),'content_type',f.content_type)
  into v_result
  from catalog.library_item_versions v join catalog.library_items i on i.id=v.library_item_id
  join core.file_objects f on f.id=v.file_object_id
  where v.id=p_library_item_version_id and v.status='published' and i.status='active'
    and f.security_status='clean' and f.deleted_at is null
    and app_private.library_actor_can_view(p_actor_user_account_id,i.owner_organization_id,v.visibility)
    and (
      v.discoverable_in_library
      or exists(
        select 1 from catalog.library_item_journey_links l
        join orchestration.enrollments en on en.journey_version_id=l.journey_version_id
        where l.library_item_version_id=v.id and en.entrepreneur_id=v_entrepreneur_id
          and en.status in ('assigned','active','paused','completed')
      )
    );
  if v_result is null then raise exception 'LIBRARY_FILE_NOT_FOUND' using errcode='P0002'; end if;
  return v_result;
end;
$function$;

revoke all on function public.create_library_upload_intent(uuid,uuid,text,text,text,text,text) from public;
revoke all on function public.confirm_library_upload(uuid,uuid,uuid,text,bigint,text,text,text,jsonb,text) from public;
revoke all on function public.abort_library_upload(uuid,uuid,uuid,text,text) from public;
revoke all on function public.save_library_content_draft(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text,text,text,text,text[],text,uuid[],boolean,uuid,text) from public;
revoke all on function public.get_library_file_download(uuid,uuid) from public;

grant execute on function public.create_library_upload_intent(uuid,uuid,text,text,text,text,text) to authenticated,service_role;
grant execute on function public.confirm_library_upload(uuid,uuid,uuid,text,bigint,text,text,text,jsonb,text) to authenticated,service_role;
grant execute on function public.abort_library_upload(uuid,uuid,uuid,text,text) to authenticated,service_role;
grant execute on function public.save_library_content_draft(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text,text,text,text,text[],text,uuid[],boolean,uuid,text) to authenticated,service_role;
grant execute on function public.get_library_file_download(uuid,uuid) to authenticated,service_role;