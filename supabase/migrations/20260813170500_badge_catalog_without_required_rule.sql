begin;

alter table engagement.badge_versions
  alter column criteria_rule_version_id drop not null;

create or replace function public.save_admin_badge_catalog(
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
  v_request_hash text:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'payload',p_payload));
  v_event_id uuid:=app_private.e14_command_event_id('save_admin_badge_catalog',p_actor_user_account_id,p_organization_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_definition_id uuid:=nullif(p_payload->>'definition_id','')::uuid;
  v_version_id uuid;
  v_rule_version_id uuid:=nullif(p_payload->>'criteria_rule_version_id','')::uuid;
  v_code text:=lower(btrim(coalesce(p_payload->>'code','')));
  v_name text:=btrim(coalesce(p_payload->>'name',''));
  v_title text:=btrim(coalesce(p_payload->>'title',''));
  v_description text:=btrim(coalesce(p_payload->>'description',''));
  v_status text:=case when p_payload->>'status'='published' then 'published' else 'draft' end;
  v_next_version integer;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if jsonb_typeof(p_payload)<>'object' then raise exception 'BADGE_PAYLOAD_INVALID' using errcode='22023'; end if;
  if v_code!~'^[a-z][a-z0-9_\-]{1,79}$' then raise exception 'ADMIN_CODE_INVALID' using errcode='22023'; end if;
  if nullif(v_name,'') is null or nullif(v_title,'') is null or nullif(v_description,'') is null then
    raise exception 'BADGE_FIELDS_REQUIRED' using errcode='22023';
  end if;

  select payload->>'request_hash',payload->'result' into v_existing_hash,v_existing_result
  from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;

  if v_rule_version_id is not null and not exists (
    select 1
    from orchestration.rule_versions version
    join orchestration.rule_definitions definition on definition.id=version.rule_definition_id
    where version.id=v_rule_version_id and version.status='published'
      and definition.status='active' and definition.owner_organization_id=p_organization_id
  ) then
    raise exception 'BADGE_RULE_NOT_FOUND' using errcode='P0002';
  end if;

  if v_definition_id is null then
    insert into engagement.badge_definitions(id,owner_organization_id,code,name,status)
    values(gen_random_uuid(),p_organization_id,v_code,v_name,'active')
    returning id into v_definition_id;
  else
    update engagement.badge_definitions set code=v_code,name=v_name,status='active'
    where id=v_definition_id and owner_organization_id=p_organization_id;
    if not found then raise exception 'BADGE_NOT_FOUND' using errcode='P0002'; end if;
  end if;

  select coalesce(max(version_number),0)+1 into v_next_version
  from engagement.badge_versions where badge_definition_id=v_definition_id;
  insert into engagement.badge_versions(
    id,badge_definition_id,version_number,status,title,description,
    criteria_rule_version_id,asset_file_object_id,published_at
  ) values(
    gen_random_uuid(),v_definition_id,v_next_version,v_status,v_title,v_description,
    v_rule_version_id,null,case when v_status='published' then now() else null end
  ) returning id into v_version_id;

  v_result:=jsonb_build_object('definition_id',v_definition_id,'version_id',v_version_id,'criteria_rule_version_id',v_rule_version_id,'status',v_status);
  perform app_private.e14_lock_scope('badge|'||v_definition_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events where aggregate_type='badge' and aggregate_id=v_definition_id;
  perform app_private.e14_append_event(
    v_event_id,'admin.badge.catalog.saved','badge',v_definition_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'badge',v_definition_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.save_admin_badge_catalog(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_admin_badge_catalog(uuid,uuid,jsonb,text) to postgres,service_role,app_worker;

commit;
