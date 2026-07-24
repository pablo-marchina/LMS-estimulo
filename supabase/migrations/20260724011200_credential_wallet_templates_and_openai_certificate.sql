-- Participant credential wallet, governed external certificate uploads,
-- certificate background templates and the OpenAI journey completion certificate.

alter table engagement.certificate_versions
  add column if not exists template_layout jsonb not null default '{"name_y":0.53,"journey_y":0.40,"text_color":"primary"}'::jsonb;

alter table engagement.certificate_versions
  drop constraint if exists certificate_versions_template_layout_object;
alter table engagement.certificate_versions
  add constraint certificate_versions_template_layout_object
  check (jsonb_typeof(template_layout) = 'object');

create table if not exists engagement.external_credentials (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid not null references core.entrepreneurs(id),
  file_object_id uuid not null references core.file_objects(id),
  title text not null check (length(btrim(title)) between 3 and 180),
  issuer text not null check (length(btrim(issuer)) between 2 and 160),
  issued_on date,
  expires_on date,
  verification_url text,
  status text not null default 'active' check (status in ('active','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (entrepreneur_id, file_object_id),
  check (expires_on is null or issued_on is null or expires_on >= issued_on),
  check (verification_url is null or verification_url ~ '^https://[^[:space:]]+$')
);

alter table engagement.external_credentials enable row level security;
revoke all on engagement.external_credentials from anon, authenticated;

insert into core.file_upload_profiles(code,description,allowed_mime_types,allowed_extensions,max_size_bytes,retention_class,status)
values
  ('external_credential_v1','Certificados externos enviados pelo participante',array['application/pdf','image/png','image/jpeg','image/webp'],array['pdf','png','jpg','jpeg','webp'],8388608,'participant_record','active'),
  ('certificate_template_v1','Imagem de fundo para certificado institucional',array['image/jpeg'],array['jpg','jpeg'],10485760,'institutional_template','active')
on conflict (code) do update set
  description=excluded.description,
  allowed_mime_types=excluded.allowed_mime_types,
  allowed_extensions=excluded.allowed_extensions,
  max_size_bytes=excluded.max_size_bytes,
  retention_class=excluded.retention_class,
  status='active',
  updated_at=now();

-- Register audit schemas before any command can append these events.
do $schemas$
declare
  v_name text;
  v_document jsonb;
begin
  foreach v_name in array array[
    'learning.external_credential.upload_requested',
    'learning.external_credential.confirmed',
    'learning.external_credential.upload_failed',
    'engagement.certificate_template.upload_requested',
    'engagement.certificate_template.confirmed',
    'engagement.certificate_template.upload_failed',
    'engagement.certificate_version.configured',
    'engagement.certificate_version.published'
  ] loop
    v_document:=jsonb_build_object(
      '$schema','https://json-schema.org/draft/2020-12/schema',
      'title',v_name,
      'type','object',
      'additionalProperties',true
    );
    insert into eventing.event_schemas(id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at)
    values(
      app_private.e14_deterministic_uuid('event-schema:'||v_name||':1'),
      v_name,1,'urn:estimulo:event:'||v_name||':1',v_document,
      encode(digest(v_document::text,'sha256'),'hex'),'published',now()
    ) on conflict (event_name,event_version) do nothing;
  end loop;
end;
$schemas$;

create or replace function app_private.participant_file_organization(p_entrepreneur_id uuid)
returns uuid
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
  select coalesce(
    (
      select jd.owner_organization_id
      from orchestration.enrollments en
      join catalog.journey_versions jv on jv.id=en.journey_version_id
      join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
      where en.entrepreneur_id=p_entrepreneur_id
        and en.status in ('assigned','active','paused','completed')
      order by en.created_at desc
      limit 1
    ),
    (select id from iam.organizations where slug='estimulo-e14-internal' and status='active' limit 1)
  );
$function$;

create or replace function public.create_external_credential_upload_intent(
  p_actor_user_account_id uuid,
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
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  v_organization_id uuid;
  v_profile core.file_upload_profiles%rowtype;
  v_filename text:=app_private.safe_object_filename(p_original_filename);
  v_content_type text:=lower(btrim(coalesce(p_expected_content_type,'')));
  v_extension text;
  v_intent_id uuid:=app_private.e14_deterministic_uuid('external-credential-intent:'||p_actor_user_account_id::text||':'||v_key);
  v_event_id uuid:=app_private.e14_command_event_id('create_external_credential_upload_intent',p_actor_user_account_id,v_intent_id,v_key);
  v_request_hash text;
  v_snapshot jsonb;
begin
  if v_entrepreneur_id is null then raise exception 'ENTREPRENEUR_PROFILE_REQUIRED' using errcode='42501'; end if;
  if p_storage_provider not in ('supabase_storage','s3') then raise exception 'EXTERNAL_CREDENTIAL_STORAGE_UNSUPPORTED' using errcode='22023'; end if;
  if nullif(btrim(p_bucket),'') is null then raise exception 'EXTERNAL_CREDENTIAL_BUCKET_REQUIRED' using errcode='22023'; end if;
  v_organization_id:=app_private.participant_file_organization(v_entrepreneur_id);
  if v_organization_id is null then raise exception 'FILE_ORGANIZATION_NOT_FOUND' using errcode='P0002'; end if;
  select * into v_profile from core.file_upload_profiles where code='external_credential_v1' and status='active';
  if not found then raise exception 'EXTERNAL_CREDENTIAL_PROFILE_NOT_FOUND' using errcode='P0002'; end if;
  if not v_content_type=any(v_profile.allowed_mime_types) then raise exception 'EXTERNAL_CREDENTIAL_TYPE_NOT_ALLOWED' using errcode='22023'; end if;
  v_extension:=lower(split_part(v_filename,'.',cardinality(string_to_array(v_filename,'.'))));
  if v_extension=v_filename or not v_extension=any(v_profile.allowed_extensions) then raise exception 'EXTERNAL_CREDENTIAL_EXTENSION_NOT_ALLOWED' using errcode='22023'; end if;
  v_request_hash:=app_private.e14_request_hash(jsonb_build_object('filename',v_filename,'content_type',v_content_type,'bucket',btrim(p_bucket)));
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select payload->'result' into v_snapshot from eventing.events where event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_snapshot);
  end if;
  insert into core.file_upload_intents(id,owner_organization_id,requested_by_user_account_id,requested_by_entrepreneur_id,upload_profile_code,storage_provider,bucket,object_key,original_filename,expected_content_type,max_size_bytes,retention_class,status,expires_at)
  values(v_intent_id,v_organization_id,p_actor_user_account_id,v_entrepreneur_id,v_profile.code,p_storage_provider,btrim(p_bucket),'private/'||v_organization_id::text||'/external-credentials/'||v_intent_id::text||'/'||v_filename,v_filename,v_content_type,v_profile.max_size_bytes,v_profile.retention_class,'pending_upload',now()+interval '30 minutes');
  select jsonb_build_object('upload_intent_id',id,'bucket',bucket,'object_key',object_key,'original_filename',original_filename,'expected_content_type',expected_content_type,'max_size_bytes',max_size_bytes,'expires_at',expires_at) into v_snapshot from core.file_upload_intents where id=v_intent_id;
  perform app_private.e14_append_event(v_event_id,'learning.external_credential.upload_requested','external_credential_upload',v_intent_id,'user_account',p_actor_user_account_id,v_organization_id,null,'file_upload_intent',v_intent_id,1,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_snapshot));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_snapshot);
