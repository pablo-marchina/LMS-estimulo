-- Task 4: Path-scoped (trilha) credential wiring.
--
-- Adds a 'path' scope to the existing credential-matching pipeline so a Selo
-- (badge) can be awarded automatically when a participant finishes 100% of a
-- single trilha (orchestration.path_templates), alongside the existing
-- 'journey' and 'activity' scopes. Purely additive: every existing call site
-- for the 'journey'/'activity' scopes keeps working unchanged.
--
-- credential_rule_matches gains an 8th parameter (p_path_template_id,
-- default null) which changes its argument-type signature. A plain
-- `create or replace function` with a new trailing parameter does NOT
-- replace the existing 7-arg function in Postgres -- it creates a second,
-- overloaded function, leaving a stale 7-arg body around (without the
-- 'path' case) that would silently keep being resolved by any caller that
-- still binds positionally to 7 args. Drop the old signature first so there
-- is exactly one (8-arg) function afterwards.
drop function if exists app_private.credential_rule_matches(uuid, text, uuid, uuid, boolean, boolean, boolean);

create or replace function app_private.credential_rule_matches(
  p_rule_version_id uuid, p_scope text, p_journey_version_id uuid,
  p_activity_version_id uuid, p_completed boolean,
  p_required_steps_completed boolean, p_assessments_passed boolean,
  p_path_template_id uuid default null
)
returns boolean
language sql
stable
set search_path to 'pg_catalog'
as $function$
  select exists (
    select 1
    from orchestration.rule_versions rv
    where rv.id=p_rule_version_id
      and rv.status='published'
      and rv.language='credential-v1'
      and rv.expression->>'scope'=p_scope
      and case p_scope
        when 'journey' then rv.expression->>'journey_version_id'=p_journey_version_id::text
        when 'activity' then rv.expression->>'activity_version_id'=p_activity_version_id::text
        when 'path' then rv.expression->>'path_template_id'=p_path_template_id::text
        else false
      end
      and case lower(coalesce(rv.expression->>'requires_completed_status','true'))
        when 'true' then p_completed when 'false' then true else false end
      and case lower(coalesce(rv.expression->>'requires_required_steps_completed','false'))
        when 'true' then p_required_steps_completed when 'false' then true else false end
      and case lower(coalesce(rv.expression->>'requires_passed_assessment','true'))
        when 'true' then p_assessments_passed when 'false' then true else false end
  );
$function$;

-- The prior 7-arg function had an explicit revoke locking it down from
-- public/anon/authenticated (see 20260715155144_learning_credentials_schema.sql).
-- Because the drop+create above produces a brand-new pg_proc row, that ACL is
-- NOT inherited (unlike a plain `create or replace`, which preserves ACLs) --
-- the new 8-arg function defaults to PUBLIC execute. Re-apply the same
-- privilege model explicitly so this doesn't silently regress.
revoke all on function app_private.credential_rule_matches(uuid,text,uuid,uuid,boolean,boolean,boolean,uuid) from public,anon,authenticated;

