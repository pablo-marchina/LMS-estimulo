update engagement.point_rule_versions version set recurrence_policy=version.recurrence_policy || jsonb_build_object(
  'trigger',case definition.code
    when 'complete_welcome' then jsonb_build_object('event_name','journey.instance.started')
    when 'rate_lesson' then jsonb_build_object('event_name','learning.activity.utility.rated')
    when 'complete_quick_activity' then jsonb_build_object('event_name','assessment.attempt.submitted')
    when 'complete_lesson' then jsonb_build_object('event_name','learning.activity.completed')
    when 'complete_basic_module' then jsonb_build_object('event_name','journey.path.completed','path_codes',jsonb_build_array('marketing_vendas_ia'))
    when 'submit_practice' then jsonb_build_object('event_name','learning.practice.evidence.confirmed')
    when 'pass_path_assessment' then jsonb_build_object('event_name','assessment.attempt.passed','activity_codes',jsonb_build_array('marketing_aula_4','gestao_aula_5','codex_aula_6'))
    when 'complete_bonus_content' then jsonb_build_object('event_name','learning.activity.completed','is_bonus',true)
    when 'pass_basic_assessment' then jsonb_build_object('event_name','assessment.attempt.passed','activity_codes',jsonb_build_array('marketing_aula_4','gestao_aula_5'),'path_codes',jsonb_build_array('marketing_vendas_ia','gestao_ia'))
    when 'pass_advanced_assessment' then jsonb_build_object('event_name','assessment.attempt.passed','activity_codes',jsonb_build_array('codex_aula_6'),'path_codes',jsonb_build_array('desenvolvimento_codex'))
    else coalesce(version.recurrence_policy->'trigger','{}'::jsonb)
  end
)
from engagement.point_rule_definitions definition
where definition.id=version.point_rule_definition_id
  and definition.code in (
    'complete_welcome','rate_lesson','complete_quick_activity','complete_lesson','complete_basic_module',
    'submit_practice','pass_path_assessment','complete_bonus_content','pass_basic_assessment','pass_advanced_assessment'
  );

create or replace function app_private.award_points_for_event()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_actor uuid;
  v_organization_id uuid;
  v_activity_code text;
  v_path_code text;
  v_step_instance_id uuid;
  v_attempt_id uuid;
  v_is_bonus boolean:=false;
  v_rule record;
  v_rule_code text;
  v_trigger jsonb;
  v_scope text;
  v_source_reference text;
  v_idempotency_key text;
