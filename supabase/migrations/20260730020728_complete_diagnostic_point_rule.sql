do $$
declare
  v_organization_id uuid;
  v_definition_id uuid;
  v_version_id uuid;
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
  limit 1;

  if v_definition_id is null then
    v_definition_id := app_private.e14_deterministic_uuid(
      'point-rule-definition|' || v_organization_id::text || '|complete_diagnostic'
    );

    insert into engagement.point_rule_definitions (
      id,
      owner_organization_id,
      code,
      name,
      status
    ) values (
      v_definition_id,
      v_organization_id,
      'complete_diagnostic',
      'Concluir o diagnóstico empreendedor',
      'active'
    );
  else
    update engagement.point_rule_definitions
      set name = 'Concluir o diagnóstico empreendedor',
          status = 'active'
    where id = v_definition_id;
  end if;

  select version.id
    into v_version_id
  from engagement.point_rule_versions version
  where version.point_rule_definition_id = v_definition_id
    and version.status = 'published'
  order by version.version_number desc
  limit 1;

  if v_version_id is null then
    v_version_id := app_private.e14_deterministic_uuid(
      'point-rule-version|' || v_definition_id::text || '|1'
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
      v_version_id,
      v_definition_id,
      1,
      'published',
      50,
      v_eligibility_rule_version_id,
      jsonb_build_object(
        'scope', 'journey',
        'frequency', 'once',
        'maximum', 1,
        'maximum_awards', 1,
        'transferable', false,
        'description', 'Concluir o diagnóstico empreendedor.',
        'trigger', jsonb_build_object('event_name', 'diagnostic.session.completed')
      ),
      now()
    );
  end if;
end
$$;
