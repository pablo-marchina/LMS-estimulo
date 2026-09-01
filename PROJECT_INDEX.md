# Plataforma Estímulo — índice canônico

**Revisado em:** 2026-09-01

Este índice referencia **toda documentação canônica** e os artefatos documentais permanentes do repositório. Resultados transitórios de CI, métricas e evidências de um candidato pertencem aos workflows/artifacts do SHA correspondente.

## Como ler

1. `supabase/migrations/` define o banco físico e o comportamento transacional executável.
2. Documentos de implementação descrevem o runtime vigente.
3. [`docs/decisions/DECISION_LOG.md`](docs/decisions/DECISION_LOG.md) contém decisões ativas e supera documentos conceituais antigos quando houver conflito.
4. Specs/propostas não provam implementação nem aprovação editorial.
5. Arquivos marcados como históricos preservam contexto, não instrução operacional atual.
6. Supabase/Vercel são desenvolvimento, teste, preview e validação controlada; produção institucional continua condicionada ao Gate B AWS.

## Entrada e manutenção

- [README](README.md) — visão geral, execução e gates.
- [Guia de contribuição](CONTRIBUTING.md) — fluxo de mudanças.
- [Política de manutenção](docs/REPOSITORY_MAINTENANCE.md) — higiene e documentação.
- [Release dos editores administrativos de 30/07 — histórico](docs/ADMIN_EDITOR_RELEASE_20260730.md).

## Estado atual da implementação

- [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md).
- [Contratos atuais das correções prioritárias](docs/implementation/CURRENT_PLATFORM_BEHAVIOR.md).
- [Motor configurável do diagnóstico](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md).
- [Contratos públicos de RPC](docs/implementation/PUBLIC_RPC_CONTRACTS.md).
- [Contenção de helpers opacos](docs/implementation/OPAQUE_HELPER_CONTAINMENT.md).
- [Backend E2E reproduzível](docs/implementation/BACKEND_E2E.md).
- [Preview de interface e loading](docs/implementation/INTERFACE_PREVIEW_AND_LOADING.md).
- [Suíte de crescimento e engajamento](docs/implementation/PLATFORM_GROWTH_ENGAGEMENT_SUITE.md).
- [Bloqueadores da entrega](docs/implementation/DELIVERY_BLOCKERS.md).
- [Auditoria de correções definitivas](docs/implementation/DEFINITIVE_CORRECTIONS_AUDIT.md).

## Produto e requisitos

- [Escopo de jornadas](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md).
- [Princípios da release inicial](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md).
- [Glossário](docs/product/GLOSSARY.md).
- [Inventário de informações](docs/product/INFORMATION_INVENTORY.md).
- [Solicitações de informação](docs/product/INFORMATION_REQUESTS.md).
- [Requisitos não funcionais](docs/product/NON_FUNCTIONAL_REQUIREMENTS.md).
- [Inventário inicial da Jornada OpenAI — histórico](docs/product/OPENAI_JOURNEY_INVENTORY.md).

## Jornada OpenAI e lifecycle

- [Lifecycle de jornadas](docs/journeys/JOURNEY_LIFECYCLE.md) — autoridade do ciclo `draft ↔ published`.
- [Especificação da Jornada OpenAI](docs/journeys/OPENAI_JOURNEY_SPEC.md).
- [Progressão proposta](docs/journeys/OPENAI_PROGRESSION_RULES.md).
- [Avaliações e práticas propostas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md).
- [Gamificação e credenciais propostas](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md).
- [Modelo de competências](docs/journeys/OPENAI_COMPETENCY_MODEL.md).
- [Lacunas editoriais](docs/journeys/OPENAI_CONTENT_GAPS.md).
- [Requisitos de eventos da jornada](docs/journeys/OPENAI_EVENT_REQUIREMENTS.md).
- [Versionamento editorial da jornada — documento substituído](docs/journeys/OPENAI_EDITORIAL_VERSIONING.md).

## Domínio e decisões

