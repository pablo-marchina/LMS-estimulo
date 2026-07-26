-- Product corrections round two: participant journey access, diagnostic summary,
-- safe diagnostic retirement, read-only Estimulo staff access, one admin role,
-- and event-driven point rules.

create or replace function app_private.e14_state_step(a uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
  select jsonb_build_object(
    'step_instance_id',si.id,
    'status',si.status,
    'aggregate_version',si.aggregate_version,
    'version_id',si.activity_version_id,
    'accepted_sections',coalesce(ac.accepted_observation_count,0),
    'session_id',ac.id
  )
  from orchestration.path_assignments pa
  join orchestration.step_instances si on si.path_assignment_id=pa.id
  join orchestration.path_steps ps on ps.id=si.path_step_id
  left join lateral (
    select session.id,session.accepted_observation_count
    from orchestration.activity_sessions session
    where session.step_instance_id=si.id
    order by session.started_at desc,session.id desc
    limit 1
  ) ac on true
  where pa.journey_instance_id=a
  order by
    case si.status
      when 'in_progress' then 0
      when 'available' then 1
      when 'completed' then 2
      when 'locked' then 3
      else 4
    end,
    ps.position_hint,
    si.available_at desc nulls last,
    si.id
  limit 1
$function$;

create or replace function public.get_participant_diagnostic_summary(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid;
  v_summary jsonb;
begin
  select entrepreneur.id into v_entrepreneur_id
  from core.entrepreneurs entrepreneur
  join iam.user_accounts account on account.id=entrepreneur.user_account_id
  where entrepreneur.user_account_id=p_actor_user_account_id
    and entrepreneur.status='active'
    and account.status='active';
  if v_entrepreneur_id is null then
    raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002';
  end if;

  with selected_session as (
    select session.id,session.diagnostic_version_id,session.completed_at
    from diagnostics.sessions session
    where session.entrepreneur_id=v_entrepreneur_id
      and session.status='completed'
    order by session.completed_at desc nulls last,session.started_at desc,session.id desc
    limit 1
  ), selected_result as (
    select result.id,result.session_id
    from diagnostics.results result
    join selected_session session on session.id=result.session_id
    order by result.calculated_at desc,result.id desc
    limit 1
  ), dimension_maximums as (
    select dimension.id,
      coalesce(sum((
        select max(coalesce((option.value->>'score')::numeric,0))
        from diagnostics.item_options option
        where option.item_id=item.id
      )),0) as maximum_score
    from diagnostics.dimensions dimension
    join selected_session session on session.diagnostic_version_id=dimension.diagnostic_version_id
    left join diagnostics.items item on item.dimension_id=dimension.id
    group by dimension.id
  )
  select jsonb_build_object(
    'diagnostic_name',definition.name,
    'completed_at',session.completed_at,
    'dimensions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'code',dimension.code,
        'name',dimension.name,
        'score',dimension_result.score,
        'maximum_score',maximum.maximum_score,
        'percentage',case when maximum.maximum_score>0
          then least(100,greatest(0,round(dimension_result.score/maximum.maximum_score*100)))
          else 0 end,
        'answered_ratio',dimension_result.answered_ratio,
        'position',dimension.position
      ) order by dimension.position)
      from diagnostics.dimension_results dimension_result
      join diagnostics.dimensions dimension on dimension.id=dimension_result.dimension_id
      join dimension_maximums maximum on maximum.id=dimension.id
      where dimension_result.result_id=result.id
    ),'[]'::jsonb)
  ) into v_summary
  from selected_session session
  join selected_result result on result.session_id=session.id
  join diagnostics.diagnostic_versions version on version.id=session.diagnostic_version_id
  join diagnostics.diagnostic_definitions definition on definition.id=version.diagnostic_definition_id;

  return coalesce(v_summary,jsonb_build_object('diagnostic_name',null,'completed_at',null,'dimensions','[]'::jsonb));
end;
$function$;

