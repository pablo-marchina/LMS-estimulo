begin;

-- The gamification screen must not depend on the complete product-management
-- workspace. Keep this query small, tenant-scoped and resilient to unrelated
-- product modules being unavailable or evolving independently.
create or replace function public.get_admin_gamification_workspace(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
begin
  if not app_private.estimulo_staff_can_view(
    p_actor_user_account_id,p_organization_id
  ) and not app_private.e14_actor_has_permission(
    p_actor_user_account_id,p_organization_id,'engagement.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  return jsonb_build_object(
    'organization_id',p_organization_id,
    'rules',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'definition_id',definition.id,
        'code',definition.code,
        'rule_type',definition.rule_type,
        'name',definition.name,
        'status',definition.status,
        'versions',(
          select coalesce(jsonb_agg(jsonb_build_object(
            'id',version.id,
            'version_number',version.version_number,
            'status',version.status,
            'language',version.language,
            'expression',version.expression,
            'input_schema',version.input_schema,
            'output_schema',version.output_schema,
            'content_hash',version.content_hash
          ) order by version.version_number desc),'[]'::jsonb)
          from orchestration.rule_versions version
          where version.rule_definition_id=definition.id
        )
      ) order by definition.name),'[]'::jsonb)
      from orchestration.rule_definitions definition
      where definition.owner_organization_id=p_organization_id
    ),
    'journeys',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'definition_id',definition.id,
        'code',definition.code,
        'name',definition.name,
        'status',definition.status,
        'versions',(
          select coalesce(jsonb_agg(jsonb_build_object(
            'id',version.id,
            'version_number',version.version_number,
            'status',version.status,
            'title',version.title,
            'description',version.description,
            'published_at',version.published_at
          ) order by version.version_number desc),'[]'::jsonb)
          from catalog.journey_versions version
          where version.journey_definition_id=definition.id
        )
      ) order by definition.name),'[]'::jsonb)
      from catalog.journey_definitions definition
      where definition.owner_organization_id=p_organization_id
    ),
    'point_rules',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'definition_id',definition.id,
        'code',definition.code,
        'name',definition.name,
        'status',definition.status,
        'versions',(
          select coalesce(jsonb_agg(to_jsonb(version) order by version.version_number desc),'[]'::jsonb)
          from engagement.point_rule_versions version
          where version.point_rule_definition_id=definition.id
        )
      ) order by definition.name),'[]'::jsonb)
      from engagement.point_rule_definitions definition
      where definition.owner_organization_id=p_organization_id
    ),
    'badges',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'definition_id',definition.id,
        'code',definition.code,
        'name',definition.name,
        'status',definition.status,
        'versions',(
          select coalesce(jsonb_agg(to_jsonb(version) order by version.version_number desc),'[]'::jsonb)
          from engagement.badge_versions version
          where version.badge_definition_id=definition.id
        )
      ) order by definition.name),'[]'::jsonb)
      from engagement.badge_definitions definition
      where definition.owner_organization_id=p_organization_id
    ),
    'certificates',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'definition_id',definition.id,
        'code',definition.code,
        'name',definition.name,
        'status',definition.status,
        'versions',(
          select coalesce(jsonb_agg(to_jsonb(version) order by version.version_number desc),'[]'::jsonb)
          from engagement.certificate_versions version
          where version.certificate_definition_id=definition.id
        )
      ) order by definition.name),'[]'::jsonb)
      from engagement.certificate_definitions definition
      where definition.owner_organization_id=p_organization_id
    )
  );
end;
$function$;