-- Extend learning_credential_context with path-scoped fields, computed only
-- when a p_step_instance_id is supplied (unchanged precondition from before).
create or replace function app_private.learning_credential_context(p_actor_user_account_id uuid, p_journey_instance_id uuid, p_step_instance_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_actor_entrepreneur_id uuid;
  v_entrepreneur_id uuid;
  v_organization_id uuid;
  v_journey_version_id uuid;
  v_journey_status text;
  v_journey_title text;
  v_display_name text;
  v_required_total integer:=0;
  v_required_completed integer:=0;
  v_required_assessments_passed boolean:=false;
  v_step_activity_version_id uuid;
  v_step_completed boolean:=false;
  v_step_assessment_passed boolean:=false;
  v_path_assignment_id uuid;
  v_path_template_id uuid;
  v_path_completed boolean:=false;
  v_path_required_total integer:=0;
  v_path_required_completed integer:=0;
  v_path_required_assessments_passed boolean:=false;
begin
  select en.entrepreneur_id,app_private.journey_owner_organization_id(ji.id),
    en.journey_version_id,ji.status,jv.title,
    coalesce(e.preferred_name,e.legal_name,split_part(ua.email_normalized,'@',1),'Participante')
  into v_entrepreneur_id,v_organization_id,v_journey_version_id,v_journey_status,
    v_journey_title,v_display_name
  from orchestration.journey_instances ji
  join orchestration.enrollments en on en.id=ji.enrollment_id
  join catalog.journey_versions jv on jv.id=en.journey_version_id
  join core.entrepreneurs e on e.id=en.entrepreneur_id
  join iam.user_accounts ua on ua.id=e.user_account_id
  where ji.id=p_journey_instance_id;

  if v_entrepreneur_id is null or v_organization_id is null then
    raise exception 'CREDENTIAL_JOURNEY_NOT_FOUND' using errcode='P0002';
  end if;

  v_actor_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_actor_entrepreneur_id is null or v_actor_entrepreneur_id<>v_entrepreneur_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select count(*) filter(where ps.is_required),
    count(*) filter(where ps.is_required and si.status='completed'),
    coalesce(bool_and(case
      when ps.is_required and asp.activity_version_id is not null then exists(
        select 1 from assessment.attempts a
        join assessment.results r on r.attempt_id=a.id
        where a.step_instance_id=si.id and r.passed
      ) else true end),true)
  into v_required_total,v_required_completed,v_required_assessments_passed
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.path_steps ps on ps.id=si.path_step_id
  left join assessment.assessment_specs asp on asp.activity_version_id=si.activity_version_id
  where pa.journey_instance_id=p_journey_instance_id;

  if p_step_instance_id is not null then
    select si.activity_version_id,si.status='completed',case
      when asp.activity_version_id is null then true
      else exists(
        select 1 from assessment.attempts a
        join assessment.results r on r.attempt_id=a.id
        where a.step_instance_id=si.id and r.passed
      ) end,
      pa.id,pa.status='completed',ps.path_template_id
    into v_step_activity_version_id,v_step_completed,v_step_assessment_passed,
      v_path_assignment_id,v_path_completed,v_path_template_id
    from orchestration.step_instances si
    join orchestration.path_assignments pa on pa.id=si.path_assignment_id
    join orchestration.path_steps ps on ps.id=si.path_step_id
    left join assessment.assessment_specs asp on asp.activity_version_id=si.activity_version_id
    where si.id=p_step_instance_id and pa.journey_instance_id=p_journey_instance_id;
    if v_step_activity_version_id is null then
      raise exception 'CREDENTIAL_STEP_NOT_FOUND' using errcode='P0002';
    end if;

    if v_path_completed then
      select count(*) filter(where ps2.is_required),
        count(*) filter(where ps2.is_required and si2.status='completed'),
        coalesce(bool_and(case
          when ps2.is_required and asp2.activity_version_id is not null then exists(
            select 1 from assessment.attempts a2
            join assessment.results r2 on r2.attempt_id=a2.id
            where a2.step_instance_id=si2.id and r2.passed
          ) else true end),true)
      into v_path_required_total,v_path_required_completed,v_path_required_assessments_passed
      from orchestration.step_instances si2
      join orchestration.path_steps ps2 on ps2.id=si2.path_step_id
      left join assessment.assessment_specs asp2 on asp2.activity_version_id=si2.activity_version_id
      where si2.path_assignment_id=v_path_assignment_id;
    end if;
  end if;

  return jsonb_build_object(
    'entrepreneur_id',v_entrepreneur_id,'organization_id',v_organization_id,
    'journey_instance_id',p_journey_instance_id,'journey_version_id',v_journey_version_id,
    'journey_status',v_journey_status,'journey_title',v_journey_title,
    'display_name',v_display_name,
    'required_steps_completed',v_required_total>0 and v_required_completed=v_required_total,
    'required_assessments_passed',v_required_assessments_passed,
    'step_instance_id',p_step_instance_id,'step_activity_version_id',v_step_activity_version_id,
    'step_completed',v_step_completed,'step_assessment_passed',v_step_assessment_passed,
    'path_assignment_id',v_path_assignment_id,'path_template_id',v_path_template_id,
    'path_completed',v_path_completed,'path_required_steps_completed',(v_path_required_total>0 and v_path_required_completed=v_path_required_total),
    'path_required_assessments_passed',v_path_required_assessments_passed
  );
end;
$function$;

-- Add the path-scoped loop to learning_badge_candidates, alongside the
-- existing step-scoped ('activity') and journey-scoped loops.
create or replace function app_private.learning_badge_candidates(p_context jsonb)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_badges jsonb:='[]'::jsonb;
  v_record record;
  v_award_id uuid;
  v_entrepreneur_id uuid:=(p_context->>'entrepreneur_id')::uuid;
  v_journey_instance_id uuid:=(p_context->>'journey_instance_id')::uuid;
  v_journey_version_id uuid:=(p_context->>'journey_version_id')::uuid;
  v_step_instance_id uuid:=(p_context->>'step_instance_id')::uuid;
  v_step_activity_version_id uuid:=(p_context->>'step_activity_version_id')::uuid;
begin
  if v_step_instance_id is not null then
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where bv.status='published' and bd.status='active'
        and app_private.credential_rule_matches(
          bv.criteria_rule_version_id,'activity',v_journey_version_id,
          v_step_activity_version_id,(p_context->>'step_completed')::boolean,
          true,(p_context->>'step_assessment_passed')::boolean
        )
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','activity',
        'step_instance_id',v_step_instance_id,'rule_version_id',v_record.criteria_rule_version_id
      ));
    end loop;
  end if;

  if p_context->>'journey_status'='completed' then
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where bv.status='published' and bd.status='active'
        and app_private.credential_rule_matches(
          bv.criteria_rule_version_id,'journey',v_journey_version_id,null,true,
          (p_context->>'required_steps_completed')::boolean,
          (p_context->>'required_assessments_passed')::boolean
        )
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','journey','step_instance_id',null,
        'rule_version_id',v_record.criteria_rule_version_id
      ));
    end loop;
  end if;

  if (p_context->>'path_completed')::boolean is true then
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where bv.status='published' and bd.status='active'
        and app_private.credential_rule_matches(
          bv.criteria_rule_version_id,'path',v_journey_version_id,null,true,
          (p_context->>'path_required_steps_completed')::boolean,
          (p_context->>'path_required_assessments_passed')::boolean,
          (p_context->>'path_template_id')::uuid
        )
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','path',
        'path_template_id',p_context->>'path_template_id',
        'rule_version_id',v_record.criteria_rule_version_id
      ));
    end loop;
  end if;

  return v_badges;
end;
$function$;
