# Plataforma Estímulo — índice canônico

Este índice aponta para a documentação permanente. Requisitos, decisões, estado implementado e bloqueadores são mantidos diretamente nos documentos correspondentes.

## Entrada

- [README](README.md) — execução, estado e arquitetura resumida.
- [Guia de contribuição](CONTRIBUTING.md) — fluxo de mudanças e padrões.

## Produto

- [Escopo de jornadas](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Princípios da primeira release](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Solicitações de informação](docs/product/INFORMATION_REQUESTS.md)
- [Inventário de informação](docs/product/INFORMATION_INVENTORY.md)
- [Inventário da Jornada OpenAI](docs/product/OPENAI_JOURNEY_INVENTORY.md)
- [Requisitos não funcionais](docs/product/NON_FUNCTIONAL_REQUIREMENTS.md)
- [Glossário](docs/product/GLOSSARY.md)

## Jornada OpenAI

- [Especificação](docs/journeys/OPENAI_JOURNEY_SPEC.md)
- [Progressão proposta](docs/journeys/OPENAI_PROGRESSION_RULES.md)
- [Avaliações e práticas propostas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md)
- [Gamificação e credenciais propostas](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md)
- [Modelo de competências](docs/journeys/OPENAI_COMPETENCY_MODEL.md)
- [Lacunas de conteúdo](docs/journeys/OPENAI_CONTENT_GAPS.md)
- [Versionamento editorial](docs/journeys/OPENAI_EDITORIAL_VERSIONING.md)
- [Requisitos de eventos](docs/journeys/OPENAI_EVENT_REQUIREMENTS.md)

## Pesquisa e diagnóstico

- [Finalidade e guardrails](docs/research/DIAGNOSTIC_PURPOSE_AND_GUARDRAILS.md)
- [Modelo de dimensões](docs/research/DIAGNOSTIC_DIMENSION_MODEL.md)
- [Banco de itens](docs/research/DIAGNOSTIC_ITEM_BANK_V0_1.md)
- [Protocolo de pesquisa com empreendedores](docs/research/ENTREPRENEUR_RESEARCH_PROTOCOL.md)
- [Modelo de momento de intervenção](docs/research/INTERVENTION_MOMENT_MODEL.md)

## Domínio

- [Contextos delimitados](docs/domain/BOUNDED_CONTEXTS.md)
- [Modelo de domínio](docs/domain/DOMAIN_MODEL.md)
- [Modelo de extensibilidade](docs/domain/EXTENSIBILITY_MODEL.md)
- [Ciclos de vida e máquinas de estado](docs/domain/LIFECYCLES_AND_STATE_MACHINES.md)
- [Modelo de permissões](docs/domain/PERMISSION_MODEL.md)

## Decisões e riscos

- [Registro de decisões ativas](docs/decisions/DECISION_LOG.md)
- [DEC-070 — escopo HubSpot](docs/decisions/HUBSPOT_SCOPE_DECISION.md)
- [DEC-075 — produção integral na AWS](docs/decisions/AWS_PRODUCTION_ARCHITECTURE.md)
- [ADR-001 — Supabase em teste e AWS em produção](docs/decisions/ADR-001-SUPABASE-TEST-AWS-PRODUCTION.md)
- [ADR-002 — rebaseline das premissas](docs/decisions/ADR-002-REBASELINE-NEW-PREMISES.md)
- [Registro de riscos](docs/decisions/RISK_REGISTER.md)

## Arquitetura e ambientes

- [Arquitetura-alvo AWS](docs/architecture/AWS_TARGET_ARCHITECTURE.md)
- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Migração dos adapters Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Identidade, Cognito/OIDC e vínculo interno](docs/architecture/IDENTITY_BRIDGE.md)
- [Portas e adapters de provedores](docs/architecture/PROVIDER_PORTS_AND_ADAPTERS.md)
- [Mapeamento operacional AWS](docs/architecture/AWS_OPERATIONS_MAPPING.md)
- [Migrations executáveis](docs/architecture/EXECUTABLE_MIGRATIONS.md)
- [Observabilidade e alertas](docs/architecture/OBSERVABILITY_AND_ALERTS.md)
- [Arquitetura de filas](docs/architecture/QUEUE_ARCHITECTURE.md)
- [Mapeamento de filas para SQS](docs/architecture/QUEUE_AWS_SQS_MAPPING.md)
- [Scheduler e dispatcher](docs/architecture/SCHEDULER_DISPATCHER_ARCHITECTURE.md)
- [Outbox transacional](docs/architecture/TRANSACTIONAL_OUTBOX.md)
- [Reconciliação e recuperação](docs/architecture/RECONCILIATION_AND_RECOVERY.md)
- [Implementação de RLS](docs/architecture/RLS_IMPLEMENTATION.md)
- [Arquitetura de armazenamento](docs/architecture/STORAGE_ARCHITECTURE.md)
- [Mapeamento de armazenamento para AWS](docs/architecture/STORAGE_AWS_MAPPING.md)

## Dados e banco

- [Modelo do banco](docs/data/database/DATABASE_MODEL.md)
- [Diagrama ER](docs/data/database/DATABASE_ERD.md)
- [Dicionário de dados](docs/data/database/DATA_DICTIONARY.md)
- [Constraints e integridade](docs/data/database/DATABASE_CONSTRAINTS_AND_INTEGRITY.md)
- [Índices e particionamento](docs/data/database/DATABASE_INDEXING_PARTITIONING.md)
- [Estratégia de migrations](docs/data/database/DATABASE_MIGRATION_STRATEGY.md)
- [RLS e segurança do banco](docs/data/database/DATABASE_RLS_AND_SECURITY.md)
- [Modelo de features comportamentais](docs/data/database/BEHAVIORAL_FEATURE_MODEL.md)
- [Modelo experimental de score](docs/data/database/EXPERIMENTAL_SCORE_MODEL.md)
- [Ledger de gamificação](docs/data/database/GAMIFICATION_LEDGER_MODEL.md)

