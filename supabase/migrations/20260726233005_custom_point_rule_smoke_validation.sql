-- Historical migration retained for version compatibility.
-- The custom-rule behavior test runs only when its organization, journey and
-- eligibility fixtures are present. Empty structural replay must not depend on
-- mutable editorial content.
do $smoke$
declare
  v_actor uuid:=gen_random_uuid();
  v_entrepreneur uuid:=gen_random_uuid();
  v_definition uuid:=gen_random_uuid();
  v_version uuid:=gen_random_uuid();
  v_organization uuid;
  v_journey_version uuid;
  v_enrollment jsonb;
  v_instance uuid;
  v_state jsonb;
  v_count integer;
  v_total integer;
begin
  select id into v_organization from iam.organizations where slug='estimulo' and status='active' limit 1;
  if v_organization is null then
    raise notice 'custom point-rule smoke skipped: organization fixture is not present during structural replay';
    return;
  end if;

  select version.id into v_journey_version
  from catalog.journey_versions version
  join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  where definition.code='capacitacao_ia_mei_openai' and version.status='published'
  order by version.version_number desc limit 1;
  if v_journey_version is null then
    raise notice 'custom point-rule smoke skipped: published journey fixture is not present during structural replay';
    return;
  end if;

  if not exists (
    select 1 from engagement.eligibility_rule_versions
    where id='10d67e41-e2d6-519b-a1a2-a981f628ba89'::uuid
  ) then
    raise notice 'custom point-rule smoke skipped: eligibility fixture is not present during structural replay';
    return;
  end if;

  begin
    insert into engagement.point_rule_definitions(id,owner_organization_id,code,name,status)
    values(v_definition,v_organization,'runtime_smoke_custom_start','Regra funcional de validação','active');
    insert into engagement.point_rule_versions(
      id,point_rule_definition_id,version_number,status,amount,eligibility_rule_version_id,recurrence_policy,published_at
    ) values(
      v_version,v_definition,1,'published',7,'10d67e41-e2d6-519b-a1a2-a981f628ba89'::uuid,
      jsonb_build_object('scope','journey','maximum',1,'transferable',false,'trigger',jsonb_build_object('event_name','journey.instance.started')),now()
    );

    insert into iam.user_accounts(id,email_normalized,status)
    values(v_actor,'runtime-smoke-custom-rule-'||replace(v_actor::text,'-','')||'@invalid.local','active');
    insert into core.entrepreneurs(id,user_account_id,preferred_name,email_normalized,status,profile_data)
    values(v_entrepreneur,v_actor,'Runtime Smoke Custom Rule','runtime-smoke-custom-rule-'||replace(v_actor::text,'-','')||'@invalid.local','active','{}'::jsonb);

    v_enrollment:=public.e14_self_enroll(v_actor,v_journey_version,'smoke-custom-rule-enroll');
    v_instance:=(v_enrollment->'data'->>'journey_instance_id')::uuid;
    v_state:=public.e14_get_participant_state(v_actor,v_instance);
    perform public.e14_start_journey(v_actor,v_instance,(v_state->>'journey_aggregate_version')::bigint,'smoke-custom-rule-start');

    select count(*),coalesce(sum(ledger.amount),0) into v_count,v_total
    from engagement.point_ledger ledger
    where ledger.entrepreneur_id=v_entrepreneur and ledger.point_rule_version_id=v_version;
    if v_count<>1 or v_total<>7 then
      raise exception 'CUSTOM_POINT_RULE_NOT_AWARDED count=% total=%',v_count,v_total;
    end if;

    perform public.e14_start_journey(v_actor,v_instance,0,'smoke-custom-rule-start');
    select count(*),coalesce(sum(ledger.amount),0) into v_count,v_total
    from engagement.point_ledger ledger
    where ledger.entrepreneur_id=v_entrepreneur and ledger.point_rule_version_id=v_version;
    if v_count<>1 or v_total<>7 then
      raise exception 'CUSTOM_POINT_RULE_NOT_IDEMPOTENT count=% total=%',v_count,v_total;
    end if;

    raise exception using errcode='ZX005',message='ROLLBACK_CUSTOM_POINT_RULE_SMOKE';
  exception when sqlstate 'ZX005' then null;
  end;
end
$smoke$;
