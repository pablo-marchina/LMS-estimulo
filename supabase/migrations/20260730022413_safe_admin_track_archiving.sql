do $$
declare
  v_schema jsonb := jsonb_build_object(
    '$schema', 'https://json-schema.org/draft/2020-12/schema',
    'title', 'catalog.journey_track.archived',
    'type', 'object',
    'additionalProperties', true
  );
begin
  if not exists (
    select 1 from eventing.event_schemas
    where event_name = 'catalog.journey_track.archived'
      and event_version = 1
  ) then
    insert into eventing.event_schemas (
      id, event_name, event_version, schema_uri, schema_document,
      schema_hash, status, published_at
    ) values (
      app_private.e14_deterministic_uuid('event-schema|catalog.journey_track.archived|1'),
      'catalog.journey_track.archived',
      1,
      'urn:estimulo:event:catalog.journey_track.archived:1',
      v_schema,
      app_private.e14_request_hash(v_schema),
      'published',
      now()
    );
  end if;
end
$$;

create or replace function public.archive_admin_track(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_path_template_id uuid,
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
    'archive_admin_track',
    p_actor_user_account_id,
    p_path_template_id,
    v_key
  );
  v_request_hash text := app_private.e14_request_hash(jsonb_build_object(
    'organization_id', p_organization_id,
    'path_template_id', p_path_template_id
  ));
  v_result jsonb;
  v_journey_version_id uuid;
  v_status text;
  v_is_default boolean;
  v_name text;
  v_active_assignments integer;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'journey.definition.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if app_private.e14_assert_idempotency(v_event_id, v_request_hash) then
    select event.payload->'result'
      into v_result
    from eventing.events event
    where event.event_id = v_event_id;
    return jsonb_build_object('request_id', v_event_id, 'idempotency_key', v_key, 'replayed', true, 'data', v_result);
  end if;

  select template.journey_version_id, template.status, template.is_default, template.name
    into v_journey_version_id, v_status, v_is_default, v_name
  from orchestration.path_templates template
  join catalog.journey_versions version on version.id = template.journey_version_id
  join catalog.journey_definitions definition on definition.id = version.journey_definition_id
  where template.id = p_path_template_id
    and definition.owner_organization_id = p_organization_id
  for update of template;

  if v_journey_version_id is null then
    raise exception 'TRACK_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_status = 'retired' then
    v_result := jsonb_build_object(
      'path_template_id', p_path_template_id,
      'journey_version_id', v_journey_version_id,
      'name', v_name,
      'status', 'retired',
      'changed', false
    );
  else
    if v_is_default then
      raise exception 'DEFAULT_TRACK_CANNOT_BE_ARCHIVED' using errcode = '23514';
    end if;

    select count(*)::integer
      into v_active_assignments
    from orchestration.path_assignments assignment
    where assignment.path_template_id = p_path_template_id
      and assignment.status = 'active';

    if v_active_assignments > 0 then
      raise exception 'TRACK_HAS_ACTIVE_ASSIGNMENTS' using errcode = '23503';
    end if;

    update orchestration.path_templates
      set status = 'retired'
    where id = p_path_template_id;

    v_result := jsonb_build_object(
      'path_template_id', p_path_template_id,
      'journey_version_id', v_journey_version_id,
      'name', v_name,
      'status', 'retired',
      'changed', true
    );
  end if;

  perform app_private.e14_append_event(
    v_event_id,
    'catalog.journey_track.archived',
    'path_template',
    p_path_template_id,
    'user',
    p_actor_user_account_id,
    p_organization_id,
    null,
    'path_template',
    p_path_template_id,
    1,
    v_event_id,
    null,
    jsonb_build_object('request_hash', v_request_hash, 'result', v_result)
  );

  return jsonb_build_object('request_id', v_event_id, 'idempotency_key', v_key, 'replayed', false, 'data', v_result);
end;
$$;

revoke all on function public.archive_admin_track(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.archive_admin_track(uuid, uuid, uuid, text) to service_role, app_worker;

comment on function public.archive_admin_track(uuid, uuid, uuid, text) is
  'Archives a non-default journey track only when no active participant assignment depends on it.';
