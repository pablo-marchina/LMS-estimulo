# Plataforma Estímulo — índice atual

**Versão:** 3.0  
**Data:** 2026-07-10  
**Status:** E14 em execução; runtime reproduzível e legado opaco contido; modelo físico HubSpot bloqueado pelo inventário da conta

## 1. Hierarquia de referência

Em caso de conflito:

1. `Estimulo_all` e decisões explícitas posteriores da Estímulo;
2. ADRs e decisões atuais aprovadas;
3. estado real do repositório e ambientes autorizados;
4. documentação técnica atual;
5. histórico Git.

Documentos e outputs substituídos não permanecem na árvore ativa. O Git preserva sua história.

## 2. Recursos oficiais

- repositório: `pablo-marchina/LMS-estimulo`;
- branch principal: `main`;
- Supabase de desenvolvimento/teste: `cfpfeavjlgheqqiaqtzv`;
- staging e produção oficiais: AWS;
- HubSpot: fonte autoritativa dos dados de negócio coletados e utilizados;
- contribuição: [CONTRIBUTING.md](CONTRIBUTING.md).

O Supabase não será promovido a produção. Toda release deve passar pelo AWS staging.

## 3. Premissas atuais

- desenvolvimento integralmente interno;
- plataforma multi-jornada;
- monólito modular com contextos delimitados;
- formulário configurável e versionado;
- quatro arquétipos na configuração inicial, sem limite estrutural fixo;
- adição, retirada, recálculo e override versionados e auditáveis;
- captura governada de ações relevantes;
- todo dado de negócio coletado é persistido no HubSpot;
- toda função de negócio usa dados provenientes do HubSpot;
- PostgreSQL é plano técnico de outbox, idempotência, cache HubSpot-sourced, auditoria e reconciliação;
- conteúdo próprio e de terceiros por modelo unificado e adapters;
- Supabase somente para desenvolvimento/teste;
- AWS para staging e produção;
- código, migrations, contratos, testes e documentação entregues juntos.

Detalhes: [PREMISES_AND_SCOPE.md](docs/product/PREMISES_AND_SCOPE.md) e [ADR-003](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md).

## 4. Runtime atual

O repositório contém:

- aplicação Next.js em `apps/web`;
- seis rotas iniciais para participante e operação;
- bridge de identidade e camada de RPCs no servidor;
- 76 migrations M00–M12, 165 migrations M13 e 2 migrations M14/M14b recuperadas;
- 243 migrations executáveis, manifests, fingerprints e SQL canônico;
- gate de CI em PostgreSQL 17.6 com equivalência estrutural;
- contrato congelado dos 18 RPCs públicos;
- backend E2E com publicação, matrícula, diagnóstico, atividade, quick check, RLS, idempotência, concorrência, eventos, outbox e pontos;
- porta `HubSpotDataGateway`, adapter em memória e gate `write → readback → use` testados sem acesso à conta real;
- motor lógico configurável de formulário, arquétipos, classificação e ativações;
- `package-lock.json` v3 e instalações reproduzíveis em Ubuntu e Windows;
- baseline de 107 helpers privados e 8 RPCs públicos opacos, com expansão bloqueada e aliases da aplicação isolados;
- duas Edge Functions ativas apenas no Supabase de teste: `file-storage` e `file-scan-worker`.

O runtime atual comprova a fundação técnica, mas ainda usa estruturas PostgreSQL que não satisfazem a autoridade HubSpot recém-definida. Essas estruturas serão réplica técnica, cache ou serão descontinuadas após a transição.

## 5. Bloqueadores ativos

Fonte única: [E14_BLOCKER_REGISTER.md](docs/implementation/E14_BLOCKER_REGISTER.md).

Permanecem dois P0:

1. substituir e remover incrementalmente as 115 funções com argumentos opacos já inventariadas, sem ampliar o legado;
2. inventariar a conta HubSpot, aprovar o modelo físico e provar o adapter real.

```text
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
reproducible_install_passed = true
opaque_helper_containment_passed = true
opaque_helper_physical_replacement_complete = false
hubspot_authoritative_source_decided = true
hubspot_gateway_contract_defined = true
hubspot_test_adapter_implemented = true
write_readback_use_gate_tested = true
hubspot_inventory_complete = false
hubspot_physical_model_approved = false
hubspot_real_adapter_implemented = false
new_functional_migration_authorized = false
```

## 6. Documentação canônica

### Produto

