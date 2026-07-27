-- Managed announcement banners, global participant announcements, and point/ranking hardening.

insert into core.file_upload_profiles(
  code,description,allowed_mime_types,allowed_extensions,max_size_bytes,retention_class,status
) values (
  'announcement_banner_v1',
  'Imagem horizontal para o carrossel de anúncios da Estímulo',
  array['image/png','image/jpeg','image/webp']::text[],
  array['png','jpg','jpeg','webp']::text[],
  4194304,
  'announcement_banner',
  'active'
) on conflict (code) do update set
  description=excluded.description,
  allowed_mime_types=excluded.allowed_mime_types,
  allowed_extensions=excluded.allowed_extensions,
  max_size_bytes=excluded.max_size_bytes,
  retention_class=excluded.retention_class,
  status='active',
  updated_at=now();

alter table engagement.announcements
  add column if not exists image_file_object_id uuid null references core.file_objects(id),
  add column if not exists image_alt text null,
  add column if not exists display_mode text not null default 'image_with_text';

alter table engagement.announcements drop constraint if exists announcements_display_mode_check;
alter table engagement.announcements add constraint announcements_display_mode_check
  check (display_mode in ('image_only','image_with_text'));
alter table engagement.announcements drop constraint if exists announcements_image_alt_check;
alter table engagement.announcements add constraint announcements_image_alt_check
  check (image_alt is null or length(btrim(image_alt)) between 3 and 240);

create index if not exists announcements_image_file_idx
  on engagement.announcements(image_file_object_id) where image_file_object_id is not null;

insert into eventing.event_schemas(id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at)
select gen_random_uuid(),event_name,1,'urn:estimulo:event:'||event_name||':1',
  jsonb_build_object('$schema','https://json-schema.org/draft/2020-12/schema','title',event_name,'type','object','additionalProperties',true),
  encode(digest(convert_to(event_name||':1:announcement-banner','UTF8'),'sha256'),'hex'),'published',now()
from unnest(array[
  'engagement.announcement_banner.upload_requested',
  'engagement.announcement_banner.upload_confirmed',
  'engagement.announcement_banner.upload_failed'
]) event_name
where not exists(select 1 from eventing.event_schemas existing where existing.event_name=event_name and existing.event_version=1);

create or replace function public.create_announcement_banner_upload_intent(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_original_filename text,
  p_expected_content_type text,
  p_storage_provider text,
  p_bucket text,
  p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_filename text:=app_private.safe_object_filename(p_original_filename);
  v_content_type text:=lower(btrim(coalesce(p_expected_content_type,'')));
  v_profile core.file_upload_profiles%rowtype;
  v_extension text;
  v_intent_id uuid:=app_private.e14_deterministic_uuid('announcement-banner-upload:'||p_actor_user_account_id::text||':'||v_key);
  v_object_key text;
  v_event_id uuid:=app_private.e14_command_event_id('create_announcement_banner_upload_intent',p_actor_user_account_id,p_organization_id,v_key);
  v_request_hash text;
  v_snapshot jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if p_storage_provider not in ('supabase_storage','s3') then raise exception 'ANNOUNCEMENT_STORAGE_PROVIDER_UNSUPPORTED' using errcode='22023'; end if;
  if nullif(btrim(p_bucket),'') is null then raise exception 'ANNOUNCEMENT_STORAGE_BUCKET_REQUIRED' using errcode='22023'; end if;
  select * into v_profile from core.file_upload_profiles where code='announcement_banner_v1' and status='active';
  if not found then raise exception 'ANNOUNCEMENT_UPLOAD_PROFILE_NOT_FOUND' using errcode='P0002'; end if;
  if not v_content_type=any(v_profile.allowed_mime_types) then raise exception 'ANNOUNCEMENT_CONTENT_TYPE_NOT_ALLOWED' using errcode='22023'; end if;
  v_extension:=lower(split_part(reverse(v_filename),'.',1));
  if v_extension=v_filename or not v_extension=any(v_profile.allowed_extensions) then
    raise exception 'ANNOUNCEMENT_FILE_EXTENSION_NOT_ALLOWED' using errcode='22023';
  end if;
  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,'filename',v_filename,'content_type',v_content_type,
    'storage_provider',p_storage_provider,'bucket',btrim(p_bucket)
  ));
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select e.payload->'result' into v_snapshot from eventing.events e where e.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_snapshot);
  end if;
  v_object_key:='private/'||p_organization_id::text||'/announcements/'||v_intent_id::text||'/'||v_filename;
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
    v_event_id,'engagement.announcement_banner.upload_requested','announcement_banner_upload',v_intent_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,'file_upload_intent',v_intent_id,1,
    v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_snapshot)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_snapshot);