- [Modelo de domínio](docs/domain/DOMAIN_MODEL.md).
- [Contextos delimitados](docs/domain/BOUNDED_CONTEXTS.md).
- [Extensibilidade](docs/domain/EXTENSIBILITY_MODEL.md).
- [Permissões](docs/domain/PERMISSION_MODEL.md).
- [Lifecycles e máquinas de estado](docs/domain/LIFECYCLES_AND_STATE_MACHINES.md).
- [Decisões ativas](docs/decisions/DECISION_LOG.md).
- [ADR-002 — rebaseline e refinamentos posteriores](docs/decisions/ADR-002-REBASELINE-NEW-PREMISES.md).
- [Registro de riscos](docs/decisions/RISK_REGISTER.md).

## Banco e dados analíticos

- [Modelo do banco](docs/data/database/DATABASE_MODEL.md).
- [ERD](docs/data/database/DATABASE_ERD.md).
- [Dicionário de dados](docs/data/database/DATA_DICTIONARY.md).
- [Constraints e integridade](docs/data/database/DATABASE_CONSTRAINTS_AND_INTEGRITY.md).
- [Estratégia de migrations](docs/data/database/DATABASE_MIGRATION_STRATEGY.md).
- [RLS e segurança de banco](docs/data/database/DATABASE_RLS_AND_SECURITY.md).
- [Indexação e particionamento](docs/data/database/DATABASE_INDEXING_PARTITIONING.md).
- [Modelo de features comportamentais](docs/data/database/BEHAVIORAL_FEATURE_MODEL.md).
- [Modelo de score experimental](docs/data/database/EXPERIMENTAL_SCORE_MODEL.md).
- [Modelo de ledger de gamificação](docs/data/database/GAMIFICATION_LEDGER_MODEL.md).

## Arquitetura de aplicação e infraestrutura

- [Migrations executáveis](docs/architecture/EXECUTABLE_MIGRATIONS.md).
- [Outbox transacional](docs/architecture/TRANSACTIONAL_OUTBOX.md).
- [Arquitetura de filas](docs/architecture/QUEUE_ARCHITECTURE.md).
- [Reconciliação e recuperação](docs/architecture/RECONCILIATION_AND_RECOVERY.md).
- [Storage](docs/architecture/STORAGE_ARCHITECTURE.md).
- [Observabilidade e alertas](docs/architecture/OBSERVABILITY_AND_ALERTS.md).
- [Ports e adapters de providers](docs/architecture/PROVIDER_PORTS_AND_ADAPTERS.md).
- [RLS](docs/architecture/RLS_IMPLEMENTATION.md).
- [Estado da arquitetura AWS](docs/architecture/AWS_ARCHITECTURE_STATUS.md).
- [Estratégia de ambientes e cloud](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md).

## Fluxos, eventos e linhagem

- [Arquitetura de fluxos](docs/dataflows/DATA_FLOW_ARCHITECTURE.md).
- [Catálogo de famílias de fluxo](docs/dataflows/FLOW_FAMILY_CATALOG.md).
- [Linhagem de dados](docs/dataflows/DATA_LINEAGE_MATRIX.md).
- [Falhas, replay e reconciliação](docs/dataflows/FAILURE_RECOVERY_RECONCILIATION.md).
- [Matriz de roteamento de eventos v0.1](docs/dataflows/event-routing-matrix-v0.1.csv) — artefato versionado; não usar sua contagem como métrica atual do runtime sem validação.
- [Arquitetura de eventos](docs/events/EVENT_ARCHITECTURE.md).
- [Catálogo de eventos v0.1](docs/events/EVENT_CATALOG_V0_1.md).
- [Envelope canônico](docs/events/CANONICAL_EVENT_ENVELOPE.md).
- [Qualidade da evidência](docs/events/EVENT_EVIDENCE_QUALITY.md).
- [Idempotência e ordenação](docs/events/EVENT_IDEMPOTENCY_AND_ORDERING.md).
- [Naming e versionamento de eventos](docs/events/EVENT_NAMING_AND_VERSIONING.md).
- [Privacidade, segurança e retenção de eventos](docs/events/EVENT_PRIVACY_SECURITY_RETENTION.md).
- [Registro de schemas](docs/events/EVENT_SCHEMA_REGISTRY.md).

