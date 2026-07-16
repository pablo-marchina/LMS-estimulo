# Plataforma Estímulo — índice atual

**Versão:** 5.0  
**Data:** 2026-07-16  
**Status:** fontes reconciliadas; fundação técnica reproduzível; produto oficial incompleto

## Hierarquia vinculante

A fonte canônica de resolução de conflitos é [SOURCE_AUTHORITY_HIERARCHY.md](docs/product/SOURCE_AUTHORITY_HIERARCHY.md).

```text
1. premissas-desenvolvimento.md
2. demais documentos do pacote, exceto para escolhas técnicas
3. decisões posteriores explicitamente aprovadas
4. issues do GitHub
5. ADRs, documentação técnica, código e testes
```

Para questões técnicas, segurança, evidência dos ambientes, documentação oficial e melhores práticas definem o mecanismo. Nenhuma decisão técnica pode reduzir silenciosamente requisito superior.

## Objetivo final

Entregar uma plataforma web LMS, desenvolvida internamente e em produção na AWS, que:

- publique a Jornada OpenAI;
- opere o diagnóstico e os quatro arquétipos oficiais;
- personalize a experiência por perfil e contexto autorizado;
- registre todas as ações relevantes como eventos estruturados;
- ofereça trilhas, conteúdos, comentários, avaliações, uploads, pontos, conquistas, ranking, selos e certificados;
- possua interfaces completas de participante e administração;
- integre site, identidade, HubSpot e contexto autorizado de crédito;
- assegure que todos os dados do usuário capturados ou usados possuam representação no HubSpot;
- preserve manutenibilidade, documentação e evolução interna.

## Ambientes e sistemas

- repositório: `pablo-marchina/LMS-estimulo`;
- branch principal: `main`;
- Supabase: desenvolvimento e teste;
- AWS: staging e produção;
- PostgreSQL: banco operacional, eventos, outbox e auditoria técnica;
- HubSpot: centro das informações do usuário e destino obrigatório dos dados relacionados ao usuário;
- GitHub issues: backlog funcional obrigatório;
- pacote de referências: autoridade de produto e conteúdo conforme a hierarquia.

O Supabase não será promovido a produção.

## Runtime atual

O repositório contém:

- aplicação Next.js com áreas de participante, operação e validação pública de certificado;
- identidade visual da Estímulo aplicada ao login e ao shell autenticado;
- bridge de identidade e camada server-only;
- cadastro opcional para desenvolvimento/teste, bloqueado em produção;
- 265 migrations executáveis;
- replay limpo e equivalência estrutural;
- contratos públicos históricos de RPC;
- backend E2E sintético com publicação, matrícula, diagnóstico, atividade, avaliações, RLS, idempotência, concorrência, eventos, outbox e pontos;
- motor configurável de formulários, arquétipos, classificação e ativações;
- comentários com moderação e histórico;
- uploads privados com quarentena, estados de scan, consentimento e revisão;
- avaliação multiquestão com tentativas;
- emissão idempotente de selos e certificados;
- carteira de credenciais, código de validação e impressão pelo navegador;
- biblioteca versionada com artigos, links HTTPS, busca textual e filtros;
- Browser E2E sintético de interface;
- porta HubSpot e adapter em memória;
- instalação reproduzível em Ubuntu e Windows;
- contenção do legado de RPCs e helpers.

Essa fundação não equivale ao produto final. A vertical principal ainda usa configuração sintética, o E2E de navegador substitui backend e storage reais, a biblioteca não possui conteúdo oficial completo e o cadastro de teste não substitui identidade/site/HubSpot.

## Bloqueadores principais

Fonte: [DELIVERY_BLOCKERS.md](docs/implementation/DELIVERY_BLOCKERS.md).

```text
PRODUCT-CONFIGURATION = open
OPENAI-JOURNEY-CONTENT = open
IDENTITY-SITE-INTEGRATION = open
HUBSPOT-COMPLETE-USER-DATA = open
REAL-FULLSTACK-E2E = open
BROWSER-ACCESSIBILITY = open
SECURITY-PRIVACY-REAL-USERS = open
AWS-STAGING = open
```

O gate técnico genérico de comentários, uploads, avaliações e credenciais não encerra os requisitos oficiais de produto.

## Documentação canônica

### Autoridade, produto e escopo

- [Hierarquia das fontes](docs/product/SOURCE_AUTHORITY_HIERARCHY.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [Princípios da release inicial](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Escopo e extensibilidade de jornadas](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Inventário da Jornada OpenAI](docs/product/OPENAI_JOURNEY_INVENTORY.md)
- [Solicitações de informação](docs/product/INFORMATION_REQUESTS.md)

### Jornada OpenAI

- [Especificação](docs/journeys/OPENAI_JOURNEY_SPEC.md)
- [Progressão](docs/journeys/OPENAI_PROGRESSION_RULES.md)
- [Avaliações e práticas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md)
- [Gamificação e credenciais](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md)
- [Lacunas editoriais](docs/journeys/OPENAI_CONTENT_GAPS.md)

### Diagnóstico

- [Finalidade e guardrails](docs/research/DIAGNOSTIC_PURPOSE_AND_GUARDRAILS.md)
- [Modelo de dimensões](docs/research/DIAGNOSTIC_DIMENSION_MODEL.md)
- [Banco de itens](docs/research/DIAGNOSTIC_ITEM_BANK_V0_1.md)
- [Manifesto estrutural bloqueado](config/official-diagnostic/v3/manifest.json)

### Implementação

- [Rastreabilidade de premissas](docs/implementation/PREMISE_TRACEABILITY_MATRIX.md)
- [Bloqueadores](docs/implementation/DELIVERY_BLOCKERS.md)
- [Delta de schema](docs/implementation/SCHEMA_DELTA.md)
- [Lacunas do runtime](docs/implementation/RUNTIME_GAP.md)
- [Backend E2E](docs/implementation/BACKEND_E2E.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)
- [Contenção do legado](docs/implementation/OPAQUE_HELPER_CONTAINMENT.md)

### Decisões

- [Registro de decisões](docs/decisions/DECISION_LOG.md)
- [ADR HubSpot](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md)

### Integrações e ambientes

- [Fluxo HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Contrato do adapter HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Inventário mínimo HubSpot](docs/integrations/HUBSPOT_INVENTORY_REQUEST.md)
- [Fronteira externa de crédito](docs/integrations/CREDIT_EXTERNAL_BOUNDARY.md)
- [Bridge de identidade](docs/architecture/IDENTITY_BRIDGE.md)
- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Portabilidade Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Arquitetura AWS](docs/architecture/AWS_PRODUCTION_REFERENCE_ARCHITECTURE.md)

## Regras de manutenção documental

- mudanças de requisito devem identificar a fonte afetada;
- lacuna não pode ser preenchida por heurística silenciosa;
- decisão técnica conflitante deve virar bloqueador, não reinterpretação do produto;
- estados declarados devem ser sustentados por evidência executável;
- documentos de produto devem usar a hierarquia canônica;
- documentos técnicos devem explicitar quais requisitos implementam;
- issues, documentação, código e testes da mesma capacidade devem permanecer sincronizados.
