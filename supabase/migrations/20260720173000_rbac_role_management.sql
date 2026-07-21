set lock_timeout = '5s';
set statement_timeout = '5min';

-- Role-management events are internal operational evidence and never CRM payloads.
with schemas(event_name, schema_document) as (
  values
    ('iam.role.granted', '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":true,"required":["request_hash","result"],"properties":{"request_hash":{"type":"string"},"result":{"type":"object"}}}'::jsonb),
    ('iam.role.revoked', '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":true,"required":["request_hash","result"],"properties":{"request_hash":{"type":"string"},"result":{"type":"object"}}}'::jsonb)
)
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select
  app_private.e14_deterministic_uuid('event-schema:'||event_name||':1'),event_name,1,
  'urn:estimulo:event:'||event_name||':1',schema_document,
  app_private.e14_request_hash(schema_document),'published',now()
from schemas
on conflict (event_name,event_version) do nothing;

alter table iam.membership_roles
  drop constraint if exists ck_iam_membership_roles_valid_window;
alter table iam.membership_roles
  add constraint ck_iam_membership_roles_valid_window
  check (valid_until is null or valid_until > valid_from) not valid;
alter table iam.membership_roles validate constraint ck_iam_membership_roles_valid_window;

create index if not exists ix_iam_membership_roles_active
  on iam.membership_roles(membership_id,role_id,valid_from desc)
  where valid_until is null;

create or replace function app_private.role_grants_permission(
  p_role_id uuid,
  p_permission_code text
) returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from iam.role_permissions rp
    join iam.permission_definitions pd on pd.id=rp.permission_id
    where rp.role_id=p_role_id and pd.code=p_permission_code
  );
$$;

create or replace function app_private.role_would_escalate_actor(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_role_id uuid
) returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from iam.role_permissions target_rp
    join iam.permission_definitions target_pd on target_pd.id=target_rp.permission_id
    where target_rp.role_id=p_role_id
      and not app_private.e14_actor_has_permission(
        p_actor_user_account_id,p_organization_id,target_pd.code
      )
  );
$$;

create or replace function app_private.active_role_manager_count(
  p_organization_id uuid,
  p_excluded_membership_id uuid default null,
  p_excluded_role_id uuid default null
) returns bigint
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select count(distinct om.id)
  from iam.organization_memberships om
  join iam.membership_roles mr on mr.membership_id=om.id
  join iam.role_permissions rp on rp.role_id=mr.role_id
  join iam.permission_definitions pd on pd.id=rp.permission_id
  where om.organization_id=p_organization_id
    and om.status='active'
    and om.valid_from<=now()
    and (om.valid_until is null or om.valid_until>now())
    and mr.valid_from<=now()
    and (mr.valid_until is null or mr.valid_until>now())
    and pd.code='iam.memberships.manage'
    and not (om.id is not distinct from p_excluded_membership_id and mr.role_id is not distinct from p_excluded_role_id);
$$;

create or replace function public.list_organization_role_management(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_memberships jsonb;
  v_roles jsonb;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,p_organization_id,'iam.memberships.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'membership_id',om.id,
    'user_account_id',om.user_account_id,
    'email',ua.email_normalized,
    'membership_status',om.status,
    'valid_from',om.valid_from,
    'valid_until',om.valid_until,
    'roles',coalesce((
      select jsonb_agg(jsonb_build_object(
        'role_id',rd.id,
        'role_code',rd.code,
        'role_name',rd.name,
        'scope',mr.scope,
        'valid_from',mr.valid_from,
        'valid_until',mr.valid_until,
        'active',mr.valid_from<=now() and (mr.valid_until is null or mr.valid_until>now())
      ) order by rd.name,mr.valid_from desc)
      from iam.membership_roles mr
      join iam.role_definitions rd on rd.id=mr.role_id
      where mr.membership_id=om.id
    ),'[]'::jsonb)
  ) order by ua.email_normalized),'[]'::jsonb)
  into v_memberships
  from iam.organization_memberships om
  join iam.user_accounts ua on ua.id=om.user_account_id
  where om.organization_id=p_organization_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'role_id',rd.id,
    'code',rd.code,
    'name',rd.name,
    'description',rd.description,
    'status',rd.status,
    'permissions',coalesce((
      select jsonb_agg(pd.code order by pd.code)
      from iam.role_permissions rp
      join iam.permission_definitions pd on pd.id=rp.permission_id
      where rp.role_id=rd.id
    ),'[]'::jsonb)
  ) order by rd.name),'[]'::jsonb)
  into v_roles
  from iam.role_definitions rd
  where rd.organization_id=p_organization_id;

  return jsonb_build_object(
    'organization_id',p_organization_id,
    'memberships',v_memberships,
    'roles',v_roles
  );
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
  v_valid_from timestamptz:=clock_timestamp();
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
  set valid_until=clock_timestamp()
  where membership_id=p_target_membership_id and role_id=p_role_id and valid_from=v_assignment_valid_from;

  v_result:=jsonb_build_object(
    'membership_id',p_target_membership_id,
    'role_id',p_role_id,
    'revoked_at',clock_timestamp(),
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

revoke all on function app_private.role_grants_permission(uuid,text) from public,anon,authenticated;
revoke all on function app_private.role_would_escalate_actor(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function app_private.active_role_manager_count(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.list_organization_role_management(uuid,uuid) from public,anon,authenticated;
revoke all on function public.grant_organization_role(uuid,uuid,uuid,uuid,jsonb,timestamptz,text) from public,anon,authenticated;
revoke all on function public.revoke_organization_role(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;

grant execute on function public.list_organization_role_management(uuid,uuid) to postgres,service_role,app_worker;
grant execute on function public.grant_organization_role(uuid,uuid,uuid,uuid,jsonb,timestamptz,text) to postgres,service_role,app_worker;
grant execute on function public.revoke_organization_role(uuid,uuid,uuid,uuid,text,text) to postgres,service_role,app_worker;
