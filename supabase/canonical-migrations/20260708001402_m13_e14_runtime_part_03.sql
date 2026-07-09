insert into iam.organizations(id,organization_type,slug,legal_name,display_name,status,metadata)
values(app_private.e14_deterministic_uuid('e14:organization'),'internal_test','estimulo-e14-internal','Plataforma Estímulo — validação técnica interna','Estímulo E14 Interno','active','{"synthetic":true,"internal_test_only":true}'::jsonb)
on conflict (slug) do nothing;

insert into iam.user_accounts(id,email_normalized,status)
values
(app_private.e14_deterministic_uuid('e14:user:operator'),'e14.operator@invalid.example','active'),
(app_private.e14_deterministic_uuid('e14:user:participant'),'e14.participant@invalid.example','active')
on conflict (email_normalized) do nothing;

insert into core.entrepreneurs(id,user_account_id,preferred_name,email_normalized,status,profile_data)
values(app_private.e14_deterministic_uuid('e14:entrepreneur'),app_private.e14_deterministic_uuid('e14:user:participant'),'Participante sintético E14','e14.participant@invalid.example','active',jsonb_build_object('synthetic',true,'internal_test_only',true,'owner_organization_id',app_private.e14_deterministic_uuid('e14:organization')))
on conflict (user_account_id) do nothing;

insert into iam.organization_memberships(id,organization_id,user_account_id,status,valid_from)
values(app_private.e14_deterministic_uuid('e14:membership:operator'),app_private.e14_deterministic_uuid('e14:organization'),app_private.e14_deterministic_uuid('e14:user:operator'),'active','2026-07-09T00:00:00Z')
on conflict do nothing;

insert into iam.role_definitions(id,organization_id,code,name,description,status)
values(app_private.e14_deterministic_uuid('e14:role:operator'),app_private.e14_deterministic_uuid('e14:organization'),'e14_operator','E14 internal operator','Controls the synthetic E14 vertical only','active')
on conflict (organization_id,code) do nothing;

insert into iam.role_permissions(role_id,permission_id)
select app_private.e14_deterministic_uuid('e14:role:operator'),pd.id from iam.permission_definitions pd
where pd.code in ('journey.definition.publish','journey.execution.manage','journey.execution.read','participant.manage','participant.read')
on conflict do nothing;

insert into iam.membership_roles(membership_id,role_id,scope,valid_from)
values(app_private.e14_deterministic_uuid('e14:membership:operator'),app_private.e14_deterministic_uuid('e14:role:operator'),'{"all":true}'::jsonb,'2026-07-09T00:00:00Z')
on conflict do nothing;

insert into catalog.programs(id,owner_organization_id,code,name,description,status,valid_from)
values(app_private.e14_deterministic_uuid('e14:program'),app_private.e14_deterministic_uuid('e14:organization'),'e14_runtime_validation','Validação técnica E14','Programa sintético interno para prova do runtime','active','2026-07-09')
on conflict (owner_organization_id,code) do nothing;

insert into orchestration.rule_definitions(id,owner_organization_id,code,rule_type,name,status)
values(app_private.e14_deterministic_uuid('e14:rule-definition:always-eligible'),app_private.e14_deterministic_uuid('e14:organization'),'e14_always_eligible','eligibility','E14 always eligible','active')
on conflict (owner_organization_id,code) do nothing;

insert into orchestration.rule_versions(id,rule_definition_id,version_number,status,language,expression,input_schema,output_schema,published_at,content_hash)
values(app_private.e14_deterministic_uuid('e14:rule-version:always-eligible:v1'),app_private.e14_deterministic_uuid('e14:rule-definition:always-eligible'),1,'published','json-logic','{"==":[1,1]}'::jsonb,'{"type":"object"}'::jsonb,'{"type":"boolean"}'::jsonb,now(),app_private.e14_request_hash('{"code":"e14_always_eligible","version":1}'::jsonb))
on conflict (rule_definition_id,version_number) do nothing;

