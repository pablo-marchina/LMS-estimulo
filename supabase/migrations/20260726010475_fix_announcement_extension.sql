create or replace function public.create_announcement_banner_upload_intent(
  p_actor_user_account_id uuid,p_organization_id uuid,p_original_filename text,p_expected_content_type text,
  p_storage_provider text,p_bucket text,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_filename text:=app_private.safe_object_filename(p_original_filename);
  v_content_type text:=lower(btrim(coalesce(p_expected_content_type,'')));
  v_profile core.file_upload_profiles%rowtype; v_extension text;
  v_intent_id uuid:=app_private.e14_deterministic_uuid('announcement-banner-upload:'||p_actor_user_account_id::text||':'||v_key);
  v_object_key text; v_event_id uuid:=app_private.e14_command_event_id('create_announcement_banner_upload_intent',p_actor_user_account_id,p_organization_id,v_key);
  v_request_hash text; v_snapshot jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_storage_provider not in ('supabase_storage','s3') then raise exception 'ANNOUNCEMENT_STORAGE_PROVIDER_UNSUPPORTED' using errcode='22023'; end if;
  if nullif(btrim(p_bucket),'') is null then raise exception 'ANNOUNCEMENT_STORAGE_BUCKET_REQUIRED' using errcode='22023'; end if;
  select * into v_profile from core.file_upload_profiles where code='announcement_banner_v1' and status='active';
  if not found then raise exception 'ANNOUNCEMENT_UPLOAD_PROFILE_NOT_FOUND' using errcode='P0002'; end if;
  if not v_content_type=any(v_profile.allowed_mime_types) then raise exception 'ANNOUNCEMENT_CONTENT_TYPE_NOT_ALLOWED' using errcode='22023'; end if;
  v_extension:=lower(reverse(split_part(reverse(v_filename),'.',1)));
  if v_extension=v_filename or not v_extension=any(v_profile.allowed_extensions) then raise exception 'ANNOUNCEMENT_FILE_EXTENSION_NOT_ALLOWED' using errcode='22023'; end if;
  v_request_hash:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'filename',v_filename,'content_type',v_content_type,'storage_provider',p_storage_provider,'bucket',btrim(p_bucket)));
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then select event.payload->'result' into v_snapshot from eventing.events event where event.event_id=v_event_id; return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_snapshot); end if;
  v_object_key:='private/'||p_organization_id::text||'/announcements/'||v_intent_id::text||'/'||v_filename;
  insert into core.file_upload_intents(id,owner_organization_id,requested_by_user_account_id,requested_by_entrepreneur_id,upload_profile_code,storage_provider,bucket,object_key,original_filename,expected_content_type,max_size_bytes,retention_class,status,expires_at)
  values(v_intent_id,p_organization_id,p_actor_user_account_id,null,v_profile.code,p_storage_provider,btrim(p_bucket),v_object_key,v_filename,v_content_type,v_profile.max_size_bytes,v_profile.retention_class,'pending_upload',now()+interval '30 minutes');
  v_snapshot:=jsonb_build_object('upload_intent_id',v_intent_id,'bucket',btrim(p_bucket),'object_key',v_object_key,'original_filename',v_filename,'expected_content_type',v_content_type,'max_size_bytes',v_profile.max_size_bytes,'expires_at',now()+interval '30 minutes');
  perform app_private.e14_append_event(v_event_id,'engagement.announcement_banner.upload_requested','announcement_banner_upload',v_intent_id,'user_account',p_actor_user_account_id,p_organization_id,null,'file_upload_intent',v_intent_id,1,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_snapshot));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_snapshot);
end;
$function$;
