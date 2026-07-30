begin;

-- The former internal business-maturity draft and its administration surface
-- were deliberately removed from the final product. This gate prevents stale
-- diagnostic, scoring or segmentation state from returning silently.
do $$
begin
  if exists (
    select 1 from iam.organizations where slug='estimulo-e14-internal'
  ) then
    raise exception 'obsolete internal maturity organization remains';
  end if;

  if exists (
    select 1
    from diagnostics.diagnostic_definitions
    where code='business_maturity_self_assessment'
  ) then
    raise exception 'obsolete business maturity diagnostic remains';
  end if;

  if exists (
    select 1
    from orchestration.rule_definitions
    where code='business_maturity_scoring'
  ) then
    raise exception 'obsolete business maturity scoring rule remains';
  end if;

  if exists (
    select 1
    from diagnostics.segment_definitions
    where code like 'business_maturity_%'
  ) then
    raise exception 'obsolete business maturity segments remain';
  end if;

  if exists (
    select 1
    from diagnostics.segment_assignments assignment
    join diagnostics.segment_versions version on version.id=assignment.segment_version_id
    join diagnostics.segment_definitions definition on definition.id=version.segment_definition_id
    where definition.code like 'business_maturity_%'
  ) then
    raise exception 'obsolete business maturity assignments remain';
  end if;
end;
$$;

rollback;
