# Plataforma Estímulo — Índice da Fase Inicial

**Versão:** 2.0  
**Data:** 2026-07-08  
**Status:** baseline E13 concluída; produção bloqueada pelo gate

## Objetivo

Estruturar a fase inicial da plataforma interna SaaS/LMS multi-jornada da Estímulo antes de fixar produto, schema, arquitetura ou fluxos. A Jornada OpenAI será a primeira jornada com conteúdo implementado e publicado, mas a própria release inicial deverá permitir cadastrar, versionar, publicar e operar outras jornadas sem mudanças estruturais no núcleo.

## Premissas oficiais

- Desenvolvimento integralmente interno.
- Não haverá compra ou delegação de LMS/plataforma.
- O HubSpot é o único sistema existente diretamente relevante no início.
- Os sistemas futuros deverão possuir sandbox ou ambiente equivalente.
- O repositório `denilsontorres2024/plataforma-estimulo` é uma fundação técnica real, porém totalmente revisável.
- Mockups, schemas, fluxos e código existentes não são decisões de produto.
- O diagnóstico da release inicial de produção usará dimensões contínuas e segmentos operacionais; quatro arquétipos e score comportamental permanecem hipóteses posteriores a validar.
- A referência máxima são os documentos e contexto fornecidos pela Estímulo.
- A primeira entrega será uma release inicial de produção pronta para deploy e operação real.
- A plataforma será multi-jornada desde a primeira release; a Jornada OpenAI é o primeiro conteúdo implementado, não o limite funcional da plataforma.
- Supabase será utilizado em desenvolvimento/testes; AWS será utilizada em staging e produção, com portabilidade obrigatória por adapters e migrations PostgreSQL únicas.

## Documentos atuais

