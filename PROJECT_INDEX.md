# Plataforma Estímulo — índice canônico

Este índice aponta para documentação permanente. Resultados transitórios de CI, SHAs e métricas ficam nos workflows/artefatos do candidato.

## Entrada

- [README](README.md) — execução e arquitetura resumida.
- [Guia de contribuição](CONTRIBUTING.md) — fluxo de mudanças.
- [Política de manutenção](docs/REPOSITORY_MAINTENANCE.md).

## Estado atual da implementação

- [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)
- [Contratos atuais das correções prioritárias](docs/implementation/CURRENT_PLATFORM_BEHAVIOR.md)
- [Ciclo de vida da jornada](docs/journeys/JOURNEY_LIFECYCLE.md)
- [Motor configurável do diagnóstico](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Contratos públicos de RPC](docs/implementation/PUBLIC_RPC_CONTRACTS.md)
- [Contenção de helpers opacos](docs/implementation/OPAQUE_HELPER_CONTAINMENT.md)
- [Backend E2E reproduzível](docs/implementation/BACKEND_E2E.md)
- [Preview de interface e loading](docs/implementation/INTERFACE_PREVIEW_AND_LOADING.md)
- [Suíte de crescimento/engajamento](docs/implementation/PLATFORM_GROWTH_ENGAGEMENT_SUITE.md)
- [Bloqueadores da entrega](docs/implementation/DELIVERY_BLOCKERS.md)

## Produto e jornadas

- [Escopo de jornadas](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Princípios da release inicial](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Glossário](docs/product/GLOSSARY.md)
- [Especificação da Jornada OpenAI](docs/journeys/OPENAI_JOURNEY_SPEC.md)
- [Inventário inicial da OpenAI — histórico](docs/product/OPENAI_JOURNEY_INVENTORY.md)
- [Progressão proposta](docs/journeys/OPENAI_PROGRESSION_RULES.md)
- [Avaliações e práticas propostas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md)
- [Gamificação/credenciais propostas](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md)

## Diagnóstico e pesquisa

- [Finalidade e guardrails](docs/research/DIAGNOSTIC_PURPOSE_AND_GUARDRAILS.md)
- [Modelo de dimensões](docs/research/DIAGNOSTIC_DIMENSION_MODEL.md)
- [Banco de itens](docs/research/DIAGNOSTIC_ITEM_BANK_V0_1.md)
- [Protocolo de pesquisa](docs/research/ENTREPRENEUR_RESEARCH_PROTOCOL.md)

## Domínio e decisões

- [Modelo de domínio](docs/domain/DOMAIN_MODEL.md)
- [Contextos delimitados](docs/domain/BOUNDED_CONTEXTS.md)
- [Extensibilidade](docs/domain/EXTENSIBILITY_MODEL.md)
- [Permissões](docs/domain/PERMISSION_MODEL.md)
- [Decisões ativas](docs/decisions/DECISION_LOG.md)
- [ADR-002 com refinamentos posteriores](docs/decisions/ADR-002-REBASELINE-NEW-PREMISES.md)
- [Riscos](docs/decisions/RISK_REGISTER.md)

## Dados e arquitetura

- [Modelo do banco](docs/data/database/DATABASE_MODEL.md)
- [ERD](docs/data/database/DATABASE_ERD.md)
- [Dicionário de dados](docs/data/database/DATA_DICTIONARY.md)
- [Constraints e integridade](docs/data/database/DATABASE_CONSTRAINTS_AND_INTEGRITY.md)
- [Estratégia de migrations](docs/data/database/DATABASE_MIGRATION_STRATEGY.md)
- [RLS e segurança](docs/data/database/DATABASE_RLS_AND_SECURITY.md)
- [Outbox transacional](docs/architecture/TRANSACTIONAL_OUTBOX.md)
- [RLS](docs/architecture/RLS_IMPLEMENTATION.md)
- [Estado AWS](docs/architecture/AWS_ARCHITECTURE_STATUS.md)
- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)

## Eventos e fluxos

- [Arquitetura de dados](docs/dataflows/DATA_FLOW_ARCHITECTURE.md)
- [Catálogo de fluxos](docs/dataflows/FLOW_FAMILY_CATALOG.md)
- [Linhagem](docs/dataflows/DATA_LINEAGE_MATRIX.md)
- [Arquitetura de eventos](docs/events/EVENT_ARCHITECTURE.md)
- [Catálogo de eventos](docs/events/EVENT_CATALOG_V0_1.md)

## Operação, deploy e segurança

- [Matriz de acesso](docs/operations/ACCESS_MATRIX.md)
- [Domínio e autenticação](docs/operations/DOMAIN_AND_AUTH_CONFIGURATION.md)
- [Baseline de qualidade](docs/operations/PRODUCTION_QUALITY_BASELINE.md)
- [Runbook final](docs/operations/FINAL_RELEASE_RUNBOOK.md)
- [Captura visual](docs/VISUAL_CAPTURE.md)
- [Handoff Supabase/Vercel](docs/deployments/SUPABASE_VERCEL_HANDOFF.md)
- [Segurança e privacidade](docs/security/SECURITY_PRIVACY_ARCHITECTURE.md)
- [Gate de prontidão](docs/security/PRODUCTION_READINESS_GATE.md)

## Regra de leitura

1. migrations definem o banco físico;
2. documentos de implementação descrevem o runtime vigente;
3. decisões ativas superam decisões/documentos conceituais antigos;
4. specs/propostas de produto não provam implementação;
5. arquivos marcados como históricos não devem ser usados como lista de blockers atuais;
6. evidência de CI/deploy pertence ao SHA correspondente;
7. Supabase/Vercel não substituem a decisão institucional de produção AWS.