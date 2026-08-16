begin;

-- Production guard for deployments where the web app has already moved to
-- save_admin_track_v2 but the supporting track/badge schema was not applied.
create table if not exists engagement.path_badge_links (
  path_template_id uuid primary key references orchestration.path_templates(id) on delete cascade,
  badge_version_id uuid references engagement.badge_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table engagement.path_badge_links from public, anon, authenticated;
grant select, insert, update, delete on table engagement.path_badge_links to service_role, app_worker;

insert into engagement.path_badge_links(path_template_id, badge_version_id)
select
  path.id,
  legacy.badge_version_id
from orchestration.path_templates path
left join lateral (
  select badge.id as badge_version_id
  from engagement.badge_versions badge
  join engagement.badge_definitions definition on definition.id=badge.badge_definition_id
  join orchestration.rule_versions rule on rule.id=badge.criteria_rule_version_id
  where rule.language='credential-v1'
    and rule.expression->>'scope'='path'
    and rule.expression->>'path_template_id'=path.id::text
    and badge.status in ('draft','published')
    and definition.status='active'
  order by
    (badge.status='published') desc,
    badge.version_number desc,
    badge.id desc
  limit 1
) legacy on true
on conflict(path_template_id) do nothing;

create or replace function public.save_admin_track_v2(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_payload jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path='pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text:=app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,'payload',p_payload
  ));
  v_event_id uuid:=app_private.e14_command_event_id(
    'save_admin_track_v2',p_actor_user_account_id,p_organization_id,v_key
  );
  v_existing_hash text;
  v_existing_result jsonb;
  v_path_id uuid:=nullif(p_payload->>'path_template_id','')::uuid;
  v_journey_version_id uuid:=nullif(p_payload->>'journey_version_id','')::uuid;
  v_badge_version_id uuid:=nullif(p_payload->>'completion_badge_version_id','')::uuid;
  v_path_status text;
  v_journey_status text;
  v_code text:=lower(btrim(coalesce(p_payload->>'code','')));
  v_presentation jsonb:=coalesce(p_payload->'presentation','{}'::jsonb);
  v_before jsonb;
  v_after jsonb;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,p_organization_id,'journey.definition.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if jsonb_typeof(p_payload)<>'object' then
    raise exception 'TRACK_PAYLOAD_INVALID' using errcode='22023';
  end if;
  if nullif(btrim(p_payload->>'name'),'') is null then
    raise exception 'TRACK_NAME_REQUIRED' using errcode='22023';
  end if;
  if v_code!~'^[a-z][a-z0-9_\-]{1,79}$' then
    raise exception 'ADMIN_CODE_INVALID' using errcode='22023';
  end if;

  select payload->>'request_hash',payload->'result'
  into v_existing_hash,v_existing_result
  from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505';
    end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;

  if v_path_id is not null then
    select path.journey_version_id,path.status,journey_version.status,
      jsonb_build_object(
        'path_template',to_jsonb(path),
        'badge_version_id',link.badge_version_id
      )
    into v_journey_version_id,v_path_status,v_journey_status,v_before
    from orchestration.path_templates path
    join catalog.journey_versions journey_version on journey_version.id=path.journey_version_id
    join catalog.journey_definitions journey_definition on journey_definition.id=journey_version.journey_definition_id
    left join engagement.path_badge_links link on link.path_template_id=path.id
    where path.id=v_path_id
      and journey_definition.owner_organization_id=p_organization_id
      and journey_version.status in ('draft','published')
    for update of path,journey_version;
    if not found then raise exception 'TRACK_NOT_FOUND' using errcode='P0002'; end if;
  else
    select journey_version.status
    into v_journey_status
    from catalog.journey_versions journey_version
    join catalog.journey_definitions journey_definition on journey_definition.id=journey_version.journey_definition_id
    where journey_version.id=v_journey_version_id
      and journey_definition.owner_organization_id=p_organization_id
      and journey_version.status in ('draft','published')
    for update of journey_version;
    if not found then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;
    v_path_status:=v_journey_status;
  end if;

  if v_journey_status='published' and not app_private.e14_actor_has_permission(
    p_actor_user_account_id,p_organization_id,'journey.definition.publish'
  ) then
    raise exception 'FORBIDDEN_PUBLISH' using errcode='42501';
  end if;
  if v_journey_status='published' then
    perform set_config('app.admin_live_edit','on',true);
  end if;

  if v_badge_version_id is not null and not exists (
    select 1
    from engagement.badge_versions badge
    join engagement.badge_definitions definition on definition.id=badge.badge_definition_id
    where badge.id=v_badge_version_id
      and badge.status='published'
      and definition.status='active'
      and definition.owner_organization_id=p_organization_id
  ) then
    raise exception 'PUBLISHED_BADGE_NOT_FOUND' using errcode='P0002';
  end if;

  v_presentation:=v_presentation||jsonb_build_object(
    'completion_badge_version_id',v_badge_version_id
  );

  if v_path_id is null then
    v_path_id:=gen_random_uuid();
    insert into orchestration.path_templates(
      id,journey_version_id,code,name,description,is_default,status,
      position,is_required,presentation
    ) values(
      v_path_id,v_journey_version_id,v_code,btrim(p_payload->>'name'),
      nullif(btrim(p_payload->>'description'),''),
      coalesce((p_payload->>'is_default')::boolean,false),v_journey_status,
      greatest(1,coalesce((p_payload->>'position')::integer,1)),
      coalesce((p_payload->>'is_required')::boolean,true),v_presentation
    );
    v_path_status:=v_journey_status;

    if v_journey_status='published' then
      insert into orchestration.path_assignments(
        id,journey_instance_id,path_template_id,assignment_policy_id,status,
        reason,confidence,valid_from,valid_until,created_at
      )
      select gen_random_uuid(),journey.id,v_path_id,null,'active',
        jsonb_build_object('source','admin_live_edit','reason','new_published_track'),
        1,now(),null,now()
      from orchestration.journey_instances journey
      join orchestration.enrollments enrollment on enrollment.id=journey.enrollment_id
      where enrollment.journey_version_id=v_journey_version_id
        and journey.status='in_progress'
        and not exists(
          select 1 from orchestration.path_assignments assignment
          where assignment.journey_instance_id=journey.id
            and assignment.path_template_id=v_path_id
            and assignment.status in ('active','completed')
        );
    end if;
  else
    update orchestration.path_templates
    set code=v_code,
        name=btrim(p_payload->>'name'),
        description=nullif(btrim(p_payload->>'description'),''),
        position=greatest(1,coalesce((p_payload->>'position')::integer,position)),
        is_default=coalesce((p_payload->>'is_default')::boolean,is_default),
        is_required=coalesce((p_payload->>'is_required')::boolean,is_required),
        presentation=coalesce(presentation,'{}'::jsonb)||v_presentation,
        status=case when v_journey_status='published' then 'published' else status end
    where id=v_path_id;
    v_path_status:=case when v_journey_status='published' then 'published' else v_path_status end;
  end if;

  insert into engagement.path_badge_links(
    path_template_id,badge_version_id,created_at,updated_at
  ) values(v_path_id,v_badge_version_id,now(),now())
  on conflict(path_template_id) do update
    set badge_version_id=excluded.badge_version_id,
        updated_at=now();

  select jsonb_build_object(
    'path_template',to_jsonb(path),
    'badge',case when badge.id is null then null else jsonb_build_object(
      'badge_version_id',badge.id,'title',badge.title,
      'description',badge.description,'status',badge.status
    ) end
  )
  into v_after
  from orchestration.path_templates path
  left join engagement.path_badge_links link on link.path_template_id=path.id
  left join engagement.badge_versions badge on badge.id=link.badge_version_id
  where path.id=v_path_id;

  insert into experience.admin_content_revisions(
    organization_id,resource_type,resource_id,operation,
    previous_value,new_value,actor_user_account_id
  ) values(
    p_organization_id,'path_template',v_path_id,
    case when v_before is null then 'created'
      when v_journey_status='published' then 'live_updated'
      else 'draft_updated' end,
    v_before,v_after,p_actor_user_account_id
  );

  v_result:=jsonb_build_object(
    'path_template_id',v_path_id,
    'journey_version_id',v_journey_version_id,
    'badge_version_id',v_badge_version_id,
    'status',v_path_status,
    'live_update',v_journey_status='published'
  );

  perform app_private.e14_lock_scope('path_template|'||v_path_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events
  where aggregate_type='path_template' and aggregate_id=v_path_id;
  perform app_private.e14_append_event(
    v_event_id,'admin.track.saved','path_template',v_path_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'path_template',v_path_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );

  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.save_admin_track_v2(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_admin_track_v2(uuid,uuid,jsonb,text) to postgres,service_role,app_worker;

commit;
