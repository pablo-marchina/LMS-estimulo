# Plataforma Estímulo — índice canônico

Este índice referencia a documentação permanente da plataforma. Os documentos descrevem contratos, modelos, requisitos e procedimentos duráveis; não funcionam como changelog, registro de correções, backlog de uma entrega ou relatório de um SHA.

## Fontes de verdade

1. código, configuração e migrations executáveis definem o comportamento físico do SHA avaliado;
2. contratos legíveis por máquina e testes protegem as fronteiras executáveis;
3. documentação de domínio, arquitetura, implementação e operação explica o comportamento vigente;
4. especificações de produto e pesquisa definem intenção, limites e requisitos;
5. decisões ativas registram invariantes que não são óbvias apenas pelo código.

Resultados de releases, incidentes, deploys, auditorias pontuais e CI ficam no GitHub e nos artifacts correspondentes.

## Entrada e manutenção

- [Manutenção do repositório](docs/REPOSITORY_MAINTENANCE.md).

## Produto

- [Princípios de produto](docs/product/PRODUCT_PRINCIPLES.md).
- [Escopo multi-jornada](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md).
- [Requisitos externos e de governança](docs/product/EXTERNAL_GOVERNANCE_REQUIREMENTS.md).
- [Requisitos não funcionais](docs/product/NON_FUNCTIONAL_REQUIREMENTS.md).
- [Glossário](docs/product/GLOSSARY.md).

## Implementação

- [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md).
- [Motor configurável de diagnóstico](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md).
- [Contratos públicos de RPC](docs/implementation/PUBLIC_RPC_CONTRACTS.md).
- [Contenção de helpers opacos](docs/implementation/OPAQUE_HELPER_CONTAINMENT.md).
- [Backend E2E reproduzível](docs/implementation/BACKEND_E2E.md).
- [Preview de interface e carregamento](docs/implementation/INTERFACE_PREVIEW_AND_LOADING.md).
- [Crescimento, engajamento e extensões](docs/implementation/PLATFORM_GROWTH_ENGAGEMENT_SUITE.md).

## Jornadas

- [Lifecycle de jornadas](docs/journeys/JOURNEY_LIFECYCLE.md).
- [Especificação da Jornada OpenAI](docs/journeys/OPENAI_JOURNEY_SPEC.md).
- [Progressão da Jornada OpenAI](docs/journeys/OPENAI_PROGRESSION_RULES.md).
- [Avaliações e práticas da Jornada OpenAI](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md).
- [Gamificação e credenciais da Jornada OpenAI](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md).
- [Modelo de competências da Jornada OpenAI](docs/journeys/OPENAI_COMPETENCY_MODEL.md).
- [Requisitos de eventos da Jornada OpenAI](docs/journeys/OPENAI_EVENT_REQUIREMENTS.md).

## Domínio e decisões

- [Modelo de domínio](docs/domain/DOMAIN_MODEL.md).
- [Contextos delimitados](docs/domain/BOUNDED_CONTEXTS.md).
- [Extensibilidade](docs/domain/EXTENSIBILITY_MODEL.md).
- [Permissões](docs/domain/PERMISSION_MODEL.md).
- [Lifecycles e máquinas de estado](docs/domain/LIFECYCLES_AND_STATE_MACHINES.md).
- [Decisões ativas](docs/decisions/DECISION_LOG.md).
- [Riscos da plataforma](docs/decisions/RISK_REGISTER.md).

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

## Arquitetura e ambientes

- [Fronteira da arquitetura AWS](docs/architecture/AWS_ARCHITECTURE_STATUS.md).
- [Estratégia de ambientes e cloud](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md).
- [Ports e adapters de providers](docs/architecture/PROVIDER_PORTS_AND_ADAPTERS.md).
- [Migrations executáveis](docs/architecture/EXECUTABLE_MIGRATIONS.md).
- [Outbox transacional](docs/architecture/TRANSACTIONAL_OUTBOX.md).
- [Processamento assíncrono](docs/architecture/QUEUE_ARCHITECTURE.md).
- [Reconciliação e recuperação](docs/architecture/RECONCILIATION_AND_RECOVERY.md).
- [Storage](docs/architecture/STORAGE_ARCHITECTURE.md).
- [Observabilidade e alertas](docs/architecture/OBSERVABILITY_AND_ALERTS.md).
- [Implementação de RLS](docs/architecture/RLS_IMPLEMENTATION.md).

## Fluxos, eventos e linhagem

- [Arquitetura de fluxos](docs/dataflows/DATA_FLOW_ARCHITECTURE.md).
- [Catálogo de famílias de fluxo](docs/dataflows/FLOW_FAMILY_CATALOG.md).
- [Linhagem de dados](docs/dataflows/DATA_LINEAGE_MATRIX.md).
- [Falhas, replay e reconciliação](docs/dataflows/FAILURE_RECOVERY_RECONCILIATION.md).
- [Matriz de roteamento de eventos](docs/dataflows/event-routing-matrix-v0.1.csv).
- [Arquitetura de eventos](docs/events/EVENT_ARCHITECTURE.md).
- [Catálogo de eventos](docs/events/EVENT_CATALOG_V0_1.md).
- [Envelope canônico](docs/events/CANONICAL_EVENT_ENVELOPE.md).
- [Qualidade da evidência](docs/events/EVENT_EVIDENCE_QUALITY.md).
- [Idempotência e ordenação](docs/events/EVENT_IDEMPOTENCY_AND_ORDERING.md).
- [Naming e versionamento](docs/events/EVENT_NAMING_AND_VERSIONING.md).
- [Privacidade, segurança e retenção](docs/events/EVENT_PRIVACY_SECURITY_RETENTION.md).
- [Registro de schemas](docs/events/EVENT_SCHEMA_REGISTRY.md).

## Integrações

- [Fronteira externa de crédito](docs/integrations/CREDIT_EXTERNAL_BOUNDARY.md).

Integrações externas do LMS consomem eventos/outbox e não fazem parte da transação síncrona do domínio.

## Pesquisa e diagnóstico

- [Finalidade e guardrails do diagnóstico](docs/research/DIAGNOSTIC_PURPOSE_AND_GUARDRAILS.md).
- [Modelo de dimensões](docs/research/DIAGNOSTIC_DIMENSION_MODEL.md).
- [Banco de itens](docs/research/DIAGNOSTIC_ITEM_BANK_V0_1.md).
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

## Operação e deploy

- [Matriz de acesso](docs/operations/ACCESS_MATRIX.md).
- [Domínio e autenticação](docs/operations/DOMAIN_AND_AUTH_CONFIGURATION.md).
- [Baseline de qualidade](docs/operations/PRODUCTION_QUALITY_BASELINE.md).
- [Runbook de releases](docs/operations/RELEASE_RUNBOOK.md).
- [Orientação para advisors do banco](docs/operations/DATABASE_ADVISOR_GUIDANCE.md).
- [Captura visual](docs/VISUAL_CAPTURE.md).
- [Operação Supabase/Vercel](docs/deployments/SUPABASE_VERCEL_OPERATIONS.md).