do $block$
declare
  v_generic_definition_id uuid;
  v_source_version record;
  v_journey record;
  v_rule_definition_id uuid;
  v_rule_version_id uuid;
  v_certificate_version_id uuid;
  v_next_version integer;
  v_expression jsonb;
begin
  select cd.id
    into v_generic_definition_id
  from engagement.certificate_definitions cd
  where cd.code='certificado_geral_estimulo' and cd.status='active'
  order by cd.id
  limit 1;

  select cv.validity_policy,cv.template_layout,cv.template_file_object_id,cv.issuer_id
    into v_source_version
  from engagement.certificate_versions cv
  where cv.certificate_definition_id=v_generic_definition_id
    and cv.status='published'
  order by cv.version_number desc
  limit 1;

  if v_generic_definition_id is null or v_source_version.issuer_id is null then
    raise exception 'GENERIC_ESTIMULO_CERTIFICATE_NOT_CONFIGURED';
  end if;

  for v_journey in
    select jv.id as journey_version_id,jd.owner_organization_id
    from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
    where jv.status='published'
      and coalesce(jv.configuration->>'visibility','') <> 'internal_test_only'
      and coalesce((jv.configuration->>'publishable_to_real_participants')::boolean,true)
      and not coalesce((jv.configuration#>>'{completion_certificate,enabled}')::boolean,false)
    order by jv.id
  loop
    v_rule_definition_id:=app_private.e14_deterministic_uuid('generic-journey-certificate-rule-definition:'||v_journey.journey_version_id::text);
    v_rule_version_id:=app_private.e14_deterministic_uuid('generic-journey-certificate-rule-version:'||v_journey.journey_version_id::text||':1');
    v_certificate_version_id:=app_private.e14_deterministic_uuid('generic-journey-certificate-version:'||v_journey.journey_version_id::text);
    v_expression:=jsonb_build_object(
      'scope','journey',
      'journey_version_id',v_journey.journey_version_id,
      'requires_completed_status',true,
      'requires_required_steps_completed',true
    );

    insert into orchestration.rule_definitions(id,owner_organization_id,code,rule_type,name,status)
    values(v_rule_definition_id,v_journey.owner_organization_id,
      'certificado_jornada_'||substr(replace(v_journey.journey_version_id::text,'-',''),1,16),
      'credential','Conclusão de jornada','active')
    on conflict(id) do update set status='active';

    insert into orchestration.rule_versions(id,rule_definition_id,version_number,status,language,expression,input_schema,output_schema,published_at,content_hash,created_at)
    values(v_rule_version_id,v_rule_definition_id,1,'published','credential-v1',v_expression,'{}'::jsonb,'{}'::jsonb,now(),
      app_private.e14_request_hash(jsonb_build_object('expression',v_expression,'input_schema','{}'::jsonb,'output_schema','{}'::jsonb)),now())
    on conflict(id) do update set status='published',language='credential-v1',expression=excluded.expression,content_hash=excluded.content_hash;

    if not exists(select 1 from engagement.certificate_versions where id=v_certificate_version_id) then
      select coalesce(max(version_number),0)+1 into v_next_version
      from engagement.certificate_versions
      where certificate_definition_id=v_generic_definition_id;

      insert into engagement.certificate_versions(
        id,certificate_definition_id,version_number,status,journey_version_id,requirements_rule_version_id,
        template_file_object_id,validity_policy,published_at,template_layout,issuer_id
      ) values(
        v_certificate_version_id,v_generic_definition_id,v_next_version,'published',v_journey.journey_version_id,v_rule_version_id,
        v_source_version.template_file_object_id,v_source_version.validity_policy,now(),v_source_version.template_layout,v_source_version.issuer_id
      );
    end if;

    update catalog.journey_versions jv
    set configuration=coalesce(jv.configuration,'{}'::jsonb) || jsonb_build_object(
      'completion_certificate',
      coalesce(jv.configuration->'completion_certificate','{}'::jsonb) || jsonb_build_object(
        'enabled',true,
        'certificate_version_id',v_certificate_version_id,
        'trigger_event','journey.instance.completed',
        'data_fields',jsonb_build_array('participant_name','journey_title','issued_at','verification_code')
      )
    )
    where jv.id=v_journey.journey_version_id;
  end loop;
end;
$block$;

do $backfill$
declare v_row record;
begin
  for v_row in
    select ji.id as journey_instance_id,en.entrepreneur_id,e.user_account_id
    from orchestration.journey_instances ji
    join orchestration.enrollments en on en.id=ji.enrollment_id
    join core.entrepreneurs e on e.id=en.entrepreneur_id
    where ji.status='completed'
      and app_private.e14_entrepreneur_for_account(e.user_account_id)=en.entrepreneur_id
    order by ji.id
  loop
    perform public.issue_learning_credentials(v_row.user_account_id,v_row.journey_instance_id,null,
      'generic-journey-certificate-backfill-v1:'||v_row.journey_instance_id::text);
  end loop;
end;
$backfill$;