## Integrações e fronteiras externas

- [Fronteira externa de crédito](docs/integrations/CREDIT_EXTERNAL_BOUNDARY.md).

A integração operacional do LMS continua desacoplada por eventos/outbox. Quando um destino específico for habilitado, suas restrições adicionais devem ser aplicadas sem torná-lo dependência síncrona do domínio.

## Pesquisa e diagnóstico

- [Finalidade e guardrails do diagnóstico](docs/research/DIAGNOSTIC_PURPOSE_AND_GUARDRAILS.md).
- [Modelo de dimensões](docs/research/DIAGNOSTIC_DIMENSION_MODEL.md).
- [Banco de itens v0.1](docs/research/DIAGNOSTIC_ITEM_BANK_V0_1.md).
- [Protocolo de pesquisa com empreendedores](docs/research/ENTREPRENEUR_RESEARCH_PROTOCOL.md).
- [Modelo de momento de intervenção](docs/research/INTERVENTION_MOMENT_MODEL.md).

## Segurança, privacidade e continuidade

- [Arquitetura de segurança e privacidade](docs/security/SECURITY_PRIVACY_ARCHITECTURE.md).
- [Gate de prontidão para produção](docs/security/PRODUCTION_READINESS_GATE.md).
- [Classificação e tratamento de dados](docs/security/DATA_CLASSIFICATION_AND_HANDLING.md).
- [Bases legais e consentimento](docs/security/LEGAL_BASIS_AND_CONSENT_GOVERNANCE.md).
- [Registro de atividades de tratamento](docs/security/RECORD_OF_PROCESSING_ACTIVITIES.md).
- [Direitos do titular](docs/security/DATA_SUBJECT_RIGHTS_WORKFLOW.md).
- [Retenção, deleção e legal hold](docs/security/RETENTION_DELETION_LEGAL_HOLD.md).
- [Logging, redação e auditoria](docs/security/LOGGING_REDACTION_AUDIT.md).
- [Secrets, criptografia e chaves](docs/security/SECRETS_ENCRYPTION_KEY_MANAGEMENT.md).
- [Resposta a incidentes](docs/security/SECURITY_INCIDENT_RESPONSE.md).
- [Backup, restore e disaster recovery](docs/security/BACKUP_RESTORE_DISASTER_RECOVERY.md).
- [Fornecedores e transferência internacional](docs/security/VENDOR_AND_INTERNATIONAL_TRANSFER_GOVERNANCE.md).

## Operação, deploy e evidência

- [Matriz de acesso](docs/operations/ACCESS_MATRIX.md).
- [Domínio e autenticação](docs/operations/DOMAIN_AND_AUTH_CONFIGURATION.md).
- [Baseline de qualidade](docs/operations/PRODUCTION_QUALITY_BASELINE.md).
- [Runbook final](docs/operations/FINAL_RELEASE_RUNBOOK.md).
- [Backlog do Database Advisor](docs/operations/DATABASE_ADVISOR_BACKLOG.md).
- [Captura visual](docs/VISUAL_CAPTURE.md).
- [Handoff Supabase/Vercel](docs/deployments/SUPABASE_VERCEL_HANDOFF.md).
- [Registro de rotação da service role Supabase — 27/07/2026](docs/deployments/SUPABASE_SERVICE_ROLE_ROTATION_2026_07_27.md).

## Auditorias e registros históricos

- [Matriz de correções documentais](docs/audits/DOCUMENT_CORRECTIONS_MATRIX.md).
- [Release administrativa de 30/07/2026](docs/ADMIN_EDITOR_RELEASE_20260730.md).

Documentos históricos devem carregar contexto de data/status e nunca substituir os documentos vigentes apontados acima.