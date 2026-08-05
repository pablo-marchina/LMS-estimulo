begin;

alter table engagement.announcements
  add column if not exists mobile_image_file_object_id uuid references core.file_objects(id);

create index if not exists announcements_mobile_image_file_object_idx
  on engagement.announcements(mobile_image_file_object_id)
  where mobile_image_file_object_id is not null;

create or replace function public.save_operator_announcement_responsive(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_announcement_id uuid,
  p_expected_version bigint,
  p_title text,
  p_body text,
  p_cta_label text,
  p_cta_url text,
  p_status text,
  p_priority integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_image_file_object_id uuid,
  p_mobile_image_file_object_id uuid,
  p_image_alt text,
  p_display_mode text,
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
    'save_operator_announcement_responsive',
    p_actor_user_account_id,
    coalesce(p_announcement_id, p_organization_id),
    v_key
  );
  v_request_hash text;
  v_existing jsonb;
  v_base jsonb;
  v_announcement_id uuid;
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'engagement.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_mobile_image_file_object_id is not null and not exists (
    select 1
    from core.file_objects file
    where file.id = p_mobile_image_file_object_id
      and file.owner_organization_id = p_organization_id
      and file.retention_class = 'announcement_banner'
      and file.security_status = 'clean'
      and file.deleted_at is null
  ) then
    raise exception 'ANNOUNCEMENT_MOBILE_IMAGE_NOT_AVAILABLE' using errcode = '22023';
  end if;

  v_request_hash := app_private.e14_request_hash(jsonb_build_object(
    'organization_id', p_organization_id,
    'announcement_id', p_announcement_id,
    'expected_version', p_expected_version,
    'title', p_title,
    'body', p_body,
    'cta_label', p_cta_label,
    'cta_url', p_cta_url,
    'status', p_status,
    'priority', p_priority,
    'starts_at', p_starts_at,
    'ends_at', p_ends_at,
    'image_file_object_id', p_image_file_object_id,
    'mobile_image_file_object_id', p_mobile_image_file_object_id,
    'image_alt', p_image_alt,
    'display_mode', p_display_mode
  ));

  if app_private.e14_assert_idempotency(v_event_id, v_request_hash) then
    select event.payload -> 'result'
      into v_existing
    from eventing.events event
    where event.event_id = v_event_id;

    return jsonb_build_object(
      'request_id', v_event_id,
      'idempotency_key', v_key,
      'replayed', true,
      'data', v_existing
    );
  end if;

  v_base := public.save_operator_announcement(
    p_actor_user_account_id,
    p_organization_id,
    p_announcement_id,
    p_expected_version,
    p_title,
    p_body,
    p_cta_label,
    p_cta_url,
    p_status,
    p_priority,
    p_starts_at,
    p_ends_at,
    p_image_file_object_id,
    p_image_alt,
    p_display_mode,
    v_key || '-base'
  );

  v_announcement_id := (v_base -> 'data' ->> 'announcement_id')::uuid;

  update engagement.announcements
  set mobile_image_file_object_id = p_mobile_image_file_object_id,
      updated_at = now(),
      updated_by = p_actor_user_account_id
  where id = v_announcement_id
    and organization_id = p_organization_id;

  if not found then
    raise exception 'ANNOUNCEMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_result := (v_base -> 'data') || jsonb_build_object(
    'mobile_image_file_object_id', p_mobile_image_file_object_id
  );

  perform app_private.e14_append_event(
    v_event_id,
    'engagement.announcement.responsive_media.saved',
    'announcement_responsive_media',
    v_announcement_id,
    'user_account',
    p_actor_user_account_id,
    p_organization_id,
    null,
    'announcement_responsive_media',
    v_announcement_id,
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

create or replace function public.list_operator_announcements_responsive(
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
  v_items jsonb;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'engagement.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', item.id,
    'title', item.title,
    'body', item.body,
    'cta_label', item.cta_label,
    'cta_url', item.cta_url,
    'status', item.status,
    'priority', item.priority,
    'starts_at', item.starts_at,
    'ends_at', item.ends_at,
    'image_file_object_id', item.image_file_object_id,
    'mobile_image_file_object_id', item.mobile_image_file_object_id,
    'image_alt', item.image_alt,
    'display_mode', item.display_mode,
    'aggregate_version', item.aggregate_version,
    'created_at', item.created_at,
    'updated_at', item.updated_at
  ) order by item.priority desc, item.created_at desc), '[]'::jsonb)
  into v_items
  from engagement.announcements item
  where item.organization_id = p_organization_id;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'announcements', v_items
  );
end;
$function$;