end;
$function$;

create or replace function public.confirm_announcement_banner_upload(
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
language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid:=app_private.e14_command_event_id('confirm_announcement_banner_upload',p_actor_user_account_id,p_upload_intent_id,v_key);
  v_request_hash text;
  v_intent core.file_upload_intents%rowtype;
  v_file_id uuid:=app_private.e14_deterministic_uuid('announcement-banner-file:'||p_upload_intent_id::text);
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_actual_size_bytes<1 then raise exception 'ANNOUNCEMENT_FILE_SIZE_INVALID' using errcode='22023'; end if;
  if p_sha256!~'^[a-f0-9]{64}$' then raise exception 'ANNOUNCEMENT_SHA256_INVALID' using errcode='22023'; end if;
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
     and requested_by_user_account_id=p_actor_user_account_id and upload_profile_code='announcement_banner_v1'
   for update;
  if not found then raise exception 'ANNOUNCEMENT_UPLOAD_INTENT_NOT_FOUND' using errcode='P0002'; end if;
  if v_intent.status<>'pending_upload' or v_intent.expires_at<=now() then raise exception 'ANNOUNCEMENT_UPLOAD_INTENT_EXPIRED' using errcode='55000'; end if;
  if lower(btrim(p_actual_content_type))<>v_intent.expected_content_type then raise exception 'ANNOUNCEMENT_CONTENT_TYPE_MISMATCH' using errcode='22023'; end if;
  if p_actual_size_bytes>v_intent.max_size_bytes then raise exception 'ANNOUNCEMENT_FILE_TOO_LARGE' using errcode='22023'; end if;
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
  update core.file_upload_intents set status='confirmed',uploaded_at=now(),confirmed_at=now(),file_object_id=v_file_id,updated_at=now() where id=v_intent.id;
  v_result:=jsonb_build_object(
    'file_object_id',v_file_id,'original_filename',v_intent.original_filename,
    'content_type',lower(btrim(p_actual_content_type)),'size_bytes',p_actual_size_bytes,
    'bucket',v_intent.bucket,'object_key',v_intent.object_key,'security_status','clean'
  );
  perform app_private.e14_append_event(
    v_event_id,'engagement.announcement_banner.upload_confirmed','announcement_banner',v_file_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,'file_object',v_file_id,2,
    v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;

create or replace function public.abort_announcement_banner_upload(
  p_actor_user_account_id uuid,p_organization_id uuid,p_upload_intent_id uuid,p_failure_code text,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid:=app_private.e14_command_event_id('abort_announcement_banner_upload',p_actor_user_account_id,p_upload_intent_id,v_key);
  v_code text:=left(coalesce(nullif(btrim(p_failure_code),''),'upload_failed'),120);
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update core.file_upload_intents set status='aborted',aborted_at=now(),failure_code=v_code,updated_at=now()
   where id=p_upload_intent_id and owner_organization_id=p_organization_id
     and requested_by_user_account_id=p_actor_user_account_id and upload_profile_code='announcement_banner_v1' and status='pending_upload';
  v_result:=jsonb_build_object('upload_intent_id',p_upload_intent_id,'status','aborted','failure_code',v_code);
  perform app_private.e14_append_event(
    v_event_id,'engagement.announcement_banner.upload_failed','announcement_banner_upload',p_upload_intent_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,'file_upload_intent',p_upload_intent_id,2,
    v_event_id,null,jsonb_build_object('result',v_result)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;

create or replace function public.get_announcement_banner_download(
  p_actor_user_account_id uuid,p_announcement_id uuid
) returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog'
as $function$
declare v_file core.file_objects%rowtype; v_announcement engagement.announcements%rowtype; v_allowed boolean:=false;
begin
  select * into v_announcement from engagement.announcements where id=p_announcement_id;
  if not found then raise exception 'ANNOUNCEMENT_NOT_FOUND' using errcode='P0002'; end if;
  if app_private.e14_actor_has_permission(p_actor_user_account_id,v_announcement.organization_id,'engagement.manage') then v_allowed:=true; end if;
  if not v_allowed and v_announcement.status='published'
    and (v_announcement.starts_at is null or v_announcement.starts_at<=now())
    and (v_announcement.ends_at is null or v_announcement.ends_at>now())
    and app_private.e14_entrepreneur_for_account(p_actor_user_account_id) is not null then v_allowed:=true; end if;
  if not v_allowed then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_announcement.image_file_object_id is null then raise exception 'ANNOUNCEMENT_IMAGE_NOT_FOUND' using errcode='P0002'; end if;
  select * into v_file from core.file_objects where id=v_announcement.image_file_object_id and security_status='clean' and deleted_at is null;
  if not found then raise exception 'ANNOUNCEMENT_IMAGE_NOT_AVAILABLE' using errcode='P0002'; end if;
  return jsonb_build_object('announcement_id',v_announcement.id,'file_object_id',v_file.id,'bucket',v_file.bucket,'object_key',v_file.object_key,'content_type',v_file.content_type,'original_filename',v_file.original_filename);
end;
$function$;

create or replace function public.save_operator_announcement(
  p_actor_user_account_id uuid,p_organization_id uuid,p_announcement_id uuid,p_expected_version bigint,
  p_title text,p_body text,p_cta_label text,p_cta_url text,p_status text,p_priority integer,
  p_starts_at timestamptz,p_ends_at timestamptz,p_image_file_object_id uuid,p_image_alt text,
  p_display_mode text,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_id uuid:=coalesce(p_announcement_id,gen_random_uuid());
  v_mode text:=lower(btrim(coalesce(p_display_mode,'image_with_text')));
  v_alt text:=nullif(btrim(coalesce(p_image_alt,'')),'');
  v_title text:=btrim(coalesce(p_title,''));
  v_body text:=btrim(coalesce(p_body,''));
  v_cta_label text:=nullif(btrim(coalesce(p_cta_label,'')),'');
  v_cta_url text:=nullif(btrim(coalesce(p_cta_url,'')),'');
  v_status text:=lower(btrim(coalesce(p_status,'')));
  v_priority integer:=coalesce(p_priority,0);
  v_request_hash text; v_event_id uuid; v_version bigint; v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_mode not in ('image_only','image_with_text') then raise exception 'ANNOUNCEMENT_DISPLAY_MODE_INVALID' using errcode='22023'; end if;
  if p_image_file_object_id is not null and not exists(
    select 1 from core.file_objects f where f.id=p_image_file_object_id and f.owner_organization_id=p_organization_id
      and f.retention_class='announcement_banner' and f.security_status='clean' and f.deleted_at is null
  ) then raise exception 'ANNOUNCEMENT_IMAGE_NOT_AVAILABLE' using errcode='22023'; end if;
  if p_image_file_object_id is not null and (v_alt is null or length(v_alt) not between 3 and 240) then raise exception 'ANNOUNCEMENT_IMAGE_ALT_REQUIRED' using errcode='22023'; end if;
  if v_mode='image_only' and p_image_file_object_id is null then raise exception 'ANNOUNCEMENT_IMAGE_REQUIRED' using errcode='22023'; end if;
  if v_mode='image_only' then
    if v_title='' then v_title:=coalesce(v_alt,'Anúncio da Estímulo'); end if;
    if v_body='' then v_body:='Confira esta novidade da Estímulo.'; end if;
  end if;
  if length(v_title) not between 2 and 120 then raise exception 'ANNOUNCEMENT_TITLE_INVALID' using errcode='22023'; end if;
  if length(v_body) not between 2 and 1200 then raise exception 'ANNOUNCEMENT_BODY_INVALID' using errcode='22023'; end if;
  if v_status not in ('draft','published','retired') then raise exception 'ANNOUNCEMENT_STATUS_INVALID' using errcode='22023'; end if;
  if v_priority not between -1000 and 1000 then raise exception 'ANNOUNCEMENT_PRIORITY_INVALID' using errcode='22023'; end if;
  if (v_cta_label is null)<>(v_cta_url is null) then raise exception 'ANNOUNCEMENT_CTA_PAIR_REQUIRED' using errcode='22023'; end if;
  if v_cta_label is not null and length(v_cta_label)>60 then raise exception 'ANNOUNCEMENT_CTA_LABEL_INVALID' using errcode='22023'; end if;
  if v_cta_url is not null and v_cta_url!~'^(https://|/)[^[:space:]]+$' then raise exception 'ANNOUNCEMENT_CTA_URL_INVALID' using errcode='22023'; end if;
  if p_ends_at is not null and p_starts_at is not null and p_ends_at<=p_starts_at then raise exception 'ANNOUNCEMENT_WINDOW_INVALID' using errcode='22023'; end if;
  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,'announcement_id',p_announcement_id,'expected_version',p_expected_version,
    'title',v_title,'body',v_body,'cta_label',v_cta_label,'cta_url',v_cta_url,'status',v_status,
    'priority',v_priority,'starts_at',p_starts_at,'ends_at',p_ends_at,'image_file_object_id',p_image_file_object_id,
    'image_alt',v_alt,'display_mode',v_mode
  ));
  v_event_id:=app_private.e14_command_event_id('save_operator_announcement_v2',p_actor_user_account_id,v_id,v_key);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('announcement:'||v_id::text,0));
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select event.payload->'result' into v_result from eventing.events event where event.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;
  if p_announcement_id is null then
    insert into engagement.announcements(
      id,organization_id,title,body,cta_label,cta_url,status,priority,starts_at,ends_at,
      image_file_object_id,image_alt,display_mode,created_by,updated_by,aggregate_version
    ) values(
      v_id,p_organization_id,v_title,v_body,v_cta_label,v_cta_url,v_status,v_priority,p_starts_at,p_ends_at,
      p_image_file_object_id,v_alt,v_mode,p_actor_user_account_id,p_actor_user_account_id,1
    );
    v_version:=1;
  else
    update engagement.announcements set
      title=v_title,body=v_body,cta_label=v_cta_label,cta_url=v_cta_url,status=v_status,priority=v_priority,
      starts_at=p_starts_at,ends_at=p_ends_at,image_file_object_id=p_image_file_object_id,image_alt=v_alt,
      display_mode=v_mode,updated_by=p_actor_user_account_id,aggregate_version=aggregate_version+1,updated_at=now()
    where id=v_id and organization_id=p_organization_id and aggregate_version=p_expected_version
    returning aggregate_version into v_version;
    if v_version is null then raise exception 'ANNOUNCEMENT_VERSION_CONFLICT' using errcode='40001'; end if;
  end if;
  v_result:=jsonb_build_object('announcement_id',v_id,'organization_id',p_organization_id,'status',v_status,'aggregate_version',v_version,'image_file_object_id',p_image_file_object_id,'display_mode',v_mode);
  perform app_private.e14_append_event(
    v_event_id,'engagement.announcement.saved','announcement',v_id,'user',p_actor_user_account_id,p_organization_id,null,
    'announcement',v_id,v_version,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;

create or replace function public.list_operator_announcements(p_actor_user_account_id uuid,p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog'
as $function$
declare v_items jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',item.id,'title',item.title,'body',item.body,'cta_label',item.cta_label,'cta_url',item.cta_url,
    'status',item.status,'priority',item.priority,'starts_at',item.starts_at,'ends_at',item.ends_at,
    'image_file_object_id',item.image_file_object_id,'image_alt',item.image_alt,'display_mode',item.display_mode,
    'aggregate_version',item.aggregate_version,'created_at',item.created_at,'updated_at',item.updated_at
  ) order by item.priority desc,item.created_at desc),'[]'::jsonb) into v_items
  from engagement.announcements item where item.organization_id=p_organization_id;
  return jsonb_build_object('organization_id',p_organization_id,'announcements',v_items);
end;
$function$;

create or replace function public.get_participant_engagement_hub(p_actor_user_account_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid; v_preferred_name text; v_email text; v_organizations uuid[];
  v_announcements jsonb; v_ranking jsonb; v_own_rank jsonb; v_point_history jsonb; v_rewards jsonb; v_archetype jsonb;
begin
  select entrepreneur.id,entrepreneur.preferred_name,account.email_normalized into v_entrepreneur_id,v_preferred_name,v_email
  from core.entrepreneurs entrepreneur join iam.user_accounts account on account.id=entrepreneur.user_account_id
  where entrepreneur.user_account_id=p_actor_user_account_id and entrepreneur.status='active' and account.status='active';
  if v_entrepreneur_id is null then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;
  select array_agg(distinct organization_id) into v_organizations from (
    select definition.owner_organization_id organization_id
    from orchestration.enrollments enrollment
    join catalog.journey_versions version on version.id=enrollment.journey_version_id
    join catalog.journey_definitions definition on definition.id=version.journey_definition_id
    where enrollment.entrepreneur_id=v_entrepreneur_id and enrollment.status in ('assigned','accepted','active','completed')
    union select id from iam.organizations where slug='estimulo' and status='active'
  ) organizations;
  v_organizations:=coalesce(v_organizations,'{}'::uuid[]);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',announcement.id,'title',announcement.title,'body',announcement.body,'cta_label',announcement.cta_label,
    'cta_url',announcement.cta_url,'priority',announcement.priority,'starts_at',announcement.starts_at,'ends_at',announcement.ends_at,
    'image_file_object_id',announcement.image_file_object_id,'image_alt',announcement.image_alt,'display_mode',announcement.display_mode
  ) order by announcement.priority desc,announcement.starts_at desc nulls last,announcement.created_at desc),'[]'::jsonb) into v_announcements
  from engagement.announcements announcement
  where announcement.organization_id=any(v_organizations) and announcement.status='published'
    and (announcement.starts_at is null or announcement.starts_at<=now())
    and (announcement.ends_at is null or announcement.ends_at>now());
  with balances as (
    select entrepreneur.id entrepreneur_id,coalesce(sum(balance.balance),0)::bigint points
    from core.entrepreneurs entrepreneur
    left join engagement.point_balance_projections balance on balance.entrepreneur_id=entrepreneur.id
    where entrepreneur.status='active' group by entrepreneur.id
  ), ranked as (
    select balance.entrepreneur_id,balance.points,dense_rank() over(order by balance.points desc,balance.entrepreneur_id) position from balances balance
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'position',ranked.position,'participant',case when ranked.entrepreneur_id=v_entrepreneur_id then 'Você' else 'Empreendedor '||upper(substr(md5(ranked.entrepreneur_id::text),1,4)) end,
    'points',ranked.points,'is_current',ranked.entrepreneur_id=v_entrepreneur_id
  ) order by ranked.position,ranked.entrepreneur_id) filter(where ranked.position<=10),'[]'::jsonb) into v_ranking from ranked;
  with balances as (
    select entrepreneur.id entrepreneur_id,coalesce(sum(balance.balance),0)::bigint points
    from core.entrepreneurs entrepreneur left join engagement.point_balance_projections balance on balance.entrepreneur_id=entrepreneur.id
    where entrepreneur.status='active' group by entrepreneur.id
  ), ranked as (
    select balance.entrepreneur_id,balance.points,dense_rank() over(order by balance.points desc,balance.entrepreneur_id) position from balances balance
  ) select jsonb_build_object('position',position,'points',points) into v_own_rank from ranked where entrepreneur_id=v_entrepreneur_id limit 1;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',ledger.id,'amount',ledger.amount,'reason',coalesce(definition.name,ledger.reason),'occurred_at',ledger.occurred_at,'journey_instance_id',ledger.journey_instance_id
  ) order by ledger.occurred_at desc,ledger.id desc),'[]'::jsonb) into v_point_history
  from (select item.* from engagement.point_ledger item where item.entrepreneur_id=v_entrepreneur_id order by item.occurred_at desc,item.id desc limit 30) ledger
  left join engagement.point_rule_versions version on version.id=ledger.point_rule_version_id
  left join engagement.point_rule_definitions definition on definition.id=version.point_rule_definition_id;
  with reward_rows as (
    select 'badge'::text reward_type,version.id version_id,version.title,version.description,
      exists(select 1 from engagement.badge_awards award where award.entrepreneur_id=v_entrepreneur_id and award.badge_version_id=version.id and award.revoked_at is null) earned
    from engagement.badge_versions version join engagement.badge_definitions definition on definition.id=version.badge_definition_id
    where definition.owner_organization_id=any(v_organizations) and version.status='published' and version.published_at is not null
    union all
    select 'certificate'::text,version.id,definition.name,'Certificado de conclusão da jornada'::text,
      exists(select 1 from engagement.certificate_issuances issuance where issuance.entrepreneur_id=v_entrepreneur_id and issuance.certificate_version_id=version.id and issuance.status='issued' and issuance.revoked_at is null)
    from engagement.certificate_versions version join engagement.certificate_definitions definition on definition.id=version.certificate_definition_id
    where definition.owner_organization_id=any(v_organizations) and version.status='published' and version.published_at is not null
      and exists(select 1 from orchestration.enrollments enrollment where enrollment.entrepreneur_id=v_entrepreneur_id and enrollment.journey_version_id=version.journey_version_id)
  ) select coalesce(jsonb_agg(jsonb_build_object('type',reward_type,'version_id',version_id,'title',title,'description',description,'earned',earned) order by earned desc,reward_type,title),'[]'::jsonb) into v_rewards from reward_rows;
  select jsonb_build_object('assignment_id',assignment.id,'name',definition.name,'description',definition.description,'classification_status',assignment.classification_status,'probability',assignment.probability,'assigned_at',assignment.assigned_at)
  into v_archetype from diagnostics.archetype_assignments assignment
  left join diagnostics.archetype_versions version on version.id=assignment.primary_archetype_version_id
  left join diagnostics.archetype_definitions definition on definition.id=version.archetype_definition_id
  where assignment.entrepreneur_id=v_entrepreneur_id order by assignment.assigned_at desc limit 1;
  return jsonb_build_object('entrepreneur_id',v_entrepreneur_id,'preferred_name',v_preferred_name,'email',v_email,
    'announcements',coalesce(v_announcements,'[]'::jsonb),'ranking',coalesce(v_ranking,'[]'::jsonb),'own_rank',v_own_rank,
    'point_history',coalesce(v_point_history,'[]'::jsonb),'rewards',coalesce(v_rewards,'[]'::jsonb),'archetype',v_archetype);
