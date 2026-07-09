# Plataforma Estímulo — Índice atual do projeto

**Versão:** 2.1  
**Data:** 2026-07-09  
**Status:** E14 rebaselineado; produção bloqueada pelos gates técnicos e institucionais

## 1. Hierarquia de referência

Quando houver conflito, aplicar esta ordem:

1. `Estimulo_all` e decisões explícitas posteriores fornecidas pela Estímulo;
2. ADRs e decisões atuais aprovadas;
3. estado real do repositório oficial e dos ambientes autorizados;
4. documentação técnica atual;
5. código, schemas, mockups e documentos históricos conflitantes.

Documentos históricos continuam disponíveis como evidência de evolução, mas não podem sobrescrever premissas atuais.

## 2. Recursos oficiais

- **Repositório:** `pablo-marchina/LMS-estimulo`
- **Branch principal:** `main`
- **Supabase de desenvolvimento/teste:** `cfpfeavjlgheqqiaqtzv`
- **Staging e produção oficiais:** AWS
- **Padrões de contribuição:** [CONTRIBUTING.md](CONTRIBUTING.md)

O Supabase não será promovido nem descrito como ambiente produtivo. Toda release deverá passar pelo AWS staging antes da produção oficial.

## 3. Premissas oficiais atuais

- desenvolvimento integralmente interno;
- plataforma multi-jornada desde a primeira release;
- Jornada OpenAI/IA como primeiro conteúdo, sem acoplamento estrutural;
- monólito modular com contextos delimitados;
- formulário de diagnóstico configurável e versionado;
- exatamente quatro arquétipos ativos na operação inicial, definidos como dados e não hardcoded;
- atribuições recalculáveis e overrides auditáveis, com histórico append-only;
- captura governada de todas as ações relevantes disponíveis ao usuário;
- eventos observados separados de features, inferências e scores;
- HubSpot como centro da visão integrada e operacional do usuário;
- PostgreSQL como fonte transacional e histórica;
- event store como fonte dos fatos comportamentais detalhados;
- conteúdo próprio e de terceiros por modelo unificado e adapters;
- Supabase somente para desenvolvimento/teste;
- AWS para staging/produção;
- código, migrations, testes, contratos e documentação entregues juntos;
- nenhuma capacidade declarada concluída sem evidência executável.

A especificação detalhada está em [PREMISES_AND_SCOPE.md](docs/product/PREMISES_AND_SCOPE.md).

## 4. Workstream atual — E14

### Decisões e planejamento

- [ADR-002 — rebaseline pelas premissas atuais](docs/decisions/ADR-002-E14-REBASELINE-NEW-PREMISES.md)
- [Decision Log](docs/decisions/DECISION_LOG.md)
- [Plano de execução E14 rebaselineado](docs/implementation/E14_REBASELINE_EXECUTION_PLAN.md)
- [Matriz de rastreabilidade](docs/implementation/E14_PREMISE_TRACEABILITY_MATRIX.md)
- [Registro de bloqueadores](docs/implementation/E14_BLOCKER_REGISTER.md)

### Auditoria de runtime e schema

- [Delta de schema E14](docs/implementation/SCHEMA_DELTA_E14.md)
- [Lacuna de fonte de verdade do runtime](docs/implementation/RUNTIME_GAP_E14.md)

### Estado técnico observado

O repositório contém:

- aplicação Next.js em `apps/web`;
- seis rotas iniciais;
- bridge de identidade e camada de aplicação no servidor;
- RPCs públicos da vertical E14;
- migrations M14/M14b locais;
- eventos, outbox, idempotência, concorrência e gamificação comprovados no Supabase de teste.

O workstream ainda não está concluído. O bloqueio técnico prioritário é recuperar no Git o runtime M13 aplicado remotamente e provar replay limpo e equivalência.

## 5. Bloqueadores prioritários

### P0 — fonte de verdade do runtime

O Supabase de teste possui 165 versões M13 aplicadas que não estão integralmente versionadas no Git. Os identificadores M14/M14b locais também divergem dos registrados remotamente.

