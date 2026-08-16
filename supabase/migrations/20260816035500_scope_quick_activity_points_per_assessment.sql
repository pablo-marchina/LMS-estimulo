begin;

-- A quick activity is rewarded for being submitted, regardless of pass/fail,
-- but it must be awarded at most once for the same enrolled assessment.
-- Historical versions used frequency=per_assessment without a canonical scope,
-- which fell back to participant-level idempotency. Publish a corrected version
-- rather than mutating an immutable published rule.
do $migration$
declare
  v_definition_id uuid;
  v_current engagement.point_rule_versions%rowtype;
  v_next_version integer;
  v_new_id uuid;
begin
  select definition.id
    into v_definition_id
    from engagement.point_rule_definitions definition
   where definition.code='complete_quick_activity'
     and definition.status='active'
   order by definition.id
   limit 1;

  if v_definition_id is null then
    raise exception 'COMPLETE_QUICK_ACTIVITY_POINT_RULE_NOT_FOUND' using errcode='P0002';
  end if;

  select version.*
    into v_current
    from engagement.point_rule_versions version
   where version.point_rule_definition_id=v_definition_id
     and version.status='published'
     and version.published_at is not null
   order by version.version_number desc
   limit 1;

  if v_current.id is null then
    raise exception 'COMPLETE_QUICK_ACTIVITY_POINT_RULE_NOT_PUBLISHED' using errcode='P0002';
  end if;

  if v_current.recurrence_policy->>'scope' is distinct from 'enrollment_assessment'
     or coalesce((v_current.recurrence_policy->>'maximum')::integer,0) <> 1
     or v_current.recurrence_policy#>>'{trigger,event_name}' is distinct from 'assessment.attempt.submitted'
  then
    select coalesce(max(version_number),0)+1
      into v_next_version
      from engagement.point_rule_versions
     where point_rule_definition_id=v_definition_id;

    v_new_id := app_private.e14_deterministic_uuid(
      'point-rule-version:complete-quick-activity-assessment-scope:'||v_definition_id::text||':'||v_next_version::text
    );

    insert into engagement.point_rule_versions(
      id,point_rule_definition_id,version_number,status,amount,
      eligibility_rule_version_id,recurrence_policy,published_at
    ) values (
      v_new_id,
      v_definition_id,
      v_next_version,
      'published',
      v_current.amount,
      v_current.eligibility_rule_version_id,
      v_current.recurrence_policy || jsonb_build_object(
        'scope','enrollment_assessment',
        'maximum',1,
        'frequency','per_assessment',
        'maximum_awards',1,
        'trigger',jsonb_build_object('event_name','assessment.attempt.submitted')
      ),
      now()
    );
  end if;
end;
$migration$;

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
      when 'enrollment_assessment' then coalesce(v_step_instance_id::text,v_attempt_id::text,new.aggregate_id::text,new.event_id::text)
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

revoke execute on function app_private.award_points_for_event() from public,anon,authenticated;

commit;
