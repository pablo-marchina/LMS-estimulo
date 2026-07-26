-- Executable smoke validation. Each scenario intentionally rolls back its synthetic data.

-- 1. Complete the current 12-question diagnostic through the public runtime chain.
do $smoke$
declare
  v_actor uuid:=gen_random_uuid();
  v_entrepreneur uuid:=gen_random_uuid();
  v_journey_version uuid;
  v_enrollment jsonb;
  v_instance uuid;
  v_state jsonb;
  v_experience jsonb;
  v_diagnostic_version uuid;
  v_session uuid;
  v_session_version bigint;
  v_item record;
  v_option_code text;
  v_completed jsonb;
  v_required integer;
  v_responses integer;
  v_dimensions integer;
  v_dimension_results integer;
  v_step_count integer;
  v_path_step_count integer;
begin
  begin
    insert into iam.user_accounts(id,email_normalized,status) values(v_actor,'runtime-smoke-diagnostic-'||replace(v_actor::text,'-','')||'@invalid.local','active');
    insert into core.entrepreneurs(id,user_account_id,preferred_name,email_normalized,status,profile_data)
    values(v_entrepreneur,v_actor,'Runtime Smoke Diagnostic','runtime-smoke-diagnostic-'||replace(v_actor::text,'-','')||'@invalid.local','active','{}'::jsonb);

    select version.id into v_journey_version
    from catalog.journey_versions version join catalog.journey_definitions definition on definition.id=version.journey_definition_id
    where definition.code='capacitacao_ia_mei_openai' and version.status='published'
    order by version.version_number desc limit 1;
    if v_journey_version is null then raise exception 'SMOKE_OPENAI_JOURNEY_MISSING'; end if;

    v_enrollment:=public.e14_self_enroll(v_actor,v_journey_version,'smoke-diagnostic-enroll');
    v_instance:=(v_enrollment->'data'->>'journey_instance_id')::uuid;
    v_state:=public.e14_get_participant_state(v_actor,v_instance);
    perform public.e14_start_journey(v_actor,v_instance,(v_state->>'journey_aggregate_version')::bigint,'smoke-diagnostic-start');
    v_experience:=public.get_participant_experience_with_default_diagnostic(v_actor,v_instance);
    v_diagnostic_version:=nullif(v_experience->'diagnostic'->>'version_id','')::uuid;
    if v_diagnostic_version is null then raise exception 'SMOKE_DIAGNOSTIC_NOT_AVAILABLE'; end if;
    if jsonb_array_length(v_experience->'diagnostic'->'items')<>12 then raise exception 'SMOKE_DIAGNOSTIC_EXPECTED_12_ITEMS'; end if;

    perform public.e14_start_diagnostic(v_actor,v_instance,v_diagnostic_version,'smoke-diagnostic-session-start');
    select session.id into v_session from diagnostics.sessions session
    where session.journey_instance_id=v_instance and session.diagnostic_version_id=v_diagnostic_version and session.status='in_progress'
    order by session.started_at desc limit 1;
    if v_session is null then raise exception 'SMOKE_DIAGNOSTIC_SESSION_MISSING'; end if;

    for v_item in select item.id,item.position from diagnostics.items item where item.diagnostic_version_id=v_diagnostic_version order by item.position loop
      select option.code into v_option_code from diagnostics.item_options option where option.item_id=v_item.id order by option.position limit 1;
      if v_option_code is null then raise exception 'SMOKE_DIAGNOSTIC_OPTION_MISSING'; end if;
      perform public.e14_record_diagnostic_response(v_actor,v_session,v_item.id,v_option_code,1,null,'smoke-diagnostic-answer-'||v_item.position::text);
    end loop;

    select session.aggregate_version into v_session_version from diagnostics.sessions session where session.id=v_session;
    v_completed:=public.e14_complete_diagnostic(v_actor,v_session,v_session_version,'smoke-diagnostic-complete');

    select count(*) filter(where item.is_required) into v_required from diagnostics.items item where item.diagnostic_version_id=v_diagnostic_version;
    select count(distinct response.item_id) into v_responses from diagnostics.responses response where response.session_id=v_session;
    select count(*) into v_dimensions from diagnostics.dimensions dimension where dimension.diagnostic_version_id=v_diagnostic_version;
    select count(*) into v_dimension_results from diagnostics.dimension_results result
    join diagnostics.results diagnostic_result on diagnostic_result.id=result.result_id where diagnostic_result.session_id=v_session;
    select count(*) into v_step_count from orchestration.step_instances instance
    join orchestration.path_assignments assignment on assignment.id=instance.path_assignment_id where assignment.journey_instance_id=v_instance;
    select count(*) into v_path_step_count from orchestration.path_steps step
    join orchestration.path_assignments assignment on assignment.path_template_id=step.path_template_id where assignment.journey_instance_id=v_instance and assignment.status='active';

    if (select status from diagnostics.sessions where id=v_session)<>'completed' then raise exception 'SMOKE_DIAGNOSTIC_NOT_COMPLETED'; end if;
    if v_responses<>v_required or v_responses<>12 then raise exception 'SMOKE_DIAGNOSTIC_RESPONSE_COUNT_INVALID'; end if;
    if not exists(select 1 from diagnostics.results result where result.session_id=v_session and result.status='completed') then raise exception 'SMOKE_DIAGNOSTIC_RESULT_MISSING'; end if;
    if v_dimension_results<>v_dimensions then raise exception 'SMOKE_DIAGNOSTIC_DIMENSIONS_INCOMPLETE'; end if;
    if v_step_count<>v_path_step_count or v_step_count<1 then raise exception 'SMOKE_DIAGNOSTIC_PATH_INCOMPLETE'; end if;
    if not exists(select 1 from orchestration.step_instances instance join orchestration.path_assignments assignment on assignment.id=instance.path_assignment_id where assignment.journey_instance_id=v_instance and instance.status='available') then raise exception 'SMOKE_DIAGNOSTIC_FIRST_STEP_UNAVAILABLE'; end if;
    if not exists(select 1 from diagnostics.archetype_assignments assignment where assignment.entrepreneur_id=v_entrepreneur and assignment.journey_instance_id=v_instance) then raise exception 'SMOKE_DIAGNOSTIC_ARCHETYPE_MISSING'; end if;
    if v_completed->'data'->>'result_id' is null then raise exception 'SMOKE_DIAGNOSTIC_RPC_RESULT_MISSING'; end if;

    raise exception using errcode='ZX001',message='ROLLBACK_DIAGNOSTIC_SMOKE';
  exception when sqlstate 'ZX001' then null;
  end;