Rastreamento: **issue #38 — `refactor(database): restore E14 runtime source of truth`**.

Nenhuma nova migration funcional está autorizada até:

```text
remote_versions_missing_locally = 0
local_versions_not_expected_remotely = 0
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
```

### P0 — manutenibilidade dos helpers E14

O runtime remoto contém helpers privados com nomes opacos. Os RPCs públicos devem permanecer estáveis, mas helpers internos serão substituídos incrementalmente por funções com nomes semânticos e ownership explícito.

### P1 — instalação determinística

O workspace ainda não possui lockfile canônico e o CI usa instalação não congelada.

Rastreamento: **issue #39 — `build(web): establish deterministic npm lockfile`**.

### P1 — E2E e entradas de produto

Ainda faltam:

- E2E completo pelo navegador com contas técnicas;
- validação de acessibilidade;
- formulário oficial;
- nomes, significados e regras dos quatro arquétipos;
- primeiro conteúdo externo autorizado;
- inventário e sandbox HubSpot.

## 6. Documentação canônica por área

### Produto

- [Princípios da release inicial](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Escopo multi-jornada](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [Inventário da Jornada OpenAI](docs/product/OPENAI_JOURNEY_INVENTORY.md)
- [Inventário de informações](docs/product/INFORMATION_INVENTORY.md)

### Domínio

- [Modelo de domínio](docs/domain/DOMAIN_MODEL.md)
- [Contextos delimitados](docs/domain/BOUNDED_CONTEXTS.md)
- [Ciclos de vida](docs/domain/LIFECYCLES_AND_STATE_MACHINES.md)
- [Permissões](docs/domain/PERMISSION_MODEL.md)
- [Extensibilidade](docs/domain/EXTENSIBILITY_MODEL.md)

### Jornada OpenAI

- [Especificação integral](docs/journeys/OPENAI_JOURNEY_SPEC.md)
- [Modelo de competências](docs/journeys/OPENAI_COMPETENCY_MODEL.md)
- [Regras de progressão](docs/journeys/OPENAI_PROGRESSION_RULES.md)
- [Avaliações e práticas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md)
- [Gamificação e credenciais](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md)
- [Versionamento editorial](docs/journeys/OPENAI_EDITORIAL_VERSIONING.md)
- [Requisitos de eventos](docs/journeys/OPENAI_EVENT_REQUIREMENTS.md)

### Diagnóstico e arquétipos

- [Finalidade e guardrails](docs/research/DIAGNOSTIC_PURPOSE_AND_GUARDRAILS.md)
- [Modelo inicial de dimensões](docs/research/DIAGNOSTIC_DIMENSION_MODEL.md)
- [Banco inicial de itens](docs/research/DIAGNOSTIC_ITEM_BANK_V0_1.md)
- [Plano histórico de descoberta dos arquétipos](docs/research/ARCHETYPE_DISCOVERY_AND_VALIDATION_PLAN.md)

Os documentos de pesquisa que desativavam os quatro arquétipos estão superados nesse ponto pelas decisões atuais. Continuam úteis para governança, validação e prevenção de uso indevido em crédito.

### Eventos e fluxos

- [Arquitetura de eventos](docs/events/EVENT_ARCHITECTURE.md)
- [Envelope canônico](docs/events/CANONICAL_EVENT_ENVELOPE.md)
- [Nomenclatura e versionamento](docs/events/EVENT_NAMING_AND_VERSIONING.md)
- [Catálogo de eventos](docs/events/EVENT_CATALOG_V0_1.md)
- [Privacidade e retenção](docs/events/EVENT_PRIVACY_SECURITY_RETENTION.md)
- [Arquitetura de fluxos](docs/dataflows/DATA_FLOW_ARCHITECTURE.md)
- [Linhagem de dados](docs/dataflows/DATA_LINEAGE_MATRIX.md)
- [Falhas, replay e reconciliação](docs/dataflows/FAILURE_RECOVERY_RECONCILIATION.md)

### Banco e migrations

- [Modelo completo](docs/data/database/DATABASE_MODEL.md)
- [ERD](docs/data/database/DATABASE_ERD.md)
- [Dicionário de dados](docs/data/database/DATA_DICTIONARY.md)
- [Constraints e integridade](docs/data/database/DATABASE_CONSTRAINTS_AND_INTEGRITY.md)
- [RLS e segurança](docs/data/database/DATABASE_RLS_AND_SECURITY.md)
- [Estratégia de migrations](docs/data/database/DATABASE_MIGRATION_STRATEGY.md)
- [Migrations executáveis E12](docs/architecture/E12_EXECUTABLE_MIGRATIONS.md)
- [Manifest de migrations](supabase/migrations/MIGRATION_MANIFEST.json)

### Integrações e HubSpot

- [Fluxo lógico HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Arquitetura de fluxos](docs/dataflows/DATA_FLOW_ARCHITECTURE.md)
- [Falhas e reconciliação](docs/dataflows/FAILURE_RECOVERY_RECONCILIATION.md)

A política atual de User 360 e decisão explícita de projeção por dado prevalece sobre interpretações históricas que limitavam o CRM a poucos agregados sem classificação individual.

### Ambientes e AWS

- [Estratégia de ambientes e nuvem](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Portabilidade Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Arquitetura de produção AWS](docs/architecture/AWS_PRODUCTION_REFERENCE_ARCHITECTURE.md)
- [ADR-001 — Supabase test / AWS production](docs/decisions/ADR-001-SUPABASE-TEST-AWS-PRODUCTION.md)
- [Portas e adapters](docs/architecture/PROVIDER_PORTS_AND_ADAPTERS.md)

### Segurança, privacidade e operação

- [Arquitetura de segurança e privacidade](docs/security/E13_SECURITY_PRIVACY_ARCHITECTURE.md)
- [Classificação de dados](docs/security/DATA_CLASSIFICATION_AND_HANDLING.md)
- [Registro de tratamentos](docs/security/RECORD_OF_PROCESSING_ACTIVITIES.md)
- [Bases legais e consentimento](docs/security/LEGAL_BASIS_AND_CONSENT_GOVERNANCE.md)
- [Retenção e eliminação](docs/security/RETENTION_DELETION_LEGAL_HOLD.md)
- [Logging e auditoria](docs/security/LOGGING_REDACTION_AUDIT.md)
- [Segredos e criptografia](docs/security/SECRETS_ENCRYPTION_KEY_MANAGEMENT.md)
- [Backup e disaster recovery](docs/security/BACKUP_RESTORE_DISASTER_RECOVERY.md)
- [Gate de produção](docs/security/PRODUCTION_READINESS_GATE.md)

## 7. Sequência atual obrigatória

1. incorporar o rebaseline E14 na `main`;
2. recuperar as 165 migrations M13 e os identificadores M14 exatos no Git;
3. gerar manifest com hashes e executar replay em PostgreSQL limpo;
4. comparar schema, RLS, índices, triggers, funções e contratos públicos;
5. mapear todas as ações ativas de `apps/web` para eventos e governança;
6. concluir o delta final de schema;
7. implementar formulário e quatro arquétipos configuráveis;
8. implementar conteúdo externo por um provider adapter real;
9. implementar projeção e reconciliação HubSpot User 360;
10. executar E2E completo no Supabase de teste;
11. provisionar AWS staging por IaC;
12. repetir migrations, contratos, E2E, segurança, carga e restore na AWS;
13. somente então avaliar promoção para produção oficial.

## 8. Regra de conclusão

Uma etapa somente pode ser marcada como concluída quando:

```text
code_matches_documentation = true
migrations_are_replayable = true
tests_pass = true
runtime_evidence_exists = true
security_and_data_gates_pass = true
```

Documento isolado, mockup, migration manual ou prova exclusiva no Supabase não constitui release produtiva.