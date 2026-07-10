-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709001215
-- Remote name: m12g_governance_catalog_and_readiness_seed
-- Remote SQL SHA-256: 628e9a1a6e50bb0c0fc46c430223caf4f56a9f9c7c43d96dc062b3be2fb5809e
-- Do not edit after reconciliation; corrections require a new migration.

alter table governance.processing_activities
  add column if not exists ripd_policy_document_id uuid references governance.policy_documents(id),
  add column if not exists legitimate_interest_assessment_document_id uuid references governance.policy_documents(id);

create or replace function governance.guard_processing_activity_activation()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
declare v_purpose_status text; v_retention_status text; v_ripd_status text;
begin
  if new.status='active' then
    if new.legal_basis_code is null then raise exception 'legal_basis_required_for_active_processing' using errcode='23514'; end if;
    if new.approved_at is null then raise exception 'approval_required_for_active_processing' using errcode='23514'; end if;
    select status into v_purpose_status from governance.purposes where id=new.purpose_id;
    if v_purpose_status not in ('approved','active') then raise exception 'approved_purpose_required' using errcode='23514'; end if;
    if new.retention_policy_id is null then raise exception 'retention_policy_required' using errcode='23514'; end if;
    select status into v_retention_status from governance.retention_policies where id=new.retention_policy_id;
    if v_retention_status not in ('approved','active') then raise exception 'approved_retention_policy_required' using errcode='23514'; end if;
    if new.ripd_required or new.high_risk or new.credit_decision_use then
      if new.ripd_policy_document_id is null then raise exception 'effective_ripd_required' using errcode='23514'; end if;
      select status into v_ripd_status from governance.policy_documents where id=new.ripd_policy_document_id;
      if v_ripd_status<>'effective' then raise exception 'effective_ripd_required' using errcode='23514'; end if;
    end if;
    if new.credit_decision_use and not exists(
      select 1 from governance.production_readiness_controls
      where environment='production' and control_code='CREDIT_DECISION_GOVERNANCE' and status='passed'
    ) then raise exception 'credit_decision_governance_not_ready' using errcode='23514'; end if;
  end if;
  return new;
end;
$$;

create trigger trg_processing_activity_activation before insert or update on governance.processing_activities for each row execute function governance.guard_processing_activity_activation();

insert into governance.legal_basis_definitions(code,name,law_reference,data_scope,requires_consent,description,status)
values
 ('consent','Consentimento','LGPD art. 7 I e art. 11 I','both',true,'Manifestação livre, informada e inequívoca, documentada e revogável.','active'),
 ('legal_regulatory_obligation','Cumprimento de obrigação legal ou regulatória','LGPD art. 7 II e art. 11 II a','both',false,'Tratamento necessário para obrigação legal ou regulatória aplicável ao controlador.','active'),
 ('public_policy','Execução de políticas públicas','LGPD art. 7 III e art. 11 II b','both',false,'Aplicável somente quando os requisitos legais e institucionais da política pública estiverem demonstrados.','active'),
 ('research_body','Estudos por órgão de pesquisa','LGPD art. 7 IV e art. 11 II c','both',false,'Requer enquadramento institucional e anonimização sempre que possível.','active'),
 ('contract','Execução de contrato ou procedimentos preliminares','LGPD art. 7 V','personal',false,'Tratamento necessário para contrato do qual o titular seja parte ou a seu pedido.','active'),
 ('exercise_of_rights','Exercício regular de direitos','LGPD art. 7 VI e art. 11 II d','both',false,'Defesa e exercício de direitos em processos judiciais, administrativos ou arbitrais.','active'),
 ('life_protection','Proteção da vida ou incolumidade física','LGPD art. 7 VII e art. 11 II e','both',false,'Uso excepcional para proteção da vida ou segurança física.','active'),
 ('health_protection','Tutela da saúde','LGPD art. 7 VIII e art. 11 II f','both',false,'Restrita aos agentes e contextos legalmente autorizados.','active'),
 ('legitimate_interest','Legítimo interesse','LGPD art. 7 IX e arts. 10 e 37','personal',false,'Exige finalidade legítima, necessidade, balanceamento, transparência e avaliação documentada. Não se aplica isoladamente a dados sensíveis.','active'),
 ('credit_protection','Proteção do crédito','LGPD art. 7 X','personal',false,'Possível base para proteção do crédito, sujeita a finalidade, necessidade, transparência e governança de decisões.','active'),
 ('fraud_security_identification','Prevenção à fraude e segurança na identificação e autenticação','LGPD art. 11 II g','sensitive_personal',false,'Aplicável no estrito contexto de identificação e autenticação em sistemas eletrônicos.','active')
