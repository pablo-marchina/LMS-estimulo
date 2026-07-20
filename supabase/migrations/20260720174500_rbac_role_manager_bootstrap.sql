set lock_timeout = '5s';
set statement_timeout = '5min';

create or replace function public.bootstrap_organization_role_manager(
  p_organization_id uuid,
  p_target_membership_id uuid,
  p_reason text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_reason text:=trim(coalesce(p_reason,''));
  v_role_id uuid:=app_private.e14_deterministic_uuid('iam-role-manager:'||p_organization_id::text);
  v_permission_id uuid;
  v_event_id uuid;
  v_request_hash text;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if length(v_reason) not between 3 and 500 then
    raise exception 'INVALID_BOOTSTRAP_REASON' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('iam-role-management:'||p_organization_id::text,0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('iam-membership:'||p_target_membership_id::text,0)
  );

  if not exists (
    select 1 from iam.organizations o
    where o.id=p_organization_id and o.status='active'
  ) then
    raise exception 'ORGANIZATION_NOT_FOUND' using errcode='P0002';
  end if;
  if not exists (
    select 1 from iam.organization_memberships om
    where om.id=p_target_membership_id
      and om.organization_id=p_organization_id
      and om.status='active'
      and om.valid_from<=now()
      and (om.valid_until is null or om.valid_until>now())
  ) then
    raise exception 'MEMBERSHIP_NOT_FOUND' using errcode='P0002';
  end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,
    'target_membership_id',p_target_membership_id,
    'reason',v_reason
  ));
  v_event_id:=app_private.e14_command_event_id(
    'bootstrap_organization_role_manager',null,p_target_membership_id,v_key
  );
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select e.payload->'result' into v_result
    from eventing.events e
    where e.event_id=v_event_id;
    return jsonb_build_object(
      'request_id',v_event_id,
      'idempotency_key',v_key,
      'replayed',true,
      'data',v_result
    );
  end if;

  if app_private.active_role_manager_count(p_organization_id)>0 then
    raise exception 'ROLE_MANAGER_ALREADY_BOOTSTRAPPED' using errcode='55000';
  end if;

  insert into iam.role_definitions(
    id,organization_id,code,name,description,status
  ) values(
    v_role_id,p_organization_id,'role_manager','Gestão de administradores',
    'Concede e revoga papéis de forma explícita e auditável.','active'
  )
  on conflict (organization_id,code) do update
    set name=excluded.name,
        description=excluded.description,
        status='active';

  select pd.id into strict v_permission_id
  from iam.permission_definitions pd
  where pd.code='iam.memberships.manage';

  insert into iam.role_permissions(role_id,permission_id)
  values(v_role_id,v_permission_id)
  on conflict do nothing;

  insert into iam.membership_roles(membership_id,role_id,scope,valid_from)
  values(p_target_membership_id,v_role_id,'{"all":true}'::jsonb,clock_timestamp());

  v_result:=jsonb_build_object(
    'membership_id',p_target_membership_id,
    'role_id',v_role_id,
    'role_code','role_manager',
    'scope','{"all":true}'::jsonb,
    'reason',v_reason,
    'bootstrap',true
  );

  select coalesce(max(e.aggregate_version),0)+1 into v_aggregate_version
  from eventing.events e
  where e.aggregate_type='organization_membership'
    and e.aggregate_id=p_target_membership_id;

  perform app_private.e14_append_event(
    v_event_id,'iam.role.granted','organization_membership',p_target_membership_id,
    'system',null,p_organization_id,null,
    'organization_membership',p_target_membership_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );

  return jsonb_build_object(
    'request_id',v_event_id,
    'idempotency_key',v_key,
    'replayed',false,
    'data',v_result
  );
end;
$$;

revoke all on function public.bootstrap_organization_role_manager(uuid,uuid,text,text)
  from public,anon,authenticated,app_worker;
grant execute on function public.bootstrap_organization_role_manager(uuid,uuid,text,text)
  to postgres,service_role;