end;
$function$;

create or replace function public.confirm_external_credential_upload(
  p_actor_user_account_id uuid,
  p_upload_intent_id uuid,
  p_title text,
  p_issuer text,
  p_issued_on date,
  p_expires_on date,
  p_verification_url text,
  p_actual_content_type text,
  p_actual_size_bytes bigint,
  p_sha256 text,
  p_provider_object_version text,
  p_etag text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  v_intent core.file_upload_intents%rowtype;
  v_file_id uuid:=app_private.e14_deterministic_uuid('external-credential-file:'||p_upload_intent_id::text);
  v_credential_id uuid:=app_private.e14_deterministic_uuid('external-credential:'||p_upload_intent_id::text);
  v_event_id uuid:=app_private.e14_command_event_id('confirm_external_credential_upload',p_actor_user_account_id,v_credential_id,v_key);
  v_request_hash text;
  v_result jsonb;
begin
  if v_entrepreneur_id is null then raise exception 'ENTREPRENEUR_PROFILE_REQUIRED' using errcode='42501'; end if;
  if length(btrim(coalesce(p_title,''))) not between 3 and 180 then raise exception 'EXTERNAL_CREDENTIAL_TITLE_INVALID' using errcode='22023'; end if;
  if length(btrim(coalesce(p_issuer,''))) not between 2 and 160 then raise exception 'EXTERNAL_CREDENTIAL_ISSUER_INVALID' using errcode='22023'; end if;
  if p_verification_url is not null and btrim(p_verification_url)<>'' and btrim(p_verification_url)!~'^https://[^[:space:]]+$' then raise exception 'EXTERNAL_CREDENTIAL_URL_INVALID' using errcode='22023'; end if;
  if p_sha256!~'^[a-f0-9]{64}$' then raise exception 'EXTERNAL_CREDENTIAL_SHA_INVALID' using errcode='22023'; end if;
  select * into v_intent from core.file_upload_intents where id=p_upload_intent_id for update;
  if not found or v_intent.requested_by_user_account_id<>p_actor_user_account_id or v_intent.requested_by_entrepreneur_id is distinct from v_entrepreneur_id or v_intent.upload_profile_code<>'external_credential_v1' then raise exception 'EXTERNAL_CREDENTIAL_INTENT_NOT_FOUND' using errcode='P0002'; end if;
  v_request_hash:=app_private.e14_request_hash(jsonb_build_object('intent_id',p_upload_intent_id,'title',btrim(p_title),'issuer',btrim(p_issuer),'issued_on',p_issued_on,'expires_on',p_expires_on,'verification_url',nullif(btrim(coalesce(p_verification_url,'')),''),'content_type',lower(btrim(p_actual_content_type)),'size',p_actual_size_bytes,'sha256',p_sha256));
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select payload->'result' into v_result from eventing.events where event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;
  if v_intent.status<>'pending_upload' or v_intent.expires_at<=now() then raise exception 'EXTERNAL_CREDENTIAL_INTENT_EXPIRED' using errcode='55000'; end if;
  if lower(btrim(p_actual_content_type))<>v_intent.expected_content_type or p_actual_size_bytes<1 or p_actual_size_bytes>v_intent.max_size_bytes then raise exception 'EXTERNAL_CREDENTIAL_FILE_INVALID' using errcode='22023'; end if;
  insert into core.file_objects(id,owner_organization_id,storage_provider,bucket,object_key,content_type,size_bytes,sha256,security_status,retention_class,upload_intent_id,created_by_user_account_id,original_filename,provider_object_version,etag,verified_at,released_at,metadata)
  values(v_file_id,v_intent.owner_organization_id,v_intent.storage_provider,v_intent.bucket,v_intent.object_key,lower(btrim(p_actual_content_type)),p_actual_size_bytes,p_sha256,'clean',v_intent.retention_class,v_intent.id,p_actor_user_account_id,v_intent.original_filename,nullif(btrim(coalesce(p_provider_object_version,'')),''),nullif(btrim(coalesce(p_etag,'')),''),now(),now(),jsonb_build_object('category','external_credential'));
  insert into engagement.external_credentials(id,entrepreneur_id,file_object_id,title,issuer,issued_on,expires_on,verification_url)
  values(v_credential_id,v_entrepreneur_id,v_file_id,btrim(p_title),btrim(p_issuer),p_issued_on,p_expires_on,nullif(btrim(coalesce(p_verification_url,'')),''));
  update core.file_upload_intents set status='confirmed',uploaded_at=now(),confirmed_at=now(),file_object_id=v_file_id where id=v_intent.id;
  v_result:=jsonb_build_object('external_credential_id',v_credential_id,'file_object_id',v_file_id,'title',btrim(p_title),'issuer',btrim(p_issuer),'original_filename',v_intent.original_filename,'status','active');
  perform app_private.e14_append_event(v_event_id,'learning.external_credential.confirmed','external_credential',v_credential_id,'user_account',p_actor_user_account_id,v_intent.owner_organization_id,null,'external_credential',v_credential_id,1,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;

create or replace function public.abort_external_credential_upload(p_actor_user_account_id uuid,p_upload_intent_id uuid,p_failure_code text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare v_intent core.file_upload_intents%rowtype; v_event_id uuid; v_result jsonb; begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  select * into v_intent from core.file_upload_intents where id=p_upload_intent_id for update;
  if not found or v_intent.requested_by_user_account_id<>p_actor_user_account_id or v_intent.upload_profile_code<>'external_credential_v1' then raise exception 'EXTERNAL_CREDENTIAL_INTENT_NOT_FOUND' using errcode='P0002'; end if;
  update core.file_upload_intents set status='aborted',aborted_at=now(),failure_code=left(coalesce(nullif(btrim(p_failure_code),''),'upload_failed'),120) where id=p_upload_intent_id and status='pending_upload';
  v_result:=jsonb_build_object('upload_intent_id',p_upload_intent_id,'status','aborted');
  v_event_id:=app_private.e14_command_event_id('abort_external_credential_upload',p_actor_user_account_id,p_upload_intent_id,p_idempotency_key);
  perform app_private.e14_append_event(v_event_id,'learning.external_credential.upload_failed','external_credential_upload',p_upload_intent_id,'user_account',p_actor_user_account_id,v_intent.owner_organization_id,null,'file_upload_intent',p_upload_intent_id,2,v_event_id,null,jsonb_build_object('result',v_result,'failure_code',p_failure_code));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',p_idempotency_key,'replayed',false,'data',v_result);
end;$function$;

create or replace function public.list_participant_external_credentials(p_actor_user_account_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
declare v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id); v_items jsonb; begin
  if v_entrepreneur_id is null then return jsonb_build_object('items','[]'::jsonb); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',ec.id,'title',ec.title,'issuer',ec.issuer,'issued_on',ec.issued_on,'expires_on',ec.expires_on,'verification_url',ec.verification_url,'status',ec.status,'original_filename',fo.original_filename,'content_type',fo.content_type,'size_bytes',fo.size_bytes,'created_at',ec.created_at) order by ec.created_at desc),'[]'::jsonb) into v_items
  from engagement.external_credentials ec join core.file_objects fo on fo.id=ec.file_object_id where ec.entrepreneur_id=v_entrepreneur_id and ec.status='active';
  return jsonb_build_object('entrepreneur_id',v_entrepreneur_id,'items',v_items);
end;$function$;

create or replace function public.get_external_credential_download(p_actor_user_account_id uuid,p_external_credential_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
declare v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id); v_result jsonb; begin
  select jsonb_build_object('bucket',fo.bucket,'object_key',fo.object_key,'filename',coalesce(fo.original_filename,ec.title||'.pdf'),'content_type',fo.content_type)
  into v_result from engagement.external_credentials ec join core.file_objects fo on fo.id=ec.file_object_id
  where ec.id=p_external_credential_id and ec.entrepreneur_id=v_entrepreneur_id and ec.status='active' and fo.security_status='clean' and fo.deleted_at is null;
  if v_result is null then raise exception 'EXTERNAL_CREDENTIAL_NOT_FOUND' using errcode='P0002'; end if;
  return v_result;
end;$function$;

create or replace function public.create_certificate_template_upload_intent(p_actor_user_account_id uuid,p_organization_id uuid,p_original_filename text,p_expected_content_type text,p_storage_provider text,p_bucket text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key); v_profile core.file_upload_profiles%rowtype; v_filename text:=app_private.safe_object_filename(p_original_filename); v_type text:=lower(btrim(p_expected_content_type)); v_ext text; v_intent_id uuid:=app_private.e14_deterministic_uuid('certificate-template-intent:'||p_actor_user_account_id::text||':'||v_key); v_event_id uuid:=app_private.e14_command_event_id('create_certificate_template_upload_intent',p_actor_user_account_id,v_intent_id,v_key); v_snapshot jsonb; v_hash text; begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into v_profile from core.file_upload_profiles where code='certificate_template_v1' and status='active';
  if not found or not v_type=any(v_profile.allowed_mime_types) then raise exception 'CERTIFICATE_TEMPLATE_TYPE_NOT_ALLOWED' using errcode='22023'; end if;
  v_ext:=lower(split_part(v_filename,'.',cardinality(string_to_array(v_filename,'.')))); if not v_ext=any(v_profile.allowed_extensions) then raise exception 'CERTIFICATE_TEMPLATE_EXTENSION_NOT_ALLOWED' using errcode='22023'; end if;
  v_hash:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'filename',v_filename,'content_type',v_type));
  if app_private.e14_assert_idempotency(v_event_id,v_hash) then select payload->'result' into v_snapshot from eventing.events where event_id=v_event_id; return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_snapshot); end if;
  insert into core.file_upload_intents(id,owner_organization_id,requested_by_user_account_id,upload_profile_code,storage_provider,bucket,object_key,original_filename,expected_content_type,max_size_bytes,retention_class,status,expires_at)
  values(v_intent_id,p_organization_id,p_actor_user_account_id,v_profile.code,p_storage_provider,btrim(p_bucket),'private/'||p_organization_id::text||'/certificate-templates/'||v_intent_id::text||'/'||v_filename,v_filename,v_type,v_profile.max_size_bytes,v_profile.retention_class,'pending_upload',now()+interval '30 minutes');
  select jsonb_build_object('upload_intent_id',id,'bucket',bucket,'object_key',object_key,'original_filename',original_filename,'expected_content_type',expected_content_type,'max_size_bytes',max_size_bytes) into v_snapshot from core.file_upload_intents where id=v_intent_id;
  perform app_private.e14_append_event(v_event_id,'engagement.certificate_template.upload_requested','certificate_template_upload',v_intent_id,'user_account',p_actor_user_account_id,p_organization_id,null,'file_upload_intent',v_intent_id,1,v_event_id,null,jsonb_build_object('request_hash',v_hash,'result',v_snapshot));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_snapshot);