begin
  if new.event_name='engagement.points.awarded' then return new; end if;
  if new.actor_type='user_account' then v_actor:=new.actor_id; end if;
  if v_actor is null and new.subject_type='user_account' then v_actor:=new.subject_id; end if;
  if v_actor is null then return new; end if;

  v_organization_id:=new.organization_id;
  if v_organization_id is null and new.journey_instance_id is not null then
    select definition.owner_organization_id into v_organization_id
    from orchestration.journey_instances instance
    join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
    join catalog.journey_versions version on version.id=enrollment.journey_version_id
    join catalog.journey_definitions definition on definition.id=version.journey_definition_id
    where instance.id=new.journey_instance_id;
  end if;
  if v_organization_id is null then return new; end if;

  if new.aggregate_type in ('step','step_instance') then
    v_step_instance_id:=new.aggregate_id;
  elsif new.aggregate_type='attempt' then
    v_attempt_id:=new.aggregate_id;
  end if;

  if v_attempt_id is not null then
    select attempt.step_instance_id,activity_definition.code,path.code,
      coalesce((activity_version.configuration->>'is_bonus')::boolean,false)
    into v_step_instance_id,v_activity_code,v_path_code,v_is_bonus
    from assessment.attempts attempt
    join catalog.activity_versions activity_version on activity_version.id=attempt.activity_version_id
    join catalog.activity_definitions activity_definition on activity_definition.id=activity_version.activity_definition_id
    join orchestration.step_instances step_instance on step_instance.id=attempt.step_instance_id
    join orchestration.path_assignments assignment on assignment.id=step_instance.path_assignment_id
    join orchestration.path_templates path on path.id=assignment.path_template_id
    where attempt.id=v_attempt_id;
  elsif v_step_instance_id is not null then
    select activity_definition.code,path.code,
      coalesce((activity_version.configuration->>'is_bonus')::boolean,false)
    into v_activity_code,v_path_code,v_is_bonus
    from orchestration.step_instances step_instance
    join catalog.activity_versions activity_version on activity_version.id=step_instance.activity_version_id
    join catalog.activity_definitions activity_definition on activity_definition.id=activity_version.activity_definition_id
    join orchestration.path_assignments assignment on assignment.id=step_instance.path_assignment_id
    join orchestration.path_templates path on path.id=assignment.path_template_id
    where step_instance.id=v_step_instance_id;
  elsif new.aggregate_type='path_assignment' then
    select path.code into v_path_code
    from orchestration.path_assignments assignment
    join orchestration.path_templates path on path.id=assignment.path_template_id
    where assignment.id=new.aggregate_id;
  end if;

  for v_rule in
    select definition.code,version.id version_id,version.recurrence_policy
    from engagement.point_rule_definitions definition
    join lateral (
      select current_version.*
      from engagement.point_rule_versions current_version
      where current_version.point_rule_definition_id=definition.id
        and current_version.status='published'
        and current_version.published_at is not null
      order by current_version.version_number desc
      limit 1
    ) version on true
    where definition.owner_organization_id=v_organization_id
      and definition.status='active'
      and version.recurrence_policy#>>'{trigger,event_name}'=new.event_name
  loop
    v_rule_code:=v_rule.code;
    v_trigger:=coalesce(v_rule.recurrence_policy->'trigger','{}'::jsonb);
    if v_trigger?'activity_codes'
      and not coalesce(v_activity_code=any(array(select jsonb_array_elements_text(v_trigger->'activity_codes'))),false)
    then continue; end if;
    if v_trigger?'path_codes'
      and not coalesce(v_path_code=any(array(select jsonb_array_elements_text(v_trigger->'path_codes'))),false)
    then continue; end if;
    if v_trigger?'is_bonus'
      and coalesce((v_trigger->>'is_bonus')::boolean,false) is distinct from v_is_bonus
    then continue; end if;

    v_scope:=coalesce(v_rule.recurrence_policy->>'scope','participant');
    v_source_reference:=case v_scope
      when 'participant' then v_actor::text
      when 'enrollment_activity' then coalesce(v_step_instance_id::text,new.aggregate_id::text,new.event_id::text)
      when 'enrollment_assessment' then coalesce(v_attempt_id::text,new.aggregate_id::text,new.event_id::text)
      when 'path' then coalesce(case when new.aggregate_type='path_assignment' then new.aggregate_id::text end,v_path_code,new.event_id::text)
      when 'journey' then coalesce(new.journey_instance_id::text,new.event_id::text)
      when 'participant_day' then v_actor::text||'|'||to_char(new.occurred_at at time zone 'America/Sao_Paulo','YYYY-MM-DD')
      when 'participant_week' then v_actor::text||'|'||to_char(new.occurred_at at time zone 'America/Sao_Paulo','IYYY-IW')
      else new.event_id::text
    end;
    v_idempotency_key:='event-rule-'||v_rule.version_id::text||'-'||md5(v_source_reference);
    perform public.award_participant_action_points(
      v_actor,new.journey_instance_id,v_rule.code,v_source_reference,v_idempotency_key
    );
  end loop;
  return new;
exception when others then
  raise warning 'POINT_AWARD_FAILED event=% rule=% error=%',new.event_id,coalesce(v_rule_code,''),sqlerrm;
  return new;
end;
$function$;

drop trigger if exists award_points_for_event_trigger on eventing.events;
drop trigger if exists trg_award_points_from_learning_events on eventing.events;
create trigger trg_award_points_from_learning_events
after insert on eventing.events
for each row execute function app_private.award_points_for_event();

revoke execute on function app_private.award_points_for_event() from public,anon,authenticated;
revoke execute on function public.award_participant_action_points(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.award_participant_action_points(uuid,uuid,text,text,text) to service_role;
