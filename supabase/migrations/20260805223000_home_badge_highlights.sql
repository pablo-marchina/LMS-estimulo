begin;

create table if not exists engagement.home_badge_highlight_settings (
  organization_id uuid primary key references iam.organizations(id) on delete cascade,
  display_limit integer not null default 3 check (display_limit between 1 and 12),
  updated_by uuid not null references iam.user_accounts(id),
  updated_at timestamptz not null default now()
);

create table if not exists engagement.home_badge_highlights (
  id uuid primary key,
  organization_id uuid not null references iam.organizations(id) on delete cascade,
  badge_version_id uuid not null references engagement.badge_versions(id) on delete cascade,
  position integer not null check (position between 1 and 100),
  active boolean not null default true,
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, badge_version_id),
  unique (organization_id, position)
);

create index if not exists home_badge_highlights_active_idx
  on engagement.home_badge_highlights(organization_id, active, position);

create or replace function public.get_admin_home_badge_highlights(
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
  v_limit integer;
  v_badges jsonb;
  v_selected jsonb;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'engagement.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(settings.display_limit, 3)
  into v_limit
  from engagement.home_badge_highlight_settings settings
  where settings.organization_id = p_organization_id;
  v_limit := coalesce(v_limit, 3);

  select coalesce(jsonb_agg(jsonb_build_object(
    'badge_version_id', version.id,
    'definition_id', definition.id,
    'name', definition.name,
    'title', version.title,
    'description', version.description,
    'asset_file_object_id', version.asset_file_object_id,
    'version_number', version.version_number
  ) order by definition.name, version.version_number desc), '[]'::jsonb)
  into v_badges
  from engagement.badge_versions version
  join engagement.badge_definitions definition
    on definition.id = version.badge_definition_id
  where definition.owner_organization_id = p_organization_id
    and definition.status = 'active'
    and version.status = 'published';

  select coalesce(jsonb_agg(jsonb_build_object(
    'badge_version_id', highlight.badge_version_id,
    'position', highlight.position,
    'active', highlight.active
  ) order by highlight.position), '[]'::jsonb)
  into v_selected
  from engagement.home_badge_highlights highlight
  where highlight.organization_id = p_organization_id
    and highlight.active;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'display_limit', v_limit,
    'available_badges', v_badges,
    'selected_badges', v_selected
  );
end;
$function$;