- [Princípios da release inicial](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Escopo multi-jornada](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [Requisitos não funcionais](docs/product/NON_FUNCTIONAL_REQUIREMENTS.md)
- [Glossário](docs/product/GLOSSARY.md)
- [Inventário da Jornada OpenAI](docs/product/OPENAI_JOURNEY_INVENTORY.md)
- [Inventário de informações](docs/product/INFORMATION_INVENTORY.md)
- [Solicitações de informação](docs/product/INFORMATION_REQUESTS.md)

### Domínio

- [Modelo de domínio](docs/domain/DOMAIN_MODEL.md)
- [Contextos delimitados](docs/domain/BOUNDED_CONTEXTS.md)
- [Ciclos de vida](docs/domain/LIFECYCLES_AND_STATE_MACHINES.md)
- [Permissões](docs/domain/PERMISSION_MODEL.md)
- [Extensibilidade](docs/domain/EXTENSIBILITY_MODEL.md)

### Jornada OpenAI

- [Especificação](docs/journeys/OPENAI_JOURNEY_SPEC.md)
- [Competências](docs/journeys/OPENAI_COMPETENCY_MODEL.md)
- [Progressão](docs/journeys/OPENAI_PROGRESSION_RULES.md)
- [Avaliações e práticas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md)
- [Gamificação e credenciais](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md)
- [Versionamento editorial](docs/journeys/OPENAI_EDITORIAL_VERSIONING.md)
- [Eventos](docs/journeys/OPENAI_EVENT_REQUIREMENTS.md)
- [Lacunas editoriais](docs/journeys/OPENAI_CONTENT_GAPS.md)

### Diagnóstico e arquétipos

- [Finalidade e guardrails](docs/research/DIAGNOSTIC_PURPOSE_AND_GUARDRAILS.md)
- [Modelo de dimensões](docs/research/DIAGNOSTIC_DIMENSION_MODEL.md)
- [Banco inicial de itens](docs/research/DIAGNOSTIC_ITEM_BANK_V0_1.md)
- [Protocolo de pesquisa](docs/research/ENTREPRENEUR_RESEARCH_PROTOCOL.md)
- [Momentos de intervenção](docs/research/INTERVENTION_MOMENT_MODEL.md)

### Eventos e fluxos

- [Arquitetura de eventos](docs/events/EVENT_ARCHITECTURE.md)
- [Envelope canônico](docs/events/CANONICAL_EVENT_ENVELOPE.md)
- [Nomenclatura e versionamento](docs/events/EVENT_NAMING_AND_VERSIONING.md)
- [Catálogo de eventos](docs/events/EVENT_CATALOG_V0_1.md)
- [Qualidade da evidência](docs/events/EVENT_EVIDENCE_QUALITY.md)
- [Registro de schemas](docs/events/EVENT_SCHEMA_REGISTRY.md)
- [Idempotência e ordenação](docs/events/EVENT_IDEMPOTENCY_AND_ORDERING.md)
- [Privacidade e retenção](docs/events/EVENT_PRIVACY_SECURITY_RETENTION.md)
- [Arquitetura de fluxos](docs/dataflows/DATA_FLOW_ARCHITECTURE.md)
- [Famílias de fluxo](docs/dataflows/FLOW_FAMILY_CATALOG.md)
- [Linhagem](docs/dataflows/DATA_LINEAGE_MATRIX.md)
- [Falhas e reconciliação](docs/dataflows/FAILURE_RECOVERY_RECONCILIATION.md)

### Banco e modelos quantitativos

- [Modelo do banco](docs/data/database/DATABASE_MODEL.md)
- [ERD](docs/data/database/DATABASE_ERD.md)
- [Dicionário](docs/data/database/DATA_DICTIONARY.md)
- [Constraints](docs/data/database/DATABASE_CONSTRAINTS_AND_INTEGRITY.md)
- [Índices e particionamento](docs/data/database/DATABASE_INDEXING_PARTITIONING.md)
- [RLS](docs/data/database/DATABASE_RLS_AND_SECURITY.md)
- [Estratégia de migrations](docs/data/database/DATABASE_MIGRATION_STRATEGY.md)
- [Ledger de gamificação](docs/data/database/GAMIFICATION_LEDGER_MODEL.md)
- [Features comportamentais](docs/data/database/BEHAVIORAL_FEATURE_MODEL.md)
- [Score experimental e guardrails](docs/data/database/EXPERIMENTAL_SCORE_MODEL.md)
- [Migrations M00–M12](docs/architecture/E12_EXECUTABLE_MIGRATIONS.md)
- [Manifest M00–M12 recuperado](supabase/canonical-migrations/M00_M12_RUNTIME_MANIFEST.json)
- [Manifest M13 recuperado](supabase/canonical-migrations/M13_RUNTIME_MANIFEST.json)
- [Manifest M14 recuperado](supabase/canonical-migrations/M14_RUNTIME_MANIFEST.json)

### Fundação técnica do ambiente de teste

- [Bridge de identidade](docs/architecture/E12_IDENTITY_BRIDGE.md)
- [Implementação de RLS](docs/architecture/E12_RLS_IMPLEMENTATION.md)
- [Transactional outbox](docs/architecture/E12_TRANSACTIONAL_OUTBOX.md)
- [Arquitetura de storage](docs/architecture/E12_STORAGE_ARCHITECTURE.md)
- [Arquitetura de filas](docs/architecture/E12_QUEUE_ARCHITECTURE.md)
- [Scheduler e dispatcher](docs/architecture/E12_SCHEDULER_DISPATCHER_ARCHITECTURE.md)
- [Reconciliação e recuperação](docs/architecture/E12_RECONCILIATION_AND_RECOVERY.md)
- [Observabilidade e alertas](docs/architecture/E12_OBSERVABILITY_AND_ALERTS.md)

Esses componentes são adapters e provas do Supabase de teste, não arquitetura produtiva AWS.

### E14

- [Rebaseline anterior](docs/decisions/ADR-002-E14-REBASELINE-NEW-PREMISES.md)
- [HubSpot como fonte autoritativa](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md)
- [Decisões](docs/decisions/DECISION_LOG.md)
- [Plano](docs/implementation/E14_REBASELINE_EXECUTION_PLAN.md)
- [Rastreabilidade](docs/implementation/E14_PREMISE_TRACEABILITY_MATRIX.md)
- [Bloqueadores](docs/implementation/E14_BLOCKER_REGISTER.md)
- [Delta de schema](docs/implementation/SCHEMA_DELTA_E14.md)
- [Runtime](docs/implementation/RUNTIME_GAP_E14.md)
- [Contratos públicos de RPC](docs/implementation/E14_PUBLIC_RPC_CONTRACTS.md)
- [Backend E2E](docs/implementation/E14_BACKEND_E2E.md)
- [Motor configurável](docs/implementation/E14_CONFIGURABLE_PRODUCT_ENGINE.md)
- [Contenção de helpers opacos](docs/implementation/E14_OPAQUE_HELPER_CONTAINMENT.md)

### Integrações e ambientes

- [Fluxo lógico HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Contrato do adapter HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Inventário bloqueante HubSpot](docs/integrations/HUBSPOT_INVENTORY_REQUEST.md)
- [Fronteira externa de crédito](docs/integrations/CREDIT_EXTERNAL_BOUNDARY.md)
- [Portas e adapters](docs/architecture/PROVIDER_PORTS_AND_ADAPTERS.md)
- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Portabilidade Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Arquitetura AWS](docs/architecture/AWS_PRODUCTION_REFERENCE_ARCHITECTURE.md)
- [Mapeamento storage → AWS](docs/architecture/E12_STORAGE_AWS_MAPPING.md)
- [Mapeamento filas → SQS](docs/architecture/E12_QUEUE_AWS_SQS_MAPPING.md)
- [Mapeamento operacional → AWS](docs/architecture/E12_AWS_OPERATIONS_MAPPING.md)
- [ADR Supabase teste / AWS produção](docs/decisions/ADR-001-SUPABASE-TEST-AWS-PRODUCTION.md)

