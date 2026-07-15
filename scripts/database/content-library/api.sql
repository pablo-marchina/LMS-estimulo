\set ON_ERROR_STOP on

create or replace function app_private.library_actor_is_active(p_actor_user_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from iam.user_accounts ua
    where ua.id = p_actor_user_account_id and ua.status = 'active'
  );
$$;

create or replace function app_private.library_actor_can_view(
  p_actor_user_account_id uuid,
  p_owner_organization_id uuid,
  p_visibility text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select app_private.library_actor_is_active(p_actor_user_account_id)
    and (
      p_visibility = 'authenticated'
      or (
        p_visibility = 'organization'
        and (
          exists (
            select 1
            from iam.organization_memberships om
            where om.user_account_id = p_actor_user_account_id
              and om.organization_id = p_owner_organization_id
              and om.status = 'active'
              and om.valid_from <= now()
              and (om.valid_until is null or om.valid_until > now())
          )
          or exists (
            select 1
            from core.entrepreneurs e
            join orchestration.enrollments en on en.entrepreneur_id = e.id
            join catalog.journey_versions jv on jv.id = en.journey_version_id
            join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
            where e.user_account_id = p_actor_user_account_id
              and e.status = 'active'
              and jd.owner_organization_id = p_owner_organization_id
          )
        )
      )
    );
$$;

create or replace function app_private.library_normalize_topics(p_topics text[])
returns text[]
language sql
immutable
security definer
set search_path = pg_catalog
as $$
  select coalesce(array_agg(topic order by topic), '{}'::text[])
  from (
    select distinct lower(trim(value)) as topic
    from unnest(coalesce(p_topics, '{}'::text[])) value
    where length(trim(value)) between 2 and 40
  ) normalized;
$$;

create or replace function public.list_library_content(
  p_actor_user_account_id uuid,
  p_query text default null,
  p_topic text default null,
  p_content_format text default null,
  p_level text default null,
  p_journey_version_id uuid default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_query_text text := nullif(trim(coalesce(p_query, '')), '');
  v_topic text := nullif(lower(trim(coalesce(p_topic, ''))), '');
  v_format text := nullif(trim(coalesce(p_content_format, '')), '');
  v_level text := nullif(trim(coalesce(p_level, '')), '');
  v_query tsquery;
  v_items jsonb;
  v_total integer;
  v_topics jsonb;
  v_formats jsonb;
  v_levels jsonb;
begin
  if not app_private.library_actor_is_active(p_actor_user_account_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_limit < 1 or p_limit > 100 or p_offset < 0 then
    raise exception 'INVALID_PAGINATION' using errcode = '22023';
  end if;
  if v_format is not null and v_format not in ('article','video','podcast','guide','tool','course','other') then
    raise exception 'INVALID_LIBRARY_FORMAT' using errcode = '22023';
  end if;
  if v_level is not null and v_level not in ('introductory','intermediate','advanced','all') then
    raise exception 'INVALID_LIBRARY_LEVEL' using errcode = '22023';
  end if;
  if v_query_text is not null then
    v_query := websearch_to_tsquery('pg_catalog.portuguese'::regconfig, v_query_text);
  end if;

  with visible as (
    select
      i.id as library_item_id,
      i.slug,
      i.owner_organization_id,
      v.id as library_item_version_id,
      v.version_number,
      v.title,
      v.summary,
      v.content_kind,
      v.content_format,
      v.level,
      v.estimated_minutes,
      v.source_type,
      v.source_name,
      v.language_code,
      v.topics,
      v.visibility,
      v.published_at,
      case when v_query is null then 0::real else ts_rank_cd(v.search_document, v_query) end as rank,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'journey_version_id', l.journey_version_id,
          'relation_type', l.relation_type,
          'journey_title', jv.title
        ) order by jv.title)
        from catalog.library_item_journey_links l
        join catalog.journey_versions jv on jv.id = l.journey_version_id
        where l.library_item_version_id = v.id
      ), '[]'::jsonb) as journeys
    from catalog.library_items i
    join catalog.library_item_versions v on v.library_item_id = i.id
    where i.status = 'active'
      and v.status = 'published'
      and app_private.library_actor_can_view(p_actor_user_account_id, i.owner_organization_id, v.visibility)
      and (v_query is null or v.search_document @@ v_query)
      and (v_topic is null or v_topic = any(v.topics))
      and (v_format is null or v.content_format = v_format)
      and (v_level is null or v.level = v_level)
      and (
        p_journey_version_id is null
        or exists (
          select 1 from catalog.library_item_journey_links l
          where l.library_item_version_id = v.id
            and l.journey_version_id = p_journey_version_id
        )
      )
  ), counted as (
    select visible.*, count(*) over() as total_count
    from visible
    order by rank desc, published_at desc, title
    limit p_limit offset p_offset
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'library_item_id', library_item_id,
        'library_item_version_id', library_item_version_id,
        'slug', slug,
        'version_number', version_number,
        'title', title,
        'summary', summary,
        'content_kind', content_kind,
        'content_format', content_format,
        'level', level,
        'estimated_minutes', estimated_minutes,
        'source_type', source_type,
        'source_name', source_name,
        'language_code', language_code,
        'topics', topics,
        'visibility', visibility,
        'published_at', published_at,
        'journeys', journeys,
        'rank', rank
      ) order by rank desc, published_at desc, title
    ), '[]'::jsonb),
    coalesce(max(total_count), 0)::integer
  into v_items, v_total
  from counted;

  select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
  into v_topics
  from (
    select distinct unnest(v.topics) as value
    from catalog.library_items i
    join catalog.library_item_versions v on v.library_item_id = i.id
    where i.status = 'active' and v.status = 'published'
      and app_private.library_actor_can_view(p_actor_user_account_id, i.owner_organization_id, v.visibility)
  ) facets;

  select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
  into v_formats
  from (
    select distinct v.content_format as value
    from catalog.library_items i
    join catalog.library_item_versions v on v.library_item_id = i.id
    where i.status = 'active' and v.status = 'published'
      and app_private.library_actor_can_view(p_actor_user_account_id, i.owner_organization_id, v.visibility)
  ) facets;

  select coalesce(jsonb_agg(value order by value), '[]'::jsonb)
  into v_levels
  from (
    select distinct v.level as value
    from catalog.library_items i
    join catalog.library_item_versions v on v.library_item_id = i.id
    where i.status = 'active' and v.status = 'published'
      and app_private.library_actor_can_view(p_actor_user_account_id, i.owner_organization_id, v.visibility)
  ) facets;

  return jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset,
    'facets', jsonb_build_object('topics', v_topics, 'formats', v_formats, 'levels', v_levels)
  );