on conflict(code) do update set name=excluded.name,law_reference=excluded.law_reference,data_scope=excluded.data_scope,requires_consent=excluded.requires_consent,description=excluded.description,status=excluded.status;

insert into governance.data_classifications(code,rank,name,is_personal_data,is_sensitive_personal_data,description,handling_rules,status)
values
 ('public',0,'Público',false,false,'Informação aprovada para divulgação pública.','{"encryption":"standard","logging":"allowed"}'::jsonb,'active'),
 ('internal',10,'Interno',false,false,'Informação operacional não destinada ao público.','{"access":"workforce_need_to_know","logging":"allowed_minimized"}'::jsonb,'active'),
 ('confidential',20,'Confidencial',false,false,'Informação de negócio ou segurança com acesso restrito.','{"access":"explicit","encryption":"required","logging":"redacted"}'::jsonb,'active'),
 ('personal',30,'Dado pessoal',true,false,'Informação relacionada a pessoa natural identificada ou identificável.','{"minimize":true,"purpose_bound":true,"encryption":"required","logging":"redacted"}'::jsonb,'active'),
 ('behavioral_profile',40,'Perfil comportamental',true,false,'Inferências, padrões e atributos comportamentais ligados ao titular.','{"high_risk_review":true,"explainability":true,"credit_use":"blocked_until_approved"}'::jsonb,'active'),
 ('credit_related',45,'Contexto de crédito',true,false,'Informação usada ou potencialmente utilizável em análise, concessão, acompanhamento ou recuperação de crédito.','{"credit_governance":true,"access":"strict","audit":"required"}'::jsonb,'active'),
 ('sensitive_personal',50,'Dado pessoal sensível',true,true,'Categoria sensível nos termos da LGPD.','{"access":"strict","encryption":"required","logging":"prohibited_except_metadata","ripd":"required_if_high_risk"}'::jsonb,'active'),
 ('secret',100,'Segredo técnico',false,false,'Credenciais, tokens, chaves e materiais criptográficos.','{"persist_value":"prohibited_outside_secret_manager","logging":"prohibited","rotation":"required"}'::jsonb,'active')
on conflict(code) do update set rank=excluded.rank,name=excluded.name,is_personal_data=excluded.is_personal_data,is_sensitive_personal_data=excluded.is_sensitive_personal_data,description=excluded.description,handling_rules=excluded.handling_rules,status=excluded.status;

insert into governance.purposes(code,name,description,status,legal_basis_reference,requires_consent,owner_role)
values
 ('platform_service_delivery','Prestação da plataforma de capacitação','Operar autenticação, matrícula, progressão, avaliações, suporte e emissão de credenciais.','draft',null,false,'product_owner'),
 ('learning_personalization','Personalização da aprendizagem','Adaptar conteúdos, sequência e intervenções para melhorar a experiência e aplicação do aprendizado.','draft',null,false,'learning_product_owner'),
 ('security_fraud_prevention','Segurança e prevenção a fraude','Proteger contas, arquivos, infraestrutura e integridade da plataforma.','draft',null,false,'security_owner'),
 ('program_evaluation_research','Avaliação de programa e pesquisa','Medir efetividade, qualidade e impacto da capacitação com minimização e agregação.','draft',null,false,'research_owner'),
 ('crm_operational_sync','Sincronização operacional com CRM','Sincronizar apenas fatos aprovados necessários ao acompanhamento do programa.','draft',null,false,'crm_integration_owner'),
 ('behavioral_intelligence_experimental','Inteligência comportamental experimental','Investigar sinais comportamentais da jornada em ambiente controlado, sem efeito em decisão de crédito.','draft',null,false,'behavioral_intelligence_owner'),
 ('credit_decision_support_future','Apoio futuro a decisões de crédito','Uso futuro e condicionado de sinais validados para suporte a decisões de crédito, vedado até aprovação específica.','draft',null,false,'credit_governance_owner')
on conflict(code) do update set name=excluded.name,description=excluded.description,owner_role=excluded.owner_role;

