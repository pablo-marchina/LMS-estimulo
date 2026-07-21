set lock_timeout = '5s';
set statement_timeout = '5min';

-- Owner-provided Impulso reference is reused as a domain model only.
-- This draft is intentionally inactive until the Estimulo methodology is reviewed.
do $$
declare
  v_organization_id uuid;
  v_definition_id uuid:=app_private.e14_deterministic_uuid('business-maturity:diagnostic-definition');
  v_version_id uuid:=app_private.e14_deterministic_uuid('business-maturity:diagnostic-version:v1');
  v_rule_definition_id uuid:=app_private.e14_deterministic_uuid('business-maturity:rule-definition');
  v_rule_version_id uuid:=app_private.e14_deterministic_uuid('business-maturity:rule-version:v1');
  v_configuration jsonb;
  v_rule_expression jsonb;
  v_input_schema jsonb;
  v_output_schema jsonb;
  v_dimension record;
  v_item_id uuid;
  v_segment record;
begin
  select o.id into strict v_organization_id
  from iam.organizations o
  where o.slug='estimulo-e14-internal' and o.status='active';

  v_configuration:=jsonb_build_object(
    'configuration_kind','business_maturity_self_assessment',
    'lifecycle','draft',
    'activation_allowed',false,
    'methodology_status','awaiting_methodology_approval',
    'provenance',jsonb_build_object(
      'reuse_mode','domain_model_reimplementation',
      'reference','owner_provided_impulso_empreendedor_source',
      'literal_copy',false
    ),
    'purpose','Orientar desenvolvimento empresarial e priorizar aprendizagem; não constitui análise de crédito.',
    'credit_use','forbidden',
    'crm_policy','not_synced_until_governance_approval',
    'question_count',6,
    'dimension_count',6,
    'response_scale',jsonb_build_object('minimum',0,'maximum',4,'labels',jsonb_build_array(
      'Não existe ou não acontece',
      'Acontece apenas de forma reativa',
      'Existe parcialmente e sem regularidade',
      'É realizado de forma consistente',
      'É medido, revisado e melhorado'
    )),
    'calculation',jsonb_build_object(
      'overall_score','round(sum(answer_score) / 24 * 100)',
      'dimension_score','answer_score / 4 * 100',
      'focus_dimension','lowest dimension score; ties resolved by dimension position',
      'minimum_answer_ratio',1
    ),
    'maturity_segments',jsonb_build_array(
      jsonb_build_object('code','base','minimum_score',0,'maximum_score',39),
      jsonb_build_object('code','traction','minimum_score',40,'maximum_score',71),
      jsonb_build_object('code','evolution','minimum_score',72,'maximum_score',100)
    ),
    'publication_blockers',jsonb_build_array(
      'methodology_owner_approval',
      'question_wording_review',
      'threshold_validation',
      'fairness_and_bias_review',
      'privacy_and_legal_approval',
      'learning_path_mapping_approval'
    )
  );

  insert into diagnostics.diagnostic_definitions(
    id,owner_organization_id,code,name,purpose,status
  ) values(
    v_definition_id,v_organization_id,'business_maturity_self_assessment',
    'Diagnóstico de maturidade do negócio',
    'Instrumento educacional para orientar prioridades de aprendizagem, separado do diagnóstico oficial de arquétipos.',
    'draft'
  )
  on conflict (owner_organization_id,code) do update
    set name=excluded.name,
        purpose=excluded.purpose,
        status='draft';

  insert into diagnostics.diagnostic_versions(
    id,diagnostic_definition_id,version_number,status,configuration,published_at,content_hash
  ) values(
    v_version_id,v_definition_id,1,'draft',v_configuration,now(),
    app_private.e14_request_hash(v_configuration)
  )
  on conflict (diagnostic_definition_id,version_number) do update
    set status='draft',
        configuration=excluded.configuration,
        content_hash=excluded.content_hash;

  for v_dimension in
    select * from (values
      ('strategy','Estratégia e prioridades','Clareza de prioridades, metas e ciclos de revisão.',1,
       'Com que consistência o negócio define prioridades, metas e revisões periódicas?'),
      ('financial_management','Gestão financeira','Registro financeiro e uso de indicadores para decidir.',2,
       'Com que consistência entradas, saídas e indicadores financeiros são registrados e usados nas decisões?'),
      ('sales','Vendas','Canais, etapas comerciais e acompanhamento de conversão.',3,
       'Com que consistência as vendas seguem canais, etapas e métricas de conversão?'),
      ('digital','Presença digital','Uso integrado do digital em aquisição, venda, atendimento e relacionamento.',4,
       'Com que consistência canais digitais apoiam aquisição, venda, atendimento e relacionamento?'),
      ('operations','Operação','Processos, responsabilidades, padrões e continuidade operacional.',5,
       'Com que consistência os processos têm responsáveis, padrões e continuidade sem depender de uma única pessoa?'),
      ('continuous_improvement','Desenvolvimento contínuo','Aprendizagem aplicada, experimentação e medição de resultado.',6,
       'Com que consistência o negócio reserva tempo para aprender, testar mudanças e medir resultados?')
    ) as d(code,name,description,position,prompt)
  loop
    insert into diagnostics.dimensions(
      id,diagnostic_version_id,code,name,description,minimum_answer_ratio,position
    ) values(
      app_private.e14_deterministic_uuid('business-maturity:dimension:'||v_dimension.code),
      v_version_id,v_dimension.code,v_dimension.name,v_dimension.description,1,v_dimension.position
    )
    on conflict (diagnostic_version_id,code) do update
      set name=excluded.name,
          description=excluded.description,
          minimum_answer_ratio=1,
          position=excluded.position;

    v_item_id:=app_private.e14_deterministic_uuid('business-maturity:item:'||v_dimension.code);
    insert into diagnostics.items(
      id,diagnostic_version_id,dimension_id,code,item_type,prompt,configuration,position,is_required
    ) values(
      v_item_id,v_version_id,
      app_private.e14_deterministic_uuid('business-maturity:dimension:'||v_dimension.code),
      'maturity_'||v_dimension.code,'single_select',v_dimension.prompt,
      jsonb_build_object(
        'score_field','score',
        'scale_minimum',0,
        'scale_maximum',4,
        'methodology_status','draft',
        'credit_use','forbidden'
      ),
      v_dimension.position,true
    )
    on conflict (diagnostic_version_id,code) do update
      set dimension_id=excluded.dimension_id,
          item_type=excluded.item_type,
          prompt=excluded.prompt,
          configuration=excluded.configuration,
          position=excluded.position,
          is_required=true;

    insert into diagnostics.item_options(id,item_id,code,label,value,position)
    values
      (app_private.e14_deterministic_uuid('business-maturity:option:'||v_dimension.code||':0'),v_item_id,'level_0','Não existe ou não acontece',jsonb_build_object('score',0,'level','absent'),1),
      (app_private.e14_deterministic_uuid('business-maturity:option:'||v_dimension.code||':1'),v_item_id,'level_1','Acontece apenas de forma reativa',jsonb_build_object('score',1,'level','reactive'),2),
      (app_private.e14_deterministic_uuid('business-maturity:option:'||v_dimension.code||':2'),v_item_id,'level_2','Existe parcialmente e sem regularidade',jsonb_build_object('score',2,'level','partial'),3),
      (app_private.e14_deterministic_uuid('business-maturity:option:'||v_dimension.code||':3'),v_item_id,'level_3','É realizado de forma consistente',jsonb_build_object('score',3,'level','consistent'),4),
      (app_private.e14_deterministic_uuid('business-maturity:option:'||v_dimension.code||':4'),v_item_id,'level_4','É medido, revisado e melhorado',jsonb_build_object('score',4,'level','optimized'),5)
    on conflict (item_id,code) do update
      set label=excluded.label,
          value=excluded.value,
          position=excluded.position;
  end loop;

  v_rule_expression:=jsonb_build_object(
    'engine','business_maturity_v1',
    'state','draft',
    'required_answers',6,
    'score_source','diagnostics.item_options.value.score',
    'overall',jsonb_build_object(
      'formula','round(sum(scores) / (question_count * 4) * 100)',
      'minimum',0,
      'maximum',100
    ),
    'dimensions',jsonb_build_object(
      'formula','round(score / 4 * 100)',
      'focus','minimum score; stable tie-break by configured position'
    ),
    'segments',jsonb_build_array(
      jsonb_build_object('code','base','minimum',0,'maximum',39),
      jsonb_build_object('code','traction','minimum',40,'maximum',71),
      jsonb_build_object('code','evolution','minimum',72,'maximum',100)
    ),
    'abstention',jsonb_build_object(
      'when_missing_answer',true,
      'when_configuration_not_published',true,
      'confidence',null
    )
  );
  v_input_schema:=jsonb_build_object(
    '$schema','https://json-schema.org/draft/2020-12/schema',
    'type','object',
    'required',jsonb_build_array('answers'),
    'properties',jsonb_build_object(
      'answers',jsonb_build_object(
        'type','array','minItems',6,'maxItems',6,
        'items',jsonb_build_object(
          'type','object',
          'required',jsonb_build_array('dimension','score'),
          'properties',jsonb_build_object(
            'dimension',jsonb_build_object('type','string'),
            'score',jsonb_build_object('type','integer','minimum',0,'maximum',4)
          )
        )
      )
    )
  );
  v_output_schema:=jsonb_build_object(
    '$schema','https://json-schema.org/draft/2020-12/schema',
    'type','object',
    'required',jsonb_build_array('status'),
    'properties',jsonb_build_object(
      'status',jsonb_build_object('enum',jsonb_build_array('calculated','abstained')),
      'overall_score',jsonb_build_object('type',jsonb_build_array('integer','null'),'minimum',0,'maximum',100),
      'segment',jsonb_build_object('type',jsonb_build_array('string','null')),
      'focus_dimension',jsonb_build_object('type',jsonb_build_array('string','null')),
      'confidence',jsonb_build_object('type','null')
    )
  );

  insert into orchestration.rule_definitions(
    id,owner_organization_id,code,rule_type,name,status
  ) values(
    v_rule_definition_id,v_organization_id,'business_maturity_scoring',
    'diagnostic_scoring','Cálculo de maturidade empresarial','draft'
  )
  on conflict (owner_organization_id,code) do update
    set rule_type=excluded.rule_type,
        name=excluded.name,
        status='draft';

  insert into orchestration.rule_versions(
    id,rule_definition_id,version_number,status,language,expression,input_schema,output_schema,published_at,content_hash
  ) values(
    v_rule_version_id,v_rule_definition_id,1,'draft','json-expression',
    v_rule_expression,v_input_schema,v_output_schema,null,
    app_private.e14_request_hash(jsonb_build_object(
      'expression',v_rule_expression,
      'input_schema',v_input_schema,
      'output_schema',v_output_schema
    ))
  )
  on conflict (rule_definition_id,version_number) do update
    set status='draft',
        language=excluded.language,
        expression=excluded.expression,
        input_schema=excluded.input_schema,
        output_schema=excluded.output_schema,
        published_at=null,
        content_hash=excluded.content_hash;

  for v_segment in
    select * from (values
      ('base','Base','Prioridade em organizar fundamentos, controles e rotinas essenciais.',0,39),
      ('traction','Tração','Prioridade em consolidar processos, aquisição e previsibilidade.',40,71),
      ('evolution','Evolução','Prioridade em escala sustentável, liderança e decisões orientadas por dados.',72,100)
    ) as s(code,name,description,minimum_score,maximum_score)
  loop
    insert into diagnostics.segment_definitions(
      id,owner_organization_id,code,name,description,status
    ) values(
      app_private.e14_deterministic_uuid('business-maturity:segment-definition:'||v_segment.code),
      v_organization_id,'business_maturity_'||v_segment.code,v_segment.name,
      v_segment.description,'draft'
    )
    on conflict (owner_organization_id,code) do update
      set name=excluded.name,
          description=excluded.description,
          status='draft';

    insert into diagnostics.segment_versions(
      id,segment_definition_id,version_number,rule_version_id,status,validity_interval,published_at
    ) values(
      app_private.e14_deterministic_uuid('business-maturity:segment-version:'||v_segment.code||':v1'),
      app_private.e14_deterministic_uuid('business-maturity:segment-definition:'||v_segment.code),
      1,v_rule_version_id,'draft',null,null
    )
    on conflict (segment_definition_id,version_number) do update
      set rule_version_id=excluded.rule_version_id,
          status='draft',
          validity_interval=null,
          published_at=null;
  end loop;
end;
$$;
