begin;

create table if not exists engagement.path_badge_links (
  path_template_id uuid primary key references orchestration.path_templates(id) on delete cascade,
  badge_version_id uuid references engagement.badge_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table engagement.path_badge_links from public, anon, authenticated;
grant select, insert, update, delete on table engagement.path_badge_links to service_role, app_worker;

-- Every existing path gets an explicit row. Legacy path-scoped badge rules are
-- used only to seed the link once; after that, null means intentionally unlinked.
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

create or replace function public.get_admin_path_badge_links(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog'
as $function$
begin
  if not app_private.estimulo_staff_can_view(p_actor_user_account_id,p_organization_id)
     and not app_private.e14_actor_has_permission(
       p_actor_user_account_id,p_organization_id,'journey.definition.manage'
     ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'path_template_id',path.id,
      'badge_version_id',link.badge_version_id,
      'title',badge.title,
      'description',badge.description,
      'status',badge.status
    ) order by path.position,path.id)
    from orchestration.path_templates path
    join catalog.journey_versions journey_version on journey_version.id=path.journey_version_id
    join catalog.journey_definitions journey_definition on journey_definition.id=journey_version.journey_definition_id
    left join engagement.path_badge_links link on link.path_template_id=path.id
    left join engagement.badge_versions badge on badge.id=link.badge_version_id
    where journey_definition.owner_organization_id=p_organization_id
  ),'[]'::jsonb);
end;
$function$;

revoke all on function public.get_admin_path_badge_links(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_admin_path_badge_links(uuid,uuid) to postgres,service_role,app_worker;

create or replace function public.set_admin_path_badge_link(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_path_template_id uuid,
  p_badge_version_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path='pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text:=app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,
    'path_template_id',p_path_template_id,
    'badge_version_id',p_badge_version_id
  ));
  v_event_id uuid:=app_private.e14_command_event_id(
    'set_admin_path_badge_link',p_actor_user_account_id,p_path_template_id,v_key
  );
  v_existing_hash text;
  v_existing_result jsonb;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,p_organization_id,'journey.definition.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select payload->>'request_hash',payload->'result'
    into v_existing_hash,v_existing_result
  from eventing.events
  where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505';
    end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;

  if not exists (
    select 1
    from orchestration.path_templates path
    join catalog.journey_versions journey_version on journey_version.id=path.journey_version_id
    join catalog.journey_definitions journey_definition on journey_definition.id=journey_version.journey_definition_id
    where path.id=p_path_template_id
      and journey_definition.owner_organization_id=p_organization_id
      and path.status in ('draft','published')
      and journey_version.status in ('draft','published')
  ) then
    raise exception 'TRACK_NOT_FOUND' using errcode='P0002';
  end if;

  if p_badge_version_id is not null and not exists (
    select 1
    from engagement.badge_versions badge
    join engagement.badge_definitions definition on definition.id=badge.badge_definition_id
    where badge.id=p_badge_version_id
      and badge.status='published'
      and definition.status='active'
      and definition.owner_organization_id=p_organization_id
  ) then
    raise exception 'PUBLISHED_BADGE_NOT_FOUND' using errcode='P0002';
  end if;

  insert into engagement.path_badge_links(path_template_id,badge_version_id,created_at,updated_at)
  values(p_path_template_id,p_badge_version_id,now(),now())
  on conflict(path_template_id) do update
    set badge_version_id=excluded.badge_version_id,
        updated_at=now();

  v_result:=jsonb_build_object(
    'path_template_id',p_path_template_id,
    'badge_version_id',p_badge_version_id
  );

  perform app_private.e14_lock_scope('path_template|'||p_path_template_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events
  where aggregate_type='path_template' and aggregate_id=p_path_template_id;

  perform app_private.e14_append_event(
    v_event_id,'engagement.path_badge.linked','path_template',p_path_template_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'path_template',p_path_template_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );

  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.set_admin_path_badge_link(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.set_admin_path_badge_link(uuid,uuid,uuid,uuid,text) to postgres,service_role,app_worker;

create or replace function app_private.learning_badge_candidates(p_context jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog'
as $function$
declare
  v_badges jsonb:='[]'::jsonb;
  v_record record;
  v_award_id uuid;
  v_entrepreneur_id uuid:=(p_context->>'entrepreneur_id')::uuid;
  v_journey_instance_id uuid:=(p_context->>'journey_instance_id')::uuid;
  v_journey_version_id uuid:=(p_context->>'journey_version_id')::uuid;
  v_step_instance_id uuid:=(p_context->>'step_instance_id')::uuid;
  v_step_activity_version_id uuid:=(p_context->>'step_activity_version_id')::uuid;
  v_path_template_id uuid:=nullif(p_context->>'path_template_id','')::uuid;
begin
  if v_step_instance_id is not null then
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where bv.status='published' and bd.status='active'
        and app_private.credential_rule_matches(
          bv.criteria_rule_version_id,'activity',v_journey_version_id,
          v_step_activity_version_id,(p_context->>'step_completed')::boolean,
          true,(p_context->>'step_assessment_passed')::boolean
        )
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','activity',
        'step_instance_id',v_step_instance_id,'rule_version_id',v_record.criteria_rule_version_id
      ));
    end loop;
  end if;

  if p_context->>'journey_status'='completed' then
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where bv.status='published' and bd.status='active'
        and app_private.credential_rule_matches(
          bv.criteria_rule_version_id,'journey',v_journey_version_id,null,true,
          (p_context->>'required_steps_completed')::boolean,
          (p_context->>'required_assessments_passed')::boolean
        )
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','journey','step_instance_id',null,
        'rule_version_id',v_record.criteria_rule_version_id
      ));
    end loop;
  end if;

  if (p_context->>'path_completed')::boolean is true and v_path_template_id is not null then
    -- Explicit association is authoritative, including an explicit null link.
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.path_badge_links link
      join engagement.badge_versions bv on bv.id=link.badge_version_id
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where link.path_template_id=v_path_template_id
        and bv.status='published'
        and bd.status='active'
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','path',
        'path_template_id',v_path_template_id,
        'rule_version_id',v_record.criteria_rule_version_id
      ));
    end loop;

    -- Legacy fallback only for paths that predate the explicit association row.
    if not exists (
      select 1 from engagement.path_badge_links link
      where link.path_template_id=v_path_template_id
    ) then
      for v_record in
        select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
        from engagement.badge_versions bv
        join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
        where bv.status='published' and bd.status='active'
          and app_private.credential_rule_matches(
            bv.criteria_rule_version_id,'path',v_journey_version_id,null,true,
            (p_context->>'path_required_steps_completed')::boolean,
            (p_context->>'path_required_assessments_passed')::boolean,
            v_path_template_id
          )
        order by bv.id
      loop
        v_award_id:=app_private.e14_deterministic_uuid(
          'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
        );
        v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
          'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
          'description',v_record.description,'scope','path',
          'path_template_id',v_path_template_id,
          'rule_version_id',v_record.criteria_rule_version_id
        ));
      end loop;
    end if;
  end if;

  return v_badges;
end;
$function$;

commit;