create or replace function public.save_admin_home_badge_highlights(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_badge_version_ids uuid[],
  p_display_limit integer,
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
    'save_admin_home_badge_highlights',
    p_actor_user_account_id,
    p_organization_id,
    v_key
  );
  v_request_hash text;
  v_existing jsonb;
  v_ids uuid[] := coalesce(p_badge_version_ids, '{}'::uuid[]);
  v_distinct_count integer;
  v_valid_count integer;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'engagement.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_display_limit not between 1 and 12 then
    raise exception 'HOME_BADGE_LIMIT_INVALID' using errcode = '22023';
  end if;
  if cardinality(v_ids) > 24 then
    raise exception 'HOME_BADGE_SELECTION_TOO_LARGE' using errcode = '22023';
  end if;

  select count(distinct item) into v_distinct_count from unnest(v_ids) item;
  if v_distinct_count <> cardinality(v_ids) then
    raise exception 'HOME_BADGE_SELECTION_DUPLICATED' using errcode = '22023';
  end if;

  select count(*) into v_valid_count
  from engagement.badge_versions version
  join engagement.badge_definitions definition on definition.id = version.badge_definition_id
  where version.id = any(v_ids)
    and version.status = 'published'
    and definition.status = 'active'
    and definition.owner_organization_id = p_organization_id;
  if v_valid_count <> cardinality(v_ids) then
    raise exception 'HOME_BADGE_SELECTION_INVALID' using errcode = '22023';
  end if;

  v_request_hash := app_private.e14_request_hash(jsonb_build_object(
    'organization_id', p_organization_id,
    'badge_version_ids', to_jsonb(v_ids),
    'display_limit', p_display_limit
  ));

  if app_private.e14_assert_idempotency(v_event_id, v_request_hash) then
    select event.payload -> 'result' into v_existing
    from eventing.events event where event.event_id = v_event_id;
    return coalesce(v_existing, '{}'::jsonb) || jsonb_build_object('replayed', true);
  end if;

  insert into engagement.home_badge_highlight_settings(
    organization_id,
    display_limit,
    updated_by,
    updated_at
  ) values (
    p_organization_id,
    p_display_limit,
    p_actor_user_account_id,
    now()
  ) on conflict (organization_id) do update set
    display_limit = excluded.display_limit,
    updated_by = excluded.updated_by,
    updated_at = now();

  delete from engagement.home_badge_highlights
  where organization_id = p_organization_id;

  insert into engagement.home_badge_highlights(
    id,
    organization_id,
    badge_version_id,
    position,
    active,
    created_by,
    created_at,
    updated_at
  )
  select
    app_private.e14_deterministic_uuid('home-badge-highlight:' || p_organization_id::text || ':' || item.id::text),
    p_organization_id,
    item.id,
    item.ordinality::integer,
    true,
    p_actor_user_account_id,
    now(),
    now()
  from unnest(v_ids) with ordinality item(id, ordinality);

  v_result := jsonb_build_object(
    'organization_id', p_organization_id,
    'display_limit', p_display_limit,
    'selected_count', cardinality(v_ids),
    'badge_version_ids', to_jsonb(v_ids)
  );

  perform app_private.e14_lock_scope('home-badge-highlights|' || p_organization_id::text);
  select coalesce(max(event.aggregate_version), 0) + 1 into v_aggregate_version
  from eventing.events event
  where event.aggregate_type = 'home_badge_highlights'
    and event.aggregate_id = p_organization_id;

  perform app_private.e14_append_event(
    v_event_id,
    'engagement.home_badge_highlights.saved',
    'organization',
    p_organization_id,
    'user_account',
    p_actor_user_account_id,
    p_organization_id,
    null,
    'home_badge_highlights',
    p_organization_id,
    v_aggregate_version,
    v_event_id,
    null,
    jsonb_build_object('request_hash', v_request_hash, 'result', v_result)
  );

  return v_result || jsonb_build_object('replayed', false);
end;
$function$;

create or replace function public.list_participant_home_badge_highlights(
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
  v_organization_id uuid;
  v_limit integer;
  v_items jsonb;
begin
  v_entrepreneur_id := app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_entrepreneur_id is null then
    return jsonb_build_object('display_limit', 3, 'badges', '[]'::jsonb);
  end if;

  select organization.id into v_organization_id
  from iam.organizations organization
  where organization.slug = 'estimulo'
    and organization.status = 'active'
  limit 1;

  if v_organization_id is null then
    return jsonb_build_object('display_limit', 3, 'badges', '[]'::jsonb);
  end if;

  select coalesce(settings.display_limit, 3)
  into v_limit
  from engagement.home_badge_highlight_settings settings
  where settings.organization_id = v_organization_id;
  v_limit := coalesce(v_limit, 3);

  select coalesce(jsonb_agg(jsonb_build_object(
    'badge_version_id', version.id,
    'title', version.title,
    'description', version.description,
    'asset_file_object_id', version.asset_file_object_id,
    'position', highlight.position,
    'earned', exists (
      select 1 from engagement.badge_awards award
      where award.entrepreneur_id = v_entrepreneur_id
        and award.badge_version_id = version.id
        and award.revoked_at is null
    )
  ) order by highlight.position), '[]'::jsonb)
  into v_items
  from engagement.home_badge_highlights highlight
  join engagement.badge_versions version on version.id = highlight.badge_version_id
  where highlight.organization_id = v_organization_id
    and highlight.active
    and version.status = 'published';

  return jsonb_build_object(
    'display_limit', v_limit,
    'badges', coalesce(v_items, '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.get_admin_home_badge_highlights(uuid, uuid) from public, anon, authenticated;
revoke all on function public.save_admin_home_badge_highlights(uuid, uuid, uuid[], integer, text) from public, anon, authenticated;
revoke all on function public.list_participant_home_badge_highlights(uuid) from public, anon, authenticated;

grant execute on function public.get_admin_home_badge_highlights(uuid, uuid) to service_role;
grant execute on function public.save_admin_home_badge_highlights(uuid, uuid, uuid[], integer, text) to service_role;
grant execute on function public.list_participant_home_badge_highlights(uuid) to service_role;

commit;
