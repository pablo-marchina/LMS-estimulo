create or replace function public.save_library_content_draft(
  p_actor_user_account_id uuid,p_organization_id uuid,p_library_item_id uuid,p_slug text,p_title text,p_summary text,p_body text,p_content_kind text,p_content_format text,p_level text,p_estimated_minutes integer,p_source_type text,p_source_name text,p_external_url text,p_language_code text,p_topics text[],p_visibility text,p_journey_version_ids uuid[],p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_item_id uuid:=coalesce(p_library_item_id,app_private.e14_deterministic_uuid('library:item:'||p_actor_user_account_id::text||':'||trim(p_idempotency_key)));
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
  if p_content_kind not in ('article','external_link') then raise exception 'INVALID_LIBRARY_KIND' using errcode='22023'; end if;
  if p_content_format not in ('article','video','podcast','guide','tool','course','other') then raise exception 'INVALID_LIBRARY_FORMAT' using errcode='22023'; end if;
  if p_level not in ('introductory','intermediate','advanced','all') then raise exception 'INVALID_LIBRARY_LEVEL' using errcode='22023'; end if;
  if p_estimated_minutes not between 1 and 600 then raise exception 'INVALID_LIBRARY_DURATION' using errcode='22023'; end if;
  if p_source_type not in ('estimulo','partner','external') then raise exception 'INVALID_LIBRARY_SOURCE' using errcode='22023'; end if;
  if length(v_source_name) not between 2 and 120 then raise exception 'INVALID_LIBRARY_SOURCE_NAME' using errcode='22023'; end if;
  if v_language_code!~'^[a-z]{2}(?:-[A-Z]{2})?$' then raise exception 'INVALID_LIBRARY_LANGUAGE' using errcode='22023'; end if;
  if p_visibility not in ('authenticated','organization') then raise exception 'INVALID_LIBRARY_VISIBILITY' using errcode='22023'; end if;
  if cardinality(v_topics)>12 then raise exception 'TOO_MANY_LIBRARY_TOPICS' using errcode='22023'; end if;
  if p_content_kind='article' and v_body is null then raise exception 'LIBRARY_BODY_REQUIRED' using errcode='22023'; end if;
  if p_content_kind='article' and v_external_url is not null then raise exception 'LIBRARY_EXTERNAL_URL_NOT_ALLOWED' using errcode='22023'; end if;
  if p_content_kind='external_link' and (v_external_url is null or v_external_url!~'^https://[^[:space:]]+$') then raise exception 'LIBRARY_HTTPS_URL_REQUIRED' using errcode='22023'; end if;
  if p_content_kind='external_link' then v_body:=null; end if;
  if exists(select 1 from unnest(v_journeys) requested(id) where not exists(select 1 from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where jv.id=requested.id and jd.owner_organization_id=p_organization_id)) then raise exception 'LIBRARY_JOURNEY_OUTSIDE_ORGANIZATION' using errcode='42501'; end if;
  v_request:=jsonb_build_object('organization_id',p_organization_id,'library_item_id',v_item_id,'slug',v_slug,'title',v_title,'summary',v_summary,'body',v_body,'content_kind',p_content_kind,'content_format',p_content_format,'level',p_level,'estimated_minutes',p_estimated_minutes,'source_type',p_source_type,'source_name',v_source_name,'external_url',v_external_url,'language_code',v_language_code,'topics',to_jsonb(v_topics),'visibility',p_visibility,'journey_version_ids',to_jsonb(v_journeys));
  v_request_hash:=app_private.e14_request_hash(v_request);
  v_event_id:=app_private.e14_command_event_id('save_library_content_draft',p_actor_user_account_id,v_item_id,v_key);
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id; return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result); end if;
  select i.slug,exists(select 1 from catalog.library_item_versions published where published.library_item_id=i.id and published.status='published') into v_existing_slug,v_has_published from catalog.library_items i where i.id=v_item_id for update;
  if found then
    if (select owner_organization_id from catalog.library_items where id=v_item_id)<>p_organization_id then raise exception 'FORBIDDEN' using errcode='42501'; end if;
    if v_has_published and v_existing_slug<>v_slug then raise exception 'LIBRARY_SLUG_IMMUTABLE' using errcode='22023'; end if;
    update catalog.library_items set code=v_slug,slug=v_slug,updated_at=now() where id=v_item_id;
  else
    insert into catalog.library_items(id,owner_organization_id,code,slug,status,created_by) values(v_item_id,p_organization_id,v_slug,v_slug,'active',p_actor_user_account_id);
  end if;
  select v.id,v.version_number into v_version_id,v_version_number from catalog.library_item_versions v where v.library_item_id=v_item_id and v.status='draft' order by v.version_number desc limit 1 for update;
  v_content_hash:=app_private.e14_request_hash(v_request-'organization_id'-'library_item_id');
  if v_version_id is null then
    select coalesce(max(version_number),0)+1 into v_version_number from catalog.library_item_versions where library_item_id=v_item_id;
    v_version_id:=app_private.e14_deterministic_uuid('library:version:'||v_item_id::text||':'||v_version_number::text);
    insert into catalog.library_item_versions(id,library_item_id,version_number,status,title,summary,body,content_kind,content_format,level,estimated_minutes,source_type,source_name,external_url,language_code,topics,visibility,accessibility_metadata,content_hash,created_by)
    values(v_version_id,v_item_id,v_version_number,'draft',v_title,v_summary,v_body,p_content_kind,p_content_format,p_level,p_estimated_minutes,p_source_type,v_source_name,v_external_url,v_language_code,v_topics,p_visibility,'{}'::jsonb,v_content_hash,p_actor_user_account_id);
  else
    update catalog.library_item_versions set title=v_title,summary=v_summary,body=v_body,content_kind=p_content_kind,content_format=p_content_format,level=p_level,estimated_minutes=p_estimated_minutes,source_type=p_source_type,source_name=v_source_name,external_url=v_external_url,language_code=v_language_code,topics=v_topics,visibility=p_visibility,accessibility_metadata='{}'::jsonb,content_hash=v_content_hash where id=v_version_id and status='draft';
  end if;
  delete from catalog.library_item_journey_links where library_item_version_id=v_version_id;
  insert into catalog.library_item_journey_links(library_item_version_id,journey_version_id,relation_type) select v_version_id,id,'supplemental' from unnest(v_journeys) id on conflict do nothing;
  v_result:=jsonb_build_object('library_item_id',v_item_id,'library_item_version_id',v_version_id,'version_number',v_version_number,'status','draft','slug',v_slug,'content_hash',v_content_hash,'journey_link_count',cardinality(v_journeys));
  perform app_private.e14_append_event(v_event_id,'catalog.library_content.draft_saved','library_content',v_version_id,'user',p_actor_user_account_id,p_organization_id,null,'library_item',v_item_id,v_version_number,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end; $$;
revoke all on function public.save_library_content_draft(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text,text,text,text,text[],text,uuid[],text) from public,anon,authenticated;
grant execute on function public.save_library_content_draft(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text,text,text,text,text[],text,uuid[],text) to postgres,service_role,app_worker;
