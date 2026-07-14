# Plataforma Estímulo — índice atual

**Versão:** 4.3  
**Data:** 2026-07-14  
**Status:** fundação técnica reproduzível; diagnóstico reconciliado; implementação oficial em execução

## Hierarquia de referência

Em caso de conflito:

1. documentos oficiais de referência fornecidos pela Estímulo;
2. alterações posteriores explicitamente aprovadas pela Estímulo;
3. decisões atuais que interpretam as referências sem modificá-las;
4. estado real do repositório e dos ambientes autorizados;
5. documentação técnica e histórico Git.

ADRs, código e protótipos não podem redefinir silenciosamente o produto.

## Objetivo final

Entregar uma plataforma web LMS em produção na AWS que:

- publique a Jornada OpenAI;
- opere o diagnóstico e os quatro arquétipos oficiais;
- personalize a experiência;
- registre interações, progresso e pontos;
- ofereça comentários, uploads, provas, selos e certificados;
- integre site, identidade, HubSpot e contexto autorizado;
- suporte futuras jornadas sem mudança estrutural;
- aceite conteúdo autorizado de parceiros;
- ofereça resgate mínimo de recompensas.

## Ambientes e sistemas

- repositório: `pablo-marchina/LMS-estimulo`;
- branch principal: `main`;
- Supabase: desenvolvimento e teste;
- AWS: staging e produção;
- PostgreSQL: banco operacional, eventos e outbox;
- HubSpot: User 360 e projeções de relacionamento.

O Supabase não será promovido a produção.

## Runtime atual

O repositório já contém:

- aplicação Next.js com seis rotas iniciais;
- bridge de identidade e camada de aplicação de servidor;
- 245 migrations executáveis;
- replay limpo e equivalência estrutural;
- 18 contratos públicos de RPC;
- backend E2E com publicação, matrícula, diagnóstico, atividade, quick check, RLS, idempotência, concorrência, eventos, outbox e pontos;
- motor configurável de formulário, arquétipos, classificação e ativações;
- persistência transacional e outbox do resultado configurável;
- porta HubSpot e adapter em memória;
- lockfile e instalação reproduzível em Ubuntu e Windows;
- contenção do legado de RPCs e helpers.

Essa fundação não equivale ao produto final. A vertical atual ainda usa configuração sintética.

A baseline documental do diagnóstico registra 12 perguntas, 5 dimensões e 4 arquétipos. Texto final, alternativas, scoring, desempate e casos oficiais ainda não foram aprovados.

## Bloqueadores da entrega

Fonte: [DELIVERY_BLOCKERS.md](docs/implementation/DELIVERY_BLOCKERS.md).

```text
DIAGNOSTIC-OFFICIAL-CONFIGURATION = open
OPENAI-JOURNEY-PUBLICATION = open
FRONTEND-OFFICIAL-VERTICAL = open
LMS-MUST-HAVES = open
IDENTITY-SITE-INTEGRATION = open
HUBSPOT-PHYSICAL-INTEGRATION = open
BROWSER-ACCESSIBILITY = open
AWS-STAGING = open
PARTNER-CONTENT = open
REWARDS-REDEMPTION = open
AUTHORIZED-CREDIT-CONTEXT = open
```

O legado contido e a nomenclatura histórica são dívida técnica não bloqueante. Os adapters de storage/scan serão integrados no upload ou removidos dentro do próprio requisito, sem bloqueador separado.

## Documentação canônica

### Produto e conteúdo

- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [Princípios da release inicial](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Escopo multi-jornada](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Inventário da Jornada OpenAI](docs/product/OPENAI_JOURNEY_INVENTORY.md)
- [Especificação da Jornada OpenAI](docs/journeys/OPENAI_JOURNEY_SPEC.md)
- [Progressão](docs/journeys/OPENAI_PROGRESSION_RULES.md)
- [Avaliações e práticas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md)
- [Gamificação e credenciais](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md)
- [Lacunas editoriais](docs/journeys/OPENAI_CONTENT_GAPS.md)

### Diagnóstico

- [Finalidade e guardrails](docs/research/DIAGNOSTIC_PURPOSE_AND_GUARDRAILS.md)
- [Modelo de dimensões](docs/research/DIAGNOSTIC_DIMENSION_MODEL.md)
- [Banco de itens](docs/research/DIAGNOSTIC_ITEM_BANK_V0_1.md)
- [Solicitações de informação](docs/product/INFORMATION_REQUESTS.md)

### Implementação

- [Rastreabilidade de premissas](docs/implementation/PREMISE_TRACEABILITY_MATRIX.md)
- [Bloqueadores e plano vigente](docs/implementation/DELIVERY_BLOCKERS.md)
- [Delta de schema](docs/implementation/SCHEMA_DELTA.md)
- [Lacunas do runtime](docs/implementation/RUNTIME_GAP.md)
- [Backend E2E](docs/implementation/BACKEND_E2E.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)
- [Contenção do legado](docs/implementation/OPAQUE_HELPER_CONTAINMENT.md)

### Integrações e ambientes

- [ADR HubSpot](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md)
- [Fluxo lógico HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Contrato do adapter HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Inventário mínimo HubSpot](docs/integrations/HUBSPOT_INVENTORY_REQUEST.md)
- [Fronteira externa](docs/integrations/CREDIT_EXTERNAL_BOUNDARY.md)
- [Bridge de identidade](docs/architecture/IDENTITY_BRIDGE.md)
- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Portabilidade Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Arquitetura AWS](docs/architecture/AWS_PRODUCTION_REFERENCE_ARCHITECTURE.md)

### Dados, segurança e operação

Os documentos existentes de banco, eventos, segurança e operação permanecem como referência técnica. Novos documentos especializados só devem ser criados quando uma capacidade obrigatória exigir informação que não caiba nos artefatos atuais.

## Regra de execução

O trabalho não será interrompido enquanto artefatos externos estão pendentes. A execução vigente combina um caminho crítico e uma frente paralela:

```text
ENTRADAS EXTERNAS
IR-008 diagnóstico
+ IR-005 Jornada OpenAI
+ IR-009 site/identidade
+ IR-002 HubSpot

EM PARALELO
comentários por aula
+ uploads de prática
+ avaliações, selos e certificados
+ frontend participante e administração mínima

DEPOIS DAS ENTRADAS
configurações oficiais em draft
→ casos de referência
→ publicação em desenvolvimento/teste
→ vertical oficial E2E
→ identidade/site e HubSpot
→ browser/mobile/acessibilidade
→ AWS staging
→ produção controlada
→ conteúdo de parceiros, recompensas e contexto autorizado
→ aceite final
```

Fixtures técnicas podem validar capacidades genéricas, mas nunca serão apresentadas como conteúdo, scoring ou resultado oficial.

Refatorações cosméticas, generalizações futuras e substituição integral do legado não interrompem essa sequência.
