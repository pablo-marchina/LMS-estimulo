-- Create or update the optional badge attached to any draft journey track.

create or replace function public.save_admin_path_badge(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_path_template_id uuid,
  p_title text,
  p_description text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text:=app_private.e14_request_hash(jsonb_build_object(
    'path_template_id',p_path_template_id,
    'title',btrim(p_title),
    'description',nullif(btrim(p_description),'')
  ));
  v_event_id uuid:=app_private.e14_command_event_id('save_admin_path_badge',p_actor_user_account_id,p_path_template_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_rule_definition_id uuid;
  v_rule_version_id uuid;
  v_badge_definition_id uuid;
  v_badge_version_id uuid;
  v_next_version integer;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if nullif(btrim(p_title),'') is null then
    raise exception 'BADGE_TITLE_REQUIRED' using errcode='22023';
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

  if not exists (
    select 1
    from orchestration.path_templates pt
    join catalog.journey_versions jv on jv.id=pt.journey_version_id
    join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
    where pt.id=p_path_template_id
      and pt.status='draft'
      and jv.status='draft'
      and jd.owner_organization_id=p_organization_id
  ) then
    raise exception 'PATH_TEMPLATE_DRAFT_NOT_FOUND' using errcode='P0002';
  end if;

  select rv.id,rv.rule_definition_id,bv.id,bv.badge_definition_id
    into v_rule_version_id,v_rule_definition_id,v_badge_version_id,v_badge_definition_id
  from orchestration.rule_versions rv
  join engagement.badge_versions bv on bv.criteria_rule_version_id=rv.id
  join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
  where rv.status='draft'
    and bv.status='draft'
    and rv.language='credential-v1'
    and rv.expression->>'scope'='path'
    and rv.expression->>'path_template_id'=p_path_template_id::text
    and bd.owner_organization_id=p_organization_id
  order by bv.version_number desc
  limit 1;

  if v_badge_version_id is null then
    v_rule_definition_id:=gen_random_uuid();
    insert into orchestration.rule_definitions(
      id,owner_organization_id,code,rule_type,name,status
    ) values (
      v_rule_definition_id,p_organization_id,
      'path_rule_'||replace(substr(p_path_template_id::text,1,8),'-',''),
      'credential',btrim(p_title)||' — regra','active'
    );

    v_rule_version_id:=gen_random_uuid();
    insert into orchestration.rule_versions(
      id,rule_definition_id,version_number,status,language,expression,
      input_schema,output_schema,published_at,content_hash,created_at
    ) values (
      v_rule_version_id,v_rule_definition_id,1,'draft','credential-v1',
      jsonb_build_object('scope','path','path_template_id',p_path_template_id::text),
      '{}'::jsonb,'{}'::jsonb,null,
      app_private.e14_request_hash(jsonb_build_object(
        'scope','path','path_template_id',p_path_template_id::text,'created_for',v_event_id
      )),now()
    );

    v_badge_definition_id:=gen_random_uuid();
    insert into engagement.badge_definitions(
      id,owner_organization_id,code,name,status
    ) values (
      v_badge_definition_id,p_organization_id,
      'path_badge_'||replace(substr(p_path_template_id::text,1,8),'-',''),
      btrim(p_title),'active'
    );

    v_badge_version_id:=gen_random_uuid();
    insert into engagement.badge_versions(
      id,badge_definition_id,version_number,status,title,description,
      criteria_rule_version_id,asset_file_object_id,published_at
    ) values (
      v_badge_version_id,v_badge_definition_id,1,'draft',btrim(p_title),
      coalesce(nullif(btrim(p_description),''),btrim(p_title)),
      v_rule_version_id,null,null
    );
  else
    update engagement.badge_definitions
      set name=btrim(p_title)
      where id=v_badge_definition_id and owner_organization_id=p_organization_id;
    update engagement.badge_versions
      set title=btrim(p_title),
          description=coalesce(nullif(btrim(p_description),''),btrim(p_title))
      where id=v_badge_version_id and status='draft';
  end if;

  v_result:=jsonb_build_object(
    'path_template_id',p_path_template_id,
    'badge_version_id',v_badge_version_id,
    'title',btrim(p_title)
  );
  perform app_private.e14_lock_scope('path_template|'||p_path_template_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events where aggregate_type='path_template' and aggregate_id=p_path_template_id;
  perform app_private.e14_append_event(
    v_event_id,'engagement.path_badge.saved','path_template',p_path_template_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'path_template',p_path_template_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.save_admin_path_badge(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.save_admin_path_badge(uuid,uuid,uuid,text,text,text) to service_role;
