-- Make open journeys operational without requiring a diagnostic.

create or replace function public.ensure_participant_default_path(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_entrepreneur_id uuid;
  v_journey_version_id uuid;
  v_organization_id uuid;
  v_journey_status text;
  v_path_template_id uuid;
  v_path_code text;
  v_assignment_id uuid:=app_private.e14_deterministic_uuid(p_journey_instance_id::text||'a');
  v_first_path_step_id uuid;
  v_first_step_instance_id uuid;
  v_total_required integer;
  v_event_id uuid:=app_private.e14_command_event_id('ensure_participant_default_path',p_actor_user_account_id,p_journey_instance_id,p_idempotency_key);
  v_started_event_id uuid;
  v_step_event_id uuid;
  v_result jsonb;
begin
  select enrollment.entrepreneur_id,enrollment.journey_version_id,definition.owner_organization_id,instance.status
    into v_entrepreneur_id,v_journey_version_id,v_organization_id,v_journey_status
  from orchestration.journey_instances instance
  join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions version on version.id=enrollment.journey_version_id
  join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  where instance.id=p_journey_instance_id;
  if not found then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;
  if app_private.e14_entrepreneur_for_account(p_actor_user_account_id) is distinct from v_entrepreneur_id then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_journey_status not in ('available','in_progress') then raise exception 'JOURNEY_NOT_OPEN' using errcode='P0001'; end if;

  select assignment.path_template_id,template.code,assignment.id
    into v_path_template_id,v_path_code,v_assignment_id
  from orchestration.path_assignments assignment
  join orchestration.path_templates template on template.id=assignment.path_template_id
  where assignment.journey_instance_id=p_journey_instance_id and assignment.status='active'
  order by assignment.created_at desc limit 1;

  if v_path_template_id is null then
    select template.id,template.code into v_path_template_id,v_path_code
    from orchestration.path_templates template
    where template.journey_version_id=v_journey_version_id and template.status='published'
    order by template.is_default desc,template.position,template.id limit 1;
    if v_path_template_id is null then raise exception 'DEFAULT_PATH_NOT_PUBLISHED' using errcode='P0002'; end if;
    insert into orchestration.path_assignments(
      id,journey_instance_id,path_template_id,assignment_policy_id,status,reason,confidence,valid_from
    ) values(
      v_assignment_id,p_journey_instance_id,v_path_template_id,null,'active',
      jsonb_build_object('source','participant_optional_diagnostic_skip','idempotency_key',v_key),1,now()
    ) on conflict (id) do nothing;
  end if;

  select step.id into v_first_path_step_id
  from orchestration.path_steps step
  where step.path_template_id=v_path_template_id
  order by step.position_hint,step.id limit 1;
  if v_first_path_step_id is null then raise exception 'DEFAULT_PATH_HAS_NO_STEPS' using errcode='P0002'; end if;

  insert into orchestration.step_instances(
    id,path_assignment_id,path_step_id,activity_version_id,status,available_at,started_at,completed_at,attempt_count,aggregate_version
  )
  select
    app_private.e14_deterministic_uuid(v_assignment_id::text||step.id::text),v_assignment_id,step.id,step.activity_version_id,
    case when step.id=v_first_path_step_id then 'available' else 'locked' end,
    case when step.id=v_first_path_step_id then now() else null end,null,null,0,0
  from orchestration.path_steps step
  where step.path_template_id=v_path_template_id
  order by step.position_hint,step.id
  on conflict(path_assignment_id,path_step_id) do nothing;

  select instance.id into v_first_step_instance_id
  from orchestration.step_instances instance
  where instance.path_assignment_id=v_assignment_id and instance.path_step_id=v_first_path_step_id;
  select count(*) filter(where step.is_required) into v_total_required
  from orchestration.path_steps step where step.path_template_id=v_path_template_id;

  update orchestration.progress_projections set
    total_required_steps=greatest(coalesce(v_total_required,0),1),
    current_step_id=coalesce(current_step_id,v_first_path_step_id),
    last_activity_at=coalesce(last_activity_at,now()),
    projection_version=projection_version+1,
    updated_at=now()
  where journey_instance_id=p_journey_instance_id;

  if not exists(select 1 from eventing.events event where event.event_id=v_event_id) then
    perform app_private.e14_append_event(
      v_event_id,'journey.path.assigned','path_assignment',v_assignment_id,'user_account',p_actor_user_account_id,
      v_organization_id,p_journey_instance_id,'path_assignment',v_assignment_id,0,v_event_id,null,
      jsonb_build_object('path_code',v_path_code,'source','participant_optional_diagnostic_skip')
    );
    v_started_event_id:=app_private.e14_child_event_id(v_event_id,'journey.path.started',1);
    perform app_private.e14_append_event(
      v_started_event_id,'journey.path.started','path_assignment',v_assignment_id,'user_account',p_actor_user_account_id,
      v_organization_id,p_journey_instance_id,'path_assignment',v_assignment_id,1,v_event_id,v_event_id,
      jsonb_build_object('path_code',v_path_code)
    );
    v_step_event_id:=app_private.e14_child_event_id(v_event_id,'journey.step.available',2);
    perform app_private.e14_append_event(
      v_step_event_id,'journey.step.available','step_instance',v_first_step_instance_id,'user_account',p_actor_user_account_id,
      v_organization_id,p_journey_instance_id,'step_instance',v_first_step_instance_id,0,v_event_id,v_started_event_id,
      jsonb_build_object('path_code',v_path_code,'path_step_id',v_first_path_step_id)
    );
  end if;

  v_result:=jsonb_build_object(
    'journey_instance_id',p_journey_instance_id,'path_assignment_id',v_assignment_id,'path_template_id',v_path_template_id,
    'path_code',v_path_code,'first_step_instance_id',v_first_step_instance_id,
    'step_count',(select count(*) from orchestration.step_instances where path_assignment_id=v_assignment_id)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'data',v_result);
end;
$function$;

-- When a participant later completes the optional diagnostic, preserve an already-started path.
create or replace function app_private.e14_exec_c(a uuid,b uuid,c bigint,d text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare p jsonb;ctx jsonb;s jsonb;path jsonb;existing_path jsonb;data jsonb;children jsonb;arch jsonb;
begin
  p:=app_private.e14_prepare_c(a,b,c,d);
  if (p->>'p')::boolean then return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',true,'data',app_private.e14_snapshot_c(b)); end if;
  ctx:=app_private.e14_context_c(a,b,c);
  s:=app_private.e14_scores_c(b);
  path:=app_private.e14_path_c((ctx->>'journey_version_id')::uuid,s);
  select jsonb_build_object('p',template.code,'t',template.id,'s',step.id,'v',step.activity_version_id,'l',false)
    into existing_path
  from orchestration.path_assignments assignment
  join orchestration.path_templates template on template.id=assignment.path_template_id
  join lateral (
    select candidate.id,candidate.activity_version_id from orchestration.path_steps candidate
    where candidate.path_template_id=template.id order by candidate.position_hint,candidate.id limit 1
  ) step on true
  where assignment.journey_instance_id=(ctx->>'instance_id')::uuid and assignment.status='active'
  order by assignment.created_at desc limit 1;
  path:=coalesce(existing_path,path);
  perform app_private.e14_first_c((p->>'e')::uuid,a,ctx,b,c+1,p->>'h',p->>'k');
  data:=app_private.e14_apply_c(b,ctx,s,path,(p->>'e')::uuid);
  arch:=app_private.e14_archetype_c(b,(ctx->>'version_id')::uuid,(ctx->>'organization_id')::uuid,(ctx->>'entrepreneur_id')::uuid,(ctx->>'instance_id')::uuid);
  if arch is not null then data:=data||jsonb_build_object('archetype',arch); end if;
  children:=app_private.e14_children_c((p->>'e')::uuid,a,ctx,s,data);
  return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',false,'data',data||jsonb_build_object('event_ids',jsonb_build_array((p->>'e')::uuid)||children));
end;
$function$;

revoke execute on function public.ensure_participant_default_path(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.ensure_participant_default_path(uuid,uuid,text) to service_role;