### Segurança e operação

- [Arquitetura de segurança e privacidade](docs/security/E13_SECURITY_PRIVACY_ARCHITECTURE.md)
- [Classificação](docs/security/DATA_CLASSIFICATION_AND_HANDLING.md)
- [Registro de tratamentos](docs/security/RECORD_OF_PROCESSING_ACTIVITIES.md)
- [Bases legais e consentimento](docs/security/LEGAL_BASIS_AND_CONSENT_GOVERNANCE.md)
- [Direitos dos titulares](docs/security/DATA_SUBJECT_RIGHTS_WORKFLOW.md)
- [Retenção e eliminação](docs/security/RETENTION_DELETION_LEGAL_HOLD.md)
- [Incidentes](docs/security/SECURITY_INCIDENT_RESPONSE.md)
- [Logging e auditoria](docs/security/LOGGING_REDACTION_AUDIT.md)
- [Segredos e criptografia](docs/security/SECRETS_ENCRYPTION_KEY_MANAGEMENT.md)
- [Backup e disaster recovery](docs/security/BACKUP_RESTORE_DISASTER_RECOVERY.md)
- [Fornecedores e transferências](docs/security/VENDOR_AND_INTERNATIONAL_TRANSFER_GOVERNANCE.md)
- [Gate de produção](docs/security/PRODUCTION_READINESS_GATE.md)
- [Risk register](docs/decisions/RISK_REGISTER.md)
- [Matriz de acessos](docs/operations/ACCESS_MATRIX.md)

## 7. Sequência obrigatória

A sequência vigente está no [plano E14](docs/implementation/E14_REBASELINE_EXECUTION_PLAN.md) e no [registro de bloqueadores](docs/implementation/E14_BLOCKER_REGISTER.md). Nenhuma migration dependente do modelo físico HubSpot pode ser criada antes do inventário e da aprovação desse modelo.
