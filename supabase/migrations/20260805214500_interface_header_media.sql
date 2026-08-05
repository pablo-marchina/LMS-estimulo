begin;

insert into core.file_upload_profiles(
  code,
  allowed_mime_types,
  allowed_extensions,
  max_size_bytes,
  retention_class,
  status
)
values (
  'interface_media_v1',
  array['image/png','image/jpeg','image/webp'],
  array['png','jpg','jpeg','webp'],
  8388608,
  'interface_media',
  'active'
)
on conflict (code) do update set
  allowed_mime_types = excluded.allowed_mime_types,
  allowed_extensions = excluded.allowed_extensions,
  max_size_bytes = excluded.max_size_bytes,
  retention_class = excluded.retention_class,
  status = 'active';

create or replace function public.create_interface_media_upload_intent(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_original_filename text,
  p_expected_content_type text,
  p_storage_provider text,
  p_bucket text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_filename text := app_private.safe_object_filename(p_original_filename);
  v_content_type text := lower(btrim(coalesce(p_expected_content_type, '')));
  v_profile core.file_upload_profiles%rowtype;
  v_extension text;
  v_intent_id uuid := app_private.e14_deterministic_uuid(
    'interface-media-upload:' || p_actor_user_account_id::text || ':' || v_key
  );
  v_object_key text;
  v_event_id uuid := app_private.e14_command_event_id(
    'create_interface_media_upload_intent',
    p_actor_user_account_id,
    p_organization_id,
    v_key
  );
  v_request_hash text;
  v_snapshot jsonb;
begin
  if not (
    app_private.e14_actor_has_permission(p_actor_user_account_id, p_organization_id, 'interface.content.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id, p_organization_id, 'journey.definition.manage')
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_storage_provider not in ('supabase_storage', 's3') then
    raise exception 'INTERFACE_MEDIA_STORAGE_PROVIDER_UNSUPPORTED' using errcode = '22023';
  end if;
  if nullif(btrim(p_bucket), '') is null then
    raise exception 'INTERFACE_MEDIA_BUCKET_REQUIRED' using errcode = '22023';
  end if;

  select * into v_profile
  from core.file_upload_profiles
  where code = 'interface_media_v1' and status = 'active';
  if not found then
    raise exception 'INTERFACE_MEDIA_UPLOAD_PROFILE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not v_content_type = any(v_profile.allowed_mime_types) then
    raise exception 'INTERFACE_MEDIA_CONTENT_TYPE_NOT_ALLOWED' using errcode = '22023';
  end if;
  v_extension := lower(reverse(split_part(reverse(v_filename), '.', 1)));
  if v_extension = v_filename or not v_extension = any(v_profile.allowed_extensions) then
    raise exception 'INTERFACE_MEDIA_EXTENSION_NOT_ALLOWED' using errcode = '22023';
  end if;

  v_request_hash := app_private.e14_request_hash(jsonb_build_object(
    'organization_id', p_organization_id,
    'filename', v_filename,
    'content_type', v_content_type,
    'storage_provider', p_storage_provider,
    'bucket', btrim(p_bucket)
  ));

  if app_private.e14_assert_idempotency(v_event_id, v_request_hash) then
    select event.payload -> 'result' into v_snapshot
    from eventing.events event where event.event_id = v_event_id;
    return jsonb_build_object(
      'request_id', v_event_id,
      'idempotency_key', v_key,
      'replayed', true,
      'data', v_snapshot
    );
  end if;

  v_object_key := 'private/' || p_organization_id::text || '/interface/' || v_intent_id::text || '/' || v_filename;

  insert into core.file_upload_intents(
    id,
    owner_organization_id,
    requested_by_user_account_id,
    requested_by_entrepreneur_id,
    upload_profile_code,
    storage_provider,
    bucket,
    object_key,
    original_filename,
    expected_content_type,
    max_size_bytes,
    retention_class,
    status,
    expires_at
  ) values (
    v_intent_id,
    p_organization_id,
    p_actor_user_account_id,
    null,
    v_profile.code,
    p_storage_provider,
    btrim(p_bucket),
    v_object_key,
    v_filename,
    v_content_type,
    v_profile.max_size_bytes,
    v_profile.retention_class,
    'pending_upload',
    now() + interval '30 minutes'
  );

  v_snapshot := jsonb_build_object(
    'upload_intent_id', v_intent_id,
    'bucket', btrim(p_bucket),
    'object_key', v_object_key,
    'original_filename', v_filename,
    'expected_content_type', v_content_type,
    'max_size_bytes', v_profile.max_size_bytes,
    'expires_at', now() + interval '30 minutes'
  );

  perform app_private.e14_append_event(
    v_event_id,
    'experience.interface_media.upload_requested',
    'interface_media_upload',
    v_intent_id,
    'user_account',
    p_actor_user_account_id,
    p_organization_id,
    null,
    'file_upload_intent',
    v_intent_id,
    1,
    v_event_id,
    null,
    jsonb_build_object('request_hash', v_request_hash, 'result', v_snapshot)
  );

  return jsonb_build_object(
    'request_id', v_event_id,
    'idempotency_key', v_key,
    'replayed', false,
    'data', v_snapshot
  );
end;
$function$;

create or replace function public.confirm_interface_media_upload(
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
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid := app_private.e14_command_event_id(
    'confirm_interface_media_upload',
    p_actor_user_account_id,
    p_upload_intent_id,
    v_key
  );
  v_request_hash text;
  v_intent core.file_upload_intents%rowtype;
  v_file_id uuid := app_private.e14_deterministic_uuid('interface-media-file:' || p_upload_intent_id::text);
  v_result jsonb;
begin
  if not (
    app_private.e14_actor_has_permission(p_actor_user_account_id, p_organization_id, 'interface.content.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id, p_organization_id, 'journey.definition.manage')
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_actual_size_bytes < 1 then
    raise exception 'INTERFACE_MEDIA_FILE_SIZE_INVALID' using errcode = '22023';
  end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'INTERFACE_MEDIA_SHA256_INVALID' using errcode = '22023';
  end if;

  v_request_hash := app_private.e14_request_hash(jsonb_build_object(
    'organization_id', p_organization_id,
    'upload_intent_id', p_upload_intent_id,
    'content_type', lower(btrim(p_actual_content_type)),
    'size_bytes', p_actual_size_bytes,
    'sha256', p_sha256,
    'provider_object_version', p_provider_object_version,
    'etag', p_etag
  ));

  if app_private.e14_assert_idempotency(v_event_id, v_request_hash) then
    select event.payload -> 'result' into v_result
    from eventing.events event where event.event_id = v_event_id;
    return jsonb_build_object(
      'request_id', v_event_id,
      'idempotency_key', v_key,
      'replayed', true,
      'data', v_result
    );
  end if;

  select * into v_intent
  from core.file_upload_intents
  where id = p_upload_intent_id
    and owner_organization_id = p_organization_id
    and requested_by_user_account_id = p_actor_user_account_id
    and upload_profile_code = 'interface_media_v1'
  for update;

  if not found then
    raise exception 'INTERFACE_MEDIA_UPLOAD_INTENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_intent.status <> 'pending_upload' or v_intent.expires_at <= now() then
    raise exception 'INTERFACE_MEDIA_UPLOAD_INTENT_EXPIRED' using errcode = '55000';
  end if;
  if lower(btrim(p_actual_content_type)) <> v_intent.expected_content_type then
    raise exception 'INTERFACE_MEDIA_CONTENT_TYPE_MISMATCH' using errcode = '22023';
  end if;
  if p_actual_size_bytes > v_intent.max_size_bytes then
    raise exception 'INTERFACE_MEDIA_FILE_TOO_LARGE' using errcode = '22023';
  end if;

  insert into core.file_objects(
    id,
    owner_organization_id,
    storage_provider,
    bucket,
    object_key,
    content_type,
    size_bytes,
    sha256,
    security_status,
    retention_class,
    upload_intent_id,
    created_by_user_account_id,
    original_filename,
    provider_object_version,
    etag,
    verified_at,
    quarantined_at,
    released_at,
    metadata
  ) values (
    v_file_id,
    p_organization_id,
    v_intent.storage_provider,
    v_intent.bucket,
    v_intent.object_key,
    lower(btrim(p_actual_content_type)),
    p_actual_size_bytes,
    p_sha256,
    'clean',
    v_intent.retention_class,
    v_intent.id,
    p_actor_user_account_id,
    v_intent.original_filename,
    nullif(btrim(p_provider_object_version), ''),
    nullif(btrim(p_etag), ''),
    now(),
    null,
    now(),
    coalesce(p_metadata, '{}'::jsonb)
  ) on conflict (id) do nothing;

  update core.file_upload_intents
  set status = 'confirmed',
      uploaded_at = now(),
      confirmed_at = now(),
      file_object_id = v_file_id,
      updated_at = now()
  where id = v_intent.id;

  v_result := jsonb_build_object(
    'file_object_id', v_file_id,
    'original_filename', v_intent.original_filename,
    'content_type', lower(btrim(p_actual_content_type)),
    'size_bytes', p_actual_size_bytes,
    'bucket', v_intent.bucket,
    'object_key', v_intent.object_key,
    'security_status', 'clean'
  );

  perform app_private.e14_append_event(
    v_event_id,
    'experience.interface_media.upload_confirmed',
    'interface_media',
    v_file_id,
    'user_account',
    p_actor_user_account_id,
    p_organization_id,
    null,
    'file_object',
    v_file_id,
    1,
    v_event_id,
    null,
    jsonb_build_object('request_hash', v_request_hash, 'result', v_result)
  );

  return jsonb_build_object(
    'request_id', v_event_id,
    'idempotency_key', v_key,
    'replayed', false,
    'data', v_result
  );
end;
$function$;

create or replace function public.get_interface_media_download(
  p_actor_user_account_id uuid,
  p_file_object_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_file core.file_objects%rowtype;
  v_allowed boolean := false;
begin
  select * into v_file
  from core.file_objects
  where id = p_file_object_id
    and retention_class = 'interface_media'
    and security_status = 'clean'
    and deleted_at is null;

  if not found then
    raise exception 'INTERFACE_MEDIA_NOT_FOUND' using errcode = 'P0002';
  end if;

  if app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    v_file.owner_organization_id,
    'interface.content.manage'
  ) or app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    v_file.owner_organization_id,
    'journey.definition.manage'
  ) then
    v_allowed := true;
  end if;

  if not v_allowed and app_private.e14_entrepreneur_for_account(p_actor_user_account_id) is not null then
    v_allowed := true;
  end if;

  if not v_allowed then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'file_object_id', v_file.id,
    'bucket', v_file.bucket,
    'object_key', v_file.object_key,
    'content_type', v_file.content_type,
    'original_filename', v_file.original_filename
  );
end;
$function$;

insert into experience.interface_content(
  organization_id,
  content_key,
  locale,
  area,
  page,
  element_name,
  element_type,
  description,
  route_pattern,
  placement,
  group_name,
  editor_schema,
  can_delete,
  default_value,
  draft_value,
  published_value,
  is_active,
  updated_by,
  created_at,
  updated_at
)
select
  title.organization_id,
  replace(title.content_key, '.title', '.media'),
  title.locale,
  title.area,
  title.page,
  'Imagem do cabeçalho',
  'image',
  'Imagem responsiva opcional para substituir o fundo padrão do cabeçalho desta página.',
  title.route_pattern,
  'header',
  'Cabeçalho da página',
  jsonb_build_object(
    'desktop_dimensions', '1600 × 480 px',
    'mobile_dimensions', '900 × 600 px',
    'max_size_mb', 8,
    'allowed_types', jsonb_build_array('image/png','image/jpeg','image/webp')
  ),
  false,
  jsonb_build_object(
    'visible', false,
    'order', 0,
    'image_file_object_id', null,
    'mobile_image_file_object_id', null,
    'alt', '',
    'image_position', 'center'
  ),
  null,
  jsonb_build_object(
    'visible', false,
    'order', 0,
    'image_file_object_id', null,
    'mobile_image_file_object_id', null,
    'alt', '',
    'image_position', 'center'
  ),
  true,
  title.updated_by,
  now(),
  now()
from experience.interface_content title
where title.area = 'participant'
  and title.placement = 'header'
  and title.content_key like 'participant.page.%.header.title'
on conflict (organization_id, content_key, locale) do nothing;

revoke all on function public.create_interface_media_upload_intent(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.confirm_interface_media_upload(uuid, uuid, uuid, text, bigint, text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.get_interface_media_download(uuid, uuid) from public, anon, authenticated;

grant execute on function public.create_interface_media_upload_intent(uuid, uuid, text, text, text, text, text) to service_role;
grant execute on function public.confirm_interface_media_upload(uuid, uuid, uuid, text, bigint, text, text, text, jsonb, text) to service_role;
grant execute on function public.get_interface_media_download(uuid, uuid) to service_role;

commit;
