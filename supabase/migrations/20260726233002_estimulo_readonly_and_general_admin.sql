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
  p_provider text,p_issuer text,p_subject text,p_email_normalized text,
  p_email_verified boolean,p_claims_fingerprint text
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
  v_user_account_id:=iam.resolve_external_identity(
    p_provider,p_issuer,p_subject,p_email_normalized,p_email_verified,p_claims_fingerprint
  );
  v_entrepreneur_id:=app_private.e14_entrepreneur_for_account(v_user_account_id);

  if p_email_verified and lower(btrim(p_email_normalized)) ~ '^[^@]+@estimulo\.org$' then
    select organization.id into v_estimulo_organization_id
    from iam.organizations organization
    where organization.slug='estimulo' and organization.status='active' limit 1;
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
      select 1 from iam.membership_roles assigned_role
      where assigned_role.membership_id=v_membership.membership_id
        and assigned_role.role_id=v_admin_role_id
        and assigned_role.valid_from<=now()
        and (assigned_role.valid_until is null or assigned_role.valid_until>now())
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

revoke execute on function app_private.estimulo_staff_can_view(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.e14_resolve_identity(text,text,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.e14_resolve_identity(text,text,text,text,boolean,text) to service_role;
