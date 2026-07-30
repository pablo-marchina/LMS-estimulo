begin;

create or replace function public.retire_admin_journey(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_journey_definition_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text := app_private.e14_request_hash(jsonb_build_object('journey_definition_id',p_journey_definition_id));
  v_event_id uuid := app_private.e14_command_event_id('retire_admin_journey',p_actor_user_account_id,p_organization_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_before jsonb;
  v_after jsonb;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  select payload->>'request_hash',payload->'result' into v_existing_hash,v_existing_result from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;

  perform app_private.e14_lock_scope('journey-definition|'||p_journey_definition_id::text);
  select to_jsonb(jd) into v_before
    from catalog.journey_definitions jd
   where jd.id=p_journey_definition_id and jd.owner_organization_id=p_organization_id
   for update;
  if not found then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;

  update catalog.journey_definitions
     set status='retired',updated_at=now()
   where id=p_journey_definition_id;
  update catalog.journey_versions
     set status='retired',retired_at=coalesce(retired_at,now())
   where journey_definition_id=p_journey_definition_id and status='draft';

  select to_jsonb(jd) into v_after from catalog.journey_definitions jd where jd.id=p_journey_definition_id;
  insert into experience.admin_content_revisions(organization_id,resource_type,resource_id,operation,previous_value,new_value,actor_user_account_id)
  values(p_organization_id,'journey_definition',p_journey_definition_id,'retired',v_before,v_after,p_actor_user_account_id);

  v_result:=jsonb_build_object('journey_definition_id',p_journey_definition_id,'status','retired');
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version from eventing.events where aggregate_type='journey_definition' and aggregate_id=p_journey_definition_id;
  perform app_private.e14_append_event(v_event_id,'admin.journey.retired','journey_definition',p_journey_definition_id,'user_account',p_actor_user_account_id,p_organization_id,null,'journey_definition',p_journey_definition_id,v_aggregate_version,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result));
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

create or replace function public.publish_admin_diagnostic_transition(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_diagnostic_version_id uuid,
  p_archetype_mapping jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text := app_private.e14_request_hash(jsonb_build_object('diagnostic_version_id',p_diagnostic_version_id,'archetype_mapping',p_archetype_mapping));
  v_event_id uuid := app_private.e14_command_event_id('publish_admin_diagnostic_transition',p_actor_user_account_id,p_organization_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_target_definition_id uuid;
  v_target_archetype_codes jsonb;
  v_previous_version_id uuid;
  v_old record;
  v_target_code text;
  v_target_version_id uuid;
  v_primary_count integer := 0;
  v_secondary_count integer := 0;
  v_journey_count integer := 0;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'diagnostic.configuration.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if jsonb_typeof(coalesce(p_archetype_mapping,'{}'::jsonb))<>'object' then
    raise exception 'ARCHETYPE_MAPPING_INVALID' using errcode='22023';
  end if;

  select payload->>'request_hash',payload->'result' into v_existing_hash,v_existing_result from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;

  perform app_private.e14_lock_scope('diagnostic-publication|'||p_organization_id::text);
  select dv.diagnostic_definition_id,coalesce(dv.configuration->'archetype_codes','[]'::jsonb)
    into v_target_definition_id,v_target_archetype_codes
    from diagnostics.diagnostic_versions dv
    join diagnostics.diagnostic_definitions dd on dd.id=dv.diagnostic_definition_id
   where dv.id=p_diagnostic_version_id
     and dv.status='draft'
     and dd.owner_organization_id=p_organization_id
   for update of dv,dd;
  if not found then raise exception 'DIAGNOSTIC_DRAFT_NOT_FOUND' using errcode='P0002'; end if;
  if jsonb_typeof(v_target_archetype_codes)<>'array' or jsonb_array_length(v_target_archetype_codes)<1 then
    raise exception 'TARGET_ARCHETYPES_REQUIRED' using errcode='22023';
  end if;
  if exists(
    select 1
      from jsonb_array_elements_text(v_target_archetype_codes) configured(code)
     where not exists(
       select 1
         from diagnostics.archetype_versions av
         join diagnostics.archetype_definitions ad on ad.id=av.archetype_definition_id
        where av.model_reference=p_diagnostic_version_id::text
          and av.status='draft'
          and ad.owner_organization_id=p_organization_id
          and ad.code=configured.code
     )
  ) then raise exception 'TARGET_ARCHETYPE_VERSION_MISSING' using errcode='22023'; end if;

  select dv.id
    into v_previous_version_id
    from diagnostics.diagnostic_versions dv
    join diagnostics.diagnostic_definitions dd on dd.id=dv.diagnostic_definition_id
   where dv.id<>p_diagnostic_version_id
     and dv.status='published'
     and dd.owner_organization_id=p_organization_id
     and exists(
       select 1
         from diagnostics.archetype_versions av
         join diagnostics.archetype_definitions ad on ad.id=av.archetype_definition_id
        where av.model_reference=dv.id::text
          and av.status='published'
          and ad.owner_organization_id=p_organization_id
     )
   order by dv.published_at desc nulls last,dv.version_number desc
   limit 1
   for update of dv,dd;

  if v_previous_version_id is not null then
    for v_old in
      select distinct ad.code
        from diagnostics.archetype_versions av
        join diagnostics.archetype_definitions ad on ad.id=av.archetype_definition_id
       where av.model_reference=v_previous_version_id::text
         and av.status='published'
         and ad.owner_organization_id=p_organization_id
    loop
      v_target_code:=nullif(p_archetype_mapping->>v_old.code,'');
      if v_target_code is null then raise exception 'ARCHETYPE_MAPPING_INCOMPLETE:%',v_old.code using errcode='22023'; end if;
      if not (v_target_archetype_codes ? v_target_code) then raise exception 'ARCHETYPE_MAPPING_TARGET_INVALID:%',v_target_code using errcode='22023'; end if;
      select av.id
        into v_target_version_id
        from diagnostics.archetype_versions av
        join diagnostics.archetype_definitions ad on ad.id=av.archetype_definition_id
       where av.model_reference=p_diagnostic_version_id::text
         and av.status='draft'
         and ad.owner_organization_id=p_organization_id
         and ad.code=v_target_code
       order by av.version_number desc
       limit 1;
      if v_target_version_id is null then raise exception 'ARCHETYPE_MAPPING_TARGET_INVALID:%',v_target_code using errcode='22023'; end if;
    end loop;
  end if;

  with version_map as (
    select distinct on (old_av.id)
           old_av.id as old_version_id,
           target_av.id as target_version_id
      from diagnostics.archetype_versions old_av
      join diagnostics.archetype_definitions old_ad on old_ad.id=old_av.archetype_definition_id
      join diagnostics.archetype_definitions target_ad on target_ad.owner_organization_id=p_organization_id and target_ad.code=(p_archetype_mapping->>old_ad.code)
      join diagnostics.archetype_versions target_av on target_av.archetype_definition_id=target_ad.id and target_av.model_reference=p_diagnostic_version_id::text and target_av.status='draft'
     where v_previous_version_id is not null
       and old_av.model_reference=v_previous_version_id::text
       and old_av.status='published'
       and (v_target_archetype_codes ? target_ad.code)
     order by old_av.id,target_av.version_number desc
  )
  update diagnostics.archetype_assignments aa
     set primary_archetype_version_id=version_map.target_version_id,
         model_version_reference=p_diagnostic_version_id::text,
         assigned_at=now()
    from version_map
   where aa.primary_archetype_version_id=version_map.old_version_id;
  get diagnostics v_primary_count=row_count;

  with version_map as (
    select distinct on (old_av.id)
           old_av.id as old_version_id,
           target_av.id as target_version_id
      from diagnostics.archetype_versions old_av
      join diagnostics.archetype_definitions old_ad on old_ad.id=old_av.archetype_definition_id
      join diagnostics.archetype_definitions target_ad on target_ad.owner_organization_id=p_organization_id and target_ad.code=(p_archetype_mapping->>old_ad.code)
      join diagnostics.archetype_versions target_av on target_av.archetype_definition_id=target_ad.id and target_av.model_reference=p_diagnostic_version_id::text and target_av.status='draft'
     where v_previous_version_id is not null
       and old_av.model_reference=v_previous_version_id::text
       and old_av.status='published'
       and (v_target_archetype_codes ? target_ad.code)
     order by old_av.id,target_av.version_number desc
  )
  update diagnostics.archetype_assignments aa
     set secondary_archetype_version_id=version_map.target_version_id,
         model_version_reference=p_diagnostic_version_id::text,
         assigned_at=now()
    from version_map
   where aa.secondary_archetype_version_id=version_map.old_version_id;
  get diagnostics v_secondary_count=row_count;

  perform set_config('app.admin_live_edit','on',true);
  update catalog.journey_versions jv
     set eligible_archetype_codes=array(
       select mapped_code
         from (
           select coalesce(p_archetype_mapping->>source_code,source_code) as mapped_code,min(position) as first_position
             from unnest(jv.eligible_archetype_codes) with ordinality as source(source_code,position)
            group by coalesce(p_archetype_mapping->>source_code,source_code)
         ) mapped
        order by first_position
     )
   where v_previous_version_id is not null
     and jv.journey_definition_id in (select id from catalog.journey_definitions where owner_organization_id=p_organization_id)
     and exists(select 1 from unnest(jv.eligible_archetype_codes) code where p_archetype_mapping ? code);
  get diagnostics v_journey_count=row_count;

  update diagnostics.diagnostic_versions
     set status='retired'
   where id<>p_diagnostic_version_id
     and status='published'
     and diagnostic_definition_id in (select id from diagnostics.diagnostic_definitions where owner_organization_id=p_organization_id);
  update diagnostics.diagnostic_definitions
     set status='retired'
   where id<>v_target_definition_id
     and owner_organization_id=p_organization_id
     and status='active';

  update diagnostics.archetype_versions
     set status='retired'
   where model_reference=v_previous_version_id::text and status='published';
  update diagnostics.archetype_versions av
     set status='retired'
    from diagnostics.archetype_definitions ad
   where ad.id=av.archetype_definition_id
     and av.model_reference=p_diagnostic_version_id::text
     and av.status='draft'
     and (
       not (v_target_archetype_codes ? ad.code)
       or exists(
         select 1
           from diagnostics.archetype_versions newer
          where newer.archetype_definition_id=av.archetype_definition_id
            and newer.model_reference=p_diagnostic_version_id::text
            and newer.status='draft'
            and newer.version_number>av.version_number
       )
     );
  update diagnostics.archetype_versions av
     set status='published',published_at=coalesce(published_at,now())
    from diagnostics.archetype_definitions ad
   where ad.id=av.archetype_definition_id
     and av.model_reference=p_diagnostic_version_id::text
     and av.status='draft'
     and (v_target_archetype_codes ? ad.code);
  update diagnostics.archetype_definitions ad
     set status=case when exists(
       select 1 from diagnostics.archetype_versions av where av.archetype_definition_id=ad.id and av.model_reference=p_diagnostic_version_id::text and av.status='published'
     ) then 'active' else 'retired' end
   where ad.owner_organization_id=p_organization_id;

  update diagnostics.diagnostic_versions
     set status='published',published_at=coalesce(published_at,now())
   where id=p_diagnostic_version_id;
  update diagnostics.diagnostic_definitions set status='active' where id=v_target_definition_id;

  v_result:=jsonb_build_object(
    'diagnostic_version_id',p_diagnostic_version_id,
    'previous_diagnostic_version_id',v_previous_version_id,
    'remapped_assignments',v_primary_count+v_secondary_count,
    'remapped_journey_versions',v_journey_count
  );
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version from eventing.events where aggregate_type='diagnostic_version' and aggregate_id=p_diagnostic_version_id;
  perform app_private.e14_append_event(v_event_id,'admin.diagnostic.published','diagnostic_version',p_diagnostic_version_id,'user_account',p_actor_user_account_id,p_organization_id,null,'diagnostic_version',p_diagnostic_version_id,v_aggregate_version,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result,'archetype_mapping',p_archetype_mapping));
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.retire_admin_journey(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.retire_admin_journey(uuid,uuid,uuid,text) to service_role;
revoke all on function public.publish_admin_diagnostic_transition(uuid,uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.publish_admin_diagnostic_transition(uuid,uuid,uuid,jsonb,text) to service_role;

commit;