end;
$$;

create or replace function public.get_library_content(
  p_actor_user_account_id uuid,
  p_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_result jsonb;
begin
  if not app_private.library_actor_is_active(p_actor_user_account_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'library_item_id', i.id,
    'library_item_version_id', v.id,
    'slug', i.slug,
    'version_number', v.version_number,
    'title', v.title,
    'summary', v.summary,
    'body', v.body,
    'content_kind', v.content_kind,
    'content_format', v.content_format,
    'level', v.level,
    'estimated_minutes', v.estimated_minutes,
    'source_type', v.source_type,
    'source_name', v.source_name,
    'language_code', v.language_code,
    'topics', v.topics,
    'visibility', v.visibility,
    'accessibility_metadata', v.accessibility_metadata,
    'published_at', v.published_at,
    'has_external_link', v.external_url is not null,
    'journeys', coalesce((
      select jsonb_agg(jsonb_build_object(
        'journey_version_id', l.journey_version_id,
        'relation_type', l.relation_type,
        'journey_title', jv.title
      ) order by jv.title)
      from catalog.library_item_journey_links l
      join catalog.journey_versions jv on jv.id = l.journey_version_id
      where l.library_item_version_id = v.id
    ), '[]'::jsonb)
  )
  into v_result
  from catalog.library_items i
  join catalog.library_item_versions v on v.library_item_id = i.id
  where i.slug = trim(lower(p_slug))
    and i.status = 'active'
    and v.status = 'published'
    and app_private.library_actor_can_view(p_actor_user_account_id, i.owner_organization_id, v.visibility)
  order by v.version_number desc
  limit 1;

  if v_result is null then
    raise exception 'LIBRARY_CONTENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

create or replace function public.list_operator_library_content(
  p_actor_user_account_id uuid,
  p_organization_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_items jsonb;
  v_journeys jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id, p_organization_id, 'library.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'library_item_id', i.id,
    'code', i.code,
    'slug', i.slug,
    'item_status', i.status,
    'library_item_version_id', v.id,
    'version_number', v.version_number,
    'status', v.status,
    'title', v.title,
    'summary', v.summary,
    'body', v.body,
    'content_kind', v.content_kind,
    'content_format', v.content_format,
    'level', v.level,
    'estimated_minutes', v.estimated_minutes,
    'source_type', v.source_type,
    'source_name', v.source_name,
    'external_url', v.external_url,
    'language_code', v.language_code,
    'topics', v.topics,
    'visibility', v.visibility,
    'content_hash', v.content_hash,
    'published_at', v.published_at,
    'journey_version_ids', coalesce((
      select jsonb_agg(l.journey_version_id order by l.journey_version_id)
      from catalog.library_item_journey_links l
      where l.library_item_version_id = v.id
    ), '[]'::jsonb)
  ) order by i.updated_at desc, v.version_number desc), '[]'::jsonb)
  into v_items
  from catalog.library_items i
  join catalog.library_item_versions v on v.library_item_id = i.id
  where i.owner_organization_id = p_organization_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'journey_version_id', jv.id,
    'title', jv.title,
    'version_number', jv.version_number,
    'status', jv.status
  ) order by jv.title, jv.version_number desc), '[]'::jsonb)
  into v_journeys
  from catalog.journey_versions jv
  join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
  where jd.owner_organization_id = p_organization_id
    and jv.status in ('draft','published');

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'items', v_items,
    'journey_versions', v_journeys
  );
