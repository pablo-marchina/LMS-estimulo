create or replace function app_private.library_actor_is_active(p_actor_user_account_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select exists (select 1 from iam.user_accounts ua where ua.id = p_actor_user_account_id and ua.status = 'active');
$$;

create or replace function app_private.library_actor_can_view(p_actor_user_account_id uuid,p_owner_organization_id uuid,p_visibility text)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select app_private.library_actor_is_active(p_actor_user_account_id)
    and (p_visibility = 'authenticated' or (p_visibility = 'organization' and (
      exists (select 1 from iam.organization_memberships om where om.user_account_id=p_actor_user_account_id and om.organization_id=p_owner_organization_id and om.status='active' and om.valid_from<=now() and (om.valid_until is null or om.valid_until>now()))
      or exists (select 1 from core.entrepreneurs e join orchestration.enrollments en on en.entrepreneur_id=e.id join catalog.journey_versions jv on jv.id=en.journey_version_id join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where e.user_account_id=p_actor_user_account_id and e.status='active' and jd.owner_organization_id=p_owner_organization_id)
    )));
$$;

create or replace function app_private.library_normalize_topics(p_topics text[])
returns text[] language sql immutable security definer set search_path = pg_catalog as $$
  select coalesce(array_agg(topic order by topic), '{}'::text[])
  from (select distinct lower(trim(value)) as topic from unnest(coalesce(p_topics,'{}'::text[])) value where length(trim(value)) between 2 and 40) normalized;
$$;

create or replace function public.list_library_content(
  p_actor_user_account_id uuid,p_query text default null,p_topic text default null,p_content_format text default null,p_level text default null,p_journey_version_id uuid default null,p_limit integer default 24,p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
declare
  v_query_text text := nullif(trim(coalesce(p_query,'')),'');
  v_topic text := nullif(lower(trim(coalesce(p_topic,''))),'');
  v_format text := nullif(trim(coalesce(p_content_format,'')),'');
  v_level text := nullif(trim(coalesce(p_level,'')),'');
  v_query tsquery; v_items jsonb; v_total integer; v_topics jsonb; v_formats jsonb; v_levels jsonb;
begin
  if not app_private.library_actor_is_active(p_actor_user_account_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_limit<1 or p_limit>100 or p_offset<0 then raise exception 'INVALID_PAGINATION' using errcode='22023'; end if;
  if v_format is not null and v_format not in ('article','video','podcast','guide','tool','course','other') then raise exception 'INVALID_LIBRARY_FORMAT' using errcode='22023'; end if;
  if v_level is not null and v_level not in ('introductory','intermediate','advanced','all') then raise exception 'INVALID_LIBRARY_LEVEL' using errcode='22023'; end if;
  if v_query_text is not null then v_query:=websearch_to_tsquery('pg_catalog.portuguese'::regconfig,v_query_text); end if;
  with visible as (
    select i.id library_item_id,i.slug,i.owner_organization_id,v.id library_item_version_id,v.version_number,v.title,v.summary,v.content_kind,v.content_format,v.level,v.estimated_minutes,v.source_type,v.source_name,v.language_code,v.topics,v.visibility,v.published_at,
      case when v_query is null then 0::real else ts_rank_cd(v.search_document,v_query) end rank,
      coalesce((select jsonb_agg(jsonb_build_object('journey_version_id',l.journey_version_id,'relation_type',l.relation_type,'journey_title',jv.title) order by jv.title) from catalog.library_item_journey_links l join catalog.journey_versions jv on jv.id=l.journey_version_id where l.library_item_version_id=v.id),'[]'::jsonb) journeys
    from catalog.library_items i join catalog.library_item_versions v on v.library_item_id=i.id
    where i.status='active' and v.status='published'
      and app_private.library_actor_can_view(p_actor_user_account_id,i.owner_organization_id,v.visibility)
      and (v_query is null or v.search_document@@v_query)
      and (v_topic is null or v_topic=any(v.topics))
      and (v_format is null or v.content_format=v_format)
      and (v_level is null or v.level=v_level)
      and (p_journey_version_id is null or exists(select 1 from catalog.library_item_journey_links l where l.library_item_version_id=v.id and l.journey_version_id=p_journey_version_id))
  ), counted as (
    select visible.*,count(*) over() total_count from visible order by rank desc,published_at desc,title limit p_limit offset p_offset
  )
  select coalesce(jsonb_agg(jsonb_build_object('library_item_id',library_item_id,'library_item_version_id',library_item_version_id,'slug',slug,'version_number',version_number,'title',title,'summary',summary,'content_kind',content_kind,'content_format',content_format,'level',level,'estimated_minutes',estimated_minutes,'source_type',source_type,'source_name',source_name,'language_code',language_code,'topics',topics,'visibility',visibility,'published_at',published_at,'journeys',journeys,'rank',rank) order by rank desc,published_at desc,title),'[]'::jsonb),coalesce(max(total_count),0)::integer into v_items,v_total from counted;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_topics from (select distinct unnest(v.topics) value from catalog.library_items i join catalog.library_item_versions v on v.library_item_id=i.id where i.status='active' and v.status='published' and app_private.library_actor_can_view(p_actor_user_account_id,i.owner_organization_id,v.visibility)) facets;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_formats from (select distinct v.content_format value from catalog.library_items i join catalog.library_item_versions v on v.library_item_id=i.id where i.status='active' and v.status='published' and app_private.library_actor_can_view(p_actor_user_account_id,i.owner_organization_id,v.visibility)) facets;
  select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_levels from (select distinct v.level value from catalog.library_items i join catalog.library_item_versions v on v.library_item_id=i.id where i.status='active' and v.status='published' and app_private.library_actor_can_view(p_actor_user_account_id,i.owner_organization_id,v.visibility)) facets;
  return jsonb_build_object('items',v_items,'total',v_total,'limit',p_limit,'offset',p_offset,'facets',jsonb_build_object('topics',v_topics,'formats',v_formats,'levels',v_levels));
end; $$;

create or replace function public.get_library_content(p_actor_user_account_id uuid,p_slug text)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare v_result jsonb;
begin
  if not app_private.library_actor_is_active(p_actor_user_account_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select jsonb_build_object('library_item_id',i.id,'library_item_version_id',v.id,'slug',i.slug,'version_number',v.version_number,'title',v.title,'summary',v.summary,'body',v.body,'content_kind',v.content_kind,'content_format',v.content_format,'level',v.level,'estimated_minutes',v.estimated_minutes,'source_type',v.source_type,'source_name',v.source_name,'language_code',v.language_code,'topics',v.topics,'visibility',v.visibility,'accessibility_metadata',v.accessibility_metadata,'published_at',v.published_at,'has_external_link',v.external_url is not null,'journeys',coalesce((select jsonb_agg(jsonb_build_object('journey_version_id',l.journey_version_id,'relation_type',l.relation_type,'journey_title',jv.title) order by jv.title) from catalog.library_item_journey_links l join catalog.journey_versions jv on jv.id=l.journey_version_id where l.library_item_version_id=v.id),'[]'::jsonb)) into v_result
  from catalog.library_items i join catalog.library_item_versions v on v.library_item_id=i.id
  where i.slug=trim(lower(p_slug)) and i.status='active' and v.status='published' and app_private.library_actor_can_view(p_actor_user_account_id,i.owner_organization_id,v.visibility)
  order by v.version_number desc limit 1;
  if v_result is null then raise exception 'LIBRARY_CONTENT_NOT_FOUND' using errcode='P0002'; end if;
  return v_result;
end; $$;

create or replace function public.list_operator_library_content(p_actor_user_account_id uuid,p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare v_items jsonb; v_journeys jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('library_item_id',i.id,'code',i.code,'slug',i.slug,'item_status',i.status,'library_item_version_id',v.id,'version_number',v.version_number,'status',v.status,'title',v.title,'summary',v.summary,'body',v.body,'content_kind',v.content_kind,'content_format',v.content_format,'level',v.level,'estimated_minutes',v.estimated_minutes,'source_type',v.source_type,'source_name',v.source_name,'external_url',v.external_url,'language_code',v.language_code,'topics',v.topics,'visibility',v.visibility,'content_hash',v.content_hash,'published_at',v.published_at,'journey_version_ids',coalesce((select jsonb_agg(l.journey_version_id order by l.journey_version_id) from catalog.library_item_journey_links l where l.library_item_version_id=v.id),'[]'::jsonb)) order by i.updated_at desc,v.version_number desc),'[]'::jsonb) into v_items
  from catalog.library_items i join catalog.library_item_versions v on v.library_item_id=i.id where i.owner_organization_id=p_organization_id;
  select coalesce(jsonb_agg(jsonb_build_object('journey_version_id',jv.id,'title',jv.title,'version_number',jv.version_number,'status',jv.status) order by jv.title,jv.version_number desc),'[]'::jsonb) into v_journeys
  from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where jd.owner_organization_id=p_organization_id and jv.status in ('draft','published');
  return jsonb_build_object('organization_id',p_organization_id,'items',v_items,'journey_versions',v_journeys);
end; $$;

revoke all on function app_private.library_actor_is_active(uuid) from public,anon,authenticated;
revoke all on function app_private.library_actor_can_view(uuid,uuid,text) from public,anon,authenticated;
revoke all on function app_private.library_normalize_topics(text[]) from public,anon,authenticated;
revoke all on function public.list_library_content(uuid,text,text,text,text,uuid,integer,integer) from public,anon,authenticated;
revoke all on function public.get_library_content(uuid,text) from public,anon,authenticated;
revoke all on function public.list_operator_library_content(uuid,uuid) from public,anon,authenticated;
grant execute on function public.list_library_content(uuid,text,text,text,text,uuid,integer,integer) to postgres,service_role,app_worker;
grant execute on function public.get_library_content(uuid,text) to postgres,service_role,app_worker;
grant execute on function public.list_operator_library_content(uuid,uuid) to postgres,service_role,app_worker;
