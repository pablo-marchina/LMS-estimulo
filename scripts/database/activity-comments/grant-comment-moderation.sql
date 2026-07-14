\set ON_ERROR_STOP on

insert into iam.role_permissions(role_id, permission_id)
select distinct
  source_grant.role_id,
  target_permission.id
from iam.role_permissions source_grant
join iam.permission_definitions source_permission
  on source_permission.id = source_grant.permission_id
 and source_permission.code = 'journey.execution.manage'
join iam.permission_definitions target_permission
  on target_permission.code = 'engagement.manage'
on conflict (role_id, permission_id) do nothing;
