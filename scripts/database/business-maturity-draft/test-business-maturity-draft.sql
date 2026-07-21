begin;

do $$
declare
  v_org uuid;
  v_definition uuid;
  v_version uuid;
  v_rule_version uuid;
begin
  select id into strict v_org from iam.organizations where slug='estimulo-e14-internal';
  select id into strict v_definition
  from diagnostics.diagnostic_definitions
  where owner_organization_id=v_org and code='business_maturity_self_assessment';
  select id into strict v_version
  from diagnostics.diagnostic_versions
  where diagnostic_definition_id=v_definition and version_number=1;

  if (select status from diagnostics.diagnostic_definitions where id=v_definition)<>'draft' then
    raise exception 'maturity definition must remain draft';
  end if;
  if (select status from diagnostics.diagnostic_versions where id=v_version)<>'draft' then
    raise exception 'maturity version must remain draft';
  end if;
  if coalesce((select (configuration->>'activation_allowed')::boolean from diagnostics.diagnostic_versions where id=v_version),true) then
    raise exception 'draft maturity activation must remain blocked';
  end if;
  if (select configuration->>'credit_use' from diagnostics.diagnostic_versions where id=v_version)<>'forbidden' then
    raise exception 'credit use must be forbidden';
  end if;
  if (select configuration->>'crm_policy' from diagnostics.diagnostic_versions where id=v_version)<>'not_synced_until_governance_approval' then
    raise exception 'CRM policy must remain fail closed';
  end if;
  if (select count(*) from diagnostics.dimensions where diagnostic_version_id=v_version)<>6 then
    raise exception 'expected six maturity dimensions';
  end if;
  if (select count(*) from diagnostics.items where diagnostic_version_id=v_version and is_required)<>6 then
    raise exception 'expected six required maturity questions';
  end if;
  if exists (
    select 1 from diagnostics.items i
    where i.diagnostic_version_id=v_version
      and (select count(*) from diagnostics.item_options io where io.item_id=i.id)<>5
  ) then
    raise exception 'every maturity item must have five options';
  end if;
  if exists (
    select 1 from diagnostics.item_options io
    join diagnostics.items i on i.id=io.item_id
    where i.diagnostic_version_id=v_version
      and ((io.value->>'score')::integer not between 0 and 4)
  ) then
    raise exception 'maturity option score outside zero to four';
  end if;

  select rv.id into strict v_rule_version
  from orchestration.rule_versions rv
  join orchestration.rule_definitions rd on rd.id=rv.rule_definition_id
  where rd.owner_organization_id=v_org
    and rd.code='business_maturity_scoring'
    and rv.version_number=1;
  if (select status from orchestration.rule_versions where id=v_rule_version)<>'draft'
     or (select published_at from orchestration.rule_versions where id=v_rule_version) is not null then
    raise exception 'maturity rule must remain unpublished draft';
  end if;
  if (select count(*)
      from diagnostics.segment_versions sv
      join diagnostics.segment_definitions sd on sd.id=sv.segment_definition_id
      where sd.owner_organization_id=v_org
        and sd.code like 'business_maturity_%'
        and sv.version_number=1
        and sv.rule_version_id=v_rule_version
        and sv.status='draft'
        and sv.published_at is null)<>3 then
    raise exception 'expected three unpublished maturity segments';
  end if;
  if exists (
    select 1 from diagnostics.segment_assignments sa
    join diagnostics.segment_versions sv on sv.id=sa.segment_version_id
    join diagnostics.segment_definitions sd on sd.id=sv.segment_definition_id
    where sd.owner_organization_id=v_org and sd.code like 'business_maturity_%'
  ) then
    raise exception 'draft maturity configuration cannot assign participants';
  end if;
end;
$$;

rollback;