insert into governance.retention_policies(code,data_class,store_reference,retention_interval,deletion_action,legal_hold_supported,status,effective_from,version,trigger_type,trigger_reference,anonymization_spec)
values
 ('participant_identity_draft','personal','iam.user_accounts,core.entrepreneurs',null,'manual_review',true,'draft',current_date,1,'relationship_ended','Define after legal approval','{}'::jsonb),
 ('learning_events_draft','personal','eventing.events',null,'anonymize',true,'draft',current_date,1,'purpose_completed','Define after analytics and legal approval','{"preserve_aggregate":true}'::jsonb),
 ('behavioral_features_draft','behavioral_profile','intelligence.feature_values,intelligence.score_results',null,'delete',true,'draft',current_date,1,'purpose_completed','No production score retention until governance approval','{}'::jsonb),
 ('uploaded_evidence_draft','personal','core.file_objects,storage',null,'delete',true,'draft',current_date,1,'purpose_completed','Define by upload profile and legal need','{}'::jsonb),
 ('security_audit_draft','confidential','governance.audit_log,eventing operational logs',null,'archive_restricted',true,'draft',current_date,1,'legal_deadline','Define from security, audit and legal requirements','{}'::jsonb)
on conflict(code) do update set data_class=excluded.data_class,store_reference=excluded.store_reference,deletion_action=excluded.deletion_action,legal_hold_supported=excluded.legal_hold_supported,trigger_type=excluded.trigger_type,trigger_reference=excluded.trigger_reference,anonymization_spec=excluded.anonymization_spec;

insert into governance.processing_activities(
  code,name,description,purpose_id,legal_basis_code,status,data_subject_categories,processing_operations,
  recipient_categories,international_transfer,automated_decision,profiling,credit_decision_use,high_risk,ripd_required,owner_role,limitations
)
select x.code,x.name,x.description,p.id,null,'draft',x.subjects,x.operations,x.recipients,false,x.automated,x.profiling,x.credit_use,x.high_risk,x.ripd,x.owner_role,x.limitations
from (values
 ('platform_core','Operação central da plataforma','Conta, matrícula, progressão, avaliação, suporte e credenciais.','platform_service_delivery',array['entrepreneurs'],array['collect','store','use','retrieve'],array['internal_workforce'],false,false,false,false,false,'product_owner','{"activation_blocker":"legal basis and retention approval"}'::jsonb),
 ('learning_personalization','Personalização da aprendizagem','Diagnóstico, recomendações de percurso e intervenções educacionais.','learning_personalization',array['entrepreneurs'],array['collect','infer','recommend'],array['internal_learning_team'],true,true,false,true,true,'learning_product_owner','{"credit_use":false,"human_override":true}'::jsonb),
 ('security_operations','Operações de segurança','Autenticação, trilha de auditoria, detecção e resposta a incidentes.','security_fraud_prevention',array['users','entrepreneurs','operators'],array['collect','monitor','detect','retain'],array['security_team','infrastructure_providers'],false,false,false,true,false,'security_owner','{"payload_minimization":true}'::jsonb),
 ('program_evaluation','Avaliação de efetividade','Métricas agregadas para qualidade e impacto do programa.','program_evaluation_research',array['entrepreneurs'],array['aggregate','analyze','report'],array['internal_research_team'],false,true,false,true,true,'research_owner','{"prefer_anonymized":true,"no_individual_adverse_action":true}'::jsonb),
 ('crm_sync','Sincronização com CRM','Envio de fatos operacionais mínimos e aprovados ao CRM.','crm_operational_sync',array['entrepreneurs'],array['share','synchronize'],array['crm_provider','authorized_operations_team'],false,false,false,true,false,'crm_integration_owner','{"field_allowlist_required":true,"hubspot_inventory_pending":true}'::jsonb),
 ('behavioral_research','Pesquisa comportamental experimental','Cálculo experimental de atributos comportamentais sem uso em decisão de crédito.','behavioral_intelligence_experimental',array['entrepreneurs'],array['infer','validate','compare'],array['restricted_research_team'],true,true,false,true,true,'behavioral_intelligence_owner','{"production_use":false,"credit_use":false,"approval_required":true}'::jsonb),
 ('credit_decision_support','Apoio futuro a crédito','Tratamento ainda proibido para suporte a decisões de crédito até validação, RIPD e aprovação.','credit_decision_support_future',array['credit_applicants','borrowers'],array['infer','score','support_decision'],array['authorized_credit_team'],true,true,true,true,true,'credit_governance_owner','{"status":"prohibited_until_gate_passed","automatic_denial":false,"human_review_required":true}'::jsonb)
) as x(code,name,description,purpose_code,subjects,operations,recipients,automated,profiling,credit_use,high_risk,ripd,owner_role,limitations)
join governance.purposes p on p.code=x.purpose_code
on conflict(code) do update set name=excluded.name,description=excluded.description,limitations=excluded.limitations,owner_role=excluded.owner_role;

