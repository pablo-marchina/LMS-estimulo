-- Skip diagnosis, create the default path, validate all point rules and roll back synthetic data.
do $smoke$
declare
  v_actor uuid:=gen_random_uuid(); v_entrepreneur uuid:=gen_random_uuid(); v_journey_version uuid;
  v_enrollment jsonb; v_instance uuid; v_state jsonb; v_outline jsonb; v_action text;
  v_actions text[]:=array['rate_lesson','complete_quick_activity','complete_lesson','complete_basic_module','submit_practice','pass_path_assessment','complete_bonus_content','pass_basic_assessment','pass_advanced_assessment'];
  v_ledger_count integer; v_points integer; v_hub jsonb; v_before integer;
begin
  begin
    insert into iam.user_accounts(id,email_normalized,status)
    values(v_actor,'runtime-smoke-journey-'||replace(v_actor::text,'-','')||'@invalid.local','active');
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

    if not exists(
      select 1 from engagement.point_ledger ledger
      join engagement.point_rule_versions version on version.id=ledger.point_rule_version_id
      join engagement.point_rule_definitions definition on definition.id=version.point_rule_definition_id
      where ledger.entrepreneur_id=v_entrepreneur and definition.code='complete_welcome' and ledger.amount=10
    ) then raise exception 'SMOKE_WELCOME_POINTS_MISSING'; end if;

    foreach v_action in array v_actions loop
      perform public.award_participant_action_points(v_actor,v_instance,v_action,'smoke-source-'||v_action,'smoke-key-'||v_action);
    end loop;
    perform public.set_participant_application_objective(v_actor,'Aplicar IA para organizar vendas e atendimento','smoke-objective');

    select count(*),coalesce(sum(ledger.amount),0) into v_ledger_count,v_points
    from engagement.point_ledger ledger where ledger.entrepreneur_id=v_entrepreneur;
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