create or replace function public.list_participant_announcements_responsive(
  p_actor_user_account_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid;
  v_organizations uuid[];
  v_items jsonb;
begin
  v_entrepreneur_id := app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_entrepreneur_id is null then
    return '[]'::jsonb;
  end if;

  select array_agg(distinct organization_id)
  into v_organizations
  from (
    select definition.owner_organization_id organization_id
    from orchestration.enrollments enrollment
    join catalog.journey_versions version on version.id = enrollment.journey_version_id
    join catalog.journey_definitions definition on definition.id = version.journey_definition_id
    where enrollment.entrepreneur_id = v_entrepreneur_id
      and enrollment.status in ('assigned', 'accepted', 'active', 'completed')
    union
    select id from iam.organizations where slug = 'estimulo' and status = 'active'
  ) organizations;

  v_organizations := coalesce(v_organizations, '{}'::uuid[]);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', announcement.id,
    'title', announcement.title,
    'body', announcement.body,
    'cta_label', announcement.cta_label,
    'cta_url', announcement.cta_url,
    'priority', announcement.priority,
    'starts_at', announcement.starts_at,
    'ends_at', announcement.ends_at,
    'image_file_object_id', announcement.image_file_object_id,
    'mobile_image_file_object_id', announcement.mobile_image_file_object_id,
    'image_alt', announcement.image_alt,
    'display_mode', announcement.display_mode
  ) order by announcement.priority desc, announcement.starts_at desc nulls last, announcement.created_at desc), '[]'::jsonb)
  into v_items
  from engagement.announcements announcement
  where announcement.organization_id = any(v_organizations)
    and announcement.status = 'published'
    and (announcement.starts_at is null or announcement.starts_at <= now())
    and (announcement.ends_at is null or announcement.ends_at > now());

  return v_items;
end;
$function$;

create or replace function public.get_announcement_banner_download_responsive(
  p_actor_user_account_id uuid,
  p_announcement_id uuid,
  p_variant text
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_file core.file_objects%rowtype;
  v_announcement engagement.announcements%rowtype;
  v_file_id uuid;
  v_variant text := lower(btrim(coalesce(p_variant, 'desktop')));
  v_allowed boolean := false;
begin
  if v_variant not in ('desktop', 'mobile') then
    raise exception 'ANNOUNCEMENT_IMAGE_VARIANT_INVALID' using errcode = '22023';
  end if;

  select * into v_announcement
  from engagement.announcements
  where id = p_announcement_id;

  if not found then
    raise exception 'ANNOUNCEMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    v_announcement.organization_id,
    'engagement.manage'
  ) then
    v_allowed := true;
  end if;

  if not v_allowed
    and v_announcement.status = 'published'
    and (v_announcement.starts_at is null or v_announcement.starts_at <= now())
    and (v_announcement.ends_at is null or v_announcement.ends_at > now())
    and app_private.e14_entrepreneur_for_account(p_actor_user_account_id) is not null
  then
    v_allowed := true;
  end if;

  if not v_allowed then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_file_id := case
    when v_variant = 'mobile' then coalesce(
      v_announcement.mobile_image_file_object_id,
      v_announcement.image_file_object_id
    )
    else v_announcement.image_file_object_id
  end;

  if v_file_id is null then
    raise exception 'ANNOUNCEMENT_IMAGE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_file
  from core.file_objects
  where id = v_file_id
    and security_status = 'clean'
    and deleted_at is null;

  if not found then
    raise exception 'ANNOUNCEMENT_IMAGE_NOT_AVAILABLE' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'announcement_id', v_announcement.id,
    'variant', v_variant,
    'file_object_id', v_file.id,
    'bucket', v_file.bucket,
    'object_key', v_file.object_key,
    'content_type', v_file.content_type,
    'original_filename', v_file.original_filename
  );
end;
$function$;

revoke all on function public.save_operator_announcement_responsive(uuid, uuid, uuid, bigint, text, text, text, text, text, integer, timestamptz, timestamptz, uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.list_operator_announcements_responsive(uuid, uuid) from public, anon, authenticated;
revoke all on function public.list_participant_announcements_responsive(uuid) from public, anon, authenticated;
revoke all on function public.get_announcement_banner_download_responsive(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.save_operator_announcement_responsive(uuid, uuid, uuid, bigint, text, text, text, text, text, integer, timestamptz, timestamptz, uuid, uuid, text, text, text) to service_role;
grant execute on function public.list_operator_announcements_responsive(uuid, uuid) to service_role;
grant execute on function public.list_participant_announcements_responsive(uuid) to service_role;
grant execute on function public.get_announcement_banner_download_responsive(uuid, uuid, text) to service_role;

commit;