insert into governance.processing_parties(code,party_name,party_role,country_code,contract_status,security_review_status,status,notes)
values
 ('estimulo_controller','Estímulo','controller','BR','pending','pending','draft','Formal controller identification and scope require institutional confirmation.'),
 ('supabase_test_provider','Supabase test environment provider','infrastructure_provider',null,'not_assessed','pending','draft','Test environment only; region, DPA and transfer assessment pending.'),
 ('aws_production_provider','AWS production environment provider','infrastructure_provider',null,'not_assessed','pending','draft','Production target; account, region, contracts and controls pending.'),
 ('hubspot_crm_provider','HubSpot CRM provider','operator',null,'not_assessed','not_assessed','draft','Actual connection, fields, region, contract and transfer assessment pending.')
on conflict(code) do update set party_name=excluded.party_name,party_role=excluded.party_role,notes=excluded.notes;

insert into governance.secret_inventory(secret_code,environment,provider,storage_reference,purpose,owner_role,rotation_policy,maximum_age_days,status,notes)
values
 ('SUPABASE_SERVICE_ROLE_KEY','test','local_environment','Supabase Edge Function managed environment','Backend privileged access for test Edge Functions.','security_owner','on_demand',null,'active','Value is never stored in governance tables or repository.'),
 ('SCHEDULER_PROJECT_URL','test','supabase_vault','vault:estimulo_project_url','Scheduler target URL.','platform_owner','immutable_public',null,'active','Public configuration, inventoried for change control.'),
 ('SCHEDULER_PUBLISHABLE_KEY','test','supabase_vault','vault:estimulo_publishable_key','Gateway key for scheduled Edge Function invocation; dispatch authorization still requires one-time token.','platform_owner','on_demand',null,'active','Publishable key is not treated as sole authorization.')
on conflict(secret_code) do update set storage_reference=excluded.storage_reference,purpose=excluded.purpose,notes=excluded.notes;

