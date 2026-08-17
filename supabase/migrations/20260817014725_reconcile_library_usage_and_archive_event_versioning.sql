begin;

-- Supplemental library links are a derived projection of active lesson usage.
create or replace function app_private.e14_reconcile_library_journey_links(
  p_journey_version_id uuid
) returns void
language plpgsql
security definer
set search_path='pg_catalog'
as $function$
begin
  if p_journey_version_id is null then
    return;
  end if;

  delete from catalog.library_item_journey_links link
  where link.journey_version_id=p_journey_version_id
    and link.relation_type='supplemental'
    and not exists (
      select 1
      from catalog.content_assets asset
      join orchestration.path_steps step
        on step.activity_version_id=asset.activity_version_id
      join orchestration.path_templates path
        on path.id=step.path_template_id
      join catalog.journey_versions journey_version
        on journey_version.id=path.journey_version_id
      join catalog.journey_definitions journey_definition
        on journey_definition.id=journey_version.journey_definition_id
      where asset.library_item_version_id=link.library_item_version_id
        and path.journey_version_id=p_journey_version_id
        and path.status in ('draft','published')
        and journey_version.status in ('draft','published')
        and journey_definition.status='active'
    );

  insert into catalog.library_item_journey_links(
    library_item_version_id,
    journey_version_id,
    relation_type
  )
  select distinct
    asset.library_item_version_id,
    path.journey_version_id,
    'supplemental'
  from catalog.content_assets asset
  join orchestration.path_steps step
    on step.activity_version_id=asset.activity_version_id
  join orchestration.path_templates path
    on path.id=step.path_template_id
  join catalog.journey_versions journey_version
    on journey_version.id=path.journey_version_id
  join catalog.journey_definitions journey_definition
    on journey_definition.id=journey_version.journey_definition_id
  where path.journey_version_id=p_journey_version_id
    and asset.library_item_version_id is not null
    and path.status in ('draft','published')
    and journey_version.status in ('draft','published')
    and journey_definition.status='active'
  on conflict do nothing;
end;
$function$;

revoke all on function app_private.e14_reconcile_library_journey_links(uuid) from public,anon,authenticated;
grant execute on function app_private.e14_reconcile_library_journey_links(uuid) to postgres,service_role,app_worker;

create or replace function app_private.e14_sync_library_links_from_content_asset()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog'
as $function$
declare
  v_journey record;
begin
  for v_journey in
    select distinct path.journey_version_id
    from orchestration.path_steps step
    join orchestration.path_templates path on path.id=step.path_template_id
    where step.activity_version_id in (
      case when tg_op <> 'INSERT' then old.activity_version_id else null end,
      case when tg_op <> 'DELETE' then new.activity_version_id else null end
    )
      and path.journey_version_id is not null
  loop
    perform app_private.e14_reconcile_library_journey_links(v_journey.journey_version_id);
  end loop;
  return coalesce(new,old);
end;
$function$;

revoke all on function app_private.e14_sync_library_links_from_content_asset() from public,anon,authenticated;

drop trigger if exists trg_e14_sync_library_links_content_asset on catalog.content_assets;
create trigger trg_e14_sync_library_links_content_asset
after insert or delete or update of activity_version_id,library_item_version_id
on catalog.content_assets
for each row execute function app_private.e14_sync_library_links_from_content_asset();

create or replace function app_private.e14_sync_library_links_from_path()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog'
as $function$
declare
  v_journey_version_id uuid;
begin
  for v_journey_version_id in
    select distinct journey_version_id
    from (
      select case when tg_op <> 'INSERT' then old.journey_version_id else null end as journey_version_id
      union all
      select case when tg_op <> 'DELETE' then new.journey_version_id else null end
    ) candidate
    where journey_version_id is not null
  loop
    perform app_private.e14_reconcile_library_journey_links(v_journey_version_id);
  end loop;
  return coalesce(new,old);
end;
$function$;

revoke all on function app_private.e14_sync_library_links_from_path() from public,anon,authenticated;

drop trigger if exists trg_e14_sync_library_links_path on orchestration.path_templates;
create trigger trg_e14_sync_library_links_path
after insert or delete or update of status,journey_version_id
on orchestration.path_templates
for each row execute function app_private.e14_sync_library_links_from_path();

create or replace function app_private.e14_sync_library_links_from_journey_version()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog'
as $function$
begin
  perform app_private.e14_reconcile_library_journey_links(new.id);
  return new;
end;
$function$;

revoke all on function app_private.e14_sync_library_links_from_journey_version() from public,anon,authenticated;

drop trigger if exists trg_e14_sync_library_links_journey_version on catalog.journey_versions;
create trigger trg_e14_sync_library_links_journey_version
after update of status,journey_definition_id
on catalog.journey_versions
for each row execute function app_private.e14_sync_library_links_from_journey_version();

