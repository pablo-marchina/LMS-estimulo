create or replace function public.save_admin_track(
  p_actor_user_account_id uuid,p_organization_id uuid,p_payload jsonb,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'payload',p_payload));
  v_event_id uuid:=app_private.e14_command_event_id('save_admin_track',p_actor_user_account_id,p_organization_id,v_key);
  v_existing_hash text;v_existing_result jsonb;
  v_path_id uuid:=nullif(p_payload->>'path_template_id','')::uuid;
  v_journey_version_id uuid:=nullif(p_payload->>'journey_version_id','')::uuid;
  v_path_status text;v_journey_status text;
  v_title text:=nullif(btrim(coalesce(p_payload->>'badge_title','')),'');
  v_code text:=lower(btrim(coalesce(p_payload->>'code','')));
  v_rule_definition_id uuid;v_rule_version_id uuid;v_badge_definition_id uuid;v_badge_version_id uuid;
  v_next integer;v_rule_code text;v_badge_code text;v_before jsonb;v_after jsonb;v_result jsonb;v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if jsonb_typeof(p_payload)<>'object' then raise exception 'TRACK_PAYLOAD_INVALID' using errcode='22023'; end if;
  if nullif(btrim(p_payload->>'name'),'') is null then raise exception 'TRACK_NAME_REQUIRED' using errcode='22023'; end if;
  if v_code!~'^[a-z][a-z0-9_\-]{1,79}$' then raise exception 'ADMIN_CODE_INVALID' using errcode='22023'; end if;
  select payload->>'request_hash',payload->'result' into v_existing_hash,v_existing_result from eventing.events where event_id=v_event_id;
  if found then if v_existing_hash is distinct from v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);end if;

  if v_path_id is not null then
    select pt.journey_version_id,pt.status,jv.status,jsonb_build_object('path_template',to_jsonb(pt))
      into v_journey_version_id,v_path_status,v_journey_status,v_before
    from orchestration.path_templates pt
    join catalog.journey_versions jv on jv.id=pt.journey_version_id
    join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
    where pt.id=v_path_id and jd.owner_organization_id=p_organization_id and jv.status in ('draft','published')
    for update of pt,jv;
    if not found then raise exception 'TRACK_NOT_FOUND' using errcode='P0002'; end if;
  else
    select jv.status into v_journey_status
    from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
    where jv.id=v_journey_version_id and jd.owner_organization_id=p_organization_id and jv.status in ('draft','published')
    for update of jv;
    if not found then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;
    v_path_status:=v_journey_status;
  end if;
  if v_journey_status='published' and not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.publish') then raise exception 'FORBIDDEN_PUBLISH' using errcode='42501'; end if;
  if v_journey_status='published' then perform set_config('app.admin_live_edit','on',true); end if;

  if v_path_id is null then
    v_path_id:=gen_random_uuid();
    insert into orchestration.path_templates(id,journey_version_id,code,name,description,is_default,status,position,is_required,presentation)
    values(v_path_id,v_journey_version_id,v_code,btrim(p_payload->>'name'),nullif(btrim(p_payload->>'description'),''),
      coalesce((p_payload->>'is_default')::boolean,false),v_journey_status,
      greatest(1,coalesce((p_payload->>'position')::integer,1)),coalesce((p_payload->>'is_required')::boolean,true),
      coalesce(p_payload->'presentation','{}'::jsonb));
    v_path_status:=v_journey_status;
    if v_journey_status='published' then
      insert into orchestration.path_assignments(id,journey_instance_id,path_template_id,assignment_policy_id,status,reason,confidence,valid_from,valid_until,created_at)
      select gen_random_uuid(),ji.id,v_path_id,null,'active',jsonb_build_object('source','admin_live_edit','reason','new_published_track'),1,now(),null,now()
      from orchestration.journey_instances ji join orchestration.enrollments enrollment on enrollment.id=ji.enrollment_id
      where enrollment.journey_version_id=v_journey_version_id and ji.status='in_progress'
        and not exists(select 1 from orchestration.path_assignments assignment where assignment.journey_instance_id=ji.id and assignment.path_template_id=v_path_id and assignment.status in ('active','completed'));
    end if;
  else
    update orchestration.path_templates set
      code=v_code,name=btrim(p_payload->>'name'),description=nullif(btrim(p_payload->>'description'),''),
      position=greatest(1,coalesce((p_payload->>'position')::integer,position)),
      is_default=coalesce((p_payload->>'is_default')::boolean,is_default),
      is_required=coalesce((p_payload->>'is_required')::boolean,is_required),
      presentation=coalesce(p_payload->'presentation',presentation),
      status=case when v_journey_status='published' then 'published' else status end
    where id=v_path_id;
    v_path_status:=case when v_journey_status='published' then 'published' else v_path_status end;
  end if;

  select rv.id,rv.rule_definition_id,bv.id,bv.badge_definition_id
    into v_rule_version_id,v_rule_definition_id,v_badge_version_id,v_badge_definition_id
  from orchestration.rule_versions rv
  join engagement.badge_versions bv on bv.criteria_rule_version_id=rv.id
  join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
  where rv.language='credential-v1' and rv.expression->>'scope'='path'
    and rv.expression->>'path_template_id'=v_path_id::text
    and bv.status in ('draft','published') and bd.owner_organization_id=p_organization_id
  order by bv.version_number desc limit 1;

  if v_title is null then
    if v_badge_version_id is not null then
      update engagement.badge_versions set status='retired' where id=v_badge_version_id;
      update orchestration.rule_versions set expression=expression||jsonb_build_object('scope','retired_path') where id=v_rule_version_id;
    end if;
  elsif v_badge_version_id is not null then
    update engagement.badge_definitions set name=v_title where id=v_badge_definition_id and owner_organization_id=p_organization_id;
    update engagement.badge_versions set
      title=v_title,description=coalesce(nullif(btrim(p_payload->>'badge_description'),''),v_title),status=v_path_status,
      published_at=case when v_path_status='published' then coalesce(published_at,now()) else null end
    where id=v_badge_version_id;
  else
    v_rule_code:='path_rule_'||replace(substr(v_path_id::text,1,8),'-','');
    v_badge_code:='path_badge_'||replace(substr(v_path_id::text,1,8),'-','');
    select id into v_rule_definition_id from orchestration.rule_definitions where owner_organization_id=p_organization_id and code=v_rule_code;
    if v_rule_definition_id is null then
      v_rule_definition_id:=gen_random_uuid();
      insert into orchestration.rule_definitions(id,owner_organization_id,code,rule_type,name,status)
      values(v_rule_definition_id,p_organization_id,v_rule_code,'credential',v_title||' — regra','active');
    end if;
    select coalesce(max(version_number),0)+1 into v_next from orchestration.rule_versions where rule_definition_id=v_rule_definition_id;
    v_rule_version_id:=gen_random_uuid();
    insert into orchestration.rule_versions(id,rule_definition_id,version_number,status,language,expression,input_schema,output_schema,published_at,content_hash,created_at)
    values(v_rule_version_id,v_rule_definition_id,v_next,v_path_status,'credential-v1',jsonb_build_object('scope','path','path_template_id',v_path_id::text),'{}','{}',case when v_path_status='published' then now() else null end,app_private.e14_request_hash(jsonb_build_object('scope','path','path_template_id',v_path_id::text,'version',v_next)),now());
    select id into v_badge_definition_id from engagement.badge_definitions where owner_organization_id=p_organization_id and code=v_badge_code;
    if v_badge_definition_id is null then
      v_badge_definition_id:=gen_random_uuid();
      insert into engagement.badge_definitions(id,owner_organization_id,code,name,status)
      values(v_badge_definition_id,p_organization_id,v_badge_code,v_title,'active');
    end if;
    select coalesce(max(version_number),0)+1 into v_next from engagement.badge_versions where badge_definition_id=v_badge_definition_id;
    v_badge_version_id:=gen_random_uuid();
    insert into engagement.badge_versions(id,badge_definition_id,version_number,status,title,description,criteria_rule_version_id,asset_file_object_id,published_at)
    values(v_badge_version_id,v_badge_definition_id,v_next,v_path_status,v_title,coalesce(nullif(btrim(p_payload->>'badge_description'),''),v_title),v_rule_version_id,null,case when v_path_status='published' then now() else null end);
  end if;

  select jsonb_build_object(
    'path_template',to_jsonb(pt),
    'badge',case when bv.id is null then null else jsonb_build_object('badge_version_id',bv.id,'title',bv.title,'description',bv.description,'status',bv.status) end
  ) into v_after
  from orchestration.path_templates pt
  left join orchestration.rule_versions rv on rv.language='credential-v1' and rv.expression->>'scope'='path' and rv.expression->>'path_template_id'=pt.id::text
  left join engagement.badge_versions bv on bv.criteria_rule_version_id=rv.id and bv.status in ('draft','published')
  where pt.id=v_path_id order by bv.version_number desc nulls last limit 1;

  insert into experience.admin_content_revisions(organization_id,resource_type,resource_id,operation,previous_value,new_value,actor_user_account_id)
  values(p_organization_id,'path_template',v_path_id,
    case when v_before is null then 'created' when v_journey_status='published' then 'live_updated' else 'draft_updated' end,
    v_before,v_after,p_actor_user_account_id);
  v_result:=jsonb_build_object('path_template_id',v_path_id,'journey_version_id',v_journey_version_id,'status',v_path_status,'live_update',v_journey_status='published');
  perform app_private.e14_lock_scope('path_template|'||v_path_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version from eventing.events where aggregate_type='path_template' and aggregate_id=v_path_id;
  perform app_private.e14_append_event(v_event_id,'admin.track.saved','path_template',v_path_id,'user_account',p_actor_user_account_id,p_organization_id,null,'path_template',v_path_id,v_aggregate_version,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result));
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.save_admin_track(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_admin_track(uuid,uuid,jsonb,text) to service_role;
