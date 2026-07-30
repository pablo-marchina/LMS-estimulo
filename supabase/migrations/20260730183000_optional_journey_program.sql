begin;

alter table catalog.journey_definitions
  alter column program_id drop not null;

create or replace function public.save_admin_journey(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_payload jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text := app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'payload',p_payload));
  v_event_id uuid := app_private.e14_command_event_id('save_admin_journey',p_actor_user_account_id,p_organization_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_definition_id uuid := nullif(p_payload->>'definition_id','')::uuid;
  v_version_id uuid := nullif(p_payload->>'version_id','')::uuid;
  v_status text;
  v_code text := lower(btrim(coalesce(p_payload->>'code','')));
  v_next integer;
  v_configuration jsonb;
  v_before jsonb;
  v_after jsonb;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if jsonb_typeof(p_payload)<>'object' then raise exception 'JOURNEY_PAYLOAD_INVALID' using errcode='22023'; end if;
  if v_code!~'^[a-z][a-z0-9_\-]{1,79}$' then raise exception 'ADMIN_CODE_INVALID' using errcode='22023'; end if;
  if nullif(btrim(p_payload->>'title'),'') is null then raise exception 'JOURNEY_TITLE_REQUIRED' using errcode='22023'; end if;

  select payload->>'request_hash',payload->'result'
    into v_existing_hash,v_existing_result
    from eventing.events
   where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;

  v_configuration:=coalesce(p_payload->'configuration','{}'::jsonb);
  v_configuration:=v_configuration||jsonb_build_object('_editor',coalesce(v_configuration->'_editor','{}'::jsonb)||jsonb_build_object('saved_at',now()));

  if v_version_id is null then
    if v_definition_id is null then
      insert into catalog.journey_definitions(id,program_id,owner_organization_id,code,slug,name,purpose,status,created_at,updated_at)
      values(
        gen_random_uuid(),
        nullif(p_payload->>'program_id','')::uuid,
        p_organization_id,
        v_code,
        lower(btrim(coalesce(nullif(p_payload->>'slug',''),replace(v_code,'_','-')))),
        btrim(coalesce(nullif(p_payload->>'name',''),p_payload->>'title')),
        nullif(btrim(p_payload->>'purpose'),''),
        'active',now(),now()
      ) returning id into v_definition_id;
    else
      update catalog.journey_definitions
         set program_id=nullif(p_payload->>'program_id','')::uuid,
             code=v_code,
             slug=lower(btrim(coalesce(nullif(p_payload->>'slug',''),slug))),
             name=btrim(coalesce(nullif(p_payload->>'name',''),p_payload->>'title')),
             purpose=nullif(btrim(p_payload->>'purpose'),''),
             updated_at=now()
       where id=v_definition_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;
    end if;

    perform app_private.e14_lock_scope('journey-definition|'||v_definition_id::text);
    select coalesce(max(version_number),0)+1 into v_next from catalog.journey_versions where journey_definition_id=v_definition_id;
    v_version_id:=gen_random_uuid();
    insert into catalog.journey_versions(id,journey_definition_id,version_number,status,title,description,configuration,schema_version,eligible_archetype_codes,published_at,retired_at,content_hash,created_by,created_at)
    values(
      v_version_id,v_definition_id,v_next,'draft',btrim(p_payload->>'title'),nullif(btrim(p_payload->>'description'),''),v_configuration,'1',
      (select array_agg(value) from jsonb_array_elements_text(coalesce(p_payload->'eligible_archetype_codes','[]'::jsonb)) value),
      null,null,
      app_private.e14_request_hash(jsonb_build_object('title',p_payload->>'title','description',p_payload->>'description','configuration',v_configuration,'eligible_archetype_codes',coalesce(p_payload->'eligible_archetype_codes','[]'::jsonb))),
      p_actor_user_account_id,now()
    );
    v_status:='draft';
  else
    select jv.status,jv.journey_definition_id,jsonb_build_object('journey_version',to_jsonb(jv),'journey_definition',to_jsonb(jd))
      into v_status,v_definition_id,v_before
      from catalog.journey_versions jv
      join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
     where jv.id=v_version_id
       and jd.owner_organization_id=p_organization_id
       and jv.status in ('draft','published')
       for update of jv,jd;
    if not found then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;
    if v_status='published' and not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.publish') then
      raise exception 'FORBIDDEN_PUBLISH' using errcode='42501';
    end if;
    if v_status='published' then perform set_config('app.admin_live_edit','on',true); end if;

    update catalog.journey_definitions
       set program_id=nullif(p_payload->>'program_id','')::uuid,
           code=v_code,
           slug=lower(btrim(coalesce(nullif(p_payload->>'slug',''),slug))),
           name=btrim(coalesce(nullif(p_payload->>'name',''),p_payload->>'title')),
           purpose=nullif(btrim(p_payload->>'purpose'),''),
           updated_at=now()
     where id=v_definition_id and owner_organization_id=p_organization_id;

    update catalog.journey_versions
       set title=btrim(p_payload->>'title'),
           description=nullif(btrim(p_payload->>'description'),''),
           configuration=v_configuration,
           eligible_archetype_codes=(select array_agg(value) from jsonb_array_elements_text(coalesce(p_payload->'eligible_archetype_codes','[]'::jsonb)) value),
           published_at=case when v_status='published' then coalesce(published_at,now()) else published_at end,
           content_hash=app_private.e14_request_hash(jsonb_build_object('title',p_payload->>'title','description',p_payload->>'description','configuration',v_configuration,'eligible_archetype_codes',coalesce(p_payload->'eligible_archetype_codes','[]'::jsonb)))
     where id=v_version_id and journey_definition_id=v_definition_id;
  end if;

  select jsonb_build_object('journey_version',to_jsonb(jv),'journey_definition',to_jsonb(jd))
    into v_after
    from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
   where jv.id=v_version_id;

  insert into experience.admin_content_revisions(organization_id,resource_type,resource_id,operation,previous_value,new_value,actor_user_account_id)
  values(p_organization_id,'journey_version',v_version_id,case when v_before is null then 'created' when v_status='published' then 'live_updated' else 'draft_updated' end,v_before,v_after,p_actor_user_account_id);

  v_result:=jsonb_build_object('definition_id',v_definition_id,'version_id',v_version_id,'status',v_status,'live_update',v_status='published');
  perform app_private.e14_lock_scope('journey_version|'||v_version_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version from eventing.events where aggregate_type='journey_version' and aggregate_id=v_version_id;
  perform app_private.e14_append_event(v_event_id,'admin.journey.saved','journey_version',v_version_id,'user_account',p_actor_user_account_id,p_organization_id,null,'journey_version',v_version_id,v_aggregate_version,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result));
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

commit;
