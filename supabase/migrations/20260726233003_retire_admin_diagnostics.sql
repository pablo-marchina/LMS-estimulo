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

revoke execute on function public.retire_admin_diagnostic(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.retire_admin_diagnostic(uuid,uuid,uuid,text) to service_role;