end
$smoke$;

-- 2. Skip diagnosis, create the default path, and verify every point rule and ranking projection.
do $smoke$
declare
  v_actor uuid:=gen_random_uuid();
  v_entrepreneur uuid:=gen_random_uuid();
  v_journey_version uuid;
  v_enrollment jsonb;
  v_instance uuid;
  v_state jsonb;
  v_outline jsonb;
  v_action text;
  v_actions text[]:=array[
    'rate_lesson','complete_quick_activity','complete_lesson','complete_basic_module','submit_practice',
    'pass_path_assessment','complete_bonus_content','pass_basic_assessment','pass_advanced_assessment'
  ];
  v_ledger_count integer;
  v_points integer;
  v_hub jsonb;
  v_before integer;
begin
  begin
    insert into iam.user_accounts(id,email_normalized,status) values(v_actor,'runtime-smoke-journey-'||replace(v_actor::text,'-','')||'@invalid.local','active');
    insert into core.entrepreneurs(id,user_account_id,preferred_name,email_normalized,status,profile_data)
    values(v_entrepreneur,v_actor,'Runtime Smoke Journey','runtime-smoke-journey-'||replace(v_actor::text,'-','')||'@invalid.local','active','{}'::jsonb);

    select version.id into v_journey_version
    from catalog.journey_versions version join catalog.journey_definitions definition on definition.id=version.journey_definition_id
    where definition.code='capacitacao_ia_mei_openai' and version.status='published'
    order by version.version_number desc limit 1;
    v_enrollment:=public.e14_self_enroll(v_actor,v_journey_version,'smoke-journey-enroll');
    v_instance:=(v_enrollment->'data'->>'journey_instance_id')::uuid;
    v_state:=public.e14_get_participant_state(v_actor,v_instance);
    perform public.e14_start_journey(v_actor,v_instance,(v_state->>'journey_aggregate_version')::bigint,'smoke-journey-start');
    perform public.ensure_participant_default_path(v_actor,v_instance,'smoke-journey-default-path');

    if exists(select 1 from diagnostics.sessions session where session.journey_instance_id=v_instance) then raise exception 'SMOKE_OPTIONAL_DIAGNOSTIC_CREATED_SESSION'; end if;
    if not exists(select 1 from orchestration.path_assignments assignment where assignment.journey_instance_id=v_instance and assignment.status='active') then raise exception 'SMOKE_DEFAULT_PATH_MISSING'; end if;
    if (select count(*) from orchestration.step_instances instance join orchestration.path_assignments assignment on assignment.id=instance.path_assignment_id where assignment.journey_instance_id=v_instance)
      <>(select count(*) from orchestration.path_steps step join orchestration.path_assignments assignment on assignment.path_template_id=step.path_template_id where assignment.journey_instance_id=v_instance and assignment.status='active')
      then raise exception 'SMOKE_DEFAULT_PATH_STEP_COUNT_INVALID'; end if;
    v_outline:=public.get_participant_journey_outline(v_actor,v_instance);
    if jsonb_array_length(v_outline->'modules')<1 then raise exception 'SMOKE_JOURNEY_OUTLINE_EMPTY'; end if;

    -- journey.instance.started awards the welcome points through the event trigger.
    if not exists(select 1 from engagement.point_ledger ledger join engagement.point_rule_versions version on version.id=ledger.point_rule_version_id join engagement.point_rule_definitions definition on definition.id=version.point_rule_definition_id where ledger.entrepreneur_id=v_entrepreneur and definition.code='complete_welcome' and ledger.amount=10) then raise exception 'SMOKE_WELCOME_POINTS_MISSING'; end if;

    foreach v_action in array v_actions loop
      perform public.award_participant_action_points(v_actor,v_instance,v_action,'smoke-source-'||v_action,'smoke-key-'||v_action);
    end loop;
    perform public.set_participant_application_objective(v_actor,'Aplicar IA para organizar vendas e atendimento','smoke-objective');

    select count(*),coalesce(sum(ledger.amount),0) into v_ledger_count,v_points from engagement.point_ledger ledger where ledger.entrepreneur_id=v_entrepreneur;
    if v_ledger_count<>11 or v_points<>263 then raise exception 'SMOKE_POINT_TOTAL_INVALID count=% total=%',v_ledger_count,v_points; end if;
    if (select count(*) from engagement.point_rule_definitions definition where definition.status='active')<>11 then raise exception 'SMOKE_ACTIVE_POINT_RULE_COUNT_INVALID'; end if;
    v_hub:=public.get_participant_engagement_hub(v_actor);
    if (v_hub->'own_rank'->>'points')::integer<>263 then raise exception 'SMOKE_RANKING_POINTS_INVALID'; end if;
    if jsonb_array_length(v_hub->'point_history')<>11 then raise exception 'SMOKE_POINT_HISTORY_INVALID'; end if;

    v_before:=v_points;
    perform public.e14_start_journey(v_actor,v_instance,0,'smoke-journey-start');
    foreach v_action in array v_actions loop
      perform public.award_participant_action_points(v_actor,v_instance,v_action,'smoke-source-'||v_action,'smoke-key-'||v_action);
    end loop;
    perform public.set_participant_application_objective(v_actor,'Aplicar IA para organizar vendas e atendimento','smoke-objective');
    select coalesce(sum(ledger.amount),0) into v_points from engagement.point_ledger ledger where ledger.entrepreneur_id=v_entrepreneur;
    if v_points<>v_before then raise exception 'SMOKE_POINT_IDEMPOTENCY_FAILED'; end if;

    raise exception using errcode='ZX002',message='ROLLBACK_JOURNEY_POINTS_SMOKE';
  exception when sqlstate 'ZX002' then null;
  end;
