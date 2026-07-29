# Plataforma Estímulo — índice canônico

Este índice aponta para toda a documentação permanente do repositório. Requisitos aprovados, decisões vigentes, estado implementado e bloqueadores são mantidos diretamente nos documentos correspondentes; materiais de referência e processo de desenvolvimento ficam fora da árvore ativa.

## Entrada

- [README](README.md) — execução, estrutura e estado geral.
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

## Estado da implementação

- [Fundação atual da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Bloqueadores da entrega](docs/implementation/DELIVERY_BLOCKERS.md)
- [Contrato público de RPC v1](docs/implementation/public-rpc-contracts-v1.json)

## Arquitetura e ambientes

- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Baseline AWS](docs/architecture/AWS_TARGET_ARCHITECTURE.md)
- [Lacunas de portabilidade Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Identidade, acesso e vínculo externo](docs/architecture/IDENTITY_BRIDGE.md)

## Integrações

- [Contrato do adapter HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Fluxo lógico HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Solicitação de inventário HubSpot](docs/integrations/HUBSPOT_INVENTORY_REQUEST.md)

## Operação

- [Configuração atual de domínio e autenticação](docs/operations/DOMAIN_AND_AUTH_CONFIGURATION.md)
- [Terraform de staging](infra/aws/terraform/README.md)

## Regra de leitura

- especificações de produto descrevem requisitos aprovados ou propostas explicitamente identificadas;
- decisões registram escolhas vigentes;
- documentos de implementação descrevem somente o código versionado;
- bloqueadores descrevem o que ainda falta;
- Terraform, mocks, fixtures e testes estruturais não constituem prova de produção.