end;
$function$;

update engagement.point_rule_definitions set status='retired'
where code in ('e14_activity_complete_v1','e14_quick_check_pass_v1') and status='active';

create or replace function public.award_participant_action_points(
  p_actor_user_account_id uuid,p_journey_instance_id uuid,p_action_code text,p_source_reference text,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare v_ent uuid; v_org uuid; v_rule uuid; v_amount integer; v_ledger uuid; v_event uuid; v_projection uuid;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_ent:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_ent is null then raise exception 'ENTREPRENEUR_NOT_FOUND' using errcode='P0002'; end if;
  if p_journey_instance_id is not null then
    select jd.owner_organization_id into v_org
    from orchestration.journey_instances ji join orchestration.enrollments en on en.id=ji.enrollment_id
    join catalog.journey_versions jv on jv.id=en.journey_version_id join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
    where ji.id=p_journey_instance_id and en.entrepreneur_id=v_ent;
    if v_org is null then raise exception 'JOURNEY_INSTANCE_NOT_AVAILABLE' using errcode='P0002'; end if;
  else select id into v_org from iam.organizations where slug='estimulo' and status='active' limit 1; end if;
  select prv.id,prv.amount into v_rule,v_amount from engagement.point_rule_definitions prd
  join engagement.point_rule_versions prv on prv.point_rule_definition_id=prd.id
  where prd.owner_organization_id=v_org and prd.code=p_action_code and prd.status='active' and prv.status='published'
  order by prv.version_number desc limit 1;
  if v_rule is null then raise exception 'POINT_RULE_NOT_PUBLISHED' using errcode='P0002'; end if;
  v_ledger:=app_private.e14_deterministic_uuid('points|'||p_actor_user_account_id::text||'|'||p_action_code||'|'||coalesce(p_source_reference,''));
  if exists(select 1 from engagement.point_ledger where id=v_ledger or idempotency_key=p_idempotency_key) then
    select amount into v_amount from engagement.point_ledger where id=v_ledger or idempotency_key=p_idempotency_key limit 1;
    return jsonb_build_object('replayed',true,'amount',v_amount,'action_code',p_action_code);
  end if;
  v_event:=app_private.e14_deterministic_uuid('points-event|'||v_ledger::text);
  perform app_private.e14_append_event(v_event,'engagement.points.awarded','point_ledger',v_ledger,'user_account',p_actor_user_account_id,v_org,p_journey_instance_id,'entrepreneur',v_ent,1,v_event,null,jsonb_build_object('code',p_action_code,'amount',v_amount,'source_reference',p_source_reference));
  insert into engagement.point_ledger(id,entrepreneur_id,journey_instance_id,point_rule_version_id,amount,source_event_id,idempotency_key,reason,reverses_entry_id,occurred_at)
  values(v_ledger,v_ent,p_journey_instance_id,v_rule,v_amount,v_event,p_idempotency_key,p_action_code,null,now());
  select id into v_projection from engagement.point_balance_projections where entrepreneur_id=v_ent and journey_instance_id is not distinct from p_journey_instance_id order by updated_at desc limit 1;
  if v_projection is null then
    insert into engagement.point_balance_projections(id,entrepreneur_id,journey_instance_id,balance,last_ledger_entry_id,projection_version,updated_at)
    values(app_private.e14_deterministic_uuid('point-balance|'||v_ent::text||'|'||coalesce(p_journey_instance_id::text,'global')),v_ent,p_journey_instance_id,v_amount,v_ledger,1,now());
  else update engagement.point_balance_projections set balance=balance+v_amount,last_ledger_entry_id=v_ledger,projection_version=projection_version+1,updated_at=now() where id=v_projection; end if;
  return jsonb_build_object('replayed',false,'amount',v_amount,'action_code',p_action_code,'ledger_id',v_ledger);
end;
$function$;

create or replace function app_private.award_points_for_event()
returns trigger language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare
  v_actor uuid; v_activity_code text; v_path_code text; v_step uuid; v_attempt uuid; v_is_bonus boolean:=false;
  v_actions text[]:='{}'; item text;
begin
  if new.event_name='engagement.points.awarded' then return new; end if;
  if new.actor_type='user_account' then v_actor:=new.actor_id; end if;
  if v_actor is null and new.subject_type='user_account' then v_actor:=new.subject_id; end if;
  if v_actor is null then return new; end if;
  if new.event_name='journey.instance.started' then v_actions:=array_append(v_actions,'complete_welcome');
  elsif new.event_name='learning.activity.utility.rated' then v_actions:=array_append(v_actions,'rate_lesson');
  elsif new.event_name='assessment.attempt.submitted' then v_actions:=array_append(v_actions,'complete_quick_activity');
  elsif new.event_name='learning.practice.evidence.confirmed' then v_actions:=array_append(v_actions,'submit_practice');
  elsif new.event_name='learning.activity.completed' then
    v_actions:=array_append(v_actions,'complete_lesson');
    v_step:=case when new.aggregate_type in ('step','step_instance') then new.aggregate_id else null end;
    if v_step is not null then
      select ad.code,coalesce((av.configuration->>'is_bonus')::boolean,false),pt.code into v_activity_code,v_is_bonus,v_path_code
      from orchestration.step_instances si join catalog.activity_versions av on av.id=si.activity_version_id
      join catalog.activity_definitions ad on ad.id=av.activity_definition_id
      join orchestration.path_assignments pa on pa.id=si.path_assignment_id join orchestration.path_templates pt on pt.id=pa.path_template_id
      where si.id=v_step;
      if v_is_bonus or v_activity_code ilike '%bonus%' then v_actions:=array_append(v_actions,'complete_bonus_content'); end if;
    end if;
  elsif new.event_name='journey.path.completed' then
    select pt.code into v_path_code from orchestration.path_assignments pa join orchestration.path_templates pt on pt.id=pa.path_template_id where pa.id=new.aggregate_id;
    if v_path_code='marketing_vendas_ia' then v_actions:=array_append(v_actions,'complete_basic_module'); end if;
  elsif new.event_name='assessment.attempt.passed' then
    v_attempt:=new.aggregate_id;
    select ad.code,pt.code into v_activity_code,v_path_code
    from assessment.attempts a join catalog.activity_versions av on av.id=a.activity_version_id
    join catalog.activity_definitions ad on ad.id=av.activity_definition_id
    join orchestration.step_instances si on si.id=a.step_instance_id
    join orchestration.path_assignments pa on pa.id=si.path_assignment_id join orchestration.path_templates pt on pt.id=pa.path_template_id
    where a.id=v_attempt;
    if v_activity_code in ('marketing_aula_4','gestao_aula_5','codex_aula_6') then
      v_actions:=array_append(v_actions,'pass_path_assessment');
      if v_path_code in ('marketing_vendas_ia','gestao_ia') then v_actions:=array_append(v_actions,'pass_basic_assessment');
      elsif v_path_code='desenvolvimento_codex' then v_actions:=array_append(v_actions,'pass_advanced_assessment'); end if;
    end if;
  end if;
  foreach item in array v_actions loop
    perform public.award_participant_action_points(v_actor,new.journey_instance_id,item,new.event_id::text,'event-points-'||item||'-'||new.event_id::text);
  end loop;
  return new;
exception when others then
  raise warning 'POINT_AWARD_FAILED event=% code=% error=%',new.event_id,coalesce(item,''),sqlerrm;
  return new;
end;
$function$;

drop trigger if exists award_points_for_event_trigger on eventing.events;
create trigger award_points_for_event_trigger after insert on eventing.events
for each row execute function app_private.award_points_for_event();

revoke execute on function public.create_announcement_banner_upload_intent(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.confirm_announcement_banner_upload(uuid,uuid,uuid,text,bigint,text,text,text,jsonb,text) from public,anon,authenticated;
revoke execute on function public.abort_announcement_banner_upload(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke execute on function public.get_announcement_banner_download(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.save_operator_announcement(uuid,uuid,uuid,bigint,text,text,text,text,text,integer,timestamptz,timestamptz,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.create_announcement_banner_upload_intent(uuid,uuid,text,text,text,text,text) to service_role;
grant execute on function public.confirm_announcement_banner_upload(uuid,uuid,uuid,text,bigint,text,text,text,jsonb,text) to service_role;
grant execute on function public.abort_announcement_banner_upload(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.get_announcement_banner_download(uuid,uuid) to service_role;
grant execute on function public.save_operator_announcement(uuid,uuid,uuid,bigint,text,text,text,text,text,integer,timestamptz,timestamptz,uuid,text,text,text) to service_role;
