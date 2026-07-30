do $$
declare
  v_organization_id uuid;
  v_definition_id uuid;
  v_eligibility_rule_version_id uuid;
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

  update engagement.point_rule_versions version
  set amount = 50,
      eligibility_rule_version_id = v_eligibility_rule_version_id,
      recurrence_policy = jsonb_build_object(
        'scope', 'journey',
        'frequency', 'once',
        'maximum', 1,
        'maximum_awards', 1,
        'transferable', false,
        'description', 'Concluir o diagnóstico empreendedor.',
        'trigger', jsonb_build_object('event_name', 'diagnostic.session.completed')
      ),
      published_at = coalesce(version.published_at, now())
  where version.point_rule_definition_id = v_definition_id
    and version.status = 'published';

  if not found then
    raise exception 'COMPLETE_DIAGNOSTIC_POINT_RULE_VERSION_NOT_FOUND';
  end if;
end
$$;