end
$smoke$;

-- 3. Validate banner intent, confirmation, announcement publication, global visibility and download descriptor.
do $smoke$
declare
  v_admin uuid;
  v_org uuid;
  v_actor uuid:=gen_random_uuid();
  v_entrepreneur uuid:=gen_random_uuid();
  v_intent jsonb;
  v_file jsonb;
  v_saved jsonb;
  v_announcement uuid;
  v_hub jsonb;
  v_descriptor jsonb;
begin
  begin
    select organization.id into v_org from iam.organizations organization where organization.slug='estimulo' and organization.status='active' limit 1;
    select account.id into v_admin from iam.user_accounts account
    where account.status='active' and app_private.e14_actor_has_permission(account.id,v_org,'engagement.manage')
    order by account.created_at limit 1;
    if v_admin is null then raise exception 'SMOKE_ANNOUNCEMENT_ADMIN_MISSING'; end if;

    insert into iam.user_accounts(id,email_normalized,status) values(v_actor,'runtime-smoke-banner-'||replace(v_actor::text,'-','')||'@invalid.local','active');
    insert into core.entrepreneurs(id,user_account_id,preferred_name,email_normalized,status,profile_data)
    values(v_entrepreneur,v_actor,'Runtime Smoke Banner','runtime-smoke-banner-'||replace(v_actor::text,'-','')||'@invalid.local','active','{}'::jsonb);

    v_intent:=public.create_announcement_banner_upload_intent(v_admin,v_org,'smoke-banner.webp','image/webp','supabase_storage','announcement-banners','smoke-banner-intent');
    v_file:=public.confirm_announcement_banner_upload(v_admin,v_org,(v_intent->'data'->>'upload_intent_id')::uuid,'image/webp',1024,repeat('a',64),null,null,jsonb_build_object('width',1600,'height',600),'smoke-banner-confirm');
    v_saved:=public.save_operator_announcement(v_admin,v_org,null,null,'Banner de validação','Banner de validação do carrossel',null,null,'published',100,null,null,
      (v_file->'data'->>'file_object_id')::uuid,'Banner horizontal de validação da Estímulo','image_only','smoke-banner-save');
    v_announcement:=(v_saved->'data'->>'announcement_id')::uuid;
    v_hub:=public.get_participant_engagement_hub(v_actor);
    if not exists(select 1 from jsonb_array_elements(v_hub->'announcements') item where (item->>'id')::uuid=v_announcement and item->>'display_mode'='image_only') then raise exception 'SMOKE_GLOBAL_ANNOUNCEMENT_MISSING'; end if;
    v_descriptor:=public.get_announcement_banner_download(v_actor,v_announcement);
    if v_descriptor->>'object_key' is null or v_descriptor->>'bucket'<>'announcement-banners' then raise exception 'SMOKE_ANNOUNCEMENT_DESCRIPTOR_INVALID'; end if;

    raise exception using errcode='ZX003',message='ROLLBACK_ANNOUNCEMENT_SMOKE';
  exception when sqlstate 'ZX003' then null;
  end;
end
$smoke$;
