# Plataforma Estímulo — índice atual

**Versão:** 5.1  
**Data:** 2026-07-16  
**Status:** fontes reconciliadas; fundação técnica reproduzível; produto oficial incompleto

## Hierarquia vinculante

A resolução de conflitos segue [SOURCE_AUTHORITY_HIERARCHY.md](docs/product/SOURCE_AUTHORITY_HIERARCHY.md).

```text
1. premissas-desenvolvimento.md
2. demais documentos do pacote para domínios não técnicos
3. decisões posteriores explicitamente aprovadas
4. issues do GitHub
5. ADRs, documentação técnica, código e testes
```

A decisão mais recente de escopo do HubSpot está em [DEC-070](docs/decisions/DEC-070-HUBSPOT-SCOPE.md).

## Objetivo final

Entregar uma plataforma web LMS, desenvolvida internamente e em produção na AWS, que:

- publique a Jornada OpenAI;
- opere o diagnóstico e os quatro arquétipos oficiais;
- personalize a experiência por perfil e contexto autorizado;
- registre ações relevantes como eventos estruturados;
- ofereça trilhas, conteúdos, comentários, avaliações, uploads, pontos, conquistas, ranking, selos e certificados;
- possua interfaces completas de participante e administração;
- integre site, identidade e HubSpot;
- preserve manutenibilidade, documentação e evolução interna.

## Ambientes e sistemas

- Supabase: desenvolvimento e teste;
- AWS: staging e produção;
- PostgreSQL: banco operacional, event store, outbox e auditoria;
- HubSpot: identificadores mínimos de vínculo, engajamento e dados úteis para cálculos aprovados;
- GitHub issues: backlog funcional obrigatório.

O HubSpot não é o banco operacional nem o repositório integral do LMS.

## Escopo de sincronização HubSpot

```text
linking_identifier
engagement_signal
calculation_input_or_result
not_synced
```

São sincronizáveis:

- IDs mínimos para associação;
- acesso, frequência, progresso, participação, tentativas, conclusão, pontos e credenciais;
- dimensões, arquétipo, features e resultados úteis a cálculos aprovados.

Permanecem fora por padrão:

- estado transacional detalhado;
- configuração e conteúdo editorial;
- payloads brutos sem finalidade;
- arquivos binários e URLs assinadas;
- logs, filas, retries, tokens e segredos.

## Runtime atual

O repositório contém:

- aplicação Next.js com áreas de participante e operação;
- bridge de identidade e camada server-only;
- cadastro de teste bloqueado em produção;
- 265 migrations executáveis;
- replay limpo e equivalência estrutural;
- contratos públicos históricos de RPC;
- backend E2E sintético;
- motor configurável de formulários, arquétipos e ativações;
- comentários, uploads, avaliações e credenciais genéricos;
- biblioteca versionada;
- Browser E2E sintético;
- porta HubSpot e adapter em memória;
- instalação reproduzível em Ubuntu e Windows;
- contenção do legado.

Essa fundação não equivale ao produto final.

## Bloqueadores principais

Fonte: [DELIVERY_BLOCKERS.md](docs/implementation/DELIVERY_BLOCKERS.md).

```text
PRODUCT-CONFIGURATION = open
OPENAI-JOURNEY-CONTENT = open
IDENTITY-SITE-INTEGRATION = open
HUBSPOT-ENGAGEMENT-AND-CALCULATION-DATA = open
REAL-FULLSTACK-E2E = open
SECURITY-PRIVACY-REAL-USERS = open
PARTICIPANT-MUST-HAVES = open
ADMIN-MUST-HAVES = open
BROWSER-ACCESSIBILITY = open
AWS-STAGING = open
```

## Documentação canônica

### Autoridade e produto

- [Hierarquia das fontes](docs/product/SOURCE_AUTHORITY_HIERARCHY.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [Princípios da release inicial](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Escopo de jornadas](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Solicitações de informação](docs/product/INFORMATION_REQUESTS.md)

### Jornada OpenAI

- [Especificação](docs/journeys/OPENAI_JOURNEY_SPEC.md)
- [Progressão](docs/journeys/OPENAI_PROGRESSION_RULES.md)
- [Avaliações e práticas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md)
- [Gamificação e credenciais](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md)

### Diagnóstico

- [Propósito e guardrails](docs/research/DIAGNOSTIC_PURPOSE_AND_GUARDRAILS.md)
- [Modelo de dimensões](docs/research/DIAGNOSTIC_DIMENSION_MODEL.md)
- [Banco de itens](docs/research/DIAGNOSTIC_ITEM_BANK_V0_1.md)
- [Manifesto estrutural bloqueado](config/official-diagnostic/v3/manifest.json)

### Decisões e implementação

- [DEC-070 — Escopo HubSpot](docs/decisions/DEC-070-HUBSPOT-SCOPE.md)
- [Registro de decisões](docs/decisions/DECISION_LOG.md)
- [ADR HubSpot](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md)
- [Rastreabilidade](docs/implementation/PREMISE_TRACEABILITY_MATRIX.md)
- [Bloqueadores](docs/implementation/DELIVERY_BLOCKERS.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)

### Integrações e ambientes

- [Fluxo HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Contrato do adapter HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Inventário HubSpot](docs/integrations/HUBSPOT_INVENTORY_REQUEST.md)
- [Bridge de identidade](docs/architecture/IDENTITY_BRIDGE.md)
- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Portabilidade Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Arquitetura AWS](docs/architecture/AWS_PRODUCTION_REFERENCE_ARCHITECTURE.md)

## Regras de manutenção

- mudança de requisito identifica fonte e aprovação;
- lacuna não é preenchida por heurística silenciosa;
- estados declarados exigem evidência executável;
- novo dado ou evento recebe classificação HubSpot;
- código, issues, testes e documentação permanecem sincronizados.
