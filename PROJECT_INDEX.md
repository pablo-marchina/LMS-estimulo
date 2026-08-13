# Plataforma Estímulo — índice canônico

Este índice aponta para a documentação permanente. Resultados transitórios de CI, SHAs e métricas de um candidato ficam nos artefatos do workflow ou do deploy, não em documentos permanentes.

## Entrada

- [README](README.md) — execução, estado, superfícies e arquitetura resumida.
- [Guia de contribuição](CONTRIBUTING.md) — fluxo de mudanças e padrões.

## Produto

- [Escopo de jornadas](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Princípios da primeira release](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Solicitações de informação](docs/product/INFORMATION_REQUESTS.md)
- [Inventário de informação](docs/product/INFORMATION_INVENTORY.md)
- [Inventário da Jornada OpenAI](docs/product/OPENAI_JOURNEY_INVENTORY.md)
- [Requisitos não funcionais](docs/product/NON_FUNCTIONAL_REQUIREMENTS.md)
- [Glossário](docs/product/GLOSSARY.md)

## Jornadas

- [Ciclo de vida vigente](docs/journeys/JOURNEY_LIFECYCLE.md)
- [Especificação da Jornada OpenAI](docs/journeys/OPENAI_JOURNEY_SPEC.md)
- [Progressão proposta](docs/journeys/OPENAI_PROGRESSION_RULES.md)
- [Avaliações e práticas propostas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md)
- [Gamificação e credenciais propostas](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md)
- [Modelo de competências](docs/journeys/OPENAI_COMPETENCY_MODEL.md)
- [Lacunas de conteúdo](docs/journeys/OPENAI_CONTENT_GAPS.md)
- [Requisitos de eventos](docs/journeys/OPENAI_EVENT_REQUIREMENTS.md)
- [Versionamento editorial da Jornada OpenAI](docs/journeys/OPENAI_EDITORIAL_VERSIONING.md)

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
- [ADR-002 — rebaseline das premissas](docs/decisions/ADR-002-REBASELINE-NEW-PREMISES.md)
- [Registro de riscos](docs/decisions/RISK_REGISTER.md)

## Arquitetura e ambientes

- [Estado da arquitetura AWS](docs/architecture/AWS_ARCHITECTURE_STATUS.md)
- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Portas e adapters de provedores](docs/architecture/PROVIDER_PORTS_AND_ADAPTERS.md)
- [Migrations executáveis](docs/architecture/EXECUTABLE_MIGRATIONS.md)
- [Observabilidade e alertas](docs/architecture/OBSERVABILITY_AND_ALERTS.md)
- [Contrato lógico de processamento assíncrono](docs/architecture/QUEUE_ARCHITECTURE.md)
- [Outbox transacional e exportação ETL](docs/architecture/TRANSACTIONAL_OUTBOX.md)
- [Reconciliação e recuperação](docs/architecture/RECONCILIATION_AND_RECOVERY.md)
- [Implementação de RLS](docs/architecture/RLS_IMPLEMENTATION.md)
- [Contrato lógico de armazenamento](docs/architecture/STORAGE_ARCHITECTURE.md)

## Dados e banco

- [Modelo do banco](docs/data/database/DATABASE_MODEL.md)
- [Diagrama ER](docs/data/database/DATABASE_ERD.md)
- [Dicionário de dados](docs/data/database/DATA_DICTIONARY.md)
- [Constraints e integridade](docs/data/database/DATABASE_CONSTRAINTS_AND_INTEGRITY.md)
- [Índices e particionamento](docs/data/database/DATABASE_INDEXING_PARTITIONING.md)
- [Estratégia de migrations](docs/data/database/DATABASE_MIGRATION_STRATEGY.md)
- [RLS e segurança do banco](docs/data/database/DATABASE_RLS_AND_SECURITY.md)
- [Modelo de features comportamentais](docs/data/database/BEHAVIORAL_FEATURE_MODEL.md)
- [Score comportamental configurável](docs/data/database/EXPERIMENTAL_SCORE_MODEL.md)
- [Ledger de gamificação](docs/data/database/GAMIFICATION_LEDGER_MODEL.md)

## Fluxos de dados e eventos

