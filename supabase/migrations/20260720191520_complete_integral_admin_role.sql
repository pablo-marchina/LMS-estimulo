set lock_timeout = '5s';
set statement_timeout = '5min';

insert into iam.role_permissions(role_id,permission_id)
select distinct publish_role.role_id,diagnostic_permission.id
from (
  select rp.role_id
  from iam.role_permissions rp
  join iam.permission_definitions pd on pd.id=rp.permission_id
  group by rp.role_id
  having bool_or(pd.code='journey.definition.publish')
     and bool_or(pd.code='engagement.manage')
) publish_role
cross join iam.permission_definitions diagnostic_permission
where diagnostic_permission.code='diagnostic.configuration.manage'
on conflict do nothing;
