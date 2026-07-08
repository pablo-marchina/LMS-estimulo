# Plataforma Estímulo — Índice da Fase Inicial

**Versão:** 1.2  
**Data:** 2026-07-08  
**Status:** Em execução

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
- [Dicionário de dados — 121 tabelas](docs/data/database/DATA_DICTIONARY.md)
- [Modelo máquina-legível YAML](docs/data/database/database-model-v0.1.yaml)
- [DDL PostgreSQL preliminar](docs/data/database/database-target-v0.1.sql)
- [Constraints e integridade](docs/data/database/DATABASE_CONSTRAINTS_AND_INTEGRITY.md)
- [Ledger de gamificação](docs/data/database/GAMIFICATION_LEDGER_MODEL.md)
- [Modelo de features comportamentais](docs/data/database/BEHAVIORAL_FEATURE_MODEL.md)
- [Modelo de score experimental](docs/data/database/EXPERIMENTAL_SCORE_MODEL.md)
- [Índices e particionamento](docs/data/database/DATABASE_INDEXING_PARTITIONING.md)
- [RLS e segurança do banco](docs/data/database/DATABASE_RLS_AND_SECURITY.md)
- [Estratégia de migrations e transição](docs/data/database/DATABASE_MIGRATION_STRATEGY.md)
- [Relatório de validação estática](docs/data/database/DATABASE_VALIDATION_REPORT.md)
- [Relatório de conclusão do E10](docs/data/database/E10_COMPLETION_REPORT.md)


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
- [Matriz de acessos](docs/operations/ACCESS_MATRIX.md)
- [Status do backlog](docs/operations/BACKLOG_STATUS.md)

### Auditoria
- [Baseline do repositório](docs/architecture/REPOSITORY_BASELINE.md)
- [Auditoria técnica](docs/architecture/REPOSITORY_AUDIT.md)
- [Auditoria do schema](docs/architecture/SCHEMA_AUDIT.md)
- [Auditoria de mockups](docs/architecture/MOCKUP_AUDIT.md)

## Próxima sequência

1. Concluir o inventário e o contrato concreto de integração com HubSpot quando os dados do sandbox estiverem disponíveis (E11).
2. Executar o E12 com a direção aprovada: Supabase em local/test, AWS em staging/produção.
3. Validar as migrations tanto em Supabase quanto em Amazon RDS PostgreSQL e testar o adapter de identidade/RLS com Supabase Auth e Cognito.
4. Fechar os serviços físicos AWS, infraestrutura como código, filas, workers, storage, observabilidade e estratégia de deploy.
5. Definir segurança operacional, SLOs, retenção, backups e runbooks (E13).
6. Resolver as lacunas editoriais P0 da Jornada OpenAI antes da publicação.
7. Executar o teste obrigatório com uma segunda jornada sintética antes do gate de produção.
