begin;

do $migration$
declare
  v_organization_id uuid := app_private.extension_default_organization();
  v_rule_definition_id uuid;
  v_rule_version_id uuid;
  v_expression jsonb := jsonb_build_object('==',jsonb_build_array(1,1));
  v_point record;
  v_next_version integer;
  v_new_point_version_id uuid;
begin
  select id into v_rule_definition_id
  from orchestration.rule_definitions
  where owner_organization_id=v_organization_id
    and code='general_point_eligibility'
  limit 1;

  if v_rule_definition_id is null then
    v_rule_definition_id := app_private.e14_deterministic_uuid('rule-definition:general-point-eligibility:'||v_organization_id::text);
    insert into orchestration.rule_definitions(
      id,owner_organization_id,code,rule_type,name,status
    ) values (
      v_rule_definition_id,v_organization_id,'general_point_eligibility','eligibility','Elegibilidade geral para pontos','active'
    );
  end if;

  select id into v_rule_version_id
  from orchestration.rule_versions
  where rule_definition_id=v_rule_definition_id
    and status='published'
  order by version_number desc
  limit 1;

  if v_rule_version_id is null then
    v_rule_version_id := app_private.e14_deterministic_uuid('rule-version:general-point-eligibility:'||v_rule_definition_id::text||':1');
    insert into orchestration.rule_versions(
      id,rule_definition_id,version_number,status,language,expression,input_schema,output_schema,published_at,content_hash,created_at
    ) values (
      v_rule_version_id,v_rule_definition_id,1,'published','json-logic',v_expression,
      jsonb_build_object('type','object'),jsonb_build_object('type','boolean'),now(),
      app_private.e14_request_hash(jsonb_build_object(
        'expression',v_expression,
        'input_schema',jsonb_build_object('type','object'),
        'output_schema',jsonb_build_object('type','boolean')
      )),now()
    );
  end if;

  for v_point in
    select definition.id as definition_id,
           latest.amount,
           latest.recurrence_policy,
           latest.eligibility_rule_version_id
    from engagement.point_rule_definitions definition
    join lateral (
      select version.*
      from engagement.point_rule_versions version
      where version.point_rule_definition_id=definition.id
        and version.status='published'
      order by version.version_number desc
      limit 1
    ) latest on true
    where definition.owner_organization_id=v_organization_id
      and definition.status='active'
      and latest.recurrence_policy#>>'{trigger,event_name}' is not null
      and latest.eligibility_rule_version_id is distinct from v_rule_version_id
  loop
    select coalesce(max(version_number),0)+1 into v_next_version
    from engagement.point_rule_versions
    where point_rule_definition_id=v_point.definition_id;

    v_new_point_version_id := app_private.e14_deterministic_uuid(
      'point-rule-version:canonical-eligibility:'||v_point.definition_id::text||':'||v_next_version::text
    );

    insert into engagement.point_rule_versions(
      id,point_rule_definition_id,version_number,status,amount,eligibility_rule_version_id,recurrence_policy,published_at
    ) values (
      v_new_point_version_id,v_point.definition_id,v_next_version,'published',v_point.amount,v_rule_version_id,v_point.recurrence_policy,now()
    );
  end loop;
end;
$migration$;

commit;
