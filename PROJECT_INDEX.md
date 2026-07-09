# Plataforma Estímulo — índice atual

**Versão:** 2.2  
**Data:** 2026-07-09  
**Status:** E14 em execução; produção bloqueada

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
- contribuição: [CONTRIBUTING.md](CONTRIBUTING.md).

O Supabase não será promovido a produção. Toda release deve passar pelo AWS staging.

## 3. Premissas atuais

- desenvolvimento integralmente interno;
- plataforma multi-jornada;
- monólito modular com contextos delimitados;
- formulário configurável e versionado;
- exatamente quatro arquétipos ativos na operação inicial, definidos como dados;
- recálculo e override auditáveis, com histórico append-only;
- captura governada de ações relevantes;
- PostgreSQL como fonte transacional e histórica;
- HubSpot como centro da visão operacional integrada;
- conteúdo próprio e de terceiros por modelo unificado e adapters;
- Supabase somente para desenvolvimento/teste;
- AWS para staging e produção;
- código, migrations, contratos, testes e documentação entregues juntos.

Detalhes: [PREMISES_AND_SCOPE.md](docs/product/PREMISES_AND_SCOPE.md).

## 4. Runtime atual

O repositório contém:

- aplicação Next.js em `apps/web`;
- seis rotas iniciais para participante e operação;
- bridge de identidade e camada de RPCs no servidor;
- migrations M00–M12 canônicas;
- migrations locais M14/M14b ainda pendentes de reconciliação com os identificadores remotos;
- ferramentas read-only para recuperar o histórico M13/M14;
- duas Edge Functions ativas apenas no Supabase de teste: `file-storage` e `file-scan-worker`.

A aplicação atual está documentada em [E14_STEP5_APP_FOUNDATION.md](docs/implementation/E14_STEP5_APP_FOUNDATION.md).

## 5. Bloqueadores ativos

Fonte única: [E14_BLOCKER_REGISTER.md](docs/implementation/E14_BLOCKER_REGISTER.md).

O principal bloqueio é recuperar e validar as 165 migrations M13 aplicadas remotamente. Nenhuma nova migration funcional está autorizada antes dos gates:

```text
remote_versions_missing_locally = 0
local_versions_not_expected_remotely = 0
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
```

## 6. Documentação canônica

### Produto

- [Princípios da release inicial](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Escopo multi-jornada](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
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
- [Registro de schemas](docs/events/EVENT_SCHEMA_REGISTRY.md)
- [Idempotência e ordenação](docs/events/EVENT_IDEMPOTENCY_AND_ORDERING.md)
- [Privacidade e retenção](docs/events/EVENT_PRIVACY_SECURITY_RETENTION.md)
- [Arquitetura de fluxos](docs/dataflows/DATA_FLOW_ARCHITECTURE.md)
- [Linhagem](docs/dataflows/DATA_LINEAGE_MATRIX.md)
- [Falhas e reconciliação](docs/dataflows/FAILURE_RECOVERY_RECONCILIATION.md)

### Banco

- [Modelo do banco](docs/data/database/DATABASE_MODEL.md)
- [ERD](docs/data/database/DATABASE_ERD.md)
- [Dicionário](docs/data/database/DATA_DICTIONARY.md)
- [Constraints](docs/data/database/DATABASE_CONSTRAINTS_AND_INTEGRITY.md)
- [Índices e particionamento](docs/data/database/DATABASE_INDEXING_PARTITIONING.md)
- [RLS](docs/data/database/DATABASE_RLS_AND_SECURITY.md)
- [Estratégia de migrations](docs/data/database/DATABASE_MIGRATION_STRATEGY.md)
- [Migrations M00–M12](docs/architecture/E12_EXECUTABLE_MIGRATIONS.md)
- [Manifest canônico](supabase/canonical-migrations/MIGRATION_MANIFEST.json)

### E14

- [Rebaseline](docs/decisions/ADR-002-E14-REBASELINE-NEW-PREMISES.md)
- [Decisões](docs/decisions/DECISION_LOG.md)
- [Plano](docs/implementation/E14_REBASELINE_EXECUTION_PLAN.md)
- [Rastreabilidade](docs/implementation/E14_PREMISE_TRACEABILITY_MATRIX.md)
- [Bloqueadores](docs/implementation/E14_BLOCKER_REGISTER.md)
- [Delta de schema](docs/implementation/SCHEMA_DELTA_E14.md)
- [Lacuna do runtime](docs/implementation/RUNTIME_GAP_E14.md)

### Integrações e ambientes

- [HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Portas e adapters](docs/architecture/PROVIDER_PORTS_AND_ADAPTERS.md)
- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Portabilidade Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Arquitetura AWS](docs/architecture/AWS_PRODUCTION_REFERENCE_ARCHITECTURE.md)
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

1. publicar o workflow auditado de recuperação;
2. exportar M13/M14 em modo read-only;
3. materializar as versões remotas exatas no Git;
4. executar replay em PostgreSQL limpo;
5. comparar schema, RLS, índices, triggers, funções e RPCs;
6. concluir o delta de schema;
7. implementar formulário e quatro arquétipos;
8. integrar conteúdo externo e HubSpot;
9. executar E2E completo no Supabase de teste;
10. provisionar e validar AWS staging;
11. somente então avaliar produção.

## 8. Regra de conclusão

```text
code_matches_documentation = true
migrations_are_replayable = true
tests_pass = true
runtime_evidence_is_reproducible = true
security_and_data_gates_pass = true
```

Outputs locais, relatórios gerados, provas antigas e componentes sem consumidor não permanecem na árvore ativa.
