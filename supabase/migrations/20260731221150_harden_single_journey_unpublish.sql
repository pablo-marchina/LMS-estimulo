begin;

create or replace function public.unpublish_admin_journey_to_draft(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_source_journey_version_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_hash text:=app_private.e14_request_hash(jsonb_build_object('journey_id',p_source_journey_version_id));
  v_event_id uuid:=app_private.e14_command_event_id('unpublish_admin_journey_to_draft',p_actor_user_account_id,p_source_journey_version_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_definition_id uuid;
  v_result jsonb;
  v_aggregate_version bigint;
  v_interrupted bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.publish') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select payload->>'request_hash',payload->'result'
    into v_existing_hash,v_existing_result
    from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;

  perform app_private.e14_lock_scope('journey|'||p_source_journey_version_id::text);
  select jv.journey_definition_id into v_definition_id
    from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
    where jv.id=p_source_journey_version_id
      and jv.status='published'
      and jd.owner_organization_id=p_organization_id
    for update of jv,jd;
  if not found then raise exception 'PUBLISHED_JOURNEY_NOT_FOUND' using errcode='P0002'; end if;

  update orchestration.journey_instances instance set
    status='cancelled',
    ended_at=coalesce(ended_at,now()),
    updated_at=now(),
    aggregate_version=aggregate_version+1
  from orchestration.enrollments enrollment
  where enrollment.id=instance.enrollment_id
    and enrollment.journey_version_id=p_source_journey_version_id
    and instance.status in ('in_progress','paused');
  get diagnostics v_interrupted=row_count;

  update orchestration.enrollments set
    status='cancelled',
    aggregate_version=aggregate_version+1
  where journey_version_id=p_source_journey_version_id and status='active';

  perform set_config('app.admin_live_edit','on',true);
  update orchestration.path_templates set status='draft'
    where journey_version_id=p_source_journey_version_id and status='published';
  update catalog.journey_versions set status='draft',published_at=null
    where id=p_source_journey_version_id;

  v_result:=jsonb_build_object(
    'source_journey_version_id',p_source_journey_version_id,
    'journey_version_id',p_source_journey_version_id,
    'journey_id',p_source_journey_version_id,
    'journey_definition_id',v_definition_id,
    'status','draft',
    'interrupted_participants',v_interrupted
  );
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
    from eventing.events where aggregate_type='journey' and aggregate_id=p_source_journey_version_id;
  perform app_private.e14_append_event(
    v_event_id,'admin.journey.unpublished','journey',p_source_journey_version_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'journey',p_source_journey_version_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_hash,'result',v_result)
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

drop function if exists public.create_admin_journey_draft_from_version(uuid,uuid,uuid,text);

revoke all on function public.unpublish_admin_journey_to_draft(uuid,uuid,uuid,text) from public,anon,authenticated;

commit;
