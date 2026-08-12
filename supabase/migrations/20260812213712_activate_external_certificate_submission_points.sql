do $migration$
declare
  v_org_id uuid;
begin
  select id into v_org_id
  from iam.organizations
  where slug = 'estimulo' and status = 'active'
  order by created_at
  limit 1;

  if v_org_id is null then
    raise exception 'ESTIMULO_ORGANIZATION_NOT_FOUND';
  end if;

  update engagement.point_rule_definitions
  set status = 'active'
  where owner_organization_id = v_org_id
    and code = 'submit_external_certificate';

  if not found then
    raise exception 'EXTERNAL_CERTIFICATE_POINT_RULE_NOT_FOUND';
  end if;
end;
$migration$;
