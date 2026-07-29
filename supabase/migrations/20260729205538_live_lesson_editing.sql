create or replace function public.save_admin_lesson(
  p_actor_user_account_id uuid,p_organization_id uuid,p_payload jsonb,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'payload',p_payload));
  v_event_id uuid:=app_private.e14_command_event_id('save_admin_lesson',p_actor_user_account_id,p_organization_id,v_key);
  v_existing_hash text;v_existing_result jsonb;
  v_path_id uuid:=nullif(p_payload->>'path_template_id','')::uuid;
  v_step_id uuid:=nullif(p_payload->>'step_id','')::uuid;
  v_activity_definition_id uuid;v_activity_version_id uuid;v_journey_version_id uuid;
  v_journey_status text;v_path_status text;
  v_code text:=lower(btrim(coalesce(p_payload->>'activity_definition_code','')));
  v_step_code text:=lower(btrim(coalesce(p_payload->>'step_code','')));
  v_activity_type text:=case when p_payload->>'activity_type'='practice' then 'practice' else 'content' end;
  v_next integer;v_reference_count integer;v_new_question_id uuid;v_configuration jsonb;
  v_before jsonb;v_after jsonb;v_result jsonb;v_aggregate_version bigint;
  v_library record;v_question jsonb;v_option jsonb;
  v_old_question record;v_old_option record;v_old_assessment record;v_old_practice record;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if jsonb_typeof(p_payload)<>'object' then raise exception 'LESSON_PAYLOAD_INVALID' using errcode='22023'; end if;
  if v_path_id is null then raise exception 'TRACK_REQUIRED' using errcode='22023'; end if;
  if nullif(btrim(p_payload->>'title'),'') is null then raise exception 'LESSON_TITLE_REQUIRED' using errcode='22023'; end if;
  if v_code!~'^[a-z][a-z0-9_\-]{1,79}$' then raise exception 'ADMIN_CODE_INVALID' using errcode='22023'; end if;
  if v_step_code!~'^[a-z][a-z0-9_\-]{1,79}$' then raise exception 'STEP_CODE_INVALID' using errcode='22023'; end if;
  select payload->>'request_hash',payload->'result' into v_existing_hash,v_existing_result from eventing.events where event_id=v_event_id;
  if found then if v_existing_hash is distinct from v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);end if;

  select pt.journey_version_id,pt.status,jv.status into v_journey_version_id,v_path_status,v_journey_status
  from orchestration.path_templates pt
  join catalog.journey_versions jv on jv.id=pt.journey_version_id
  join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
  where pt.id=v_path_id and jd.owner_organization_id=p_organization_id and jv.status in ('draft','published')
  for update of pt,jv;
  if not found then raise exception 'TRACK_NOT_FOUND' using errcode='P0002'; end if;
  if v_journey_status='published' and not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.publish') then raise exception 'FORBIDDEN_PUBLISH' using errcode='42501'; end if;
  if v_journey_status='published' then perform set_config('app.admin_live_edit','on',true); end if;

  v_configuration:=coalesce(p_payload->'configuration','{}'::jsonb);
  v_configuration:=v_configuration||jsonb_build_object('_editor',coalesce(v_configuration->'_editor','{}'::jsonb)||jsonb_build_object('saved_at',now(),'live_update',v_journey_status='published'));

  if v_step_id is not null then
    select ps.activity_version_id,av.activity_definition_id,
      jsonb_build_object(
        'path_step',to_jsonb(ps),'activity_version',to_jsonb(av),'activity_definition',to_jsonb(ad),
        'assets',coalesce((select jsonb_agg(to_jsonb(asset) order by asset.position,asset.id) from catalog.content_assets asset where asset.activity_version_id=av.id),'[]'::jsonb)
      )
      into v_activity_version_id,v_activity_definition_id,v_before
    from orchestration.path_steps ps
    join catalog.activity_versions av on av.id=ps.activity_version_id
    join catalog.activity_definitions ad on ad.id=av.activity_definition_id
    where ps.id=v_step_id and ps.path_template_id=v_path_id and ad.owner_organization_id=p_organization_id
    for update of ps,av,ad;
    if not found then raise exception 'LESSON_NOT_FOUND' using errcode='P0002'; end if;

    select count(*) into v_reference_count from orchestration.path_steps where activity_version_id=v_activity_version_id;
    if v_reference_count>1 then
      perform app_private.e14_lock_scope('activity-definition|'||v_activity_definition_id::text);
      select coalesce(max(version_number),0)+1 into v_next from catalog.activity_versions where activity_definition_id=v_activity_definition_id;
      insert into catalog.activity_versions(
        id,activity_definition_id,version_number,status,title,description,activity_type,configuration,
        estimated_minutes,published_at,content_hash,created_by,created_at
      )
      select gen_random_uuid(),activity_definition_id,v_next,v_journey_status,title,description,activity_type,
        coalesce(configuration,'{}'::jsonb)||jsonb_build_object('_editor',coalesce(configuration->'_editor','{}'::jsonb)||jsonb_build_object('isolated_from_activity_version_id',id,'saved_at',now())),
        estimated_minutes,case when v_journey_status='published' then now() else null end,
        app_private.e14_request_hash(jsonb_build_object('isolated_from',id,'path_step_id',v_step_id,'saved_at',now())),
        p_actor_user_account_id,now()
      from catalog.activity_versions where id=v_activity_version_id
      returning id into v_activity_version_id;

      insert into catalog.content_assets(id,activity_version_id,file_object_id,library_item_version_id,asset_type,title,external_url,language_code,accessibility_metadata,position,is_required,created_at)
      select gen_random_uuid(),v_activity_version_id,file_object_id,library_item_version_id,asset_type,title,external_url,language_code,accessibility_metadata,position,is_required,now()
      from catalog.content_assets where activity_version_id=(v_before#>>'{activity_version,id}')::uuid;

      select * into v_old_assessment from assessment.assessment_specs where activity_version_id=(v_before#>>'{activity_version,id}')::uuid;
      if found then
        insert into assessment.assessment_specs(activity_version_id,grading_mode,passing_score,max_attempts,time_limit_seconds,randomization_policy,feedback_policy)
        values(v_activity_version_id,v_old_assessment.grading_mode,v_old_assessment.passing_score,v_old_assessment.max_attempts,v_old_assessment.time_limit_seconds,v_old_assessment.randomization_policy,v_old_assessment.feedback_policy);
        for v_old_question in select * from assessment.questions where activity_version_id=(v_before#>>'{activity_version,id}')::uuid order by position,id loop
          v_new_question_id:=gen_random_uuid();
          insert into assessment.questions(id,activity_version_id,code,question_type,prompt,points,position,configuration)
          values(v_new_question_id,v_activity_version_id,v_old_question.code,v_old_question.question_type,v_old_question.prompt,v_old_question.points,v_old_question.position,v_old_question.configuration);
          for v_old_option in select * from assessment.answer_options where question_id=v_old_question.id order by position,id loop
            insert into assessment.answer_options(id,question_id,code,label,value,is_correct,position)
            values(gen_random_uuid(),v_new_question_id,v_old_option.code,v_old_option.label,v_old_option.value,v_old_option.is_correct,v_old_option.position);
          end loop;
        end loop;
      end if;
      select * into v_old_practice from assessment.practice_specs where activity_version_id=(v_before#>>'{activity_version,id}')::uuid;
      if found then
        insert into assessment.practice_specs(activity_version_id,submission_mode,allowed_evidence_types,max_submissions,review_required,rubric_version_id,terms_version)
        values(v_activity_version_id,v_old_practice.submission_mode,v_old_practice.allowed_evidence_types,v_old_practice.max_submissions,v_old_practice.review_required,v_old_practice.rubric_version_id,v_old_practice.terms_version);
      end if;
      update orchestration.path_steps set activity_version_id=v_activity_version_id where id=v_step_id;
      update orchestration.step_instances set activity_version_id=v_activity_version_id,updated_at=now() where path_step_id=v_step_id;
    end if;
  else
    v_activity_definition_id:=gen_random_uuid();
    insert into catalog.activity_definitions(id,owner_organization_id,code,activity_type,name,status,created_at,updated_at)
    values(v_activity_definition_id,p_organization_id,v_code,v_activity_type,btrim(p_payload->>'title'),'active',now(),now());
    v_activity_version_id:=gen_random_uuid();
    insert into catalog.activity_versions(id,activity_definition_id,version_number,status,title,description,activity_type,configuration,estimated_minutes,published_at,content_hash,created_by,created_at)
    values(v_activity_version_id,v_activity_definition_id,1,v_journey_status,btrim(p_payload->>'title'),nullif(btrim(p_payload->>'description'),''),v_activity_type,v_configuration,greatest(1,coalesce((p_payload->>'estimated_minutes')::integer,10)),case when v_journey_status='published' then now() else null end,app_private.e14_request_hash(jsonb_build_object('title',p_payload->>'title','configuration',v_configuration,'created_at',now())),p_actor_user_account_id,now());
    v_step_id:=gen_random_uuid();
    insert into orchestration.path_steps(id,path_template_id,code,activity_version_id,position_hint,is_required,availability_rule_version_id,completion_rule_version_id,due_offset,metadata)
    values(v_step_id,v_path_id,v_step_code,v_activity_version_id,greatest(1,coalesce((p_payload->>'position')::integer,1)),coalesce((p_payload->>'is_required')::boolean,true),null,null,null,coalesce(p_payload->'metadata','{}'::jsonb));
  end if;

  update catalog.activity_definitions set code=v_code,activity_type=v_activity_type,name=btrim(p_payload->>'title'),updated_at=now()
  where id=v_activity_definition_id and owner_organization_id=p_organization_id;
  update catalog.activity_versions set
    status=case when v_journey_status='published' then 'published' else status end,
    title=btrim(p_payload->>'title'),description=nullif(btrim(p_payload->>'description'),''),activity_type=v_activity_type,
    configuration=v_configuration,estimated_minutes=greatest(1,coalesce((p_payload->>'estimated_minutes')::integer,10)),
    published_at=case when v_journey_status='published' then coalesce(published_at,now()) else published_at end,
    content_hash=app_private.e14_request_hash(jsonb_build_object('title',p_payload->>'title','description',p_payload->>'description','activity_type',v_activity_type,'configuration',v_configuration))
  where id=v_activity_version_id and activity_definition_id=v_activity_definition_id;
  update orchestration.path_steps set
    code=v_step_code,position_hint=greatest(1,coalesce((p_payload->>'position')::integer,position_hint)),
    is_required=coalesce((p_payload->>'is_required')::boolean,is_required),metadata=coalesce(p_payload->'metadata',metadata),activity_version_id=v_activity_version_id
  where id=v_step_id and path_template_id=v_path_id;

  if coalesce(p_payload->>'content_source','current')='none' then
    delete from catalog.content_assets where activity_version_id=v_activity_version_id;
  elsif coalesce(p_payload->>'content_source','current') in ('library','new') then
    select liv.id,liv.title,liv.summary,liv.body,liv.content_kind,liv.content_format,liv.external_url,liv.file_object_id,liv.language_code,liv.accessibility_metadata,li.slug
      into v_library
    from catalog.library_item_versions liv join catalog.library_items li on li.id=liv.library_item_id
    where liv.id=nullif(p_payload->>'library_item_version_id','')::uuid and liv.status='published' and li.status='active' and li.owner_organization_id=p_organization_id;
    if not found then raise exception 'LIBRARY_CONTENT_NOT_FOUND' using errcode='P0002'; end if;
    delete from catalog.content_assets where activity_version_id=v_activity_version_id;
    insert into catalog.content_assets(id,activity_version_id,file_object_id,library_item_version_id,asset_type,title,external_url,language_code,accessibility_metadata,position,is_required,created_at)
    values(gen_random_uuid(),v_activity_version_id,v_library.file_object_id,v_library.id,
      case when v_library.content_format='podcast' then 'audio' when v_library.content_format in ('video','audio','image','pdf') then v_library.content_format when v_library.content_kind='article' then 'library_article' else 'external_link' end,
      v_library.title,coalesce(v_library.external_url,case when v_library.content_kind='article' then 'https://library.local/'||v_library.slug else null end),
      coalesce(v_library.language_code,'pt-BR'),coalesce(v_library.accessibility_metadata,'{}'::jsonb)||jsonb_build_object('description',coalesce(v_library.summary,''),'library_slug',v_library.slug,'source','library'),
      1,coalesce((p_payload->>'content_required')::boolean,false),now());
    insert into catalog.library_item_journey_links(library_item_version_id,journey_version_id,relation_type)
    values(v_library.id,v_journey_version_id,'supplemental') on conflict do nothing;
  end if;

  if jsonb_typeof(p_payload->'assessment')='object' and jsonb_array_length(coalesce(p_payload#>'{assessment,questions}','[]'::jsonb))>0 then
    insert into assessment.assessment_specs(activity_version_id,grading_mode,passing_score,max_attempts,time_limit_seconds,randomization_policy,feedback_policy)
    values(v_activity_version_id,'auto',nullif(p_payload#>>'{assessment,passing_score}','')::numeric,nullif(p_payload#>>'{assessment,max_attempts}','')::integer,null,'{}','{}')
    on conflict(activity_version_id) do update set passing_score=excluded.passing_score,max_attempts=excluded.max_attempts;
    delete from assessment.answer_options where question_id in(select id from assessment.questions where activity_version_id=v_activity_version_id);
    delete from assessment.questions where activity_version_id=v_activity_version_id;
    for v_question in select value from jsonb_array_elements(p_payload#>'{assessment,questions}') loop
      v_new_question_id:=gen_random_uuid();
      insert into assessment.questions(id,activity_version_id,code,question_type,prompt,points,position,configuration)
      values(v_new_question_id,v_activity_version_id,lower(btrim(v_question->>'code')),coalesce(nullif(v_question->>'question_type',''),'single_choice'),btrim(v_question->>'prompt'),coalesce((v_question->>'points')::numeric,1),coalesce((v_question->>'position')::integer,1),coalesce(v_question->'configuration','{}'::jsonb));
      for v_option in select value from jsonb_array_elements(coalesce(v_question->'options','[]'::jsonb)) loop
        insert into assessment.answer_options(id,question_id,code,label,value,is_correct,position)
        values(gen_random_uuid(),v_new_question_id,lower(btrim(v_option->>'code')),btrim(v_option->>'label'),coalesce(v_option->'value','{}'::jsonb),coalesce((v_option->>'is_correct')::boolean,false),coalesce((v_option->>'position')::integer,1));
      end loop;
    end loop;
  else
    delete from assessment.answer_options where question_id in(select id from assessment.questions where activity_version_id=v_activity_version_id);
    delete from assessment.questions where activity_version_id=v_activity_version_id;
    delete from assessment.assessment_specs where activity_version_id=v_activity_version_id;
  end if;

  if v_activity_type='practice' and jsonb_typeof(p_payload->'practice')='object' then
    insert into assessment.practice_specs(activity_version_id,submission_mode,allowed_evidence_types,max_submissions,review_required,rubric_version_id,terms_version)
    values(v_activity_version_id,coalesce(nullif(p_payload#>>'{practice,submission_mode}',''),'file'),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_payload#>'{practice,allowed_evidence_types}','["file","text"]'::jsonb))),array['file','text']::text[]),
      nullif(p_payload#>>'{practice,max_submissions}','')::integer,coalesce((p_payload#>>'{practice,review_required}')::boolean,true),null,nullif(p_payload#>>'{practice,terms_version}',''))
    on conflict(activity_version_id) do update set submission_mode=excluded.submission_mode,allowed_evidence_types=excluded.allowed_evidence_types,max_submissions=excluded.max_submissions,review_required=excluded.review_required,terms_version=excluded.terms_version;
  else
    delete from assessment.practice_specs where activity_version_id=v_activity_version_id;
  end if;

  if v_journey_status='published' then
    insert into orchestration.step_instances(id,path_assignment_id,path_step_id,activity_version_id,status,available_at,started_at,completed_at,attempt_count,aggregate_version,created_at,updated_at)
    select gen_random_uuid(),assignment.id,v_step_id,v_activity_version_id,
      case when coalesce((p_payload#>>'{metadata,always_available}')::boolean,true) then 'available' else 'locked' end,
      case when coalesce((p_payload#>>'{metadata,always_available}')::boolean,true) then now() else null end,
      null,null,0,0,now(),now()
    from orchestration.path_assignments assignment
    join orchestration.journey_instances instance on instance.id=assignment.journey_instance_id
    where assignment.path_template_id=v_path_id and assignment.status='active' and instance.status='in_progress'
      and not exists(select 1 from orchestration.step_instances step_instance where step_instance.path_assignment_id=assignment.id and step_instance.path_step_id=v_step_id);

    update orchestration.progress_projections projection set
      completed_required_steps=counts.completed_count,total_required_steps=counts.total_count,
      completion_ratio=case when counts.total_count=0 then 0 else counts.completed_count::numeric/counts.total_count end,
      projection_version=projection.projection_version+1,updated_at=now()
    from (
      select assignment.journey_instance_id,
        count(*) filter(where path.is_required and step.is_required and instance.status='completed')::integer completed_count,
        count(*) filter(where path.is_required and step.is_required)::integer total_count
      from orchestration.path_assignments assignment
      join orchestration.path_templates path on path.id=assignment.path_template_id
      join orchestration.step_instances instance on instance.path_assignment_id=assignment.id
      join orchestration.path_steps step on step.id=instance.path_step_id
      where assignment.journey_instance_id in(select journey_instance_id from orchestration.path_assignments where path_template_id=v_path_id)
        and assignment.status in ('active','completed')
      group by assignment.journey_instance_id
    ) counts
    where projection.journey_instance_id=counts.journey_instance_id;
  end if;

  select jsonb_build_object(
    'path_step',to_jsonb(ps),'activity_version',to_jsonb(av),'activity_definition',to_jsonb(ad),
    'assets',coalesce((select jsonb_agg(to_jsonb(asset) order by asset.position,asset.id) from catalog.content_assets asset where asset.activity_version_id=av.id),'[]'::jsonb),
    'assessment',case when spec.activity_version_id is null then null else jsonb_build_object(
      'passing_score',spec.passing_score,'max_attempts',spec.max_attempts,
      'questions',coalesce((select jsonb_agg(to_jsonb(question) order by question.position,question.id) from assessment.questions question where question.activity_version_id=av.id),'[]'::jsonb)
    ) end,
    'practice',to_jsonb(practice)
  ) into v_after
  from orchestration.path_steps ps
  join catalog.activity_versions av on av.id=ps.activity_version_id
  join catalog.activity_definitions ad on ad.id=av.activity_definition_id
  left join assessment.assessment_specs spec on spec.activity_version_id=av.id
  left join assessment.practice_specs practice on practice.activity_version_id=av.id
  where ps.id=v_step_id;

  insert into experience.admin_content_revisions(organization_id,resource_type,resource_id,operation,previous_value,new_value,actor_user_account_id)
  values(p_organization_id,'path_step',v_step_id,
    case when v_before is null then 'created' when v_journey_status='published' then 'live_updated' else 'draft_updated' end,
    v_before,v_after,p_actor_user_account_id);
  v_result:=jsonb_build_object('journey_version_id',v_journey_version_id,'path_template_id',v_path_id,'step_id',v_step_id,'activity_definition_id',v_activity_definition_id,'activity_version_id',v_activity_version_id,'status',v_journey_status,'live_update',v_journey_status='published');
  perform app_private.e14_lock_scope('path_step|'||v_step_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version from eventing.events where aggregate_type='path_step' and aggregate_id=v_step_id;
  perform app_private.e14_append_event(v_event_id,'admin.lesson.saved','path_step',v_step_id,'user_account',p_actor_user_account_id,p_organization_id,null,'path_step',v_step_id,v_aggregate_version,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result));
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.save_admin_lesson(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_admin_lesson(uuid,uuid,jsonb,text) to service_role;
