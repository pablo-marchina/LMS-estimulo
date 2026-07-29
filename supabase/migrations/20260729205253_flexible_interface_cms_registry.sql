alter table experience.interface_content
  add column if not exists route_pattern text,
  add column if not exists placement text not null default 'content',
  add column if not exists group_name text,
  add column if not exists editor_schema jsonb not null default '{}'::jsonb,
  add column if not exists can_delete boolean not null default false;

alter table experience.interface_content drop constraint if exists ck_experience_interface_content_type;
alter table experience.interface_content add constraint ck_experience_interface_content_type check(element_type=any(array['text','textarea','navigation','button','link','image','notice','section','element']));
alter table experience.interface_content drop constraint if exists ck_experience_interface_editor_schema_object;
alter table experience.interface_content add constraint ck_experience_interface_editor_schema_object check(jsonb_typeof(editor_schema)='object');
alter table experience.interface_content drop constraint if exists ck_experience_interface_placement;
alter table experience.interface_content add constraint ck_experience_interface_placement check(placement=any(array['navigation','header','before_content','content','after_content','footer']));
create index if not exists ix_experience_interface_content_route on experience.interface_content(organization_id,locale,area,route_pattern,placement) where is_active;

create or replace function public.get_admin_interface_content(p_actor_user_account_id uuid,p_organization_id uuid,p_locale text)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return jsonb_build_object(
    'organization_id',p_organization_id,
    'locale',coalesce(nullif(btrim(p_locale),''),'pt-BR'),
    'entries',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',entry.id,'content_key',entry.content_key,'area',entry.area,'page',entry.page,
        'element_name',entry.element_name,'element_type',entry.element_type,'description',entry.description,
        'route_pattern',entry.route_pattern,'placement',entry.placement,'group_name',entry.group_name,
        'editor_schema',entry.editor_schema,'can_delete',entry.can_delete,'default_value',entry.default_value,
        'draft_value',entry.draft_value,'published_value',entry.published_value,
        'has_pending_changes',entry.draft_value is not null,'updated_at',entry.updated_at,'published_at',entry.published_at
      ) order by entry.area,entry.page,entry.placement,entry.content_key)
      from experience.interface_content entry
      where entry.organization_id=p_organization_id
        and entry.locale=coalesce(nullif(btrim(p_locale),''),'pt-BR')
        and entry.is_active
    ),'[]'::jsonb)
  );
end;
$function$;

create or replace function public.get_published_interface_content(p_organization_slug text,p_locale text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog' as $function$
  select coalesce(jsonb_object_agg(
    entry.content_key,
    entry.default_value||coalesce(entry.published_value,'{}'::jsonb)||jsonb_build_object(
      '_area',entry.area,'_page',entry.page,'_element_name',entry.element_name,
      '_element_type',entry.element_type,'_route_pattern',entry.route_pattern,
      '_placement',entry.placement,'_group_name',entry.group_name
    ) order by entry.content_key
  ),'{}'::jsonb)
  from experience.interface_content entry
  join iam.organizations organization on organization.id=entry.organization_id
  where organization.slug=lower(btrim(p_organization_slug))
    and organization.status='active'
    and entry.locale=coalesce(nullif(btrim(p_locale),''),'pt-BR')
    and entry.is_active;
$function$;

create or replace function public.register_admin_interface_content(
  p_actor_user_account_id uuid,p_organization_id uuid,p_entry jsonb,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_content_key text:=lower(btrim(coalesce(p_entry->>'content_key','')));
  v_locale text:=coalesce(nullif(btrim(p_entry->>'locale'),''),'pt-BR');
  v_area text:=lower(btrim(coalesce(p_entry->>'area','participant')));
  v_page text:=lower(btrim(coalesce(p_entry->>'page','custom')));
  v_type text:=lower(btrim(coalesce(p_entry->>'element_type','text')));
  v_placement text:=lower(btrim(coalesce(p_entry->>'placement','content')));
  v_request_hash text;v_event_id uuid;v_existing_hash text;v_existing_result jsonb;
  v_entry_id uuid;v_result jsonb;v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if jsonb_typeof(p_entry)<>'object' then raise exception 'INTERFACE_ENTRY_INVALID' using errcode='22023'; end if;
  if v_content_key!~'^[a-z][a-z0-9_.-]{2,159}$' then raise exception 'INTERFACE_CONTENT_KEY_INVALID' using errcode='22023'; end if;
  if v_area<>all(array['shared','public','participant','admin']) then raise exception 'INTERFACE_AREA_INVALID' using errcode='22023'; end if;
  if v_type<>all(array['text','textarea','navigation','button','link','image','notice','section','element']) then raise exception 'INTERFACE_TYPE_INVALID' using errcode='22023'; end if;
  if v_placement<>all(array['navigation','header','before_content','content','after_content','footer']) then raise exception 'INTERFACE_PLACEMENT_INVALID' using errcode='22023'; end if;
  if jsonb_typeof(coalesce(p_entry->'default_value','{}'::jsonb))<>'object' or jsonb_typeof(coalesce(p_entry->'editor_schema','{}'::jsonb))<>'object' then raise exception 'INTERFACE_SCHEMA_INVALID' using errcode='22023'; end if;
  v_request_hash:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'entry',p_entry));
  v_event_id:=app_private.e14_command_event_id('register_admin_interface_content',p_actor_user_account_id,p_organization_id,v_key);
  select payload->>'request_hash',payload->'result' into v_existing_hash,v_existing_result from eventing.events where event_id=v_event_id;
  if found then if v_existing_hash is distinct from v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);end if;
  insert into experience.interface_content(
    organization_id,content_key,locale,area,page,element_name,element_type,description,
    route_pattern,placement,group_name,editor_schema,can_delete,default_value,draft_value,
    published_value,is_active,updated_by,created_at,updated_at
  ) values (
    p_organization_id,v_content_key,v_locale,v_area,v_page,
    coalesce(nullif(btrim(p_entry->>'element_name'),''),v_content_key),v_type,
    coalesce(nullif(btrim(p_entry->>'description'),''),'Elemento configurável da interface.'),
    nullif(btrim(p_entry->>'route_pattern'),''),v_placement,nullif(btrim(p_entry->>'group_name'),''),
    coalesce(p_entry->'editor_schema','{}'::jsonb),coalesce((p_entry->>'can_delete')::boolean,true),
    coalesce(p_entry->'default_value','{}'::jsonb),coalesce(p_entry->'initial_value',p_entry->'default_value','{}'::jsonb),
    null,true,p_actor_user_account_id,now(),now()
  ) on conflict(organization_id,content_key,locale) do update set
    area=excluded.area,page=excluded.page,element_name=excluded.element_name,
    element_type=excluded.element_type,description=excluded.description,
    route_pattern=excluded.route_pattern,placement=excluded.placement,group_name=excluded.group_name,
    editor_schema=excluded.editor_schema,can_delete=experience.interface_content.can_delete or excluded.can_delete,
    is_active=true,updated_by=p_actor_user_account_id,updated_at=now()
  returning id into v_entry_id;
  v_result:=jsonb_build_object('entry_id',v_entry_id,'content_key',v_content_key,'created_or_restored',true);
  perform app_private.e14_lock_scope('interface-content|'||p_organization_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version from eventing.events where aggregate_type='interface_content' and aggregate_id=p_organization_id;
  perform app_private.e14_append_event(v_event_id,'experience.interface_content.registered','organization',p_organization_id,'user_account',p_actor_user_account_id,p_organization_id,null,'interface_content',p_organization_id,v_aggregate_version,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result));
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

