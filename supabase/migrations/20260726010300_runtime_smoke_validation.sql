-- Complete the current 12-question diagnostic through the public runtime chain and roll back synthetic data.
do $smoke$
declare
  v_actor uuid:=gen_random_uuid(); v_entrepreneur uuid:=gen_random_uuid(); v_journey_version uuid;
  v_enrollment jsonb; v_instance uuid; v_state jsonb; v_experience jsonb; v_diagnostic_version uuid;
  v_session uuid; v_session_version bigint; v_item record; v_option_code text; v_completed jsonb;
  v_required integer; v_responses integer; v_dimensions integer; v_dimension_results integer;
  v_step_count integer; v_path_step_count integer;
begin
  begin
    insert into iam.user_accounts(id,email_normalized,status)
    values(v_actor,'runtime-smoke-diagnostic-'||replace(v_actor::text,'-','')||'@invalid.local','active');
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
    join orchestration.path_assignments assignment on assignment.path_template_id=step.path_template_id
    where assignment.journey_instance_id=v_instance and assignment.status='active';

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