-- remote migration 20260709051310: m13b2a_e14_activity_definition
insert into catalog.activity_definitions(id,owner_organization_id,code,activity_type,name,status)
values(app_private.e14_deterministic_uuid('e14:activity-definition'),app_private.e14_deterministic_uuid('e14:organization'),'inputs_rules_outputs','text_activity','Entradas regras saidas e validacao humana','active')
on conflict (owner_organization_id,code) do nothing;

-- remote migration 20260709051322: m13b2b_e14_activity_version
insert into catalog.activity_versions(id,activity_definition_id,version_number,status,title,description,activity_type,configuration,estimated_minutes,published_at,content_hash,created_by)
values(
 app_private.e14_deterministic_uuid('e14:activity-version:v1'),
 app_private.e14_deterministic_uuid('e14:activity-definition'),
 1,
 'draft',
 'Entradas regras saidas e validacao humana',
 'Distinguir entrada regra saida e validacao humana.',
 'text_activity',
 '{"visibility":"internal_test_only","language":"pt-BR","content_sections":[{"code":"input","heading":"Entrada","body":"Entrada e a informacao fornecida ao processo."},{"code":"rule","heading":"Regra","body":"Regra e a condicao aplicada a entrada."},{"code":"output","heading":"Saida","body":"Saida e o resultado produzido apos aplicar a regra."},{"code":"human_validation","heading":"Validacao humana","body":"A pessoa verifica entrada regra e saida antes de usar o resultado."}],"guided_context":{"estimated_minutes":2,"body":"No caminho guiado cada componente e destacado separadamente."},"accessibility":{"text_first":true,"requires_audio":false,"requires_video":false,"keyboard_only_supported":true,"screen_reader_labels_required":true,"color_not_sole_indicator":true},"real_participant_use_authorized":false}'::jsonb,
 6,
 null,
 app_private.e14_request_hash('{"visibility":"internal_test_only","language":"pt-BR","content_sections":[{"code":"input"},{"code":"rule"},{"code":"output"},{"code":"human_validation"}]}'::jsonb),
 app_private.e14_deterministic_uuid('e14:user:operator')
)
on conflict (activity_definition_id,version_number) do nothing;

-- remote migration 20260709051333: m13b2c_e14_assessment_fixture
insert into assessment.assessment_specs(activity_version_id,grading_mode,passing_score,max_attempts,time_limit_seconds,randomization_policy,feedback_policy)
values(app_private.e14_deterministic_uuid('e14:activity-version:v1'),'automatic',100,3,null,'{"shuffle_questions":false,"shuffle_options":false}'::jsonb,'{"mode":"immediate_per_option","show_correct_after":"final_failed_attempt"}'::jsonb)
on conflict (activity_version_id) do nothing;

insert into assessment.questions(id,activity_version_id,code,question_type,prompt,points,position,configuration)
values(app_private.e14_deterministic_uuid('e14:assessment-question'),app_private.e14_deterministic_uuid('e14:activity-version:v1'),'inputs_rules_outputs_check','single_choice','Qual elemento representa a regra do processo?',1,1,'{"required":true}'::jsonb)
on conflict (activity_version_id,code) do nothing;

insert into assessment.answer_options(id,question_id,code,label,value,is_correct,position) values
(app_private.e14_deterministic_uuid('e14:assessment-option:a'),app_private.e14_deterministic_uuid('e14:assessment-question'),'a','O valor do pedido','{"feedback":"O valor do pedido e a entrada."}'::jsonb,false,1),
(app_private.e14_deterministic_uuid('e14:assessment-option:b'),app_private.e14_deterministic_uuid('e14:assessment-question'),'b','A condicao valor do pedido maior ou igual a 100','{"feedback":"Correto. A condicao define o processamento."}'::jsonb,true,2),
(app_private.e14_deterministic_uuid('e14:assessment-option:c'),app_private.e14_deterministic_uuid('e14:assessment-question'),'c','O resultado frete gratis','{"feedback":"Frete gratis e a saida."}'::jsonb,false,3),
(app_private.e14_deterministic_uuid('e14:assessment-option:d'),app_private.e14_deterministic_uuid('e14:assessment-question'),'d','A conferencia final','{"feedback":"A conferencia e a validacao humana."}'::jsonb,false,4)
on conflict (question_id,code) do nothing;