end;
$$;

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
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_item_id uuid := coalesce(p_library_item_id, app_private.e14_deterministic_uuid('library:item:' || p_actor_user_account_id::text || ':' || trim(p_idempotency_key)));
  v_event_id uuid;
  v_request jsonb;
  v_request_hash text;
  v_result jsonb;
  v_slug text := lower(trim(p_slug));
  v_title text := trim(p_title);
  v_summary text := trim(p_summary);
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_external_url text := nullif(trim(coalesce(p_external_url, '')), '');
  v_source_name text := trim(p_source_name);
  v_language_code text := trim(p_language_code);
  v_topics text[] := app_private.library_normalize_topics(p_topics);
  v_journeys uuid[] := coalesce(p_journey_version_ids, '{}'::uuid[]);
  v_version_id uuid;
  v_version_number integer;
  v_content_hash text;
  v_existing_slug text;
  v_has_published boolean;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id, p_organization_id, 'library.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'INVALID_LIBRARY_SLUG' using errcode = '22023'; end if;
  if length(v_title) not between 3 and 200 then raise exception 'INVALID_LIBRARY_TITLE' using errcode = '22023'; end if;
  if length(v_summary) not between 10 and 600 then raise exception 'INVALID_LIBRARY_SUMMARY' using errcode = '22023'; end if;
  if p_content_kind not in ('article','external_link') then raise exception 'INVALID_LIBRARY_KIND' using errcode = '22023'; end if;
  if p_content_format not in ('article','video','podcast','guide','tool','course','other') then raise exception 'INVALID_LIBRARY_FORMAT' using errcode = '22023'; end if;
  if p_level not in ('introductory','intermediate','advanced','all') then raise exception 'INVALID_LIBRARY_LEVEL' using errcode = '22023'; end if;
  if p_estimated_minutes not between 1 and 600 then raise exception 'INVALID_LIBRARY_DURATION' using errcode = '22023'; end if;
  if p_source_type not in ('estimulo','partner','external') then raise exception 'INVALID_LIBRARY_SOURCE' using errcode = '22023'; end if;
  if length(v_source_name) not between 2 and 120 then raise exception 'INVALID_LIBRARY_SOURCE_NAME' using errcode = '22023'; end if;
  if v_language_code !~ '^[a-z]{2}(?:-[A-Z]{2})?$' then raise exception 'INVALID_LIBRARY_LANGUAGE' using errcode = '22023'; end if;
  if p_visibility not in ('authenticated','organization') then raise exception 'INVALID_LIBRARY_VISIBILITY' using errcode = '22023'; end if;
  if cardinality(v_topics) > 12 then raise exception 'TOO_MANY_LIBRARY_TOPICS' using errcode = '22023'; end if;
  if p_content_kind = 'article' and v_body is null then raise exception 'LIBRARY_BODY_REQUIRED' using errcode = '22023'; end if;
  if p_content_kind = 'article' and v_external_url is not null then raise exception 'LIBRARY_EXTERNAL_URL_NOT_ALLOWED' using errcode = '22023'; end if;
  if p_content_kind = 'external_link' and (v_external_url is null or v_external_url !~ '^https://[^[:space:]]+$') then raise exception 'LIBRARY_HTTPS_URL_REQUIRED' using errcode = '22023'; end if;
  if p_content_kind = 'external_link' then v_body := null; end if;

  if exists (
    select 1 from unnest(v_journeys) requested(id)
    where not exists (
      select 1
      from catalog.journey_versions jv
      join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
      where jv.id = requested.id and jd.owner_organization_id = p_organization_id
    )
  ) then
    raise exception 'LIBRARY_JOURNEY_OUTSIDE_ORGANIZATION' using errcode = '42501';
  end if;

  v_request := jsonb_build_object(
    'organization_id', p_organization_id,
    'library_item_id', v_item_id,
    'slug', v_slug,
    'title', v_title,
    'summary', v_summary,
    'body', v_body,
    'content_kind', p_content_kind,
    'content_format', p_content_format,
    'level', p_level,
    'estimated_minutes', p_estimated_minutes,
    'source_type', p_source_type,
    'source_name', v_source_name,
    'external_url', v_external_url,
    'language_code', v_language_code,
    'topics', to_jsonb(v_topics),
    'visibility', p_visibility,
    'journey_version_ids', to_jsonb(v_journeys)
  );
  v_request_hash := app_private.e14_request_hash(v_request);
  v_event_id := app_private.e14_command_event_id('save_library_content_draft', p_actor_user_account_id, v_item_id, v_key);

  if app_private.e14_assert_idempotency(v_event_id, v_request_hash) then
    select e.payload -> 'result' into v_result from eventing.events e where e.event_id = v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;

  select i.slug, exists(
    select 1 from catalog.library_item_versions published
    where published.library_item_id = i.id and published.status = 'published'
  )
  into v_existing_slug, v_has_published
  from catalog.library_items i
  where i.id = v_item_id
  for update;

  if found then
    if (select owner_organization_id from catalog.library_items where id = v_item_id) <> p_organization_id then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
    if v_has_published and v_existing_slug <> v_slug then
      raise exception 'LIBRARY_SLUG_IMMUTABLE' using errcode = '22023';
    end if;
    update catalog.library_items
      set code = v_slug, slug = v_slug, updated_at = now()
      where id = v_item_id;
  else
    insert into catalog.library_items(id,owner_organization_id,code,slug,status,created_by)
    values (v_item_id,p_organization_id,v_slug,v_slug,'active',p_actor_user_account_id);
  end if;

  select v.id,v.version_number
  into v_version_id,v_version_number
  from catalog.library_item_versions v
  where v.library_item_id = v_item_id and v.status = 'draft'
  order by v.version_number desc
  limit 1
  for update;

  v_content_hash := app_private.e14_request_hash(v_request - 'organization_id' - 'library_item_id');

  if v_version_id is null then
    select coalesce(max(version_number),0)+1 into v_version_number
    from catalog.library_item_versions where library_item_id = v_item_id;
    v_version_id := app_private.e14_deterministic_uuid('library:version:' || v_item_id::text || ':' || v_version_number::text);
    insert into catalog.library_item_versions(
      id,library_item_id,version_number,status,title,summary,body,content_kind,content_format,level,
      estimated_minutes,source_type,source_name,external_url,language_code,topics,visibility,
      accessibility_metadata,content_hash,created_by
    ) values (
      v_version_id,v_item_id,v_version_number,'draft',v_title,v_summary,v_body,p_content_kind,p_content_format,p_level,
      p_estimated_minutes,p_source_type,v_source_name,v_external_url,v_language_code,v_topics,p_visibility,
      '{}'::jsonb,v_content_hash,p_actor_user_account_id
    );
  else
    update catalog.library_item_versions set
      title=v_title,summary=v_summary,body=v_body,content_kind=p_content_kind,content_format=p_content_format,
      level=p_level,estimated_minutes=p_estimated_minutes,source_type=p_source_type,source_name=v_source_name,
      external_url=v_external_url,language_code=v_language_code,topics=v_topics,visibility=p_visibility,
      accessibility_metadata='{}'::jsonb,content_hash=v_content_hash
    where id=v_version_id and status='draft';
  end if;

  delete from catalog.library_item_journey_links where library_item_version_id = v_version_id;
  insert into catalog.library_item_journey_links(library_item_version_id,journey_version_id,relation_type)
  select v_version_id, id, 'supplemental' from unnest(v_journeys) id
  on conflict do nothing;

  v_result := jsonb_build_object(
    'library_item_id',v_item_id,
    'library_item_version_id',v_version_id,
    'version_number',v_version_number,
    'status','draft',
    'slug',v_slug,
    'content_hash',v_content_hash,
    'journey_link_count',cardinality(v_journeys)
  );

  perform app_private.e14_append_event(
    v_event_id,'catalog.library_content.draft_saved','library_content',v_version_id,
    'user',p_actor_user_account_id,p_organization_id,null,
    'library_item',v_item_id,v_version_number,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );

  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$$;