end;$function$;

create or replace function public.confirm_certificate_template_upload(p_actor_user_account_id uuid,p_organization_id uuid,p_upload_intent_id uuid,p_actual_content_type text,p_actual_size_bytes bigint,p_sha256 text,p_provider_object_version text,p_etag text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key); v_intent core.file_upload_intents%rowtype; v_file_id uuid:=app_private.e14_deterministic_uuid('certificate-template-file:'||p_upload_intent_id::text); v_event_id uuid:=app_private.e14_command_event_id('confirm_certificate_template_upload',p_actor_user_account_id,v_file_id,v_key); v_hash text; v_result jsonb; begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into v_intent from core.file_upload_intents where id=p_upload_intent_id for update;
  if not found or v_intent.owner_organization_id<>p_organization_id or v_intent.requested_by_user_account_id<>p_actor_user_account_id or v_intent.upload_profile_code<>'certificate_template_v1' then raise exception 'CERTIFICATE_TEMPLATE_INTENT_NOT_FOUND' using errcode='P0002'; end if;
  if v_intent.status<>'pending_upload' or v_intent.expires_at<=now() or lower(btrim(p_actual_content_type))<>v_intent.expected_content_type or p_actual_size_bytes<1 or p_actual_size_bytes>v_intent.max_size_bytes or p_sha256!~'^[a-f0-9]{64}$' then raise exception 'CERTIFICATE_TEMPLATE_FILE_INVALID' using errcode='22023'; end if;
  v_hash:=app_private.e14_request_hash(jsonb_build_object('intent_id',p_upload_intent_id,'size',p_actual_size_bytes,'sha256',p_sha256));
  if app_private.e14_assert_idempotency(v_event_id,v_hash) then select payload->'result' into v_result from eventing.events where event_id=v_event_id; return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result); end if;
  insert into core.file_objects(id,owner_organization_id,storage_provider,bucket,object_key,content_type,size_bytes,sha256,security_status,retention_class,upload_intent_id,created_by_user_account_id,original_filename,provider_object_version,etag,verified_at,released_at,metadata)
  values(v_file_id,p_organization_id,v_intent.storage_provider,v_intent.bucket,v_intent.object_key,lower(btrim(p_actual_content_type)),p_actual_size_bytes,p_sha256,'clean',v_intent.retention_class,v_intent.id,p_actor_user_account_id,v_intent.original_filename,nullif(btrim(coalesce(p_provider_object_version,'')),''),nullif(btrim(coalesce(p_etag,'')),''),now(),now(),jsonb_build_object('category','certificate_template'));
  update core.file_upload_intents set status='confirmed',uploaded_at=now(),confirmed_at=now(),file_object_id=v_file_id where id=v_intent.id;
  v_result:=jsonb_build_object('file_object_id',v_file_id,'original_filename',v_intent.original_filename,'status','clean');
  perform app_private.e14_append_event(v_event_id,'engagement.certificate_template.confirmed','certificate_template',v_file_id,'user_account',p_actor_user_account_id,p_organization_id,null,'file_object',v_file_id,1,v_event_id,null,jsonb_build_object('request_hash',v_hash,'result',v_result));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;$function$;

