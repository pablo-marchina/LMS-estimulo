begin;

create or replace function app_private.extension_admin_allowed(
  p_actor_user_account_id uuid,
  p_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog'
as $$
  select
    app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.content.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'participant.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'assessment.review')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'diagnostic.configuration.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'iam.membership.manage')
$$;

create or replace function app_private.extension_default_organization()
returns uuid
language sql
stable
security definer
set search_path to 'pg_catalog'
as $$
  select o.id
  from iam.organizations o
  where o.status='active'
  order by case when o.slug='estimulo' then 0 else 1 end, o.created_at
  limit 1
$$;

create or replace function app_private.extension_entrepreneur(p_actor_user_account_id uuid)
returns uuid
language sql
stable
security definer
set search_path to 'pg_catalog'
as $$
  select e.id
  from core.entrepreneurs e
  where e.user_account_id=p_actor_user_account_id
    and e.status='active'
  limit 1
$$;

revoke all on function app_private.extension_admin_allowed(uuid,uuid) from public,anon,authenticated;
revoke all on function app_private.extension_default_organization() from public,anon,authenticated;
revoke all on function app_private.extension_entrepreneur(uuid) from public,anon,authenticated;

commit;