create or replace function app_private.estimulo_staff_can_view(p_actor_user_account_id uuid,p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
  select exists(
    select 1
    from iam.user_accounts account
    join iam.organization_memberships membership
      on membership.user_account_id=account.id
     and membership.organization_id=p_organization_id
     and membership.status='active'
     and membership.valid_from<=now()
     and (membership.valid_until is null or membership.valid_until>now())
    join iam.organizations organization
      on organization.id=membership.organization_id
     and organization.status='active'
     and organization.slug='estimulo'
    where account.id=p_actor_user_account_id
      and account.status='active'
      and lower(account.email_normalized) ~ '^[^@]+@estimulo\.org$'
  )
$function$;

create or replace function public.e14_resolve_identity(
  p_provider text,
  p_issuer text,
  p_subject text,
  p_email_normalized text,
  p_email_verified boolean,
  p_claims_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_user_account_id uuid;
  v_entrepreneur_id uuid;
  v_organizations jsonb;
  v_estimulo_organization_id uuid;
begin
  v_user_account_id := iam.resolve_external_identity(
    p_provider,p_issuer,p_subject,p_email_normalized,p_email_verified,p_claims_fingerprint
  );
  v_entrepreneur_id := app_private.e14_entrepreneur_for_account(v_user_account_id);

  if p_email_verified and lower(btrim(p_email_normalized)) ~ '^[^@]+@estimulo\.org$' then
    select organization.id into v_estimulo_organization_id
    from iam.organizations organization
    where organization.slug='estimulo' and organization.status='active'
    limit 1;

    if v_estimulo_organization_id is not null and not exists(
      select 1 from iam.organization_memberships membership
      where membership.organization_id=v_estimulo_organization_id
        and membership.user_account_id=v_user_account_id
        and membership.status='active'
        and membership.valid_from<=now()
        and (membership.valid_until is null or membership.valid_until>now())
    ) then
      insert into iam.organization_memberships(
        id,organization_id,user_account_id,status,valid_from,valid_until,created_at
      ) values(
        app_private.e14_deterministic_uuid('estimulo-staff-membership|'||v_user_account_id::text),
        v_estimulo_organization_id,v_user_account_id,'active',now(),null,now()
      ) on conflict(id) do update set status='active',valid_until=null;
    end if;
  end if;

  select coalesce(jsonb_agg(org_context order by org_context->>'display_name'),'[]'::jsonb)
  into v_organizations
  from (
    select jsonb_build_object(
      'organization_id',organization.id,
      'slug',organization.slug,
      'display_name',organization.display_name,
      'roles',coalesce((
        select jsonb_agg(distinct role.code order by role.code)
        from iam.membership_roles membership_role
        join iam.role_definitions role on role.id=membership_role.role_id and role.status='active'
        where membership_role.membership_id=membership.id
          and membership_role.valid_from<=now()
          and (membership_role.valid_until is null or membership_role.valid_until>now())
      ),'[]'::jsonb),
      'permissions',coalesce((
        select jsonb_agg(distinct permission.code order by permission.code)
        from iam.membership_roles membership_role
        join iam.role_definitions role on role.id=membership_role.role_id and role.status='active'
        join iam.role_permissions role_permission on role_permission.role_id=role.id
        join iam.permission_definitions permission on permission.id=role_permission.permission_id
        where membership_role.membership_id=membership.id
          and membership_role.valid_from<=now()
          and (membership_role.valid_until is null or membership_role.valid_until>now())
      ),'[]'::jsonb)
    ) org_context
    from iam.organization_memberships membership
    join iam.organizations organization on organization.id=membership.organization_id and organization.status='active'
    where membership.user_account_id=v_user_account_id
      and membership.status='active'
      and membership.valid_from<=now()
      and (membership.valid_until is null or membership.valid_until>now())
  ) context_rows;

  return jsonb_build_object(
    'user_account_id',v_user_account_id,
    'entrepreneur_id',v_entrepreneur_id,
    'organizations',v_organizations
  );
end;
$function$;

-- Consolidate Estimulo administration into a single role.
do $role_consolidation$
declare
  v_organization_id uuid;
  v_admin_role_id uuid;
  v_membership record;
begin
  select id into v_organization_id from iam.organizations where slug='estimulo' and status='active' limit 1;
  select id into v_admin_role_id from iam.role_definitions
  where organization_id=v_organization_id and code='e14_operator' limit 1;
  if v_admin_role_id is null then raise exception 'ESTIMULO_ADMIN_ROLE_NOT_FOUND'; end if;

  update iam.role_definitions set
    name='Administrador geral',
    description='Acesso integral para configurar e operar a plataforma Estímulo.',
    status='active'
  where id=v_admin_role_id;

  insert into iam.role_permissions(role_id,permission_id)
  select v_admin_role_id,permission.id from iam.permission_definitions permission
  on conflict do nothing;

  for v_membership in
    select distinct membership_role.membership_id,coalesce(membership_role.scope,'{"all":true}'::jsonb) scope
    from iam.membership_roles membership_role
    join iam.role_definitions role on role.id=membership_role.role_id
    where role.organization_id=v_organization_id
      and role.id<>v_admin_role_id
      and membership_role.valid_from<=now()
      and (membership_role.valid_until is null or membership_role.valid_until>now())
  loop
    if not exists(
      select 1 from iam.membership_roles current_role
      where current_role.membership_id=v_membership.membership_id
        and current_role.role_id=v_admin_role_id
        and current_role.valid_from<=now()
        and (current_role.valid_until is null or current_role.valid_until>now())
    ) then
      insert into iam.membership_roles(membership_id,role_id,scope,valid_from,valid_until)
      values(v_membership.membership_id,v_admin_role_id,v_membership.scope,now(),null);
    end if;
  end loop;

  update iam.membership_roles membership_role set valid_until=now()
  where membership_role.role_id in (
    select role.id from iam.role_definitions role
    where role.organization_id=v_organization_id and role.id<>v_admin_role_id
  ) and membership_role.valid_from<=now()
    and (membership_role.valid_until is null or membership_role.valid_until>now());

  update iam.role_definitions set status='retired'
  where organization_id=v_organization_id and id<>v_admin_role_id;
end;
$role_consolidation$;

-- Permit active Estimulo members to invoke read surfaces without granting their write permissions.
do $readonly_patch$
declare
  v_function_name text;
  v_definition text;
  v_patched text;
begin
  select pg_get_functiondef(function_row.oid) into v_definition
  from pg_proc function_row join pg_namespace namespace on namespace.oid=function_row.pronamespace
  where namespace.nspname='public' and function_row.proname='get_admin_product_workspace';
  v_patched:=replace(v_definition,
    'v_allowed:=app_private.e14_actor_has_permission',
    'v_allowed:=app_private.estimulo_staff_can_view(p_actor_user_account_id,p_organization_id) or app_private.e14_actor_has_permission');
  if v_patched is not distinct from v_definition then raise exception 'READONLY_PATCH_FAILED:get_admin_product_workspace'; end if;
  execute v_patched;

  foreach v_function_name in array array[
    'get_admin_reporting_dashboard','list_organization_role_management',
    'list_operator_practice_submissions','list_operator_activity_comments',
    'list_operator_announcements','list_operator_library_content',
    'get_business_maturity_draft','e14_list_operator_instances','e14_get_operator_workspace'
  ] loop
    select pg_get_functiondef(function_row.oid) into v_definition
    from pg_proc function_row join pg_namespace namespace on namespace.oid=function_row.pronamespace
    where namespace.nspname='public' and function_row.proname=v_function_name
    order by function_row.oid limit 1;
    v_patched:=regexp_replace(
      v_definition,
      'if not app_private\.e14_actor_has_permission\(\s*p_actor_user_account_id\s*,\s*p_organization_id\s*,',
      'if not app_private.estimulo_staff_can_view(p_actor_user_account_id,p_organization_id) and not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,',
      'i'
    );
    if v_patched is not distinct from v_definition then raise exception 'READONLY_PATCH_FAILED:%',v_function_name; end if;
    execute v_patched;
  end loop;
end;
$readonly_patch$;

create or replace function public.retire_admin_diagnostic(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_definition_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_event_id uuid;
  v_aggregate_version bigint;
  v_name text;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'diagnostic.configuration.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  v_event_id:=app_private.e14_command_event_id('retire_admin_diagnostic',p_actor_user_account_id,p_definition_id,p_idempotency_key);
  if exists(select 1 from eventing.events event where event.event_id=v_event_id) then
    select name into v_name from diagnostics.diagnostic_definitions where id=p_definition_id;
    return jsonb_build_object('replayed',true,'definition_id',p_definition_id,'name',v_name,'status','retired');
  end if;

  update diagnostics.diagnostic_definitions definition
  set status='retired'
  where definition.id=p_definition_id
    and definition.owner_organization_id=p_organization_id
    and definition.status<>'retired'
  returning definition.name into v_name;
  if v_name is null then raise exception 'DIAGNOSTIC_NOT_FOUND' using errcode='P0002'; end if;

  perform app_private.e14_lock_scope('diagnostic|'||p_definition_id::text);
  select coalesce(max(event.aggregate_version),0)+1 into v_aggregate_version
  from eventing.events event where event.aggregate_type='diagnostic' and event.aggregate_id=p_definition_id;
  perform app_private.e14_append_event(
    v_event_id,'admin.product.configuration.saved','user_account',p_actor_user_account_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,'diagnostic',p_definition_id,
    v_aggregate_version,v_event_id,null,
    jsonb_build_object('resource_type','diagnostic','action','retired','definition_id',p_definition_id,'name',v_name)
  );
  return jsonb_build_object('replayed',false,'definition_id',p_definition_id,'name',v_name,'status','retired');
end;
$function$;

-- Describe the real platform event observed by every published rule.
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
      select current_version.* from engagement.point_rule_versions current_version
      where current_version.point_rule_definition_id=definition.id
        and current_version.status='published' and current_version.published_at is not null
      order by current_version.version_number desc limit 1
    ) version on true
    where definition.owner_organization_id=v_organization_id
      and definition.status='active'
      and version.recurrence_policy#>>'{trigger,event_name}'=new.event_name
  loop
    v_trigger:=coalesce(v_rule.recurrence_policy->'trigger','{}'::jsonb);
    if v_trigger?'activity_codes' and not coalesce(v_activity_code=any(array(select jsonb_array_elements_text(v_trigger->'activity_codes'))),false) then continue; end if;
    if v_trigger?'path_codes' and not coalesce(v_path_code=any(array(select jsonb_array_elements_text(v_trigger->'path_codes'))),false) then continue; end if;
    if v_trigger?'is_bonus' and coalesce((v_trigger->>'is_bonus')::boolean,false) is distinct from v_is_bonus then continue; end if;

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
  raise warning 'POINT_AWARD_FAILED event=% rule=% error=%',new.event_id,coalesce(v_rule.code,''),sqlerrm;
  return new;
end;
$function$;

drop trigger if exists award_points_for_event_trigger on eventing.events;
drop trigger if exists trg_award_points_from_learning_events on eventing.events;
create trigger trg_award_points_from_learning_events
after insert on eventing.events
for each row execute function app_private.award_points_for_event();

revoke execute on function app_private.e14_state_step(uuid) from public,anon,authenticated;
revoke execute on function app_private.estimulo_staff_can_view(uuid,uuid) from public,anon,authenticated;
revoke execute on function app_private.award_points_for_event() from public,anon,authenticated;
revoke execute on function public.e14_resolve_identity(text,text,text,text,boolean,text) from public,anon,authenticated;
revoke execute on function public.get_participant_diagnostic_summary(uuid) from public,anon,authenticated;
revoke execute on function public.retire_admin_diagnostic(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.award_participant_action_points(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.e14_resolve_identity(text,text,text,text,boolean,text) to service_role;
grant execute on function public.get_participant_diagnostic_summary(uuid) to service_role;
grant execute on function public.retire_admin_diagnostic(uuid,uuid,uuid,text) to service_role;
grant execute on function public.award_participant_action_points(uuid,uuid,text,text,text) to service_role;
