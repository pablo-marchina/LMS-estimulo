-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708221643
-- Remote name: m08f_rls_identity_core
-- Remote SQL SHA-256: 16dfed0e72dd6911192c62653094403932f5e682f8a45e83e50de2de0d419049
-- Do not edit after reconciliation; corrections require a new migration.

create policy user_accounts_select_self_or_admin on iam.user_accounts
for select using (
  id = app_private.current_user_account_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.read', app_private.current_organization_id(), 'user_account', id)
);

create policy user_accounts_write_admin on iam.user_accounts
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.manage', app_private.current_organization_id(), 'user_account', id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.manage', app_private.current_organization_id(), 'user_account', id)
);

create policy external_identities_select_self_or_admin on iam.external_identities
for select using (
  user_account_id = app_private.current_user_account_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.read', app_private.current_organization_id(), 'user_account', user_account_id)
);

create policy external_identities_write_admin on iam.external_identities
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.manage', app_private.current_organization_id(), 'user_account', user_account_id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.manage', app_private.current_organization_id(), 'user_account', user_account_id)
);

create policy organizations_select_member on iam.organizations
for select using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from iam.organization_memberships om
    where om.organization_id = iam.organizations.id
      and om.user_account_id = app_private.current_user_account_id()
      and om.status = 'active'
      and om.valid_from <= now()
      and (om.valid_until is null or om.valid_until > now())
  )
  or app_private.has_permission('iam.organizations.read', iam.organizations.id, 'organization', iam.organizations.id)
);

create policy organizations_write_admin on iam.organizations
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.organizations.manage', iam.organizations.id, 'organization', iam.organizations.id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.organizations.manage', iam.organizations.id, 'organization', iam.organizations.id)
);

create policy memberships_select_self_or_admin on iam.organization_memberships
for select using (
  user_account_id = app_private.current_user_account_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('iam.memberships.read', organization_id, 'organization_membership', id)
);

create policy memberships_write_admin on iam.organization_memberships
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.memberships.manage', organization_id, 'organization_membership', id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.memberships.manage', organization_id, 'organization_membership', id)
);

create policy membership_roles_select_self_or_admin on iam.membership_roles
for select using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from iam.organization_memberships om
    where om.id = membership_id
      and (
        om.user_account_id = app_private.current_user_account_id()
        or app_private.has_permission('iam.memberships.read', om.organization_id, 'organization_membership', om.id)
      )
  )
);

create policy membership_roles_write_admin on iam.membership_roles
for all using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from iam.organization_memberships om
    where om.id = membership_id
      and app_private.has_permission('iam.memberships.manage', om.organization_id, 'organization_membership', om.id)
  )
) with check (
  app_private.is_trusted_worker()
  or exists (
    select 1 from iam.organization_memberships om
    where om.id = membership_id
      and app_private.has_permission('iam.memberships.manage', om.organization_id, 'organization_membership', om.id)
  )
);

create policy entrepreneurs_select_authorized on core.entrepreneurs
for select using (app_private.can_access_entrepreneur(id));

create policy entrepreneurs_write_authorized on core.entrepreneurs
for all using (
  id = app_private.current_entrepreneur_id() or app_private.can_manage_entrepreneur(id)
) with check (
  id = app_private.current_entrepreneur_id() or app_private.can_manage_entrepreneur(id)
);

create policy businesses_select_authorized on core.businesses
for select using (app_private.can_access_business(id));

create policy businesses_write_operator on core.businesses
for all using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from orchestration.enrollments e
    join catalog.journey_versions jv on jv.id = e.journey_version_id
    join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
    where e.business_id = core.businesses.id
      and app_private.has_permission('participant.manage', jd.owner_organization_id, 'business', core.businesses.id)
  )
) with check (app_private.is_trusted_worker() or app_private.can_access_business(core.businesses.id));

create policy business_memberships_select_authorized on core.business_memberships
for select using (
  app_private.can_access_entrepreneur(entrepreneur_id)
  and app_private.can_access_business(business_id)
);

create policy business_memberships_write_operator on core.business_memberships
for all using (app_private.can_manage_entrepreneur(entrepreneur_id))
with check (app_private.can_manage_entrepreneur(entrepreneur_id));

create policy file_objects_select_authorized on core.file_objects
for select using (app_private.can_access_file_object(id));

create policy file_objects_write_operator on core.file_objects
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('file.manage', owner_organization_id, 'file_object', id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('file.manage', owner_organization_id, 'file_object', id)
);
