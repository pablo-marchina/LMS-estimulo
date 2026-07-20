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
    select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
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
  values(p_target_membership_id,v_role_id,'{"all":true}'::jsonb,now());

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
  where e.aggregate_type='organization_membership' and e.aggregate_id=p_target_membership_id;
  perform app_private.e14_append_event(
    v_event_id,'iam.role.granted','organization_membership',p_target_membership_id,
    'system',null,p_organization_id,null,
    'organization_membership',p_target_membership_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );

  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$$;

create or replace function public.grant_organization_role(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_target_membership_id uuid,
  p_role_id uuid,
  p_scope jsonb,
  p_valid_until timestamptz,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_target_user_account_id uuid;
  v_role_code text;
  v_scope jsonb:=coalesce(p_scope,'{"all":true}'::jsonb);
  v_request_hash text;
  v_event_id uuid;
  v_result jsonb;
  v_valid_from timestamptz:=now();
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,p_organization_id,'iam.memberships.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('iam-membership:'||p_target_membership_id::text,0)
  );

  if jsonb_typeof(v_scope)<>'object' then
    raise exception 'INVALID_ROLE_SCOPE' using errcode='22023';
  end if;
  if p_valid_until is not null and p_valid_until<=v_valid_from then
    raise exception 'INVALID_ROLE_VALID_UNTIL' using errcode='22023';
  end if;

  select om.user_account_id into v_target_user_account_id
  from iam.organization_memberships om
  where om.id=p_target_membership_id
    and om.organization_id=p_organization_id
    and om.status='active'
    and om.valid_from<=now()
    and (om.valid_until is null or om.valid_until>now())
  for update;
  if not found then raise exception 'MEMBERSHIP_NOT_FOUND' using errcode='P0002'; end if;
  select rd.code into v_role_code
  from iam.role_definitions rd
  where rd.id=p_role_id and rd.organization_id=p_organization_id and rd.status='active';
  if not found then raise exception 'ROLE_NOT_FOUND' using errcode='P0002'; end if;
  if v_target_user_account_id=p_actor_user_account_id
    and app_private.role_would_escalate_actor(
      p_actor_user_account_id,p_organization_id,p_role_id
    ) then
    raise exception 'SELF_ESCALATION_FORBIDDEN' using errcode='42501';
  end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,
    'target_membership_id',p_target_membership_id,
    'role_id',p_role_id,
    'scope',v_scope,
    'valid_until',p_valid_until
  ));
  v_event_id:=app_private.e14_command_event_id(
    'grant_organization_role',p_actor_user_account_id,p_target_membership_id,v_key
  );
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;

  if exists (
    select 1 from iam.membership_roles mr
    where mr.membership_id=p_target_membership_id and mr.role_id=p_role_id
      and mr.valid_from<=now() and (mr.valid_until is null or mr.valid_until>now())
  ) then
    raise exception 'ROLE_ALREADY_ACTIVE' using errcode='55000';
  end if;

  insert into iam.membership_roles(membership_id,role_id,scope,valid_from,valid_until)
  values(p_target_membership_id,p_role_id,v_scope,v_valid_from,p_valid_until);

  v_result:=jsonb_build_object(
    'membership_id',p_target_membership_id,
    'role_id',p_role_id,
    'role_code',v_role_code,
    'scope',v_scope,
    'valid_from',v_valid_from,
    'valid_until',p_valid_until
  );
  select coalesce(max(e.aggregate_version),0)+1 into v_aggregate_version
  from eventing.events e
  where e.aggregate_type='organization_membership' and e.aggregate_id=p_target_membership_id;
  perform app_private.e14_append_event(
    v_event_id,'iam.role.granted','organization_membership',p_target_membership_id,
    'operator',p_actor_user_account_id,p_organization_id,null,
    'organization_membership',p_target_membership_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );

  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$$;

create or replace function public.revoke_organization_role(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_target_membership_id uuid,
  p_role_id uuid,
  p_reason text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_target_user_account_id uuid;
  v_reason text:=trim(coalesce(p_reason,''));
  v_assignment_valid_from timestamptz;
  v_request_hash text;
  v_event_id uuid;
  v_result jsonb;
  v_is_manager boolean;
  v_is_self boolean;
  v_aggregate_version bigint;
begin
  if length(v_reason) not between 3 and 500 then
    raise exception 'INVALID_REVOCATION_REASON' using errcode='22023';
  end if;

  select om.user_account_id into v_target_user_account_id
  from iam.organization_memberships om
  where om.id=p_target_membership_id
    and om.organization_id=p_organization_id
    and om.status='active'
  for update;
  if not found then raise exception 'MEMBERSHIP_NOT_FOUND' using errcode='P0002'; end if;

  v_is_manager:=app_private.e14_actor_has_permission(
    p_actor_user_account_id,p_organization_id,'iam.memberships.manage'
  );
  v_is_self:=v_target_user_account_id=p_actor_user_account_id;
  if not v_is_manager and not v_is_self then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,
    'target_membership_id',p_target_membership_id,
    'role_id',p_role_id,
    'reason',v_reason
  ));
  v_event_id:=app_private.e14_command_event_id(
    'revoke_organization_role',p_actor_user_account_id,p_target_membership_id,v_key
  );
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('iam-role-management:'||p_organization_id::text,0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('iam-membership:'||p_target_membership_id::text,0)
  );

  select mr.valid_from into v_assignment_valid_from
  from iam.membership_roles mr
  where mr.membership_id=p_target_membership_id and mr.role_id=p_role_id
    and mr.valid_from<=now() and (mr.valid_until is null or mr.valid_until>now())
  order by mr.valid_from desc
  limit 1
  for update;
  if not found then raise exception 'ACTIVE_ROLE_NOT_FOUND' using errcode='P0002'; end if;

  if app_private.role_grants_permission(p_role_id,'iam.memberships.manage')
    and app_private.active_role_manager_count(p_organization_id,p_target_membership_id,p_role_id)<1 then
    raise exception 'LAST_ROLE_MANAGER_REQUIRED' using errcode='55000';
  end if;

  update iam.membership_roles
  set valid_until=now()
  where membership_id=p_target_membership_id and role_id=p_role_id and valid_from=v_assignment_valid_from;

  v_result:=jsonb_build_object(
    'membership_id',p_target_membership_id,
    'role_id',p_role_id,
    'revoked_at',now(),
    'reason',v_reason,
    'self_revocation',v_is_self
  );
  select coalesce(max(e.aggregate_version),0)+1 into v_aggregate_version
  from eventing.events e
  where e.aggregate_type='organization_membership' and e.aggregate_id=p_target_membership_id;
  perform app_private.e14_append_event(
    v_event_id,'iam.role.revoked','organization_membership',p_target_membership_id,
    case when v_is_self then 'user' else 'operator' end,p_actor_user_account_id,p_organization_id,null,
    'organization_membership',p_target_membership_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );

  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$$;
