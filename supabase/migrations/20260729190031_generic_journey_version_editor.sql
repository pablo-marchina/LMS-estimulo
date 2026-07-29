-- Generic journey editor foundation.
-- Published versions remain immutable; any owned journey version can be cloned
-- into a complete draft containing tracks, lessons, content, assessments,
-- practices and path credentials.

create or replace function public.get_admin_journey_editor_details(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_journey_version_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
begin
  if not (
    app_private.estimulo_staff_can_view(p_actor_user_account_id,p_organization_id)
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage')
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  if not exists (
    select 1
    from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
    where jv.id=p_journey_version_id
      and jd.owner_organization_id=p_organization_id
  ) then
    raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002';
  end if;

  return jsonb_build_object(
    'journey_version_id',p_journey_version_id,
    'activities',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'activity_version_id',av.id,
        'activity_definition_id',ad.id,
        'definition_code',ad.code,
        'definition_name',ad.name,
        'version_number',av.version_number,
        'status',av.status,
        'estimated_minutes',av.estimated_minutes,
        'assets',(select coalesce(jsonb_agg(jsonb_build_object(
          'id',ca.id,
          'asset_type',ca.asset_type,
          'title',ca.title,
          'external_url',ca.external_url,
          'file_object_id',ca.file_object_id,
          'library_item_version_id',ca.library_item_version_id,
          'position',ca.position,
          'is_required',ca.is_required,
          'accessibility_metadata',ca.accessibility_metadata
        ) order by ca.position,ca.id),'[]'::jsonb)
          from catalog.content_assets ca where ca.activity_version_id=av.id),
        'assessment',(select jsonb_build_object(
          'passing_score',spec.passing_score,
          'max_attempts',spec.max_attempts,
          'questions',(select coalesce(jsonb_agg(jsonb_build_object(
            'id',q.id,
            'code',q.code,
            'prompt',q.prompt,
            'question_type',q.question_type,
            'points',q.points,
            'position',q.position,
            'configuration',q.configuration,
            'options',(select coalesce(jsonb_agg(jsonb_build_object(
              'id',answer.id,
              'code',answer.code,
              'label',answer.label,
              'value',answer.value,
              'is_correct',answer.is_correct,
              'position',answer.position
            ) order by answer.position,answer.id),'[]'::jsonb)
              from assessment.answer_options answer where answer.question_id=q.id)
          ) order by q.position,q.id),'[]'::jsonb)
            from assessment.questions q where q.activity_version_id=av.id)
        ) from assessment.assessment_specs spec where spec.activity_version_id=av.id),
        'practice',(select jsonb_build_object(
          'submission_mode',practice.submission_mode,
          'allowed_evidence_types',practice.allowed_evidence_types,
          'max_submissions',practice.max_submissions,
          'review_required',practice.review_required,
          'terms_version',practice.terms_version
        ) from assessment.practice_specs practice where practice.activity_version_id=av.id)
      ) order by av.id),'[]'::jsonb)
      from (
        select distinct ps.activity_version_id
        from orchestration.path_templates pt
        join orchestration.path_steps ps on ps.path_template_id=pt.id
        where pt.journey_version_id=p_journey_version_id
      ) linked
      join catalog.activity_versions av on av.id=linked.activity_version_id
      join catalog.activity_definitions ad on ad.id=av.activity_definition_id
      where ad.owner_organization_id=p_organization_id
    )
  );
end;
$function$;