### Produto
- [Princípios da release inicial de produção](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Escopo multi-jornada do produto](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Inventário da Jornada OpenAI](docs/product/OPENAI_JOURNEY_INVENTORY.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [Glossário inicial](docs/product/GLOSSARY.md)
- [Inventário de informações](docs/product/INFORMATION_INVENTORY.md)
- [Solicitações de informação](docs/product/INFORMATION_REQUESTS.md)


### Domínio
- [Modelo de domínio](docs/domain/DOMAIN_MODEL.md)
- [Contextos delimitados](docs/domain/BOUNDED_CONTEXTS.md)
- [Ciclos de vida e máquinas de estado](docs/domain/LIFECYCLES_AND_STATE_MACHINES.md)
- [Modelo de permissões](docs/domain/PERMISSION_MODEL.md)
- [Modelo de extensibilidade](docs/domain/EXTENSIBILITY_MODEL.md)
- [Relatório de conclusão do E05](docs/domain/E05_COMPLETION_REPORT.md)


### Jornada OpenAI
- [Especificação integral](docs/journeys/OPENAI_JOURNEY_SPEC.md)
- [Modelo de competências](docs/journeys/OPENAI_COMPETENCY_MODEL.md)
- [Regras de progressão](docs/journeys/OPENAI_PROGRESSION_RULES.md)
- [Avaliações e práticas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md)
- [Gamificação e credenciais](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md)
- [Versionamento editorial](docs/journeys/OPENAI_EDITORIAL_VERSIONING.md)
- [Requisitos de eventos](docs/journeys/OPENAI_EVENT_REQUIREMENTS.md)
- [Lacunas editoriais](docs/journeys/OPENAI_CONTENT_GAPS.md)
- [Definição YAML v0.1](docs/journeys/openai-journey-v0.1.yaml)
- [Relatório de conclusão do E06](docs/journeys/E06_COMPLETION_REPORT.md)


### Diagnóstico, arquétipos e intervenções
- [Finalidade e guardrails do diagnóstico](docs/research/DIAGNOSTIC_PURPOSE_AND_GUARDRAILS.md)
- [Modelo inicial de dimensões](docs/research/DIAGNOSTIC_DIMENSION_MODEL.md)
- [Protocolo de pesquisa com empreendedores](docs/research/ENTREPRENEUR_RESEARCH_PROTOCOL.md)
- [Banco inicial de itens v0.1](docs/research/DIAGNOSTIC_ITEM_BANK_V0_1.md)
- [Plano de descoberta e validação dos arquétipos](docs/research/ARCHETYPE_DISCOVERY_AND_VALIDATION_PLAN.md)
- [Modelo de momentos de intervenção](docs/research/INTERVENTION_MOMENT_MODEL.md)
- [Schema de pesquisa v0.1](docs/research/diagnostic-research-schema-v0.1.yaml)
- [Template de evidências das entrevistas](docs/research/INTERVIEW_EVIDENCE_TEMPLATE.csv)
- [Relatório de conclusão operacional do E07](docs/research/E07_PROGRESS_REPORT.md)
- [Estratégia de personalização da release inicial de produção](docs/research/INITIAL_PRODUCTION_PERSONALIZATION_STRATEGY.md)
- [Especificação do diagnóstico da release inicial de produção v0.2](docs/research/DIAGNOSTIC_INITIAL_PRODUCTION_SPEC_V0_2.md)
- [Plano de coleta de evidências na coorte inicial de produção](docs/research/INITIAL_PRODUCTION_EVIDENCE_COLLECTION_PLAN.md)
- [Schema do diagnóstico da release inicial de produção v0.2](docs/research/diagnostic-production-v0.2.yaml)


### Eventos comportamentais
- [Arquitetura canônica](docs/events/EVENT_ARCHITECTURE.md)
- [Envelope canônico](docs/events/CANONICAL_EVENT_ENVELOPE.md)
- [Nomenclatura e versionamento](docs/events/EVENT_NAMING_AND_VERSIONING.md)
- [Catálogo v0.1](docs/events/EVENT_CATALOG_V0_1.md)
- [Catálogo máquina-legível](docs/events/event-catalog-v0.1.yaml)
- [Qualidade da evidência](docs/events/EVENT_EVIDENCE_QUALITY.md)
- [Idempotência e ordenação](docs/events/EVENT_IDEMPOTENCY_AND_ORDERING.md)
- [Privacidade, segurança e retenção](docs/events/EVENT_PRIVACY_SECURITY_RETENTION.md)
- [Registro de schemas](docs/events/EVENT_SCHEMA_REGISTRY.md)
- [Relatório de conclusão do E08](docs/events/E08_COMPLETION_REPORT.md)


### Fluxos de dados ponta a ponta
- [Arquitetura de fluxos](docs/dataflows/DATA_FLOW_ARCHITECTURE.md)
- [Catálogo de fluxos por família](docs/dataflows/FLOW_FAMILY_CATALOG.md)
- [Falhas, replay e reconciliação](docs/dataflows/FAILURE_RECOVERY_RECONCILIATION.md)
- [Matriz de linhagem](docs/dataflows/DATA_LINEAGE_MATRIX.md)
- [Matriz de roteamento CSV](docs/dataflows/event-routing-matrix-v0.1.csv)
- [Matriz de roteamento YAML](docs/dataflows/event-routing-matrix-v0.1.yaml)
- [Fluxo lógico HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Fronteira lógica de crédito](docs/integrations/CREDIT_EXTERNAL_BOUNDARY.md)
- [Relatório de conclusão do E09](docs/dataflows/E09_COMPLETION_REPORT.md)


### Modelo de dados e banco
- [Modelo completo do banco](docs/data/database/DATABASE_MODEL.md)
- [ERD lógico resumido](docs/data/database/DATABASE_ERD.md)
- [Dicionário de dados — baseline lógico v0.2 (122 tabelas)](docs/data/database/DATA_DICTIONARY.md)
- [Modelo máquina-legível YAML v0.2](docs/data/database/database-model-v0.2.yaml)
- [Baseline PostgreSQL v0.2](docs/data/database/database-target-v0.2.sql)
- [Constraints e integridade](docs/data/database/DATABASE_CONSTRAINTS_AND_INTEGRITY.md)
- [Ledger de gamificação](docs/data/database/GAMIFICATION_LEDGER_MODEL.md)
- [Modelo de features comportamentais](docs/data/database/BEHAVIORAL_FEATURE_MODEL.md)
- [Modelo de score experimental](docs/data/database/EXPERIMENTAL_SCORE_MODEL.md)
- [Índices e particionamento](docs/data/database/DATABASE_INDEXING_PARTITIONING.md)
- [RLS e segurança do banco](docs/data/database/DATABASE_RLS_AND_SECURITY.md)
- [Estratégia de migrations e transição](docs/data/database/DATABASE_MIGRATION_STRATEGY.md)
- [Relatório de validação estática](docs/data/database/DATABASE_VALIDATION_REPORT.md)
- [Relatório de conclusão do E10](docs/data/database/E10_COMPLETION_REPORT.md)


### E12 — migrations, identidade, RLS, outbox, storage, fila, worker e operação contínua
- [Migrations executáveis M00–M12](docs/architecture/E12_EXECUTABLE_MIGRATIONS.md)
- [Bridge de identidade Supabase/Cognito](docs/architecture/E12_IDENTITY_BRIDGE.md)
- [Implementação de RLS](docs/architecture/E12_RLS_IMPLEMENTATION.md)
- [Transactional outbox](docs/architecture/E12_TRANSACTIONAL_OUTBOX.md)
- [Baseline físico v0.2](docs/data/database/database-target-v0.2.sql)
- [Modelo de banco v0.2](docs/data/database/database-model-v0.2.yaml)
- [Manifest das migrations](supabase/migrations/MIGRATION_MANIFEST.json)
- [Handoff de execução do banco](docs/operations/E12_DATABASE_EXECUTION_HANDOFF.md)
- [Verificador de migrations](scripts/e12/verify-migration-set.py)
- [Adapter de identidade Supabase](scripts/e12/adapters/supabase-identity-provider.mjs)
- [Saída dos testes v1.5](docs/architecture/e12-v1.5-test-output.txt)
- [Validação estrutural v1.5](docs/architecture/e12-v1.5-structural-validation.json)
- [Execução real no Supabase](docs/architecture/E12_SUPABASE_DATABASE_EXECUTION_REPORT.md)
- [Resultados das validações de runtime](docs/architecture/E12_RUNTIME_VALIDATION_RESULTS.md)
- [Revisão do Performance Advisor](docs/architecture/E12_PERFORMANCE_ADVISOR_REVIEW.md)
- [Validação live v1.6](docs/architecture/e12-v1.6-live-validation.json)
- [Histórico remoto de migrations](docs/architecture/e12-remote-migration-history.json)
- [Tipos gerados do schema público](generated/supabase-public.types.ts)
- [Bootstrap de papéis do ambiente de teste](supabase/test-environment/bootstrap-runtime-roles.sql)
- [Migration M09 — lifecycle de arquivos](supabase/migrations/20260708001000_m09_storage_lifecycle.sql)
- [Arquitetura de armazenamento](docs/architecture/E12_STORAGE_ARCHITECTURE.md)
- [Validação de runtime do armazenamento](docs/architecture/E12_STORAGE_RUNTIME_VALIDATION.md)
- [Mapeamento para AWS](docs/architecture/E12_STORAGE_AWS_MAPPING.md)
- [Prova live do Storage](docs/architecture/e12-storage-live-proof.json)
- [Validação estrutural pós-M09](docs/architecture/e12-storage-structural-validation.json)
- [Edge Function autenticada](supabase/functions/file-storage/index.ts)
- [Adapter Supabase Storage](scripts/e12/adapters/supabase-storage-provider.mjs)
- [Teste regressivo SQL do lifecycle](supabase/tests/database/e12_storage_lifecycle_test.sql)
- [Handoff operacional do storage](docs/operations/E12_STORAGE_HANDOFF.md)
- [Migration M10 — fila e worker](supabase/migrations/20260708001100_m10_queue_worker.sql)
- [Arquitetura de fila](docs/architecture/E12_QUEUE_ARCHITECTURE.md)
- [Validação de runtime da fila e worker](docs/architecture/E12_QUEUE_RUNTIME_VALIDATION.md)
- [Mapeamento PGMQ para AWS SQS](docs/architecture/E12_QUEUE_AWS_SQS_MAPPING.md)
- [Validação live v1.8](docs/architecture/e12-queue-live-validation.json)
- [Saída dos testes v1.8](docs/architecture/e12-v1.8-test-output.txt)
- [Saída final dos testes v1.8](docs/architecture/e12-v1.8-final-test-output.txt)
- [Validação das migrations v1.8](docs/architecture/e12-v1.8-migration-validation.json)
- [Validação final das migrations v1.8](docs/architecture/e12-v1.8-final-migration-validation.json)
- [Validação de transpile das Edge Functions](docs/architecture/e12-v1.8-edge-function-transpile.json)
- [Histórico remoto de migrations v1.8](docs/architecture/e12-remote-migration-history-v1.8.json)
- [Edge Worker de scan](supabase/functions/file-scan-worker/index.ts)
- [Adapter Supabase Queue](scripts/e12/adapters/supabase-queue-provider.mjs)
- [Contrato HMAC do worker](scripts/e12/workers/internal-worker-auth.mjs)
- [Scanner técnico de prova](scripts/e12/workers/proof-file-scanner.mjs)
- [Handoff operacional da fila/worker](docs/operations/E12_QUEUE_WORKER_HANDOFF.md)
- [Migration M11 — scheduler e observabilidade](supabase/migrations/20260708001200_m11_scheduler_observability.sql)
- [Arquitetura do scheduler/dispatcher](docs/architecture/E12_SCHEDULER_DISPATCHER_ARCHITECTURE.md)
- [Reconciliação e autorrecuperação](docs/architecture/E12_RECONCILIATION_AND_RECOVERY.md)
- [Observabilidade e alertas](docs/architecture/E12_OBSERVABILITY_AND_ALERTS.md)
- [Validação concorrente de runtime](docs/architecture/E12_CONCURRENCY_RUNTIME_VALIDATION.md)
- [Mapeamento operacional para AWS](docs/architecture/E12_AWS_OPERATIONS_MAPPING.md)
- [Validação live do scheduler v1.9](docs/architecture/e12-scheduler-live-validation.json)
- [Handoff operacional do scheduler](docs/operations/E12_SCHEDULER_OPERATIONS_HANDOFF.md)

### E12 — provas técnicas e Supabase de teste
- [Relatório de progresso E12](docs/architecture/E12_PROGRESS_REPORT.md)
- [Resultado do smoke test Supabase](docs/architecture/E12_SUPABASE_API_SMOKE_RESULT.md)
- [Portas e adapters de provedor](docs/architecture/PROVIDER_PORTS_AND_ADAPTERS.md)
- [Saída dos testes de contrato](docs/architecture/e12-provider-contract-test-output.txt)
- [Relatório JSON do smoke test](docs/architecture/supabase-api-smoke-report.json)
- [Readiness do projeto Supabase](docs/architecture/SUPABASE_TEST_PROJECT_READINESS.md)
- [Plano de provas técnicas E12](docs/architecture/E12_TECHNICAL_PROOF_PLAN.md)
- [Handoff seguro para execução dos testes](docs/operations/SUPABASE_TEST_EXECUTION_HANDOFF.md)
- [Scripts de prova E12](scripts/e12/README.md)

### E13 — segurança, privacidade/LGPD e operação
- [Arquitetura de segurança e privacidade](docs/security/E13_SECURITY_PRIVACY_ARCHITECTURE.md)
- [Classificação de dados](docs/security/DATA_CLASSIFICATION_AND_HANDLING.md)
- [Registro de operações de tratamento](docs/security/RECORD_OF_PROCESSING_ACTIVITIES.md)
- [Bases legais e consentimento](docs/security/LEGAL_BASIS_AND_CONSENT_GOVERNANCE.md)
- [Direitos dos titulares](docs/security/DATA_SUBJECT_RIGHTS_WORKFLOW.md)
- [Retenção, eliminação e legal hold](docs/security/RETENTION_DELETION_LEGAL_HOLD.md)
- [Resposta a incidentes](docs/security/SECURITY_INCIDENT_RESPONSE.md)
- [Logging, redaction e auditoria](docs/security/LOGGING_REDACTION_AUDIT.md)
- [Segredos, criptografia e chaves](docs/security/SECRETS_ENCRYPTION_KEY_MANAGEMENT.md)
- [Backup, restore e disaster recovery](docs/security/BACKUP_RESTORE_DISASTER_RECOVERY.md)
- [Fornecedores e transferências](docs/security/VENDOR_AND_INTERNATIONAL_TRANSFER_GOVERNANCE.md)
- [Gate de prontidão para produção](docs/security/PRODUCTION_READINESS_GATE.md)
- [Relatório de conclusão E13](docs/security/E13_COMPLETION_REPORT.md)
- [Validação live E13](docs/security/e13-live-validation.json)
- [Provas transacionais E13](docs/security/e13-transaction-tests.json)
- [Migration M12 canônica](supabase/migrations/20260708001300_m12_security_privacy_operations.sql)
- [Handoff operacional E13](docs/operations/E13_OPERATIONS_HANDOFF.md)
- [Histórico remoto v2.0](docs/architecture/e13-remote-migration-history-v2.0.json)

### Arquitetura de ambientes e nuvem
- [Estratégia de ambientes e nuvem](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Portabilidade Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Arquitetura de referência para produção na AWS](docs/architecture/AWS_PRODUCTION_REFERENCE_ARCHITECTURE.md)
- [ADR-001 — Supabase para testes e AWS para produção](docs/decisions/ADR-001-SUPABASE-TEST-AWS-PRODUCTION.md)

### Decisões e riscos
- [Decision Log](docs/decisions/DECISION_LOG.md)
- [Relatório de correção de escopo multi-jornada](docs/decisions/SCOPE_CORRECTION_REPORT.md)
- [Risk Register](docs/decisions/RISK_REGISTER.md)

### Operação
- [Relatório de integridade do pacote v2.0](docs/operations/PACKAGE_INTEGRITY_REPORT_V2_0.md)
- [Varredura de integridade v2.0](docs/operations/e13-v2.0-integrity-scan.json)
- [Relatório de integridade do pacote v1.9](docs/operations/PACKAGE_INTEGRITY_REPORT_V1_9.md)
- [Varredura de integridade v1.9](docs/operations/e12-v1.9-integrity-scan.json)
- [Relatório de integridade do pacote v1.8](docs/operations/PACKAGE_INTEGRITY_REPORT_V1_8.md)
- [Varredura de links e credenciais v1.8](docs/operations/e12-v1.8-integrity-scan.json)
- [Relatório de integridade do pacote v1.7](docs/operations/PACKAGE_INTEGRITY_REPORT_V1_7.md)
- [Relatório de integridade do pacote v1.6](docs/operations/PACKAGE_INTEGRITY_REPORT_V1_6.md)
- [Relatório de integridade do pacote v1.5](docs/operations/PACKAGE_INTEGRITY_REPORT_V1_5.md)
- [Matriz de acessos](docs/operations/ACCESS_MATRIX.md)
- [Status do backlog](docs/operations/BACKLOG_STATUS.md)

### Auditoria
- [Baseline do repositório](docs/architecture/REPOSITORY_BASELINE.md)
- [Auditoria técnica](docs/architecture/REPOSITORY_AUDIT.md)
- [Auditoria do schema](docs/architecture/SCHEMA_AUDIT.md)
- [Auditoria de mockups](docs/architecture/MOCKUP_AUDIT.md)

## Próxima sequência

1. Iniciar E14: transformar a fundação em backlog de release inicial, vertical slices, critérios de aceite e plano de deploy.
2. Obter as decisões institucionais do gate E13: controlador, encarregado, bases, retenção, aviso, fornecedores e governança de crédito.
3. Executar E2E com JWT real de participante e sem dados reais sensíveis.
4. Provisionar AWS staging por IaC e validar RDS, Cognito, S3, SQS, Lambda, KMS, Secrets Manager, backup e restore.
5. Substituir o scanner técnico por solução antimalware aprovada.
6. Concluir o inventário/mapeamento concreto do HubSpot e o fluxo real de crédito.
7. Resolver as lacunas editoriais P0 da Jornada OpenAI e executar uma segunda jornada sintética.
