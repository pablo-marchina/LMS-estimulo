begin;

do $$
declare
  v_actor uuid:=gen_random_uuid();
  v_membership uuid:=gen_random_uuid();
  v_role uuid;
  v_org uuid;
  v_program uuid;
  v_journey jsonb;
  v_activity jsonb;
  v_rule jsonb;
  v_certificate_rule_definition_id uuid:=gen_random_uuid();
  v_certificate_rule_version_id uuid:=gen_random_uuid();
  v_certificate_rule_expression jsonb;
  v_path jsonb;
  v_diagnostic jsonb;
  v_point jsonb;
  v_badge jsonb;
  v_certificate jsonb;
  v_workspace jsonb;
  v_report jsonb;
  v_replay jsonb;
begin
  select id,owner_organization_id into v_program,v_org
  from catalog.programs
  order by created_at
  limit 1;
  if v_program is null or v_org is null then raise exception 'program fixture missing'; end if;

  select id into v_role
  from iam.role_definitions
  where organization_id=v_org and code='e14_operator' and status='active'
  limit 1;
  if v_role is null then raise exception 'integral administrator role missing'; end if;

  insert into iam.user_accounts(id,email_normalized,status,last_authenticated_at)
  values(v_actor,'admin-product-e2e@invalid.local','active',now());

  insert into iam.organization_memberships(
    id,organization_id,user_account_id,status,valid_from,valid_until
  ) values(
    v_membership,v_org,v_actor,'active',now()-interval '1 minute',null
  );

  insert into iam.membership_roles(membership_id,role_id,scope,valid_from,valid_until)
  values(v_membership,v_role,'{"all":true}'::jsonb,now()-interval '1 minute',null);

  if not app_private.e14_actor_has_permission(v_actor,v_org,'journey.definition.manage')
     or not app_private.e14_actor_has_permission(v_actor,v_org,'diagnostic.configuration.manage')
     or not app_private.e14_actor_has_permission(v_actor,v_org,'engagement.manage')
     or not app_private.e14_actor_has_permission(v_actor,v_org,'reporting.read') then
    raise exception 'integral administrator permissions missing';
  end if;

  v_rule:=public.save_admin_product_resource(v_actor,v_org,'rule',jsonb_build_object(
    'code','admin_e2e_rule','name','Regra administrativa E2E','rule_type','eligibility','language','json-logic',
    'expression',jsonb_build_object('==',jsonb_build_array(1,1)),'input_schema','{}'::jsonb,'output_schema','{}'::jsonb
  ),'admin-product-e2e-rule');

  v_journey:=public.save_admin_product_resource(v_actor,v_org,'journey',jsonb_build_object(
    'program_id',v_program,'code','admin_e2e_journey','slug','admin-e2e-journey','name','Jornada administrativa E2E',
    'purpose','Provar gestão integral','title','Jornada administrativa E2E','description','Draft transacional',
    'configuration',jsonb_build_object('visibility','test_only')
  ),'admin-product-e2e-journey');

  v_certificate_rule_expression:=jsonb_build_object(
    'scope','journey',
    'journey_version_id',(v_journey->>'version_id')::uuid,
    'requires_completed_status',true,
    'requires_required_steps_completed',true
  );

  insert into orchestration.rule_definitions(
    id,owner_organization_id,code,rule_type,name,status
  ) values (
    v_certificate_rule_definition_id,v_org,'admin_e2e_certificate_rule','credential',
    'Conclusão da jornada administrativa E2E','active'
  );

  insert into orchestration.rule_versions(
    id,rule_definition_id,version_number,status,language,expression,input_schema,
    output_schema,published_at,content_hash,created_at
  ) values (
    v_certificate_rule_version_id,v_certificate_rule_definition_id,1,'published','credential-v1',
    v_certificate_rule_expression,'{}'::jsonb,'{}'::jsonb,now(),
    app_private.e14_request_hash(jsonb_build_object(
      'expression',v_certificate_rule_expression,
      'input_schema','{}'::jsonb,
      'output_schema','{}'::jsonb
    )),now()
  );

  v_activity:=public.save_admin_product_resource(v_actor,v_org,'activity',jsonb_build_object(
    'code','admin_e2e_activity','name','Atividade administrativa E2E','title','Atividade administrativa E2E',
    'description','Prática privada','activity_type','practice','estimated_minutes',15,
    'configuration',jsonb_build_object('layout','guided'),
    'asset',jsonb_build_object('type','external_link','title','Material acessível','url','https://example.org/material','language','pt-BR','required',true,'accessibility',jsonb_build_object('description','Material textual')),
    'practice',jsonb_build_object('submission_mode','file','allowed_evidence_types',jsonb_build_array('file'),'max_submissions',2,'review_required',true,'terms_version','v1')
  ),'admin-product-e2e-activity');

  v_path:=public.save_admin_product_resource(v_actor,v_org,'path_step',jsonb_build_object(
    'code','admin_e2e_path','journey_version_id',v_journey->>'version_id','path_name','Trilha administrativa E2E',
    'path_description','Bloco configurado pela administração','is_default',true,'step_code','atividade_e2e',
    'activity_version_id',v_activity->>'version_id','position',1,'is_required',true,
    'availability_rule_version_id',v_rule->>'version_id','completion_rule_version_id',v_rule->>'version_id',
    'metadata',jsonb_build_object('block','Primeiros passos')
  ),'admin-product-e2e-path');

  v_diagnostic:=public.save_admin_product_resource(v_actor,v_org,'diagnostic',jsonb_build_object(
    'code','admin_e2e_diagnostic','name','Diagnóstico administrativo E2E','purpose','Provar editor',
    'configuration',jsonb_build_object('optional',true),
    'dimensions',jsonb_build_array(jsonb_build_object('code','gestao','name','Gestão','minimum_answer_ratio',1,'position',1)),
    'items',jsonb_build_array(jsonb_build_object('code','gestao_1','dimension_code','gestao','item_type','single_choice','prompt','Como você organiza sua gestão?','position',1,'is_required',true,'options',jsonb_build_array(
      jsonb_build_object('code','a','label','Com rotina','value',jsonb_build_object('score',2),'position',1),
      jsonb_build_object('code','b','label','Sem rotina','value',jsonb_build_object('score',1),'position',2)
    ))),
    'archetypes',jsonb_build_array(jsonb_build_object('code','estrategista','name','Estrategista','description','Perfil de teste'))
  ),'admin-product-e2e-diagnostic');

  v_point:=public.save_admin_product_resource(v_actor,v_org,'point_rule',jsonb_build_object(
    'code','admin_e2e_points','name','Pontos administrativos E2E','amount',10,
    'eligibility_rule_version_id',v_rule->>'version_id','recurrence_policy',jsonb_build_object('mode','once'),'status','draft'
  ),'admin-product-e2e-points');

  v_badge:=public.save_admin_product_resource(v_actor,v_org,'badge',jsonb_build_object(
    'code','admin_e2e_badge','name','Selo administrativo E2E','title','Selo administrativo E2E',
    'description','Conquista configurável','criteria_rule_version_id',v_rule->>'version_id','status','draft'
  ),'admin-product-e2e-badge');

  v_certificate:=public.save_admin_product_resource(v_actor,v_org,'certificate',jsonb_build_object(
    'code','admin_e2e_certificate','name','Certificado administrativo E2E',
    'journey_version_id',v_journey->>'version_id','requirements_rule_version_id',v_certificate_rule_version_id,
    'validity_policy',jsonb_build_object('expires',false),'status','draft'
  ),'admin-product-e2e-certificate');

  if v_rule->>'version_id' is null or v_journey->>'version_id' is null
     or v_activity->>'version_id' is null or v_path->>'step_id' is null
     or v_diagnostic->>'version_id' is null or v_point->>'version_id' is null
     or v_badge->>'version_id' is null or v_certificate->>'version_id' is null then
    raise exception 'one or more integral editors failed';
  end if;

  v_replay:=public.save_admin_product_resource(v_actor,v_org,'journey',jsonb_build_object(
    'program_id',v_program,'code','admin_e2e_journey','slug','admin-e2e-journey','name','Jornada administrativa E2E',
    'purpose','Provar gestão integral','title','Jornada administrativa E2E','description','Draft transacional',
    'configuration',jsonb_build_object('visibility','test_only')
  ),'admin-product-e2e-journey');
  if coalesce((v_replay->>'replayed')::boolean,false) is not true then raise exception 'idempotency replay failed'; end if;

  v_workspace:=public.get_admin_product_workspace(v_actor,v_org);
  if not (v_workspace->'journeys' @> jsonb_build_array(jsonb_build_object('code','admin_e2e_journey'))) then raise exception 'journey missing from workspace'; end if;
  if not (v_workspace->'activities' @> jsonb_build_array(jsonb_build_object('code','admin_e2e_activity'))) then raise exception 'activity missing from workspace'; end if;
  if not (v_workspace->'diagnostics' @> jsonb_build_array(jsonb_build_object('code','admin_e2e_diagnostic'))) then raise exception 'diagnostic missing from workspace'; end if;

  v_report:=public.get_admin_reporting_dashboard(v_actor,v_org);
  if jsonb_typeof(v_report->'metrics')<>'object' or jsonb_typeof(v_report->'journeys')<>'array' then raise exception 'reporting contract failed'; end if;

  begin
    perform public.get_admin_product_workspace(gen_random_uuid(),v_org);
    raise exception 'permission negative failed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;