create or replace function public.archive_admin_interface_content(
  p_actor_user_account_id uuid,p_organization_id uuid,p_content_key text,p_locale text,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'content_key',p_content_key,'locale',p_locale));
  v_event_id uuid:=app_private.e14_command_event_id('archive_admin_interface_content',p_actor_user_account_id,p_organization_id,v_key);
  v_existing_hash text;v_existing_result jsonb;v_result jsonb;v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select payload->>'request_hash',payload->'result' into v_existing_hash,v_existing_result from eventing.events where event_id=v_event_id;
  if found then if v_existing_hash is distinct from v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);end if;
  update experience.interface_content set is_active=false,draft_value=null,updated_by=p_actor_user_account_id,updated_at=now()
  where organization_id=p_organization_id and content_key=lower(btrim(p_content_key))
    and locale=coalesce(nullif(btrim(p_locale),''),'pt-BR') and can_delete;
  if not found then raise exception 'INTERFACE_CONTENT_NOT_REMOVABLE' using errcode='P0002'; end if;
  v_result:=jsonb_build_object('content_key',lower(btrim(p_content_key)),'archived',true);
  perform app_private.e14_lock_scope('interface-content|'||p_organization_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version from eventing.events where aggregate_type='interface_content' and aggregate_id=p_organization_id;
  perform app_private.e14_append_event(v_event_id,'experience.interface_content.archived','organization',p_organization_id,'user_account',p_actor_user_account_id,p_organization_id,null,'interface_content',p_organization_id,v_aggregate_version,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result));
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

with names(event_name) as (
  values('experience.interface_content.registered'::text),('experience.interface_content.archived'::text)
),docs as (
  select event_name,jsonb_build_object('$schema','https://json-schema.org/draft/2020-12/schema','title',event_name,'type','object','additionalProperties',true) schema_document from names
)
insert into eventing.event_schemas(id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at)
select gen_random_uuid(),event_name,1,'urn:estimulo:event:'||event_name||':1',schema_document,app_private.e14_request_hash(schema_document),'published',now()
from docs on conflict(event_name,event_version) do nothing;

revoke all on function public.register_admin_interface_content(uuid,uuid,jsonb,text) from public,anon,authenticated;
revoke all on function public.archive_admin_interface_content(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.register_admin_interface_content(uuid,uuid,jsonb,text) to service_role;
grant execute on function public.archive_admin_interface_content(uuid,uuid,text,text,text) to service_role;
