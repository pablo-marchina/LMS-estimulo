do $migration$
declare
  v_org_id uuid;
  v_eligibility_rule_version_id uuid;
  v_definition_id uuid;
  v_next_version integer;
  v_policy jsonb := jsonb_build_object(
    'scope', 'event',
    'frequency', 'per_certificate',
    'transferable', false,
    'trigger', jsonb_build_object('event_name', 'learning.external_credential.confirmed')
  );
begin
  select id into v_org_id
  from iam.organizations
  where slug = 'estimulo' and status = 'active'
  order by created_at
  limit 1;

  if v_org_id is null then
    raise exception 'ESTIMULO_ORGANIZATION_NOT_FOUND';
  end if;

  select rv.id into v_eligibility_rule_version_id
  from orchestration.rule_versions rv
  join orchestration.rule_definitions rd on rd.id = rv.rule_definition_id
  where rd.owner_organization_id = v_org_id
    and rd.code = 'e14_always_eligible'
    and rv.status = 'published'
  order by rv.version_number desc
  limit 1;

  if v_eligibility_rule_version_id is null then
    raise exception 'ALWAYS_ELIGIBLE_RULE_NOT_FOUND';
  end if;

  insert into engagement.point_rule_definitions(owner_organization_id, code, name, status)
  values (v_org_id, 'submit_external_certificate', 'Enviar um certificado', 'published')
  on conflict (owner_organization_id, code) do update
    set name = excluded.name,
        status = 'published'
  returning id into v_definition_id;

  if exists (
    select 1
    from engagement.point_rule_versions
    where point_rule_definition_id = v_definition_id
      and status = 'published'
      and amount = 20
      and eligibility_rule_version_id = v_eligibility_rule_version_id
      and recurrence_policy = v_policy
  ) then
    return;
  end if;

  update engagement.point_rule_versions
  set status = 'retired'
  where point_rule_definition_id = v_definition_id
    and status = 'published';

  select coalesce(max(version_number), 0) + 1
  into v_next_version
  from engagement.point_rule_versions
  where point_rule_definition_id = v_definition_id;

  insert into engagement.point_rule_versions(
    point_rule_definition_id,
    version_number,
    status,
    amount,
    eligibility_rule_version_id,
    recurrence_policy,
    published_at
  ) values (
    v_definition_id,
    v_next_version,
    'published',
    20,
    v_eligibility_rule_version_id,
    v_policy,
    now()
  );
end;
$migration$;