create or replace function app_private.e14_sync_library_links_from_journey_definition()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog'
as $function$
declare
  v_journey_version_id uuid;
begin
  for v_journey_version_id in
    select version.id
    from catalog.journey_versions version
    where version.journey_definition_id=new.id
  loop
    perform app_private.e14_reconcile_library_journey_links(v_journey_version_id);
  end loop;
  return new;
end;
$function$;

revoke all on function app_private.e14_sync_library_links_from_journey_definition() from public,anon,authenticated;

drop trigger if exists trg_e14_sync_library_links_journey_definition on catalog.journey_definitions;
create trigger trg_e14_sync_library_links_journey_definition
after update of status
on catalog.journey_definitions
for each row execute function app_private.e14_sync_library_links_from_journey_definition();

-- Repair all currently stale/missing supplemental links once.
do $do$
declare
  v_journey_version_id uuid;
begin
  for v_journey_version_id in select id from catalog.journey_versions loop
    perform app_private.e14_reconcile_library_journey_links(v_journey_version_id);
  end loop;
end;
$do$;

-- Event stream version must advance monotonically for each archived track.
create or replace function public.archive_admin_track(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_path_template_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path='pg_catalog'
as $function$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid := app_private.e14_command_event_id(
    'archive_admin_track',p_actor_user_account_id,p_path_template_id,v_key
  );
  v_request_hash text := app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,'path_template_id',p_path_template_id
  ));
  v_result jsonb;
  v_journey_version_id uuid;
  v_status text;
  v_is_default boolean;
  v_name text;
  v_active_assignments integer;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,p_organization_id,'journey.definition.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select event.payload->'result' into v_result
    from eventing.events event where event.event_id=v_event_id;
    return jsonb_build_object(
      'request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result
    );
  end if;

  select template.journey_version_id,template.status,template.is_default,template.name
  into v_journey_version_id,v_status,v_is_default,v_name
  from orchestration.path_templates template
  join catalog.journey_versions version on version.id=template.journey_version_id
  join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  where template.id=p_path_template_id
    and definition.owner_organization_id=p_organization_id
  for update of template;

  if v_journey_version_id is null then
    raise exception 'TRACK_NOT_FOUND' using errcode='P0002';
  end if;

  if v_status='retired' then
    v_result:=jsonb_build_object(
      'path_template_id',p_path_template_id,
      'journey_version_id',v_journey_version_id,
      'name',v_name,'status','retired','changed',false
    );
  else
    if v_is_default then
      raise exception 'DEFAULT_TRACK_CANNOT_BE_ARCHIVED' using errcode='23514';
    end if;

    select count(*)::integer into v_active_assignments
    from orchestration.path_assignments assignment
    where assignment.path_template_id=p_path_template_id
      and assignment.status='active';

    if v_active_assignments>0 then
      raise exception 'TRACK_HAS_ACTIVE_ASSIGNMENTS' using errcode='23503';
    end if;

    update orchestration.path_templates set status='retired'
    where id=p_path_template_id;

    v_result:=jsonb_build_object(
      'path_template_id',p_path_template_id,
      'journey_version_id',v_journey_version_id,
      'name',v_name,'status','retired','changed',true
    );
  end if;

  perform app_private.e14_lock_scope('path_template|'||p_path_template_id::text);
  select coalesce(max(event.aggregate_version),0)+1
  into v_aggregate_version
  from eventing.events event
  where event.aggregate_type='path_template'
    and event.aggregate_id=p_path_template_id;

  perform app_private.e14_append_event(
    v_event_id,'catalog.journey_track.archived','path_template',p_path_template_id,
    'user',p_actor_user_account_id,p_organization_id,null,
    'path_template',p_path_template_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );

  return jsonb_build_object(
    'request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result
  );
end;
$function$;

