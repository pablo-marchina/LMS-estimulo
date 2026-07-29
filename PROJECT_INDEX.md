# Plataforma Estímulo — índice do projeto

Este arquivo é o mapa de navegação da documentação e da estrutura ativa. Requisitos do produto permanecem em [`premissas-desenvolvimento.md`](premissas-desenvolvimento.md); o estado de release permanece em [`DELIVERY_BLOCKERS.md`](docs/implementation/DELIVERY_BLOCKERS.md).

## Estrutura principal

```text
apps/web/                    aplicação Next.js
config/                      configuração versionada do produto
docs/                        documentação canônica
infra/aws/terraform/         infraestrutura AWS declarativa
scripts/                     validações, testes e operação
supabase/canonical-migrations/ baselines canônicas do histórico
supabase/functions/          adapters do ambiente Supabase
supabase/migrations/         migrations executáveis e imutáveis
```

## Produto

- [Requisitos ativos](premissas-desenvolvimento.md)
- [Hierarquia das fontes](docs/product/SOURCE_AUTHORITY_HIERARCHY.md)
- [Escopo multi-jornada](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Princípios da primeira release](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Solicitações de informação](docs/product/INFORMATION_REQUESTS.md)

## Jornada OpenAI

- [Especificação](docs/journeys/OPENAI_JOURNEY_SPEC.md)
- [Progressão](docs/journeys/OPENAI_PROGRESSION_RULES.md)
- [Avaliações e práticas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md)
- [Gamificação e credenciais](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md)

## Arquitetura

- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Arquitetura-alvo AWS](docs/architecture/AWS_TARGET_ARCHITECTURE.md)
- [Portabilidade Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Bridge de identidade](docs/architecture/IDENTITY_BRIDGE.md)
- [Baseline Terraform](infra/aws/terraform/README.md)

## Decisões e contratos

- [Registro de decisões](docs/decisions/DECISION_LOG.md)
- [Escopo HubSpot](docs/decisions/HUBSPOT_SCOPE_DECISION.md)
- [Contrato HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Contratos públicos de RPC](docs/implementation/public-rpc-contracts-v1.json)

## Implementação e release

- [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Bloqueadores de entrega](docs/implementation/DELIVERY_BLOCKERS.md)

## Operação

- [Configuração atual de domínio e autenticação](docs/operations/DOMAIN_AND_AUTH_CONFIGURATION.md)
- [Guia de contribuição](CONTRIBUTING.md)

## Regra de permanência

Somente código, configuração, contratos, infraestrutura, documentação canônica e testes reproduzíveis são versionados. Planos de agentes, relatórios de execução, estados locais, arquivos temporários, clones de ferramentas e gatilhos manuais ficam fora do Git.
