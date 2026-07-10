# Plataforma Estímulo — índice atual

**Versão:** 4.0  
**Data:** 2026-07-10  
**Status:** fundação técnica reproduzível; modelo físico HubSpot pendente de inventário

## Hierarquia de referência

Em caso de conflito:

1. decisões explícitas posteriores da Estímulo;
2. ADRs vigentes;
3. estado real do repositório e dos ambientes autorizados;
4. documentação técnica atual;
5. histórico Git.

Documentos substituídos e planos operacionais não permanecem na árvore ativa. O Git preserva sua história.

## Recursos oficiais

- repositório: `pablo-marchina/LMS-estimulo`;
- branch principal: `main`;
- Supabase de desenvolvimento/teste: `cfpfeavjlgheqqiaqtzv`;
- staging e produção oficiais: AWS;
- HubSpot: fonte autoritativa dos dados de negócio coletados e utilizados;
- contribuição: [CONTRIBUTING.md](CONTRIBUTING.md).

O Supabase não será promovido a produção. Toda release deve passar pelo AWS staging.

## Premissas atuais

- desenvolvimento integralmente interno;
- plataforma multi-jornada;
- monólito modular com contextos delimitados;
- formulário configurável e versionado;
- quatro arquétipos na configuração inicial, sem limite estrutural fixo;
- adição, retirada, recálculo e override versionados e auditáveis;
- todo dado de negócio coletado é persistido no HubSpot;
- toda função de negócio usa dados provenientes do HubSpot;
- PostgreSQL é plano técnico de outbox, idempotência, cache HubSpot-sourced, auditoria e reconciliação;
- conteúdo próprio e de terceiros usa modelo unificado e adapters;
- Supabase é somente desenvolvimento/teste;
- AWS é o ambiente oficial de staging e produção.

Detalhes: [PREMISES_AND_SCOPE.md](docs/product/PREMISES_AND_SCOPE.md) e [ADR-003](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md).

## Runtime atual

O repositório contém:

- aplicação Next.js em `apps/web`;
- seis rotas iniciais para participante e operação;
- bridge de identidade e camada de RPCs no servidor;
- 244 migrations executáveis, manifests, fingerprints e SQL canônico;
- gate de CI em PostgreSQL 17.6 com equivalência estrutural;
- contrato congelado dos 18 RPCs públicos;
- backend E2E com publicação, matrícula, diagnóstico, atividade, quick check, RLS, idempotência, concorrência, eventos, outbox e pontos;
- porta `HubSpotDataGateway`, adapter em memória e gate `write → readback → use`;
- motor configurável de formulário, arquétipos, classificação e ativações;
- `package-lock.json` v3 e instalações reproduzíveis em Ubuntu e Windows;
- baseline de 106 helpers privados e 8 RPCs públicos opacos, com expansão bloqueada;
- duas Edge Functions ativas apenas no Supabase de teste: `file-storage` e `file-scan-worker`.

Os identificadores remotos `e14_*` permanecem apenas como compatibilidade com o banco já aplicado. Novos arquivos, scripts, workflows, classes e documentos usam nomes semânticos.

## Bloqueadores ativos

Fonte única: [DELIVERY_BLOCKERS.md](docs/implementation/DELIVERY_BLOCKERS.md).

```text
LEGACY-RPC-NAMING = open
HUBSPOT-PHYSICAL-INTEGRATION = open
BROWSER-ACCESSIBILITY = open
PRODUCT-CONFIGURATION = open
UNUSED-TEST-ADAPTERS = open
```

## Documentação canônica

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

### Banco e arquitetura

- [Modelo do banco](docs/data/database/DATABASE_MODEL.md)
- [ERD](docs/data/database/DATABASE_ERD.md)
- [Dicionário](docs/data/database/DATA_DICTIONARY.md)
- [Constraints](docs/data/database/DATABASE_CONSTRAINTS_AND_INTEGRITY.md)
- [Índices e particionamento](docs/data/database/DATABASE_INDEXING_PARTITIONING.md)
- [RLS](docs/data/database/DATABASE_RLS_AND_SECURITY.md)
- [Estratégia de migrations](docs/data/database/DATABASE_MIGRATION_STRATEGY.md)
- [Migrations executáveis](docs/architecture/EXECUTABLE_MIGRATIONS.md)
- [Bridge de identidade](docs/architecture/IDENTITY_BRIDGE.md)
- [Implementação de RLS](docs/architecture/RLS_IMPLEMENTATION.md)
- [Transactional outbox](docs/architecture/TRANSACTIONAL_OUTBOX.md)
- [Arquitetura de storage](docs/architecture/STORAGE_ARCHITECTURE.md)
- [Arquitetura de filas](docs/architecture/QUEUE_ARCHITECTURE.md)
- [Scheduler e dispatcher](docs/architecture/SCHEDULER_DISPATCHER_ARCHITECTURE.md)
- [Reconciliação e recuperação](docs/architecture/RECONCILIATION_AND_RECOVERY.md)
- [Observabilidade e alertas](docs/architecture/OBSERVABILITY_AND_ALERTS.md)

### Implementação atual

- [Rebaseline de premissas](docs/decisions/ADR-002-REBASELINE-NEW-PREMISES.md)
- [HubSpot como fonte autoritativa](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md)
- [Decisões](docs/decisions/DECISION_LOG.md)
- [Rastreabilidade de premissas](docs/implementation/PREMISE_TRACEABILITY_MATRIX.md)
- [Bloqueadores](docs/implementation/DELIVERY_BLOCKERS.md)
- [Delta de schema](docs/implementation/SCHEMA_DELTA.md)
- [Lacunas do runtime](docs/implementation/RUNTIME_GAP.md)
- [Contratos públicos de RPC](docs/implementation/PUBLIC_RPC_CONTRACTS.md)
- [Backend E2E](docs/implementation/BACKEND_E2E.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Contenção de helpers opacos](docs/implementation/OPAQUE_HELPER_CONTAINMENT.md)
- [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)

### Integrações e ambientes

- [Fluxo lógico HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Contrato do adapter HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Inventário bloqueante HubSpot](docs/integrations/HUBSPOT_INVENTORY_REQUEST.md)
- [Fronteira externa de crédito](docs/integrations/CREDIT_EXTERNAL_BOUNDARY.md)
- [Portas e adapters](docs/architecture/PROVIDER_PORTS_AND_ADAPTERS.md)
- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Portabilidade Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Arquitetura AWS](docs/architecture/AWS_PRODUCTION_REFERENCE_ARCHITECTURE.md)
- [Mapeamento storage → AWS](docs/architecture/STORAGE_AWS_MAPPING.md)
- [Mapeamento filas → SQS](docs/architecture/QUEUE_AWS_SQS_MAPPING.md)
- [Mapeamento operacional → AWS](docs/architecture/AWS_OPERATIONS_MAPPING.md)
- [ADR Supabase teste / AWS produção](docs/decisions/ADR-001-SUPABASE-TEST-AWS-PRODUCTION.md)

### Segurança e operação

- [Arquitetura de segurança e privacidade](docs/security/SECURITY_PRIVACY_ARCHITECTURE.md)
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

## Regra de nomenclatura

O repositório não versiona planos operacionais nem usa fases de entrega como identidade de arquivos, scripts, workflows, classes ou documentos. Identificadores remotos históricos permanecem somente onde são necessários para reproduzir e migrar contratos já aplicados.
