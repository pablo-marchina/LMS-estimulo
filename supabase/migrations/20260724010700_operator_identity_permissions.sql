-- Frente 6: the existing internal operator role owns the Users admin surface.
-- Grant only the permissions needed to read accounts and resolve integration links.

insert into iam.role_permissions(role_id,permission_id)
select r.id,p.id
from iam.role_definitions r
join iam.permission_definitions p on p.code in ('iam.accounts.manage','integration.manage')
where r.code='e14_operator' and r.status='active'
on conflict do nothing;