revoke all on function public.get_admin_journey_editor_details(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_admin_journey_editor_details(uuid,uuid,uuid) to service_role;

create or replace function public.clear_admin_activity_parts(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_journey_version_id uuid,
  p_activity_version_id uuid,
  p_clear_content boolean,
  p_clear_assessment boolean,
  p_clear_practice boolean,
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
    'journey_version_id',p_journey_version_id,
    'activity_version_id',p_activity_version_id,
    'clear_content',coalesce(p_clear_content,false),
    'clear_assessment',coalesce(p_clear_assessment,false),
    'clear_practice',coalesce(p_clear_practice,false)
  ));
  v_event_id uuid:=app_private.e14_command_event_id('clear_admin_activity_parts',p_actor_user_account_id,p_activity_version_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
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
    from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
    join orchestration.path_templates pt on pt.journey_version_id=jv.id
    join orchestration.path_steps ps on ps.path_template_id=pt.id
    join catalog.activity_versions av on av.id=ps.activity_version_id
    where jv.id=p_journey_version_id
      and jv.status='draft'
      and jd.owner_organization_id=p_organization_id
      and av.id=p_activity_version_id
      and av.status='draft'
  ) then
    raise exception 'ACTIVITY_DRAFT_NOT_FOUND' using errcode='P0002';
  end if;

  if coalesce(p_clear_content,false) then
    delete from catalog.content_assets where activity_version_id=p_activity_version_id;
  end if;
  if coalesce(p_clear_assessment,false) then
    delete from assessment.answer_options where question_id in (
      select id from assessment.questions where activity_version_id=p_activity_version_id
    );
    delete from assessment.questions where activity_version_id=p_activity_version_id;
    delete from assessment.assessment_specs where activity_version_id=p_activity_version_id;
  end if;
  if coalesce(p_clear_practice,false) then
    delete from assessment.practice_specs where activity_version_id=p_activity_version_id;
  end if;

  v_result:=jsonb_build_object(
    'journey_version_id',p_journey_version_id,
    'activity_version_id',p_activity_version_id,
    'content_cleared',coalesce(p_clear_content,false),
    'assessment_cleared',coalesce(p_clear_assessment,false),
    'practice_cleared',coalesce(p_clear_practice,false)
  );

  perform app_private.e14_lock_scope('activity_version|'||p_activity_version_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events where aggregate_type='activity_version' and aggregate_id=p_activity_version_id;
  perform app_private.e14_append_event(
    v_event_id,'catalog.activity.parts.cleared','activity_version',p_activity_version_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'activity_version',p_activity_version_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.clear_admin_activity_parts(uuid,uuid,uuid,uuid,boolean,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.clear_admin_activity_parts(uuid,uuid,uuid,uuid,boolean,boolean,boolean,text) to service_role;

create or replace function public.create_admin_journey_draft_from_version(
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
  v_request_hash text:=app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,
    'source_journey_version_id',p_source_journey_version_id
  ));
  v_event_id uuid:=app_private.e14_command_event_id('create_admin_journey_draft_from_version',p_actor_user_account_id,p_source_journey_version_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_source catalog.journey_versions%rowtype;
  v_definition_id uuid;
  v_next_version integer;
  v_new_journey_version_id uuid;
  v_new_path_id uuid;
  v_new_activity_version_id uuid;
  v_new_rule_version_id uuid;
  v_new_badge_version_id uuid;
  v_activity_map jsonb:='{}'::jsonb;
  v_configuration jsonb;
  v_result jsonb;
  v_aggregate_version bigint;
  v_path record;
  v_step record;
  v_activity record;
  v_asset record;
  v_assessment record;
  v_question record;
  v_option record;
  v_practice record;
  v_credential record;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
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

  select jv.* into v_source
  from catalog.journey_versions jv
  join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
  where jv.id=p_source_journey_version_id
    and jd.owner_organization_id=p_organization_id;
  if not found then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;
  v_definition_id:=v_source.journey_definition_id;

  if v_source.status='draft' then
    v_result:=jsonb_build_object(
      'journey_version_id',v_source.id,
      'version_number',v_source.version_number,
      'source_journey_version_id',v_source.id,
      'already_editable',true
    );
  else
    perform app_private.e14_lock_scope('journey-definition|'||v_definition_id::text);
    select coalesce(max(version_number),0)+1 into v_next_version
    from catalog.journey_versions where journey_definition_id=v_definition_id;

    v_new_journey_version_id:=gen_random_uuid();
    v_configuration:=coalesce(v_source.configuration,'{}'::jsonb)
      ||jsonb_build_object('_editor',jsonb_build_object(
        'cloned_from_journey_version_id',v_source.id,
        'cloned_at',now()
      ));

    insert into catalog.journey_versions(
      id,journey_definition_id,version_number,status,title,description,configuration,
      schema_version,eligible_archetype_codes,published_at,retired_at,content_hash,created_by,created_at
    ) values (
      v_new_journey_version_id,v_definition_id,v_next_version,'draft',v_source.title,v_source.description,
      v_configuration,v_source.schema_version,v_source.eligible_archetype_codes,null,null,
      app_private.e14_request_hash(jsonb_build_object(
        'title',v_source.title,'description',v_source.description,'configuration',v_configuration
      )),p_actor_user_account_id,now()
    );

    for v_path in
      select * from orchestration.path_templates
      where journey_version_id=v_source.id order by position,id
    loop
      v_new_path_id:=gen_random_uuid();
      insert into orchestration.path_templates(
        id,journey_version_id,code,name,description,is_default,status,position,is_required,presentation
      ) values (
        v_new_path_id,v_new_journey_version_id,v_path.code,v_path.name,v_path.description,
        v_path.is_default,'draft',v_path.position,v_path.is_required,v_path.presentation
      );

      for v_step in
        select * from orchestration.path_steps
        where path_template_id=v_path.id order by position_hint,id
      loop
        v_new_activity_version_id:=nullif(v_activity_map->>v_step.activity_version_id::text,'')::uuid;
        if v_new_activity_version_id is null then
          select av.*,ad.id as definition_id into v_activity
          from catalog.activity_versions av
          join catalog.activity_definitions ad on ad.id=av.activity_definition_id
          where av.id=v_step.activity_version_id
            and ad.owner_organization_id=p_organization_id;
          if not found then raise exception 'ACTIVITY_NOT_FOUND' using errcode='P0002'; end if;

          perform app_private.e14_lock_scope('activity-definition|'||v_activity.definition_id::text);
          select coalesce(max(version_number),0)+1 into v_next_version
          from catalog.activity_versions where activity_definition_id=v_activity.definition_id;
          v_new_activity_version_id:=gen_random_uuid();
          v_configuration:=coalesce(v_activity.configuration,'{}'::jsonb)
            ||jsonb_build_object('_editor',jsonb_build_object(
              'cloned_from_activity_version_id',v_activity.id,
              'cloned_at',now()
            ));

          insert into catalog.activity_versions(
            id,activity_definition_id,version_number,status,title,description,activity_type,
            configuration,estimated_minutes,published_at,content_hash,created_by,created_at
          ) values (
            v_new_activity_version_id,v_activity.definition_id,v_next_version,'draft',v_activity.title,
            v_activity.description,v_activity.activity_type,v_configuration,v_activity.estimated_minutes,null,
            app_private.e14_request_hash(jsonb_build_object(
              'title',v_activity.title,'description',v_activity.description,
              'activity_type',v_activity.activity_type,'configuration',v_configuration
            )),p_actor_user_account_id,now()
          );
          v_activity_map:=v_activity_map||jsonb_build_object(v_activity.id::text,v_new_activity_version_id::text);

          for v_asset in
            select * from catalog.content_assets
            where activity_version_id=v_activity.id order by position,id
          loop
            insert into catalog.content_assets(
              id,activity_version_id,file_object_id,library_item_version_id,asset_type,title,
              external_url,language_code,accessibility_metadata,position,is_required,created_at
            ) values (
              gen_random_uuid(),v_new_activity_version_id,v_asset.file_object_id,v_asset.library_item_version_id,
              v_asset.asset_type,v_asset.title,v_asset.external_url,v_asset.language_code,
              v_asset.accessibility_metadata,v_asset.position,v_asset.is_required,now()
            );
          end loop;

          select * into v_assessment
          from assessment.assessment_specs where activity_version_id=v_activity.id;
          if found then
            insert into assessment.assessment_specs(
              activity_version_id,grading_mode,passing_score,max_attempts,time_limit_seconds,
              randomization_policy,feedback_policy
            ) values (
              v_new_activity_version_id,v_assessment.grading_mode,v_assessment.passing_score,
              v_assessment.max_attempts,v_assessment.time_limit_seconds,
              v_assessment.randomization_policy,v_assessment.feedback_policy
            );
            for v_question in
              select * from assessment.questions
              where activity_version_id=v_activity.id order by position,id
            loop
              v_new_rule_version_id:=gen_random_uuid();
              insert into assessment.questions(
                id,activity_version_id,code,question_type,prompt,points,position,configuration
              ) values (
                v_new_rule_version_id,v_new_activity_version_id,v_question.code,v_question.question_type,
                v_question.prompt,v_question.points,v_question.position,v_question.configuration
              );
              for v_option in
                select * from assessment.answer_options
                where question_id=v_question.id order by position,id
              loop
                insert into assessment.answer_options(
                  id,question_id,code,label,value,is_correct,position
                ) values (
                  gen_random_uuid(),v_new_rule_version_id,v_option.code,v_option.label,
                  v_option.value,v_option.is_correct,v_option.position
                );
              end loop;
            end loop;
          end if;

          select * into v_practice
          from assessment.practice_specs where activity_version_id=v_activity.id;
          if found then
            insert into assessment.practice_specs(
              activity_version_id,submission_mode,allowed_evidence_types,max_submissions,
              review_required,rubric_version_id,terms_version
            ) values (
              v_new_activity_version_id,v_practice.submission_mode,v_practice.allowed_evidence_types,
              v_practice.max_submissions,v_practice.review_required,v_practice.rubric_version_id,
              v_practice.terms_version
            );
          end if;
        end if;

        insert into orchestration.path_steps(
          id,path_template_id,code,activity_version_id,position_hint,is_required,
          availability_rule_version_id,completion_rule_version_id,due_offset,metadata
        ) values (
          gen_random_uuid(),v_new_path_id,v_step.code,v_new_activity_version_id,v_step.position_hint,
          v_step.is_required,v_step.availability_rule_version_id,v_step.completion_rule_version_id,
          v_step.due_offset,v_step.metadata
        );
      end loop;

      for v_credential in
        select
          rv.rule_definition_id,rv.language,rv.expression,rv.input_schema,rv.output_schema,
          bv.badge_definition_id,bv.title,bv.description,bv.asset_file_object_id
        from orchestration.rule_versions rv
        join engagement.badge_versions bv on bv.criteria_rule_version_id=rv.id
        join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
        where rv.language='credential-v1'
          and rv.expression->>'scope'='path'
          and rv.expression->>'path_template_id'=v_path.id::text
          and bd.owner_organization_id=p_organization_id
      loop
        perform app_private.e14_lock_scope('rule-definition|'||v_credential.rule_definition_id::text);
        select coalesce(max(version_number),0)+1 into v_next_version
        from orchestration.rule_versions where rule_definition_id=v_credential.rule_definition_id;
        v_new_rule_version_id:=gen_random_uuid();
        v_configuration:=v_credential.expression||jsonb_build_object('path_template_id',v_new_path_id::text);
        insert into orchestration.rule_versions(
          id,rule_definition_id,version_number,status,language,expression,input_schema,
          output_schema,published_at,content_hash,created_at
        ) values (
          v_new_rule_version_id,v_credential.rule_definition_id,v_next_version,'draft',
          v_credential.language,v_configuration,v_credential.input_schema,v_credential.output_schema,
          null,app_private.e14_request_hash(jsonb_build_object(
            'language',v_credential.language,'expression',v_configuration,
            'input_schema',v_credential.input_schema,'output_schema',v_credential.output_schema
          )),now()
        );

        perform app_private.e14_lock_scope('badge-definition|'||v_credential.badge_definition_id::text);
        select coalesce(max(version_number),0)+1 into v_next_version
        from engagement.badge_versions where badge_definition_id=v_credential.badge_definition_id;
        v_new_badge_version_id:=gen_random_uuid();
        insert into engagement.badge_versions(
          id,badge_definition_id,version_number,status,title,description,
          criteria_rule_version_id,asset_file_object_id,published_at
        ) values (
          v_new_badge_version_id,v_credential.badge_definition_id,v_next_version,'draft',
          v_credential.title,v_credential.description,v_new_rule_version_id,
          v_credential.asset_file_object_id,null
        );
      end loop;
    end loop;

    v_result:=jsonb_build_object(
      'journey_version_id',v_new_journey_version_id,
      'version_number',(select version_number from catalog.journey_versions where id=v_new_journey_version_id),
      'source_journey_version_id',v_source.id,
      'already_editable',false
    );
  end if;

  perform app_private.e14_lock_scope('journey-definition|'||v_definition_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events where aggregate_type='journey_definition' and aggregate_id=v_definition_id;
  perform app_private.e14_append_event(
    v_event_id,'catalog.journey_version.draft_cloned','journey_version',
    (v_result->>'journey_version_id')::uuid,'user_account',p_actor_user_account_id,
    p_organization_id,null,'journey_definition',v_definition_id,v_aggregate_version,
    v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.create_admin_journey_draft_from_version(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.create_admin_journey_draft_from_version(uuid,uuid,uuid,text) to service_role;
