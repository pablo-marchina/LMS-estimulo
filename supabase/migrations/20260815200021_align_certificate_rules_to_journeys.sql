begin;

create or replace function app_private.validate_certificate_journey_rule()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_expression jsonb;
  v_rule_journey_version_id uuid;
begin
  select rule_version.expression
    into v_expression
  from orchestration.rule_versions rule_version
  where rule_version.id = new.requirements_rule_version_id
    and rule_version.status = 'published';

  if v_expression is null then
    raise exception 'CERTIFICATE_REQUIREMENTS_RULE_MUST_BE_PUBLISHED' using errcode='22023';
  end if;

  if coalesce(v_expression->>'scope','') <> 'journey' then
    raise exception 'CERTIFICATE_REQUIREMENTS_RULE_MUST_TARGET_JOURNEY' using errcode='22023';
  end if;

  begin
    v_rule_journey_version_id := nullif(v_expression->>'journey_version_id','')::uuid;
  exception when invalid_text_representation then
    raise exception 'CERTIFICATE_REQUIREMENTS_RULE_JOURNEY_INVALID' using errcode='22023';
  end;

  if v_rule_journey_version_id is distinct from new.journey_version_id then
    raise exception 'CERTIFICATE_REQUIREMENTS_RULE_JOURNEY_MISMATCH' using errcode='22023';
  end if;

  return new;
end;
$$;

revoke all on function app_private.validate_certificate_journey_rule() from public,anon,authenticated,service_role;

do $repair$
declare
  v_certificate record;
  v_rule_definition_id uuid;
  v_rule_version_id uuid;
  v_code text;
  v_rule_name text;
  v_expression jsonb;
begin
  for v_certificate in
    select certificate_version.id as certificate_version_id,
           certificate_version.journey_version_id,
           certificate_definition.owner_organization_id,
           journey_definition.name as journey_name
    from engagement.certificate_versions certificate_version
    join engagement.certificate_definitions certificate_definition
      on certificate_definition.id=certificate_version.certificate_definition_id
    join catalog.journey_versions journey_version
      on journey_version.id=certificate_version.journey_version_id
    join catalog.journey_definitions journey_definition
      on journey_definition.id=journey_version.journey_definition_id
    left join orchestration.rule_versions rule_version
      on rule_version.id=certificate_version.requirements_rule_version_id
    where not exists (
      select 1
      from engagement.certificate_issuances issuance
      where issuance.certificate_version_id=certificate_version.id
    )
      and (
        rule_version.id is null
        or rule_version.status <> 'published'
        or coalesce(rule_version.expression->>'scope','') <> 'journey'
        or coalesce(rule_version.expression->>'journey_version_id','') <> certificate_version.journey_version_id::text
      )
  loop
    v_rule_definition_id := app_private.e14_deterministic_uuid('certificate-journey-rule-definition:'||v_certificate.certificate_version_id::text);
    v_rule_version_id := app_private.e14_deterministic_uuid('certificate-journey-rule-version:'||v_certificate.certificate_version_id::text||':1');
    v_code := 'certificado_jornada_'||substr(replace(v_certificate.certificate_version_id::text,'-',''),1,16);
    v_rule_name := 'Conclusão — '||v_certificate.journey_name;
    v_expression := jsonb_build_object(
      'scope','journey',
      'journey_version_id',v_certificate.journey_version_id,
      'requires_completed_status',true,
      'requires_required_steps_completed',true
    );

    insert into orchestration.rule_definitions(
      id,owner_organization_id,code,rule_type,name,status
    ) values (
      v_rule_definition_id,v_certificate.owner_organization_id,v_code,'credential',v_rule_name,'active'
    ) on conflict (id) do update
      set name=excluded.name,
          status='active';

    insert into orchestration.rule_versions(
      id,rule_definition_id,version_number,status,language,expression,input_schema,output_schema,published_at,content_hash,created_at
    ) values (
      v_rule_version_id,v_rule_definition_id,1,'published','json-logic',v_expression,'{}'::jsonb,'{}'::jsonb,now(),
      app_private.e14_request_hash(jsonb_build_object('expression',v_expression,'input_schema','{}'::jsonb,'output_schema','{}'::jsonb)),now()
    ) on conflict (id) do update
      set status='published',
          expression=excluded.expression,
          published_at=coalesce(orchestration.rule_versions.published_at,excluded.published_at),
          content_hash=excluded.content_hash;

    update engagement.certificate_versions
       set requirements_rule_version_id=v_rule_version_id
     where id=v_certificate.certificate_version_id;
  end loop;
end;
$repair$;

drop trigger if exists trg_validate_certificate_journey_rule on engagement.certificate_versions;
create trigger trg_validate_certificate_journey_rule
before insert or update of journey_version_id, requirements_rule_version_id
on engagement.certificate_versions
for each row
execute function app_private.validate_certificate_journey_rule();

commit;