create or replace function public.publish_library_content(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_library_item_version_id uuid,
  p_expected_content_hash text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid := app_private.e14_command_event_id('publish_library_content',p_actor_user_account_id,p_library_item_version_id,v_key);
  v_request_hash text := app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,
    'library_item_version_id',p_library_item_version_id,
    'expected_content_hash',p_expected_content_hash
  ));
  v_result jsonb;
  v_item_id uuid;
  v_version_number integer;
  v_content_hash text;
  v_status text;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;

  select v.library_item_id,v.version_number,v.content_hash,v.status
  into v_item_id,v_version_number,v_content_hash,v_status
  from catalog.library_item_versions v
  join catalog.library_items i on i.id=v.library_item_id
  where v.id=p_library_item_version_id and i.owner_organization_id=p_organization_id
  for update of v;

  if v_item_id is null then raise exception 'LIBRARY_CONTENT_NOT_FOUND' using errcode='P0002'; end if;
  if v_status <> 'draft' then raise exception 'LIBRARY_VERSION_NOT_DRAFT' using errcode='22023'; end if;
  if v_content_hash <> p_expected_content_hash then raise exception 'CONTENT_HASH_MISMATCH' using errcode='40001'; end if;

  update catalog.library_item_versions
  set status='retired',retired_at=now()
  where library_item_id=v_item_id and status='published';

  update catalog.library_item_versions
  set status='published',published_at=now(),retired_at=null
  where id=p_library_item_version_id;

  update catalog.library_items set status='active',updated_at=now() where id=v_item_id;

  v_result := jsonb_build_object(
    'library_item_id',v_item_id,
    'library_item_version_id',p_library_item_version_id,
    'version_number',v_version_number,
    'status','published',
    'content_hash',v_content_hash
  );

  perform app_private.e14_append_event(
    v_event_id,'catalog.library_content.published','library_content',p_library_item_version_id,
    'user',p_actor_user_account_id,p_organization_id,null,
    'library_item',v_item_id,v_version_number,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );

  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$$;