revoke all on function public.archive_admin_track(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.archive_admin_track(uuid,uuid,uuid,text) to postgres,service_role,app_worker;

-- Library archival now considers active usage, not historical references, and uses stream versioning.
create or replace function public.archive_library_content(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_library_item_version_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path='pg_catalog'
as $function$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid := app_private.e14_command_event_id(
    'archive_library_content',p_actor_user_account_id,p_library_item_version_id,v_key
  );
  v_request_hash text := app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,
    'library_item_version_id',p_library_item_version_id
  ));
  v_result jsonb;
  v_item_id uuid;
  v_version_number integer;
  v_status text;
  v_active_reference_count integer;
  v_aggregate_version bigint;
  v_journey_version_id uuid;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,p_organization_id,'library.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select event.payload->'result' into v_result
    from eventing.events event where event.event_id=v_event_id;
    return jsonb_build_object(
      'request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result
    );
  end if;

  select version.library_item_id,version.version_number,version.status
  into v_item_id,v_version_number,v_status
  from catalog.library_item_versions version
  join catalog.library_items item on item.id=version.library_item_id
  where version.id=p_library_item_version_id
    and item.owner_organization_id=p_organization_id
  for update of version,item;

  if v_item_id is null then
    raise exception 'LIBRARY_CONTENT_NOT_FOUND' using errcode='P0002';
  end if;

  if v_status='retired' then
    v_result:=jsonb_build_object(
      'library_item_id',v_item_id,
      'library_item_version_id',p_library_item_version_id,
      'version_number',v_version_number,
      'status','retired','changed',false
    );
  else
    -- Reconcile only journeys that may reference this content before deciding whether it is in use.
    for v_journey_version_id in
      select distinct journey_version_id
      from (
        select link.journey_version_id
        from catalog.library_item_journey_links link
        where link.library_item_version_id=p_library_item_version_id
        union all
        select path.journey_version_id
        from catalog.content_assets asset
        join orchestration.path_steps step on step.activity_version_id=asset.activity_version_id
        join orchestration.path_templates path on path.id=step.path_template_id
        where asset.library_item_version_id=p_library_item_version_id
      ) candidate
      where journey_version_id is not null
    loop
      perform app_private.e14_reconcile_library_journey_links(v_journey_version_id);
    end loop;

    select (
      -- A lesson in an active journey/track is an active reference.
      (select count(*)
       from catalog.content_assets asset
       join orchestration.path_steps step on step.activity_version_id=asset.activity_version_id
       join orchestration.path_templates path on path.id=step.path_template_id
       join catalog.journey_versions journey_version on journey_version.id=path.journey_version_id
       join catalog.journey_definitions journey_definition on journey_definition.id=journey_version.journey_definition_id
       where asset.library_item_version_id=p_library_item_version_id
         and journey_definition.owner_organization_id=p_organization_id
         and journey_definition.status='active'
         and journey_version.status in ('draft','published')
         and path.status in ('draft','published'))
      +
      -- Explicit core/recommended journey links remain authoritative references.
      (select count(*)
       from catalog.library_item_journey_links link
       join catalog.journey_versions journey_version on journey_version.id=link.journey_version_id
       join catalog.journey_definitions journey_definition on journey_definition.id=journey_version.journey_definition_id
       where link.library_item_version_id=p_library_item_version_id
         and link.relation_type in ('core','recommended')
         and journey_definition.owner_organization_id=p_organization_id
         and journey_definition.status='active'
         and journey_version.status in ('draft','published'))
    )::integer into v_active_reference_count;

    if v_active_reference_count>0 then
      raise exception 'LIBRARY_CONTENT_IN_USE' using errcode='23503';
    end if;

    update catalog.library_item_versions
    set status='retired',retired_at=now()
    where id=p_library_item_version_id;

    if not exists (
      select 1 from catalog.library_item_versions version
      where version.library_item_id=v_item_id
        and version.status in ('draft','published')
    ) then
      update catalog.library_items
      set status='archived',updated_at=now()
      where id=v_item_id;
    end if;

    v_result:=jsonb_build_object(
      'library_item_id',v_item_id,
      'library_item_version_id',p_library_item_version_id,
      'version_number',v_version_number,
      'status','retired','changed',true
    );
  end if;

  perform app_private.e14_lock_scope('library_content|'||p_library_item_version_id::text);
  select coalesce(max(event.aggregate_version),0)+1
  into v_aggregate_version
  from eventing.events event
  where event.aggregate_type='library_content'
    and event.aggregate_id=p_library_item_version_id;

  perform app_private.e14_append_event(
    v_event_id,'catalog.library_content.archived','library_content',p_library_item_version_id,
    'user',p_actor_user_account_id,p_organization_id,null,
    'library_content',p_library_item_version_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );

  return jsonb_build_object(
    'request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result
  );
end;
$function$;

revoke all on function public.archive_library_content(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.archive_library_content(uuid,uuid,uuid,text) to postgres,service_role,app_worker;

-- The draft-delete RPC already emits this event; register its schema so the command can complete.
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select
  gen_random_uuid(),
  'admin.journey.deleted',
  1,
  'urn:estimulo:event:admin.journey.deleted:1',
  document.schema_document,
  app_private.e14_request_hash(document.schema_document),
  'published',
  now()
from (
  select jsonb_build_object(
    'type','object',
    'title','admin.journey.deleted',
    '$schema','https://json-schema.org/draft/2020-12/schema',
    'additionalProperties',true
  ) as schema_document
) document
on conflict(event_name,event_version) do update
set schema_uri=excluded.schema_uri,
    schema_document=excluded.schema_document,
    schema_hash=excluded.schema_hash,
    status='published',
    published_at=coalesce(eventing.event_schemas.published_at,excluded.published_at);

commit;