- [Arquitetura de fluxos atual](docs/dataflows/DATA_FLOW_ARCHITECTURE.md)
- [Catálogo de famílias de fluxo](docs/dataflows/FLOW_FAMILY_CATALOG.md)
- [Matriz de linhagem](docs/dataflows/DATA_LINEAGE_MATRIX.md)
- [Falhas, recuperação e reconciliação](docs/dataflows/FAILURE_RECOVERY_RECONCILIATION.md)
- [Arquitetura de eventos](docs/events/EVENT_ARCHITECTURE.md)
- [Envelope canônico](docs/events/CANONICAL_EVENT_ENVELOPE.md)
- [Catálogo de eventos](docs/events/EVENT_CATALOG_V0_1.md)
- [Idempotência e ordenação](docs/events/EVENT_IDEMPOTENCY_AND_ORDERING.md)
- [Privacidade, segurança e retenção](docs/events/EVENT_PRIVACY_SECURITY_RETENTION.md)
- [Nomenclatura e versionamento de eventos](docs/events/EVENT_NAMING_AND_VERSIONING.md)
- [Registro de schemas de eventos](docs/events/EVENT_SCHEMA_REGISTRY.md)
- [Qualidade das evidências de eventos](docs/events/EVENT_EVIDENCE_QUALITY.md)

## Estado da implementação

- [Fundação atual da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)
- [Preview de interface e carregamento](docs/implementation/INTERFACE_PREVIEW_AND_LOADING.md)
- [Auditoria das correções definitivas](docs/implementation/DEFINITIVE_CORRECTIONS_AUDIT.md)
- [Matriz canônica das correções solicitadas](docs/audits/DOCUMENT_CORRECTIONS_MATRIX.md)
- [Motor configurável do diagnóstico](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Backend ponta a ponta](docs/implementation/BACKEND_E2E.md)
- [Suíte de crescimento e engajamento](docs/implementation/PLATFORM_GROWTH_ENGAGEMENT_SUITE.md)
- [Contenção de helpers opacos](docs/implementation/OPAQUE_HELPER_CONTAINMENT.md)
- [Contratos públicos de RPC](docs/implementation/PUBLIC_RPC_CONTRACTS.md)
- [Contrato público de RPC v1](docs/implementation/public-rpc-contracts-v1.json)
- [Bloqueadores da entrega](docs/implementation/DELIVERY_BLOCKERS.md)
- [Registro das correções administrativas](docs/ADMIN_EDITOR_RELEASE_20260730.md)

## Integrações

- [Fronteira externa de crédito](docs/integrations/CREDIT_EXTERNAL_BOUNDARY.md)

## Operação, segurança e release

- [Matriz de acesso](docs/operations/ACCESS_MATRIX.md)
- [Configuração de domínio e autenticação](docs/operations/DOMAIN_AND_AUTH_CONFIGURATION.md)
- [Baseline de qualidade](docs/operations/PRODUCTION_QUALITY_BASELINE.md)
- [Runbook do release final](docs/operations/FINAL_RELEASE_RUNBOOK.md)
- [Rotação da service role do Supabase](docs/deployments/SUPABASE_SERVICE_ROLE_ROTATION_2026_07_27.md)
- [Backlog dos advisors do banco](docs/operations/DATABASE_ADVISOR_BACKLOG.md)
- [Arquitetura de segurança e privacidade](docs/security/SECURITY_PRIVACY_ARCHITECTURE.md)
- [Classificação e tratamento de dados](docs/security/DATA_CLASSIFICATION_AND_HANDLING.md)
- [Retenção, exclusão e legal hold](docs/security/RETENTION_DELETION_LEGAL_HOLD.md)
- [Segredos, criptografia e chaves](docs/security/SECRETS_ENCRYPTION_KEY_MANAGEMENT.md)
- [Logs, redação e auditoria](docs/security/LOGGING_REDACTION_AUDIT.md)
- [Resposta a incidentes](docs/security/SECURITY_INCIDENT_RESPONSE.md)
- [Backup, restore e disaster recovery](docs/security/BACKUP_RESTORE_DISASTER_RECOVERY.md)
- [Gate de prontidão institucional](docs/security/PRODUCTION_READINESS_GATE.md)
- [Bases legais e governança de consentimento](docs/security/LEGAL_BASIS_AND_CONSENT_GOVERNANCE.md)
- [Fluxo de direitos dos titulares](docs/security/DATA_SUBJECT_RIGHTS_WORKFLOW.md)
- [Registro das atividades de tratamento](docs/security/RECORD_OF_PROCESSING_ACTIVITIES.md)
- [Fornecedores e transferências internacionais](docs/security/VENDOR_AND_INTERNATIONAL_TRANSFER_GOVERNANCE.md)

## Regra de leitura

- especificações de produto descrevem requisitos aprovados ou propostas identificadas;
- documentos de implementação descrevem somente o código vigente;
- migrations são a fonte executável do banco;
- bloqueadores descrevem lacunas ativas;
- evidências de um candidato pertencem aos workflows, manifestos e deploy daquele SHA;
- a implantação Vercel atual é operacional, mas não substitui a decisão de arquitetura AWS institucional;
- serviços AWS específicos não são tratados como decididos antes de ADR aprovado.
