# Plataforma Estímulo — índice canônico

Este índice aponta para a documentação permanente. Requisitos, decisões, estado implementado e bloqueadores são mantidos diretamente nos documentos correspondentes.

## Entrada

- [README](README.md) — execução, estado e arquitetura resumida.
- [Guia de contribuição](CONTRIBUTING.md) — fluxo de mudanças e padrões.

## Produto

- [Escopo de jornadas](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Princípios da primeira release](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Solicitações de informação](docs/product/INFORMATION_REQUESTS.md)

## Jornada OpenAI

- [Especificação](docs/journeys/OPENAI_JOURNEY_SPEC.md)
- [Progressão proposta](docs/journeys/OPENAI_PROGRESSION_RULES.md)
- [Avaliações e práticas propostas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md)
- [Gamificação e credenciais propostas](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md)

## Decisões

- [Registro de decisões ativas](docs/decisions/DECISION_LOG.md)
- [DEC-070 — escopo HubSpot](docs/decisions/HUBSPOT_SCOPE_DECISION.md)
- [DEC-075 — produção integral na AWS](docs/decisions/AWS_PRODUCTION_ARCHITECTURE.md)

## Estado da implementação

- [Fundação atual da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Bloqueadores da entrega](docs/implementation/DELIVERY_BLOCKERS.md)
- [Contrato público de RPC v1](docs/implementation/public-rpc-contracts-v1.json)

## Arquitetura e ambientes

- [Arquitetura-alvo AWS](docs/architecture/AWS_TARGET_ARCHITECTURE.md)
- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Migração dos adapters Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Identidade, Cognito/OIDC e vínculo interno](docs/architecture/IDENTITY_BRIDGE.md)

## Integrações

- [Contrato do adapter HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Fluxo lógico HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Solicitação de inventário HubSpot](docs/integrations/HUBSPOT_INVENTORY_REQUEST.md)

## AWS e operação

- [Inventário necessário da AWS corporativa](infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md)
- [Runtime web em AWS Lambda](infra/aws/lambda/README.md)
- [Configuração de domínio e autenticação](docs/operations/DOMAIN_AND_AUTH_CONFIGURATION.md)
- [Baseline de qualidade para produção](docs/operations/PRODUCTION_QUALITY_BASELINE.md)

## Regra de leitura

- especificações de produto descrevem requisitos aprovados ou propostas identificadas;
- decisões registram escolhas vigentes;
- documentos de implementação descrevem somente o código versionado;
- bloqueadores descrevem o que ainda falta;
- Supabase é evidência de desenvolvimento/teste, não de produção;
- `Dockerfile.lambda`, mocks, fixtures e smoke tests não constituem prova de produção.