## Fluxos de dados

- [Arquitetura de fluxos](docs/dataflows/DATA_FLOW_ARCHITECTURE.md)
- [Catálogo de famílias de fluxo](docs/dataflows/FLOW_FAMILY_CATALOG.md)
- [Matriz de linhagem](docs/dataflows/DATA_LINEAGE_MATRIX.md)
- [Falhas, recuperação e reconciliação](docs/dataflows/FAILURE_RECOVERY_RECONCILIATION.md)

## Eventos

- [Arquitetura de eventos](docs/events/EVENT_ARCHITECTURE.md)
- [Envelope canônico](docs/events/CANONICAL_EVENT_ENVELOPE.md)
- [Catálogo de eventos](docs/events/EVENT_CATALOG_V0_1.md)
- [Qualidade da evidência](docs/events/EVENT_EVIDENCE_QUALITY.md)
- [Idempotência e ordenação](docs/events/EVENT_IDEMPOTENCY_AND_ORDERING.md)
- [Nomenclatura e versionamento](docs/events/EVENT_NAMING_AND_VERSIONING.md)
- [Privacidade, segurança e retenção](docs/events/EVENT_PRIVACY_SECURITY_RETENTION.md)
- [Registro de schemas](docs/events/EVENT_SCHEMA_REGISTRY.md)

## Integrações

- [Contrato do adapter HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Fluxo lógico HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Solicitação de inventário HubSpot](docs/integrations/HUBSPOT_INVENTORY_REQUEST.md)
- [Fronteira externa de crédito](docs/integrations/CREDIT_EXTERNAL_BOUNDARY.md)

## Estado da implementação

- [Fundação atual da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Backend ponta a ponta](docs/implementation/BACKEND_E2E.md)
- [Contenção de helpers opacos](docs/implementation/OPAQUE_HELPER_CONTAINMENT.md)
- [Contratos públicos de RPC](docs/implementation/PUBLIC_RPC_CONTRACTS.md)
- [Contrato público de RPC v1](docs/implementation/public-rpc-contracts-v1.json)
- [Lacuna de runtime](docs/implementation/RUNTIME_GAP.md)
- [Delta de schema](docs/implementation/SCHEMA_DELTA.md)
- [Bloqueadores da entrega](docs/implementation/DELIVERY_BLOCKERS.md)

## Operação e release

- [Matriz de acesso](docs/operations/ACCESS_MATRIX.md)
- [Configuração de domínio e autenticação](docs/operations/DOMAIN_AND_AUTH_CONFIGURATION.md)
- [Baseline de qualidade para produção](docs/operations/PRODUCTION_QUALITY_BASELINE.md)
- [Runbook do release final](docs/operations/FINAL_RELEASE_RUNBOOK.md)
- [Registro da rotação da service role](docs/deployments/SUPABASE_SERVICE_ROLE_ROTATION_2026_07_27.md)
- [Inventário necessário da AWS corporativa](infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md)
- [Runtime web em AWS Lambda](infra/aws/lambda/README.md)

## Segurança, privacidade e continuidade

- [Arquitetura de segurança e privacidade](docs/security/SECURITY_PRIVACY_ARCHITECTURE.md)
- [Classificação e tratamento de dados](docs/security/DATA_CLASSIFICATION_AND_HANDLING.md)
- [Bases legais e consentimento](docs/security/LEGAL_BASIS_AND_CONSENT_GOVERNANCE.md)
- [Registro das atividades de tratamento](docs/security/RECORD_OF_PROCESSING_ACTIVITIES.md)
- [Direitos dos titulares](docs/security/DATA_SUBJECT_RIGHTS_WORKFLOW.md)
- [Retenção, exclusão e legal hold](docs/security/RETENTION_DELETION_LEGAL_HOLD.md)
- [Segredos, criptografia e chaves](docs/security/SECRETS_ENCRYPTION_KEY_MANAGEMENT.md)
- [Logs, redação e auditoria](docs/security/LOGGING_REDACTION_AUDIT.md)
- [Resposta a incidentes](docs/security/SECURITY_INCIDENT_RESPONSE.md)
- [Fornecedores e transferências internacionais](docs/security/VENDOR_AND_INTERNATIONAL_TRANSFER_GOVERNANCE.md)
- [Backup, restore e disaster recovery](docs/security/BACKUP_RESTORE_DISASTER_RECOVERY.md)
- [Gate de prontidão para produção](docs/security/PRODUCTION_READINESS_GATE.md)

## Artefatos executáveis permanentes

- [Candidatos de credenciais](scripts/database/learning-credentials/candidates.sql)
- [API de emissão de credenciais](scripts/database/learning-credentials/issuance-api.sql)
- [API de leitura de credenciais](scripts/database/learning-credentials/read-api.sql)

## Regra de leitura

- especificações de produto descrevem requisitos aprovados ou propostas identificadas;
- decisões registram escolhas vigentes;
- documentos de implementação descrevem somente o código versionado;
- bloqueadores descrevem o que ainda falta;
- Supabase é evidência de desenvolvimento/teste, não de produção;
- `Dockerfile.lambda`, mocks, fixtures e smoke tests não constituem prova de produção.
