update orchestration.rule_versions rv
set language = 'credential-v1'
where rv.id in (
  select cv.requirements_rule_version_id
  from engagement.certificate_versions cv
)
  and rv.language = 'json-logic'
  and rv.expression->>'scope' = 'journey';

create or replace function app_private.validate_certificate_journey_rule()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
declare
  v_expression jsonb;
  v_language text;
  v_rule_journey_version_id uuid;
begin
  select rule_version.expression, rule_version.language
    into v_expression, v_language
  from orchestration.rule_versions rule_version
  where rule_version.id = new.requirements_rule_version_id
    and rule_version.status = 'published';

  if v_expression is null then
    raise exception 'CERTIFICATE_REQUIREMENTS_RULE_MUST_BE_PUBLISHED' using errcode='22023';
  end if;

  if v_language <> 'credential-v1' then
    raise exception 'CERTIFICATE_REQUIREMENTS_RULE_LANGUAGE_INVALID' using errcode='22023';
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
$function$;

revoke all on function app_private.validate_certificate_journey_rule() from public, anon, authenticated, service_role;

do $block$
declare
  v_row record;
begin
  for v_row in
    select ji.id as journey_instance_id, en.entrepreneur_id, e.user_account_id
    from orchestration.journey_instances ji
    join orchestration.enrollments en on en.id = ji.enrollment_id
    join core.entrepreneurs e on e.id = en.entrepreneur_id
    where ji.status = 'completed'
      and app_private.e14_entrepreneur_for_account(e.user_account_id) = en.entrepreneur_id
    order by ji.id
  loop
    perform public.issue_learning_credentials(
      v_row.user_account_id,
      v_row.journey_instance_id,
      null,
      'journey-certificate-rule-language-backfill-v1:' || v_row.journey_instance_id::text
    );
  end loop;
end;
$block$;