revoke all on function public.get_admin_gamification_workspace(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.get_admin_gamification_workspace(uuid,uuid)
  to postgres,service_role,app_worker;

-- Build the administrative directory from accounts, not memberships. Public
-- participant provisioning intentionally creates an account and entrepreneur
-- before any organization membership, so membership-first queries omit valid
-- users. Read-only Estimulo staff access is preserved while role mutations
-- remain protected by the existing command RPCs.
create or replace function public.list_organization_role_management(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
  v_memberships jsonb;
  v_roles jsonb;
begin
  if not app_private.estimulo_staff_can_view(
    p_actor_user_account_id,p_organization_id
  ) and not app_private.e14_actor_has_permission(
    p_actor_user_account_id,p_organization_id,'iam.memberships.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'membership_id',directory.membership_id,
    'user_account_id',directory.user_account_id,
    'email',directory.email_normalized,
    'account_status',directory.account_status,
    'membership_status',coalesce(directory.membership_status,'unlinked'),
    'valid_from',directory.valid_from,
    'valid_until',directory.valid_until,
    'roles',coalesce((
      select jsonb_agg(jsonb_build_object(
        'role_id',role_definition.id,
        'role_code',role_definition.code,
        'role_name',role_definition.name,
        'scope',membership_role.scope,
        'valid_from',membership_role.valid_from,
        'valid_until',membership_role.valid_until,
        'active',membership_role.valid_from<=now()
          and (membership_role.valid_until is null or membership_role.valid_until>now())
      ) order by role_definition.name,membership_role.valid_from desc)
      from iam.membership_roles membership_role
      join iam.role_definitions role_definition on role_definition.id=membership_role.role_id
      where membership_role.membership_id=directory.membership_id
    ),'[]'::jsonb)
  ) order by directory.email_normalized),'[]'::jsonb)
  into v_memberships
  from (
    select
      account.id user_account_id,
      account.email_normalized,
      account.status account_status,
      membership.id membership_id,
      membership.status membership_status,
      membership.valid_from,
      membership.valid_until
    from iam.user_accounts account
    left join lateral (
      select candidate.*
      from iam.organization_memberships candidate
      where candidate.organization_id=p_organization_id
        and candidate.user_account_id=account.id
      order by
        (candidate.status='active'
          and candidate.valid_from<=now()
          and (candidate.valid_until is null or candidate.valid_until>now())) desc,
        candidate.valid_from desc,
        candidate.created_at desc,
        candidate.id
      limit 1
    ) membership on true
    where account.status='active'
      and (
        membership.id is not null
        or exists (
          select 1
          from core.entrepreneurs entrepreneur
          where entrepreneur.user_account_id=account.id
            and entrepreneur.status='active'
            and (
              exists (
                select 1
                from iam.organizations organization
                where organization.id=p_organization_id
                  and organization.slug='estimulo'
                  and organization.status='active'
              )
              or exists (
                select 1
                from orchestration.enrollments enrollment
                join catalog.journey_versions journey_version
                  on journey_version.id=enrollment.journey_version_id
                join catalog.journey_definitions journey_definition
                  on journey_definition.id=journey_version.journey_definition_id
                where enrollment.entrepreneur_id=entrepreneur.id
                  and journey_definition.owner_organization_id=p_organization_id
              )
            )
        )
      )
  ) directory;

  select coalesce(jsonb_agg(jsonb_build_object(
    'role_id',role_definition.id,
    'code',role_definition.code,
    'name',role_definition.name,
    'description',role_definition.description,
    'status',role_definition.status,
    'permissions',coalesce((
      select jsonb_agg(permission_definition.code order by permission_definition.code)
      from iam.role_permissions role_permission
      join iam.permission_definitions permission_definition
        on permission_definition.id=role_permission.permission_id
      where role_permission.role_id=role_definition.id
    ),'[]'::jsonb)
  ) order by role_definition.name),'[]'::jsonb)
  into v_roles
  from iam.role_definitions role_definition
  where role_definition.organization_id=p_organization_id;

  return jsonb_build_object(
    'organization_id',p_organization_id,
    'memberships',v_memberships,
    'roles',v_roles
  );
end;
$function$;

revoke all on function public.list_organization_role_management(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.list_organization_role_management(uuid,uuid)
  to postgres,service_role,app_worker;

commit;
