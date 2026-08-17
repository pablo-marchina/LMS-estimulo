-- Allow administrators to archive non-default tracks that already have participant assignments.
--
-- Archiving is a soft retirement: existing path assignments and step progress must remain
-- available to participants who already received the track. All new-assignment flows select
-- only published path templates, so a retired track will not be assigned to new participants.

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

comment on function public.archive_admin_track(uuid,uuid,uuid,text) is
'Archives a non-default journey track by soft-retiring its path template. Existing active assignments and progress are intentionally preserved; new assignment flows only select published tracks.';
