do $$
declare
  v_schema jsonb := jsonb_build_object(
    '$schema', 'https://json-schema.org/draft/2020-12/schema',
    'title', 'catalog.library_content.archived',
    'type', 'object',
    'additionalProperties', true
  );
begin
  if not exists (
    select 1 from eventing.event_schemas
    where event_name = 'catalog.library_content.archived'
      and event_version = 1
  ) then
    insert into eventing.event_schemas (
      id, event_name, event_version, schema_uri, schema_document,
      schema_hash, status, published_at
    ) values (
      app_private.e14_deterministic_uuid('event-schema|catalog.library_content.archived|1'),
      'catalog.library_content.archived',
      1,
      'urn:estimulo:event:catalog.library_content.archived:1',
      v_schema,
      app_private.e14_request_hash(v_schema),
      'published',
      now()
    );
  end if;
end
$$;

create or replace function public.archive_library_content(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_library_item_version_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid := app_private.e14_command_event_id(
    'archive_library_content',
    p_actor_user_account_id,
    p_library_item_version_id,
    v_key
  );
  v_request_hash text := app_private.e14_request_hash(jsonb_build_object(
    'organization_id', p_organization_id,
    'library_item_version_id', p_library_item_version_id
  ));
  v_result jsonb;
  v_item_id uuid;
  v_version_number integer;
  v_status text;
  v_reference_count integer;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'library.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if app_private.e14_assert_idempotency(v_event_id, v_request_hash) then
    select event.payload->'result'
      into v_result
    from eventing.events event
    where event.event_id = v_event_id;

    return jsonb_build_object(
      'request_id', v_event_id,
      'idempotency_key', v_key,
      'replayed', true,
      'data', v_result
    );
  end if;

  select version.library_item_id, version.version_number, version.status
    into v_item_id, v_version_number, v_status
  from catalog.library_item_versions version
  join catalog.library_items item on item.id = version.library_item_id
  where version.id = p_library_item_version_id
    and item.owner_organization_id = p_organization_id
  for update of version, item;

  if v_item_id is null then
    raise exception 'LIBRARY_CONTENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_status = 'retired' then
    v_result := jsonb_build_object(
      'library_item_id', v_item_id,
      'library_item_version_id', p_library_item_version_id,
      'version_number', v_version_number,
      'status', 'retired',
      'changed', false
    );
  else
    select (
      (select count(*) from catalog.content_assets asset where asset.library_item_version_id = p_library_item_version_id)
      +
      (select count(*) from catalog.library_item_journey_links link where link.library_item_version_id = p_library_item_version_id)
    )::integer
      into v_reference_count;

    if v_reference_count > 0 then
      raise exception 'LIBRARY_CONTENT_IN_USE' using errcode = '23503';
    end if;

    update catalog.library_item_versions
      set status = 'retired',
          retired_at = now()
    where id = p_library_item_version_id;

    if not exists (
      select 1
      from catalog.library_item_versions version
      where version.library_item_id = v_item_id
        and version.status in ('draft', 'published')
    ) then
      update catalog.library_items
        set status = 'archived',
            updated_at = now()
      where id = v_item_id;
    end if;

    v_result := jsonb_build_object(
      'library_item_id', v_item_id,
      'library_item_version_id', p_library_item_version_id,
      'version_number', v_version_number,
      'status', 'retired',
      'changed', true
    );
  end if;

  perform app_private.e14_append_event(
    v_event_id,
    'catalog.library_content.archived',
    'library_content',
    p_library_item_version_id,
    'user',
    p_actor_user_account_id,
    p_organization_id,
    null,
    'library_item',
    v_item_id,
    v_version_number,
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
$$;

revoke all on function public.archive_library_content(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.archive_library_content(uuid, uuid, uuid, text) to service_role, app_worker;

comment on function public.archive_library_content(uuid, uuid, uuid, text) is
  'Safely retires an unreferenced library version. Referenced content is rejected instead of breaking published journeys.';
