do $$
declare
  v_organization_id uuid;
  v_definition_id uuid;
  v_eligibility_rule_version_id uuid;
  v_current_version engagement.point_rule_versions%rowtype;
  v_expected_policy jsonb;
  v_next_version integer;
  v_new_version_id uuid;
begin
  select organization.id
    into v_organization_id
  from iam.organizations organization
  where organization.slug = 'estimulo'
    and organization.status = 'active'
  order by organization.created_at
  limit 1;

  if v_organization_id is null then
    raise exception 'ESTIMULO_ORGANIZATION_NOT_FOUND';
  end if;

  select version.id
    into v_eligibility_rule_version_id
  from orchestration.rule_definitions definition
  join orchestration.rule_versions version
    on version.rule_definition_id = definition.id
  where definition.owner_organization_id = v_organization_id
    and definition.code = 'e14_always_eligible'
    and definition.rule_type = 'eligibility'
    and definition.status = 'active'
    and version.status = 'published'
    and version.published_at is not null
  order by version.version_number desc
  limit 1;

  if v_eligibility_rule_version_id is null then
    raise exception 'ALWAYS_ELIGIBLE_RULE_NOT_FOUND';
  end if;

  select definition.id
    into v_definition_id
  from engagement.point_rule_definitions definition
  where definition.owner_organization_id = v_organization_id
    and definition.code = 'complete_diagnostic'
    and definition.status = 'active'
  limit 1;

  if v_definition_id is null then
    raise exception 'COMPLETE_DIAGNOSTIC_POINT_RULE_NOT_FOUND';
  end if;

  v_expected_policy := jsonb_build_object(
    'scope', 'journey',
    'frequency', 'once',
    'maximum', 1,
    'maximum_awards', 1,
    'transferable', false,
    'description', 'Concluir o diagnóstico empreendedor.',
    'trigger', jsonb_build_object('event_name', 'diagnostic.session.completed')
  );

  select version.*
    into v_current_version
  from engagement.point_rule_versions version
  where version.point_rule_definition_id = v_definition_id
    and version.status = 'published'
    and version.published_at is not null
  order by version.version_number desc
  limit 1;

  if v_current_version.id is null then
    raise exception 'COMPLETE_DIAGNOSTIC_POINT_RULE_VERSION_NOT_FOUND';
  end if;

  if v_current_version.amount = 50
    and v_current_version.eligibility_rule_version_id = v_eligibility_rule_version_id
    and v_current_version.recurrence_policy = v_expected_policy
  then
    return;
  end if;

  select coalesce(max(version.version_number), 0) + 1
    into v_next_version
  from engagement.point_rule_versions version
  where version.point_rule_definition_id = v_definition_id;

  v_new_version_id := app_private.e14_deterministic_uuid(
    'point-rule-version|' || v_definition_id::text || '|' || v_next_version::text || '|diagnostic-normalized'
  );

  insert into engagement.point_rule_versions (
    id,
    point_rule_definition_id,
    version_number,
    status,
    amount,
    eligibility_rule_version_id,
    recurrence_policy,
    published_at
  ) values (
    v_new_version_id,
    v_definition_id,
    v_next_version,
    'published',
    50,
    v_eligibility_rule_version_id,
    v_expected_policy,
    now()
  )
  on conflict (point_rule_definition_id, version_number) do nothing;
end
$$;