insert into governance.production_readiness_controls(environment,control_code,control_domain,title,description,blocking,status,evidence_reference,owner_role,verified_at)
values
 ('production','INTERNAL_RLS_COMPLETE','security','RLS interno completo','Todas as tabelas internas possuem RLS e não há privilégios diretos para anon/authenticated.',true,'passed','migration:m12f_internal_rls_and_default_privileges','database_security_owner',now()),
 ('production','LOG_REDACTION_ACTIVE','observability','Redaction de logs ativa','Campos com aparência de segredo são redigidos antes da persistência.',true,'passed','migration:m12d_log_redaction_and_consent_evidence','security_owner',now()),
 ('production','CONTROLLER_IDENTIFIED','legal','Controlador e escopo formalizados','Identificação jurídica do controlador e responsabilidades documentadas.',true,'blocked',null,'legal_owner',null),
 ('production','DPO_DESIGNATION','privacy','Encarregado ou dispensa documentada','Designação formal e canal público, ou justificativa válida de dispensa.',true,'blocked',null,'privacy_owner',null),
 ('production','PRIVACY_NOTICE_EFFECTIVE','privacy','Aviso de privacidade vigente','Aviso versionado, aprovado, acessível e consistente com os tratamentos.',true,'blocked',null,'privacy_owner',null),
 ('production','ROPA_APPROVED','privacy','Registro de operações aprovado','Atividades de tratamento, ativos, partes e finalidades aprovados.',true,'blocked',null,'privacy_owner',null),
 ('production','LEGAL_BASES_APPROVED','legal','Bases legais aprovadas','Cada tratamento ativo possui base legal específica e evidência de aprovação.',true,'blocked',null,'legal_owner',null),
 ('production','RETENTION_APPROVED','data','Retenção aprovada','Prazos, gatilhos, ações e legal holds aprovados e testados.',true,'blocked',null,'data_governance_owner',null),
 ('production','DATA_SUBJECT_RIGHTS_OPERATIONAL','privacy','Direitos dos titulares operacionais','Canal, verificação, prazos, exportação, correção e resposta testados.',true,'in_progress','rpc:privacy_submit_request,privacy_record_event','privacy_operations_owner',null),
 ('production','INCIDENT_RESPONSE_OPERATIONAL','security','Resposta a incidentes operacional','Playbook, contatos, classificação, comunicação e exercícios aprovados.',true,'in_progress','rpc:security_open_incident,security_record_incident_event','incident_commander',null),
 ('production','REAL_MALWARE_SCANNER','application','Scanner de malware de produção','Scanner técnico de prova substituído por serviço real com cobertura e SLA.',true,'blocked',null,'security_owner',null),
 ('production','AWS_STAGING_PARITY','cloud','Staging AWS equivalente','Infraestrutura AWS de staging validada antes de produção.',true,'blocked',null,'cloud_owner',null),
 ('production','BACKUP_PITR_CONFIGURED','resilience','Backups e PITR configurados','Banco e objetos possuem estratégia de backup, retenção e cópia separada.',true,'blocked',null,'platform_owner',null),
 ('production','RESTORE_TEST_PASSED','resilience','Teste de restauração aprovado','Restauração de banco e objetos executada com RPO/RTO e integridade comprovados.',true,'blocked',null,'platform_owner',null),
 ('production','TLS_ENFORCEMENT_VERIFIED','security','TLS verificado','Conexões de banco, APIs e storage exigem transporte seguro.',true,'blocked',null,'security_owner',null),
 ('production','SECRETS_ROTATION_OPERATIONAL','security','Rotação de segredos operacional','Inventário, ownership, rotação e resposta a comprometimento testados.',true,'blocked',null,'security_owner',null),
 ('production','ACCESS_REVIEW_COMPLETED','identity','Revisão de acesso concluída','IAM, roles de aplicação, contas de serviço e terceiros revisados.',true,'blocked',null,'identity_owner',null),
 ('production','VENDOR_DPA_APPROVED','vendor','Contratos e DPAs aprovados','Operadores e subprocessadores avaliados e contratados.',true,'blocked',null,'vendor_owner',null),
 ('production','INTERNATIONAL_TRANSFER_ASSESSED','vendor','Transferências internacionais avaliadas','Regiões, fluxos, mecanismos e salvaguardas documentados.',true,'blocked',null,'privacy_owner',null),
 ('production','HUBSPOT_DATA_INVENTORY_APPROVED','data','Inventário HubSpot aprovado','Objetos, campos, identificadores, bases legais e sincronizações confirmados.',true,'blocked',null,'crm_integration_owner',null),
 ('production','BEHAVIORAL_RIPD_EFFECTIVE','credit_governance','RIPD comportamental efetivo','RIPD aprovado para perfilamento e sinais comportamentais de alto risco.',true,'blocked',null,'privacy_owner',null),
 ('production','CREDIT_DECISION_GOVERNANCE','credit_governance','Governança de decisão de crédito','Validação, explicabilidade, revisão humana, contestação, equidade e monitoramento aprovados.',true,'blocked',null,'credit_governance_owner',null),
 ('production','AWS_KMS_KEY_POLICY_APPROVED','cloud','KMS e política de chaves aprovados','Chaves gerenciadas, separação de funções, rotação e auditoria configuradas.',true,'blocked',null,'cloud_security_owner',null),
 ('production','CLOUD_AUDIT_INTEGRITY_ACTIVE','observability','Integridade de auditoria cloud ativa','Trilhas de ações administrativas com retenção, integridade e alertas.',true,'blocked',null,'cloud_security_owner',null)
on conflict(environment,control_code) do update set title=excluded.title,description=excluded.description,blocking=excluded.blocking,owner_role=excluded.owner_role,
  status=case when governance.production_readiness_controls.status='passed' then 'passed' else excluded.status end,
  evidence_reference=coalesce(governance.production_readiness_controls.evidence_reference,excluded.evidence_reference),
  verified_at=coalesce(governance.production_readiness_controls.verified_at,excluded.verified_at);
