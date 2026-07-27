-- Upload requested is aggregate version 1; confirmation or abort is version 2.

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
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
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
    'user_account',p_actor_user_account_id,p_organization_id,null,'file_upload_intent',p_upload_intent_id,2,
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
  if not found then raise exception 'LIBRARY_UPLOAD_INTENT_NOT_PENDING' using errcode='55000'; end if;
  v_result:=jsonb_build_object('upload_intent_id',p_upload_intent_id,'status','aborted','failure_code',v_code);
  perform app_private.e14_append_event(
    v_event_id,'catalog.library_file.upload_failed','library_upload_intent',p_upload_intent_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,'file_upload_intent',p_upload_intent_id,2,
    v_event_id,null,jsonb_build_object('result',v_result)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;
