begin;

alter function public.get_admin_extensions_workspace(uuid,uuid)
  rename to get_admin_extensions_workspace_before_behavior_configuration;

create or replace function public.get_admin_extensions_workspace(
  p_actor_user_account_id uuid,
  p_organization_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_result jsonb;
  v_configuration jsonb;
begin
  v_result:=public.get_admin_extensions_workspace_before_behavior_configuration(
    p_actor_user_account_id,p_organization_id
  );
  select app_private.validate_behavior_score_configuration(configuration)
    into v_configuration
    from intelligence.behavior_score_configurations
    where owner_organization_id=p_organization_id and status='active';
  return v_result||jsonb_build_object(
    'behavior_score_configuration',coalesce(v_configuration,app_private.default_behavior_score_configuration())
  );
end;
$function$;

alter function public.save_admin_extension(uuid,uuid,text,jsonb,text)
  rename to save_admin_extension_before_behavior_configuration;

create or replace function public.save_admin_extension(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_resource_type text,
  p_payload jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_hash text:=app_private.e14_request_hash(jsonb_build_object(
    'resource_type',p_resource_type,'payload',p_payload,'organization_id',p_organization_id
  ));
  v_existing experience.extension_commands%rowtype;
  v_configuration jsonb;
  v_configuration_id uuid;
  v_count bigint;
  v_result jsonb;
begin
  if p_resource_type not in ('behavior_score_configuration','behavior_recalculate') then
    return public.save_admin_extension_before_behavior_configuration(
      p_actor_user_account_id,p_organization_id,p_resource_type,p_payload,p_idempotency_key
    );
  end if;

  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'participant.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select * into v_existing from experience.extension_commands
  where actor_user_account_id=p_actor_user_account_id
    and command_scope='admin:'||p_resource_type
    and idempotency_key=v_key;
  if found then
    if v_existing.request_hash<>v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return v_existing.result||jsonb_build_object('replayed',true);
  end if;

  if p_resource_type='behavior_score_configuration' then
    v_configuration:=app_private.validate_behavior_score_configuration(p_payload->'configuration');
    insert into intelligence.behavior_score_configurations(
      owner_organization_id,configuration,status,updated_by
    ) values (
      p_organization_id,v_configuration,'active',p_actor_user_account_id
    )
    on conflict(owner_organization_id) do update set
      configuration=excluded.configuration,status='active',updated_by=excluded.updated_by,updated_at=now()
    returning id into v_configuration_id;
    insert into intelligence.behavior_score_configuration_history(
      configuration_id,owner_organization_id,configuration,changed_by
    ) values (
      v_configuration_id,p_organization_id,v_configuration,p_actor_user_account_id
    );
    v_count:=app_private.recalculate_behavior_scores(p_organization_id,null);
    v_result:=jsonb_build_object(
      'configuration_id',v_configuration_id,'configuration',v_configuration,'recalculated',v_count
    );
  else
    v_count:=app_private.recalculate_behavior_scores(p_organization_id,null);
    v_result:=jsonb_build_object('recalculated',v_count);
  end if;

  insert into experience.extension_commands(
    actor_user_account_id,organization_id,command_scope,idempotency_key,request_hash,result
  ) values (
    p_actor_user_account_id,p_organization_id,'admin:'||p_resource_type,v_key,v_hash,v_result
  );
  perform governance.write_audit_entry(
    'admin_extension_'||p_resource_type,'behavior_score_configuration',
    coalesce(v_configuration_id,p_organization_id),v_result,'internal',
    p_organization_id,p_actor_user_account_id
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

alter function public.perform_participant_extension(uuid,text,jsonb,text)
  rename to perform_participant_extension_before_continuous_behavior_score;

create or replace function public.perform_participant_extension(
  p_actor_user_account_id uuid,
  p_action text,
  p_payload jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_result jsonb;
  v_entrepreneur_id uuid;
  v_organization_id uuid;
begin
  v_result:=public.perform_participant_extension_before_continuous_behavior_score(
    p_actor_user_account_id,p_action,p_payload,p_idempotency_key
  );
  if p_action='behavior_event' and coalesce((v_result->>'replayed')::boolean,false)=false then
    v_entrepreneur_id:=app_private.extension_entrepreneur(p_actor_user_account_id);
    v_organization_id:=app_private.extension_default_organization();
    if v_entrepreneur_id is not null and v_organization_id is not null then
      perform app_private.recalculate_behavior_scores(v_organization_id,v_entrepreneur_id);
    end if;
  end if;
  return v_result;
end;
$function$;

create or replace view intelligence.behavior_score_etl
with (security_invoker=true)
as
select
  snapshot.owner_organization_id,
  snapshot.entrepreneur_id,
  snapshot.score_version_id,
  snapshot.configuration_id,
  snapshot.raw_score,
  snapshot.total_score,
  snapshot.dimensions,
  snapshot.classification,
  snapshot.confidence,
  snapshot.event_count,
  snapshot.coverage_started_at,
  snapshot.calculated_at,
  snapshot.input_snapshot_hash,
  snapshot.configuration_snapshot
from intelligence.behavior_score_snapshots snapshot;

revoke all on intelligence.behavior_score_etl from public,anon,authenticated;
grant select on intelligence.behavior_score_etl to service_role;
grant select,insert,update,delete on intelligence.behavior_score_configurations to service_role;
grant select,insert on intelligence.behavior_score_configuration_history to service_role;
grant select,insert on intelligence.behavior_score_history to service_role;

revoke all on function app_private.default_behavior_score_configuration() from public,anon,authenticated;
revoke all on function app_private.validate_behavior_score_configuration(jsonb) from public,anon,authenticated;
revoke all on function app_private.recalculate_behavior_scores(uuid,uuid) from public,anon,authenticated;
revoke all on function public.get_admin_extensions_workspace(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_admin_extensions_workspace(uuid,uuid) to service_role;
revoke all on function public.save_admin_extension(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_admin_extension(uuid,uuid,text,jsonb,text) to service_role;
revoke all on function public.perform_participant_extension(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.perform_participant_extension(uuid,text,jsonb,text) to service_role;

commit;
