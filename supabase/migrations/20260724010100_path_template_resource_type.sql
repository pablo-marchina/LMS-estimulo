-- Task 2: add `path_template` resource type to save_admin_product_resource so the
-- admin builder can create/edit/reorder a trilha (orchestration.path_templates) row
-- independent of adding an aula (path_step) to it.
--
-- Base: live pg_get_functiondef(oid) for public.save_admin_product_resource pulled
-- from the dev database immediately before authoring this migration. Every existing
-- branch (journey/activity/path_step/rule/diagnostic/point_rule/badge/certificate) is
-- reproduced byte-identical except for:
--   1. the permission-bucket line, which now also covers 'path_template'
--   2. the new 'path_template' branch inserted after 'path_step' and before 'rule'

CREATE OR REPLACE FUNCTION public.save_admin_product_resource(p_actor_user_account_id uuid, p_organization_id uuid, p_resource_type text, p_payload jsonb, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_permission text;
  v_request_hash text;
  v_event_id uuid;
  v_existing_hash text;
  v_existing_result jsonb;
  v_result jsonb;
  v_definition_id uuid;
  v_version_id uuid;
  v_path_id uuid;
  v_activity_definition_id uuid;
  v_activity_version_id uuid;
  v_rule_definition_id uuid;
  v_rule_version_id uuid;
  v_next_version integer;
  v_item jsonb;
  v_option jsonb;
  v_dimension_id uuid;
  v_subject_id uuid;
  v_status text;
  v_code text;
  v_aggregate_version bigint;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if jsonb_typeof(p_payload)<>'object' then raise exception 'ADMIN_PAYLOAD_INVALID' using errcode='22023'; end if;
  v_permission:=case
    when p_resource_type in('journey','activity','path_step','rule','path_template') then 'journey.definition.manage'
    when p_resource_type='diagnostic' then 'diagnostic.configuration.manage'
    when p_resource_type in('point_rule','badge','certificate') then 'engagement.manage'
    else null
  end;
  if v_permission is null then raise exception 'ADMIN_RESOURCE_TYPE_INVALID' using errcode='22023'; end if;
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,v_permission) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  v_request_hash:=app_private.e14_request_hash(jsonb_build_object('resource_type',p_resource_type,'payload',p_payload));
  v_event_id:=app_private.e14_command_event_id('save_admin_product_resource',p_actor_user_account_id,p_organization_id,p_idempotency_key);
  select payload->>'request_hash',payload->'result' into v_existing_hash,v_existing_result from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;
  v_code:=lower(btrim(coalesce(p_payload->>'code','')));
  if v_code!~'^[a-z][a-z0-9_\-]{1,79}$' then raise exception 'ADMIN_CODE_INVALID' using errcode='22023'; end if;

  if p_resource_type='journey' then
    v_definition_id:=nullif(p_payload->>'definition_id','')::uuid;
    if v_definition_id is null then
      if nullif(p_payload->>'program_id','') is null then raise exception 'PROGRAM_REQUIRED' using errcode='22023'; end if;
      insert into catalog.journey_definitions(id,program_id,owner_organization_id,code,slug,name,purpose,status,created_at,updated_at)
      values(gen_random_uuid(),(p_payload->>'program_id')::uuid,p_organization_id,v_code,lower(btrim(coalesce(p_payload->>'slug',replace(v_code,'_','-')))),btrim(p_payload->>'name'),nullif(btrim(p_payload->>'purpose'),''),'active',now(),now())
      returning id into v_definition_id;
    else
      update catalog.journey_definitions set program_id=coalesce(nullif(p_payload->>'program_id','')::uuid,program_id),code=v_code,slug=lower(btrim(coalesce(p_payload->>'slug',slug))),name=btrim(p_payload->>'name'),purpose=nullif(btrim(p_payload->>'purpose'),''),updated_at=now()
      where id=v_definition_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    v_version_id:=nullif(p_payload->>'version_id','')::uuid;
    if v_version_id is null then
      select coalesce(max(version_number),0)+1 into v_next_version from catalog.journey_versions where journey_definition_id=v_definition_id;
      insert into catalog.journey_versions(id,journey_definition_id,version_number,status,title,description,configuration,schema_version,eligible_archetype_codes,published_at,retired_at,content_hash,created_by,created_at)
      values(gen_random_uuid(),v_definition_id,v_next_version,'draft',btrim(p_payload->>'title'),nullif(btrim(p_payload->>'description'),''),coalesce(p_payload->'configuration','{}'::jsonb),'1',
        (select array_agg(value) from jsonb_array_elements_text(coalesce(p_payload->'eligible_archetype_codes','[]'::jsonb)) as value),
        null,null,app_private.e14_request_hash(jsonb_build_object('title',p_payload->>'title','description',p_payload->>'description','configuration',coalesce(p_payload->'configuration','{}'::jsonb))),p_actor_user_account_id,now())
      returning id into v_version_id;
    else
      update catalog.journey_versions set title=btrim(p_payload->>'title'),description=nullif(btrim(p_payload->>'description'),''),configuration=coalesce(p_payload->'configuration','{}'::jsonb),
        eligible_archetype_codes=(select array_agg(value) from jsonb_array_elements_text(coalesce(p_payload->'eligible_archetype_codes','[]'::jsonb)) as value),
        content_hash=app_private.e14_request_hash(jsonb_build_object('title',p_payload->>'title','description',p_payload->>'description','configuration',coalesce(p_payload->'configuration','{}'::jsonb)))
      where id=v_version_id and journey_definition_id=v_definition_id and status='draft';
      if not found then raise exception 'JOURNEY_DRAFT_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    v_result:=jsonb_build_object('definition_id',v_definition_id,'version_id',v_version_id);
    v_subject_id:=v_definition_id;

  elsif p_resource_type='activity' then
    v_activity_definition_id:=nullif(p_payload->>'definition_id','')::uuid;
    if v_activity_definition_id is null then
      insert into catalog.activity_definitions(id,owner_organization_id,code,activity_type,name,status,created_at,updated_at)
      values(gen_random_uuid(),p_organization_id,v_code,btrim(p_payload->>'activity_type'),btrim(p_payload->>'name'),'active',now(),now())
      returning id into v_activity_definition_id;
    else
      update catalog.activity_definitions set code=v_code,activity_type=btrim(p_payload->>'activity_type'),name=btrim(p_payload->>'name'),updated_at=now()
      where id=v_activity_definition_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'ACTIVITY_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    v_activity_version_id:=nullif(p_payload->>'version_id','')::uuid;
    if v_activity_version_id is null then
      select coalesce(max(version_number),0)+1 into v_next_version from catalog.activity_versions where activity_definition_id=v_activity_definition_id;
      insert into catalog.activity_versions(id,activity_definition_id,version_number,status,title,description,activity_type,configuration,estimated_minutes,published_at,content_hash,created_by,created_at)
      values(gen_random_uuid(),v_activity_definition_id,v_next_version,'draft',btrim(p_payload->>'title'),nullif(btrim(p_payload->>'description'),''),btrim(p_payload->>'activity_type'),coalesce(p_payload->'configuration','{}'::jsonb),greatest(0,coalesce((p_payload->>'estimated_minutes')::integer,0)),null,app_private.e14_request_hash(jsonb_build_object('title',p_payload->>'title','description',p_payload->>'description','activity_type',p_payload->>'activity_type','configuration',coalesce(p_payload->'configuration','{}'::jsonb))),p_actor_user_account_id,now())
      returning id into v_activity_version_id;
    else
      update catalog.activity_versions set title=btrim(p_payload->>'title'),description=nullif(btrim(p_payload->>'description'),''),activity_type=btrim(p_payload->>'activity_type'),configuration=coalesce(p_payload->'configuration','{}'::jsonb),estimated_minutes=greatest(0,coalesce((p_payload->>'estimated_minutes')::integer,0)),content_hash=app_private.e14_request_hash(jsonb_build_object('title',p_payload->>'title','description',p_payload->>'description','activity_type',p_payload->>'activity_type','configuration',coalesce(p_payload->'configuration','{}'::jsonb)))
      where id=v_activity_version_id and activity_definition_id=v_activity_definition_id and status='draft';
      if not found then raise exception 'ACTIVITY_DRAFT_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    if p_payload?'asset' and jsonb_typeof(p_payload->'asset')='object' and nullif(p_payload#>>'{asset,title}','') is not null then
      delete from catalog.content_assets where activity_version_id=v_activity_version_id;
      insert into catalog.content_assets(id,activity_version_id,file_object_id,asset_type,title,external_url,language_code,accessibility_metadata,position,is_required,created_at)
      values(gen_random_uuid(),v_activity_version_id,null,btrim(p_payload#>>'{asset,type}'),btrim(p_payload#>>'{asset,title}'),nullif(btrim(p_payload#>>'{asset,url}'),''),coalesce(nullif(p_payload#>>'{asset,language}',''),'pt-BR'),coalesce(p_payload#>'{asset,accessibility}','{}'::jsonb),1,coalesce((p_payload#>>'{asset,required}')::boolean,true),now());
    end if;
    if btrim(p_payload->>'activity_type')='practice' and jsonb_typeof(coalesce(p_payload->'practice','{}'::jsonb))='object' then
      insert into assessment.practice_specs(activity_version_id,submission_mode,allowed_evidence_types,max_submissions,review_required,rubric_version_id,terms_version)
      values(v_activity_version_id,coalesce(nullif(p_payload#>>'{practice,submission_mode}',''),'file'),coalesce(array(select jsonb_array_elements_text(coalesce(p_payload#>'{practice,allowed_evidence_types}','["file"]'::jsonb))),array['file']::text[]),nullif(p_payload#>>'{practice,max_submissions}','')::integer,coalesce((p_payload#>>'{practice,review_required}')::boolean,true),null,nullif(p_payload#>>'{practice,terms_version}',''))
      on conflict(activity_version_id) do update set submission_mode=excluded.submission_mode,allowed_evidence_types=excluded.allowed_evidence_types,max_submissions=excluded.max_submissions,review_required=excluded.review_required,terms_version=excluded.terms_version;
    end if;
    v_result:=jsonb_build_object('definition_id',v_activity_definition_id,'version_id',v_activity_version_id);
    v_subject_id:=v_activity_definition_id;

  elsif p_resource_type='path_step' then
    v_path_id:=nullif(p_payload->>'path_template_id','')::uuid;
    if v_path_id is null then
      insert into orchestration.path_templates(id,journey_version_id,code,name,description,is_default,status)
      select gen_random_uuid(),jv.id,v_code,btrim(p_payload->>'path_name'),nullif(btrim(p_payload->>'path_description'),''),coalesce((p_payload->>'is_default')::boolean,false),'draft'
      from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
      where jv.id=(p_payload->>'journey_version_id')::uuid and jv.status='draft' and jd.owner_organization_id=p_organization_id
      returning id into v_path_id;
      if v_path_id is null then raise exception 'JOURNEY_DRAFT_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    v_activity_version_id:=(p_payload->>'activity_version_id')::uuid;
    if not exists(select 1 from catalog.activity_versions av join catalog.activity_definitions ad on ad.id=av.activity_definition_id where av.id=v_activity_version_id and ad.owner_organization_id=p_organization_id) then
      raise exception 'ACTIVITY_NOT_FOUND' using errcode='P0002';
    end if;
    v_version_id:=nullif(p_payload->>'step_id','')::uuid;
    if v_version_id is null then
      insert into orchestration.path_steps(id,path_template_id,code,activity_version_id,position_hint,is_required,availability_rule_version_id,completion_rule_version_id,due_offset,metadata)
      values(gen_random_uuid(),v_path_id,lower(btrim(p_payload->>'step_code')),v_activity_version_id,greatest(1,(p_payload->>'position')::integer),coalesce((p_payload->>'is_required')::boolean,true),nullif(p_payload->>'availability_rule_version_id','')::uuid,nullif(p_payload->>'completion_rule_version_id','')::uuid,nullif(p_payload->>'due_offset','')::interval,coalesce(p_payload->'metadata','{}'::jsonb))
      returning id into v_version_id;
    else
      update orchestration.path_steps set code=lower(btrim(p_payload->>'step_code')),activity_version_id=v_activity_version_id,position_hint=greatest(1,(p_payload->>'position')::integer),is_required=coalesce((p_payload->>'is_required')::boolean,true),availability_rule_version_id=nullif(p_payload->>'availability_rule_version_id','')::uuid,completion_rule_version_id=nullif(p_payload->>'completion_rule_version_id','')::uuid,due_offset=nullif(p_payload->>'due_offset','')::interval,metadata=coalesce(p_payload->'metadata','{}'::jsonb)
      where id=v_version_id and path_template_id=v_path_id;
      if not found then raise exception 'PATH_STEP_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    v_result:=jsonb_build_object('path_template_id',v_path_id,'step_id',v_version_id);
    v_subject_id:=v_path_id;

  elsif p_resource_type='path_template' then
    v_path_id:=nullif(p_payload->>'path_template_id','')::uuid;
    if v_path_id is null then
      insert into orchestration.path_templates(id,journey_version_id,code,name,description,is_default,status,position)
      select gen_random_uuid(),jv.id,v_code,btrim(p_payload->>'name'),nullif(btrim(p_payload->>'description'),''),
        coalesce((p_payload->>'is_default')::boolean,false),'draft',coalesce((p_payload->>'position')::integer,0)
      from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
      where jv.id=(p_payload->>'journey_version_id')::uuid and jv.status='draft' and jd.owner_organization_id=p_organization_id
      returning id into v_path_id;
      if v_path_id is null then raise exception 'JOURNEY_DRAFT_NOT_FOUND' using errcode='P0002'; end if;
    else
      update orchestration.path_templates set
        name=btrim(p_payload->>'name'),
        description=nullif(btrim(p_payload->>'description'),''),
        position=coalesce((p_payload->>'position')::integer,position),
        is_default=coalesce((p_payload->>'is_default')::boolean,is_default)
      where id=v_path_id
        and journey_version_id in (select jv.id from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where jd.owner_organization_id=p_organization_id);
      if not found then raise exception 'PATH_TEMPLATE_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    v_result:=jsonb_build_object('journey_version_id',coalesce((p_payload->>'journey_version_id')::uuid,(select journey_version_id from orchestration.path_templates where id=v_path_id)),'path_template_id',v_path_id);
    v_subject_id:=v_path_id;

  elsif p_resource_type='rule' then
    v_rule_definition_id:=nullif(p_payload->>'definition_id','')::uuid;
    if v_rule_definition_id is null then
      insert into orchestration.rule_definitions(id,owner_organization_id,code,rule_type,name,status)
      values(gen_random_uuid(),p_organization_id,v_code,btrim(p_payload->>'rule_type'),btrim(p_payload->>'name'),'active')
      returning id into v_rule_definition_id;
    else
      update orchestration.rule_definitions set code=v_code,rule_type=btrim(p_payload->>'rule_type'),name=btrim(p_payload->>'name')
      where id=v_rule_definition_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'RULE_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    v_rule_version_id:=nullif(p_payload->>'version_id','')::uuid;
    if v_rule_version_id is null then
      select coalesce(max(version_number),0)+1 into v_next_version from orchestration.rule_versions where rule_definition_id=v_rule_definition_id;
      insert into orchestration.rule_versions(id,rule_definition_id,version_number,status,language,expression,input_schema,output_schema,published_at,content_hash,created_at)
      values(gen_random_uuid(),v_rule_definition_id,v_next_version,'draft',coalesce(nullif(p_payload->>'language',''),'json-logic'),coalesce(p_payload->'expression','{}'::jsonb),coalesce(p_payload->'input_schema','{}'::jsonb),coalesce(p_payload->'output_schema','{}'::jsonb),null,app_private.e14_request_hash(jsonb_build_object('expression',coalesce(p_payload->'expression','{}'::jsonb),'input_schema',coalesce(p_payload->'input_schema','{}'::jsonb),'output_schema',coalesce(p_payload->'output_schema','{}'::jsonb))),now())
      returning id into v_rule_version_id;
    else
      update orchestration.rule_versions set language=coalesce(nullif(p_payload->>'language',''),'json-logic'),expression=coalesce(p_payload->'expression','{}'::jsonb),input_schema=coalesce(p_payload->'input_schema','{}'::jsonb),output_schema=coalesce(p_payload->'output_schema','{}'::jsonb),content_hash=app_private.e14_request_hash(jsonb_build_object('expression',coalesce(p_payload->'expression','{}'::jsonb),'input_schema',coalesce(p_payload->'input_schema','{}'::jsonb),'output_schema',coalesce(p_payload->'output_schema','{}'::jsonb)))
      where id=v_rule_version_id and rule_definition_id=v_rule_definition_id and status='draft';
      if not found then raise exception 'RULE_DRAFT_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    v_result:=jsonb_build_object('definition_id',v_rule_definition_id,'version_id',v_rule_version_id);
    v_subject_id:=v_rule_definition_id;

  elsif p_resource_type='diagnostic' then
    v_definition_id:=nullif(p_payload->>'definition_id','')::uuid;
    if v_definition_id is null then
      insert into diagnostics.diagnostic_definitions(id,owner_organization_id,code,name,purpose,status)
      values(gen_random_uuid(),p_organization_id,v_code,btrim(p_payload->>'name'),btrim(p_payload->>'purpose'),'active')
      returning id into v_definition_id;
    else
      update diagnostics.diagnostic_definitions set code=v_code,name=btrim(p_payload->>'name'),purpose=btrim(p_payload->>'purpose')
      where id=v_definition_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'DIAGNOSTIC_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    -- NOTE: v_status is the caller's REQUESTED final status. The version row
    -- and its children (dimensions/items/item_options) are rebuilt while the
    -- row stays 'draft' -- diagnostics.dimensions/items/item_options each
    -- carry a BEFORE INSERT OR DELETE OR UPDATE trigger
    -- (trg_e14_diagnostic_*_immutable -> app_private.e14_reject_published_diagnostic_child)
    -- that raises PUBLISHED_DIAGNOSTIC_IMMUTABLE if the parent version's
    -- status is already 'published' at write time. Flipping status to
    -- 'published' is therefore deferred to a final update, after all child
    -- rebuild is done, that touches only diagnostic_versions (no trigger on
    -- that table) so it cannot trip the guard.
    v_status:=case when p_payload->>'status'='published' then 'published' else 'draft' end;
    v_version_id:=nullif(p_payload->>'version_id','')::uuid;
    if v_version_id is null then
      select coalesce(max(version_number),0)+1 into v_next_version from diagnostics.diagnostic_versions where diagnostic_definition_id=v_definition_id;
      insert into diagnostics.diagnostic_versions(id,diagnostic_definition_id,version_number,status,configuration,published_at,content_hash,created_at)
      values(gen_random_uuid(),v_definition_id,v_next_version,'draft',
        coalesce(p_payload->'configuration','{}'::jsonb) || jsonb_build_object('classification_rules',coalesce(p_payload->'classification_rules','{}'::jsonb)),
        null,app_private.e14_request_hash(coalesce(p_payload,'{}'::jsonb)),now())
      returning id into v_version_id;
    else
      update diagnostics.diagnostic_versions set
        configuration=coalesce(p_payload->'configuration','{}'::jsonb) || jsonb_build_object('classification_rules',coalesce(p_payload->'classification_rules','{}'::jsonb)),
        content_hash=app_private.e14_request_hash(coalesce(p_payload,'{}'::jsonb))
      where id=v_version_id and diagnostic_definition_id=v_definition_id and status='draft';
      if not found then raise exception 'DIAGNOSTIC_DRAFT_NOT_FOUND' using errcode='P0002'; end if;
      delete from diagnostics.item_options where item_id in (select id from diagnostics.items where diagnostic_version_id=v_version_id);
      delete from diagnostics.items where diagnostic_version_id=v_version_id;
      delete from diagnostics.dimensions where diagnostic_version_id=v_version_id;
    end if;
    for v_item in select value from jsonb_array_elements(coalesce(p_payload->'dimensions','[]'::jsonb)) loop
      insert into diagnostics.dimensions(id,diagnostic_version_id,code,name,description,minimum_answer_ratio,position)
      values(gen_random_uuid(),v_version_id,lower(btrim(v_item->>'code')),btrim(v_item->>'name'),nullif(btrim(v_item->>'description'),''),coalesce((v_item->>'minimum_answer_ratio')::numeric,1),coalesce((v_item->>'position')::integer,1));
    end loop;
    for v_item in select value from jsonb_array_elements(coalesce(p_payload->'items','[]'::jsonb)) loop
      select id into v_dimension_id from diagnostics.dimensions where diagnostic_version_id=v_version_id and code=lower(btrim(v_item->>'dimension_code'));
      insert into diagnostics.items(id,diagnostic_version_id,dimension_id,code,item_type,prompt,configuration,position,is_required)
      values(gen_random_uuid(),v_version_id,v_dimension_id,lower(btrim(v_item->>'code')),coalesce(nullif(v_item->>'item_type',''),'single_choice'),btrim(v_item->>'prompt'),coalesce(v_item->'configuration','{}'::jsonb),coalesce((v_item->>'position')::integer,1),coalesce((v_item->>'is_required')::boolean,true))
      returning id into v_activity_version_id;
      for v_option in select value from jsonb_array_elements(coalesce(v_item->'options','[]'::jsonb)) loop
        insert into diagnostics.item_options(id,item_id,code,label,value,position)
        values(gen_random_uuid(),v_activity_version_id,lower(btrim(v_option->>'code')),btrim(v_option->>'label'),coalesce(v_option->'value','{}'::jsonb),coalesce((v_option->>'position')::integer,1));
      end loop;
    end loop;
    for v_item in select value from jsonb_array_elements(coalesce(p_payload->'archetypes','[]'::jsonb)) loop
      insert into diagnostics.archetype_definitions(id,owner_organization_id,code,name,description,status)
      values(gen_random_uuid(),p_organization_id,lower(btrim(v_item->>'code')),btrim(v_item->>'name'),nullif(btrim(v_item->>'description'),''),'active')
      on conflict (owner_organization_id,code) do update set name=excluded.name,description=excluded.description
      returning id into v_activity_definition_id;
      select coalesce(max(version_number),0)+1 into v_next_version from diagnostics.archetype_versions where archetype_definition_id=v_activity_definition_id;
      insert into diagnostics.archetype_versions(id,archetype_definition_id,version_number,model_reference,status,validation_status,published_at)
      values(gen_random_uuid(),v_activity_definition_id,v_next_version,v_version_id::text,
        case when p_payload->>'status'='published' then 'published' else 'draft' end,'pending',
        case when p_payload->>'status'='published' then now() else null end);
    end loop;
    if v_status='published' then
      update diagnostics.diagnostic_versions set status='published',published_at=coalesce(published_at,now())
      where id=v_version_id;
    end if;
    v_result:=jsonb_build_object('definition_id',v_definition_id,'version_id',v_version_id);
    v_subject_id:=v_definition_id;

  elsif p_resource_type='point_rule' then
    v_definition_id:=nullif(p_payload->>'definition_id','')::uuid;
    if v_definition_id is null then
      insert into engagement.point_rule_definitions(id,owner_organization_id,code,name,status)
      values(gen_random_uuid(),p_organization_id,v_code,btrim(p_payload->>'name'),'active')
      returning id into v_definition_id;
    else
      update engagement.point_rule_definitions set code=v_code,name=btrim(p_payload->>'name')
      where id=v_definition_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'POINT_RULE_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    select coalesce(max(version_number),0)+1 into v_next_version from engagement.point_rule_versions where point_rule_definition_id=v_definition_id;
    v_status:=case when p_payload->>'status'='published' then 'published' else 'draft' end;
    insert into engagement.point_rule_versions(id,point_rule_definition_id,version_number,status,amount,eligibility_rule_version_id,recurrence_policy,published_at)
    values(gen_random_uuid(),v_definition_id,v_next_version,v_status,(p_payload->>'amount')::integer,(p_payload->>'eligibility_rule_version_id')::uuid,coalesce(p_payload->'recurrence_policy','{}'::jsonb),now())
    returning id into v_version_id;
    v_result:=jsonb_build_object('definition_id',v_definition_id,'version_id',v_version_id);
    v_subject_id:=v_definition_id;

  elsif p_resource_type='badge' then
    v_definition_id:=nullif(p_payload->>'definition_id','')::uuid;
    if v_definition_id is null then
      insert into engagement.badge_definitions(id,owner_organization_id,code,name,status)
      values(gen_random_uuid(),p_organization_id,v_code,btrim(p_payload->>'name'),'active')
      returning id into v_definition_id;
    else
      update engagement.badge_definitions set code=v_code,name=btrim(p_payload->>'name')
      where id=v_definition_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'BADGE_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    select coalesce(max(version_number),0)+1 into v_next_version from engagement.badge_versions where badge_definition_id=v_definition_id;
    v_status:=case when p_payload->>'status'='published' then 'published' else 'draft' end;
    insert into engagement.badge_versions(id,badge_definition_id,version_number,status,title,description,criteria_rule_version_id,asset_file_object_id,published_at)
    values(gen_random_uuid(),v_definition_id,v_next_version,v_status,btrim(p_payload->>'title'),btrim(p_payload->>'description'),(p_payload->>'criteria_rule_version_id')::uuid,null,case when v_status='published' then now() else null end)
    returning id into v_version_id;
    v_result:=jsonb_build_object('definition_id',v_definition_id,'version_id',v_version_id);
    v_subject_id:=v_definition_id;

  elsif p_resource_type='certificate' then
    v_definition_id:=nullif(p_payload->>'definition_id','')::uuid;
    if v_definition_id is null then
      insert into engagement.certificate_definitions(id,owner_organization_id,code,name,status)
      values(gen_random_uuid(),p_organization_id,v_code,btrim(p_payload->>'name'),'active')
      returning id into v_definition_id;
    else
      update engagement.certificate_definitions set code=v_code,name=btrim(p_payload->>'name')
      where id=v_definition_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'CERTIFICATE_NOT_FOUND' using errcode='P0002'; end if;
    end if;
    select coalesce(max(version_number),0)+1 into v_next_version from engagement.certificate_versions where certificate_definition_id=v_definition_id;
    v_status:=case when p_payload->>'status'='published' then 'published' else 'draft' end;
    insert into engagement.certificate_versions(id,certificate_definition_id,version_number,status,journey_version_id,requirements_rule_version_id,template_file_object_id,validity_policy,published_at)
    values(gen_random_uuid(),v_definition_id,v_next_version,v_status,(p_payload->>'journey_version_id')::uuid,(p_payload->>'requirements_rule_version_id')::uuid,null,coalesce(p_payload->'validity_policy','{}'::jsonb),case when v_status='published' then now() else null end)
    returning id into v_version_id;
    v_result:=jsonb_build_object('definition_id',v_definition_id,'version_id',v_version_id);
    v_subject_id:=v_definition_id;
  end if;

  -- Serialize concurrent saves of the same (resource_type, subject) around the
  -- read-then-write aggregate_version computation below, mirroring
  -- app_private.library_event_aggregate_version_trigger's identical pattern for
  -- eventing.events (pg_advisory_xact_lock via the app_private.e14_lock_scope
  -- helper already used throughout this function's E14 command family).
  -- Transaction-scoped: released automatically at commit/rollback, no explicit unlock needed.
  perform app_private.e14_lock_scope(p_resource_type||'|'||v_subject_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
    from eventing.events where aggregate_type=p_resource_type and aggregate_id=v_subject_id;
  perform app_private.e14_append_event(v_event_id,'admin.product.configuration.saved','user_account',p_actor_user_account_id,'user_account',p_actor_user_account_id,p_organization_id,null,p_resource_type,v_subject_id,v_aggregate_version,v_event_id,null,jsonb_build_object('resource_type',p_resource_type,'request_hash',v_request_hash,'result',v_result));
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;