create or replace function public.configure_certificate_version(p_actor_user_account_id uuid,p_organization_id uuid,p_certificate_version_id uuid,p_template_file_object_id uuid,p_template_layout jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare v_event_id uuid:=app_private.e14_command_event_id('configure_certificate_version',p_actor_user_account_id,p_certificate_version_id,p_idempotency_key); v_hash text; v_result jsonb; begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if jsonb_typeof(coalesce(p_template_layout,'{}'::jsonb))<>'object' then raise exception 'CERTIFICATE_LAYOUT_INVALID' using errcode='22023'; end if;
  if p_template_file_object_id is not null and not exists(select 1 from core.file_objects where id=p_template_file_object_id and owner_organization_id=p_organization_id and security_status='clean' and metadata->>'category'='certificate_template' and deleted_at is null) then raise exception 'CERTIFICATE_TEMPLATE_NOT_FOUND' using errcode='P0002'; end if;
  v_hash:=app_private.e14_request_hash(jsonb_build_object('version_id',p_certificate_version_id,'template_file_object_id',p_template_file_object_id,'layout',p_template_layout));
  if app_private.e14_assert_idempotency(v_event_id,v_hash) then select payload->'result' into v_result from eventing.events where event_id=v_event_id; return jsonb_build_object('request_id',v_event_id,'idempotency_key',p_idempotency_key,'replayed',true,'data',v_result); end if;
  update engagement.certificate_versions cv set template_file_object_id=p_template_file_object_id,template_layout=coalesce(p_template_layout,'{}'::jsonb)
  from engagement.certificate_definitions cd where cv.id=p_certificate_version_id and cv.certificate_definition_id=cd.id and cd.owner_organization_id=p_organization_id and cv.status='draft';
  if not found then raise exception 'CERTIFICATE_DRAFT_NOT_FOUND' using errcode='P0002'; end if;
  v_result:=jsonb_build_object('certificate_version_id',p_certificate_version_id,'template_file_object_id',p_template_file_object_id,'template_layout',p_template_layout);
  perform app_private.e14_append_event(v_event_id,'engagement.certificate_version.configured','certificate_version',p_certificate_version_id,'user_account',p_actor_user_account_id,p_organization_id,null,'certificate_version',p_certificate_version_id,1,v_event_id,null,jsonb_build_object('request_hash',v_hash,'result',v_result));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',p_idempotency_key,'replayed',false,'data',v_result);
end;$function$;

create or replace function public.publish_certificate_version(p_actor_user_account_id uuid,p_organization_id uuid,p_certificate_version_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare v_event_id uuid:=app_private.e14_command_event_id('publish_certificate_version',p_actor_user_account_id,p_certificate_version_id,p_idempotency_key); v_definition_id uuid; v_result jsonb; begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select cv.certificate_definition_id into v_definition_id from engagement.certificate_versions cv join engagement.certificate_definitions cd on cd.id=cv.certificate_definition_id where cv.id=p_certificate_version_id and cd.owner_organization_id=p_organization_id and cv.status='draft' for update of cv;
  if v_definition_id is null then raise exception 'CERTIFICATE_DRAFT_NOT_FOUND' using errcode='P0002'; end if;
  update engagement.certificate_versions set status='retired' where certificate_definition_id=v_definition_id and status='published';
  update engagement.certificate_versions set status='published',published_at=now() where id=p_certificate_version_id;
  v_result:=jsonb_build_object('certificate_version_id',p_certificate_version_id,'status','published');
  perform app_private.e14_append_event(v_event_id,'engagement.certificate_version.published','certificate_version',p_certificate_version_id,'user_account',p_actor_user_account_id,p_organization_id,null,'certificate_version',p_certificate_version_id,2,v_event_id,null,jsonb_build_object('result',v_result));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',p_idempotency_key,'replayed',false,'data',v_result);
end;$function$;

create or replace function public.get_certificate_render_payload(p_actor_user_account_id uuid,p_issuance_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
declare v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id); v_result jsonb; begin
  select jsonb_build_object('issuance_id',ci.id,'display_name',ci.display_name_snapshot,'journey_title',jv.title,'certificate_name',cd.name,'verification_code',ci.verification_code,'issued_at',ci.issued_at,'expires_at',ci.expires_at,'template_layout',cv.template_layout,'template',case when fo.id is null then null else jsonb_build_object('bucket',fo.bucket,'object_key',fo.object_key,'content_type',fo.content_type,'filename',fo.original_filename) end)
  into v_result from engagement.certificate_issuances ci join engagement.certificate_versions cv on cv.id=ci.certificate_version_id join engagement.certificate_definitions cd on cd.id=cv.certificate_definition_id join catalog.journey_versions jv on jv.id=cv.journey_version_id left join core.file_objects fo on fo.id=cv.template_file_object_id and fo.security_status='clean' and fo.deleted_at is null
  where ci.id=p_issuance_id and ci.entrepreneur_id=v_entrepreneur_id and ci.status='active' and ci.revoked_at is null;
  if v_result is null then raise exception 'CERTIFICATE_ISSUANCE_NOT_FOUND' using errcode='P0002'; end if;
  return v_result;
end;$function$;

-- Publish the completion rule and certificate for the OpenAI journey. The
-- built-in branded PDF is used until an administrator assigns a JPEG template.
do $seed$
declare
  v_org uuid;
  v_journey uuid;
  v_rule_definition uuid;
  v_rule_version uuid;
  v_certificate_definition uuid;
  v_certificate_version uuid;
begin
  select jd.owner_organization_id,jv.id into v_org,v_journey from catalog.journey_definitions jd join catalog.journey_versions jv on jv.journey_definition_id=jd.id where jd.code='capacitacao_ia_mei_openai' and jv.status='published' order by jv.version_number desc limit 1;
  if v_journey is null then return; end if;
  v_rule_definition:=app_private.e14_deterministic_uuid('rule:openai-journey-completion');
  v_rule_version:=app_private.e14_deterministic_uuid('rule-version:openai-journey-completion:1');
  insert into orchestration.rule_definitions(id,owner_organization_id,code,rule_type,name,status) values(v_rule_definition,v_org,'cred_openai_journey_complete','credential','Conclusão da jornada OpenAI','active') on conflict(id) do nothing;
  insert into orchestration.rule_versions(id,rule_definition_id,version_number,status,language,expression,input_schema,output_schema,published_at,content_hash,created_at)
  values(v_rule_version,v_rule_definition,1,'published','json-logic',jsonb_build_object('scope','journey','journey_version_id',v_journey,'requires_completed_status',true),'{}'::jsonb,'{}'::jsonb,now(),app_private.e14_request_hash(jsonb_build_object('scope','journey','journey_version_id',v_journey,'requires_completed_status',true)),now()) on conflict(id) do nothing;
  v_certificate_definition:=app_private.e14_deterministic_uuid('certificate:openai-journey');
  v_certificate_version:=app_private.e14_deterministic_uuid('certificate-version:openai-journey:1');
  insert into engagement.certificate_definitions(id,owner_organization_id,code,name,status) values(v_certificate_definition,v_org,'certificado_capacitacao_openai','Certificado Capacitação em IA — Estímulo <> OpenAI','active') on conflict(id) do nothing;
  insert into engagement.certificate_versions(id,certificate_definition_id,version_number,status,journey_version_id,requirements_rule_version_id,template_file_object_id,validity_policy,template_layout,published_at)
  values(v_certificate_version,v_certificate_definition,1,'published',v_journey,v_rule_version,null,'{"expires":false}'::jsonb,'{"name_y":0.53,"journey_y":0.40,"text_color":"primary"}'::jsonb,now()) on conflict(id) do nothing;
end;
$seed$;

revoke all on function public.create_external_credential_upload_intent(uuid,text,text,text,text,text) from public;
revoke all on function public.confirm_external_credential_upload(uuid,uuid,text,text,date,date,text,text,bigint,text,text,text,text) from public;
revoke all on function public.abort_external_credential_upload(uuid,uuid,text,text) from public;
revoke all on function public.list_participant_external_credentials(uuid) from public;
revoke all on function public.get_external_credential_download(uuid,uuid) from public;
revoke all on function public.create_certificate_template_upload_intent(uuid,uuid,text,text,text,text,text) from public;
revoke all on function public.confirm_certificate_template_upload(uuid,uuid,uuid,text,bigint,text,text,text,text) from public;
revoke all on function public.configure_certificate_version(uuid,uuid,uuid,uuid,jsonb,text) from public;
revoke all on function public.publish_certificate_version(uuid,uuid,uuid,text) from public;
revoke all on function public.get_certificate_render_payload(uuid,uuid) from public;
grant execute on function public.create_external_credential_upload_intent(uuid,text,text,text,text,text) to authenticated,service_role;
grant execute on function public.confirm_external_credential_upload(uuid,uuid,text,text,date,date,text,text,bigint,text,text,text,text) to authenticated,service_role;
grant execute on function public.abort_external_credential_upload(uuid,uuid,text,text) to authenticated,service_role;
grant execute on function public.list_participant_external_credentials(uuid) to authenticated,service_role;
grant execute on function public.get_external_credential_download(uuid,uuid) to authenticated,service_role;
grant execute on function public.create_certificate_template_upload_intent(uuid,uuid,text,text,text,text,text) to authenticated,service_role;
grant execute on function public.confirm_certificate_template_upload(uuid,uuid,uuid,text,bigint,text,text,text,text) to authenticated,service_role;
grant execute on function public.configure_certificate_version(uuid,uuid,uuid,uuid,jsonb,text) to authenticated,service_role;
grant execute on function public.publish_certificate_version(uuid,uuid,uuid,text) to authenticated,service_role;
grant execute on function public.get_certificate_render_payload(uuid,uuid) to authenticated,service_role;