create or replace function public.record_library_content_access(
  p_actor_user_account_id uuid,
  p_library_item_version_id uuid,
  p_action text,
  p_source text,
  p_journey_instance_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid := app_private.e14_command_event_id('record_library_content_access',p_actor_user_account_id,p_library_item_version_id,v_key);
  v_request_hash text;
  v_result jsonb;
  v_item_id uuid;
  v_org_id uuid;
  v_version_number integer;
  v_slug text;
  v_kind text;
  v_external_url text;
  v_visibility text;
begin
  if p_action not in ('view','open') then raise exception 'INVALID_LIBRARY_ACCESS_ACTION' using errcode='22023'; end if;
  if length(trim(coalesce(p_source,''))) not between 2 and 80 then raise exception 'INVALID_LIBRARY_ACCESS_SOURCE' using errcode='22023'; end if;

  select i.id,i.owner_organization_id,v.version_number,i.slug,v.content_kind,v.external_url,v.visibility
  into v_item_id,v_org_id,v_version_number,v_slug,v_kind,v_external_url,v_visibility
  from catalog.library_items i
  join catalog.library_item_versions v on v.library_item_id=i.id
  where v.id=p_library_item_version_id and i.status='active' and v.status='published';

  if v_item_id is null or not app_private.library_actor_can_view(p_actor_user_account_id,v_org_id,v_visibility) then
    raise exception 'LIBRARY_CONTENT_NOT_FOUND' using errcode='P0002';
  end if;

  if p_journey_instance_id is not null and not exists (
    select 1 from orchestration.journey_instances ji
    join orchestration.enrollments en on en.id=ji.enrollment_id
    join core.entrepreneurs e on e.id=en.entrepreneur_id
    where ji.id=p_journey_instance_id and e.user_account_id=p_actor_user_account_id
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  v_request_hash := app_private.e14_request_hash(jsonb_build_object(
    'library_item_version_id',p_library_item_version_id,
    'action',p_action,
    'source',trim(p_source),
    'journey_instance_id',p_journey_instance_id
  ));

  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;

  v_result := jsonb_build_object(
    'library_item_id',v_item_id,
    'library_item_version_id',p_library_item_version_id,
    'slug',v_slug,
    'content_kind',v_kind,
    'external_url',case when p_action='open' and v_kind='external_link' then v_external_url else null end,
    'action',p_action
  );

  perform app_private.e14_append_event(
    v_event_id,'learning.library_content.accessed','library_content',p_library_item_version_id,
    'user',p_actor_user_account_id,v_org_id,p_journey_instance_id,
    'library_item',v_item_id,v_version_number,v_event_id,null,
    jsonb_build_object(
      'request_hash',v_request_hash,
      'result',v_result,
      'action',p_action,
      'source',trim(p_source)
    )
  );

  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$$;

revoke all on function app_private.library_actor_is_active(uuid) from public, anon, authenticated;
revoke all on function app_private.library_actor_can_view(uuid,uuid,text) from public, anon, authenticated;
revoke all on function app_private.library_normalize_topics(text[]) from public, anon, authenticated;

revoke all on function public.list_library_content(uuid,text,text,text,text,uuid,integer,integer) from public, anon, authenticated;
revoke all on function public.get_library_content(uuid,text) from public, anon, authenticated;
revoke all on function public.list_operator_library_content(uuid,uuid) from public, anon, authenticated;
revoke all on function public.save_library_content_draft(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text,text,text,text,text[],text,uuid[],text) from public, anon, authenticated;
revoke all on function public.publish_library_content(uuid,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.record_library_content_access(uuid,uuid,text,text,uuid,text) from public, anon, authenticated;

grant execute on function public.list_library_content(uuid,text,text,text,text,uuid,integer,integer) to postgres, service_role, app_worker;
grant execute on function public.get_library_content(uuid,text) to postgres, service_role, app_worker;
grant execute on function public.list_operator_library_content(uuid,uuid) to postgres, service_role, app_worker;
grant execute on function public.save_library_content_draft(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text,text,text,text,text[],text,uuid[],text) to postgres, service_role, app_worker;
grant execute on function public.publish_library_content(uuid,uuid,uuid,text,text) to postgres, service_role, app_worker;
grant execute on function public.record_library_content_access(uuid,uuid,text,text,uuid,text) to postgres, service_role, app_worker;
