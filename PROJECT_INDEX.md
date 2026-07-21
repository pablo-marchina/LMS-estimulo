# Plataforma Estímulo — índice do projeto

## Objetivo

Entregar uma plataforma LMS interna e operada pela Estímulo, publicada na AWS, com:

- Jornada OpenAI;
- diagnóstico e quatro arquétipos configuráveis;
- personalização por perfil;
- eventos estruturados;
- trilhas, conteúdos, comentários, avaliações, uploads e credenciais;
- pontos, conquistas, recompensas e ranking;
- interfaces completas de participante e administração;
- identidade, site e HubSpot integrados;
- segurança, acessibilidade e operação comprovadas.

Os requisitos ativos estão em [`premissas-desenvolvimento.md`](premissas-desenvolvimento.md). Materiais de análise de fontes externas e cobertura não fazem parte da documentação do repositório.

## Decisões vigentes

### HubSpot

```text
linking_identifier
engagement_signal
calculation_input_or_result
not_synced
```

O PostgreSQL é o banco operacional. Só candidatos das três primeiras classes podem ser sincronizados, sempre com destino e finalidade aprovados. Todo o restante permanece `not_synced`.

### Identidade

- participante: cadastro público e e-mail confirmado;
- CPF: obrigatório, validado, cifrado e deduplicado por HMAC;
- administração: e-mail confirmado no domínio exato `@estimulo.org` mais RBAC ativo;
- o domínio não concede permissões automaticamente.

### Ambientes

- Supabase: desenvolvimento e testes;
- AWS: staging e produção;
- GitHub: código, issues, revisão e release controlada.

## Estrutura principal

```text
apps/web/                       aplicação Next.js
apps/web/lib/auth/              autenticação e acesso
apps/web/lib/identity/          proteção de CPF e identificadores
apps/web/lib/hubspot/           política seletiva e adapter
apps/web/lib/journey-runtime/   jornadas e execução
apps/web/lib/configurable-product/ formulários e personalização
supabase/migrations/            banco executável
supabase/functions/             workers de desenvolvimento
docs/                           produto, decisões, arquitetura e operação
infra/aws/terraform/            baseline de staging
scripts/                        validação, replay e E2E
```

## Produto

- [Requisitos](premissas-desenvolvimento.md)
- [Escopo da primeira jornada](docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md)
- [Princípios da primeira release](docs/product/INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md)
- [Solicitações de informação](docs/product/INFORMATION_REQUESTS.md)

## Jornada OpenAI

- [Especificação](docs/journeys/OPENAI_JOURNEY_SPEC.md)
- [Progressão](docs/journeys/OPENAI_PROGRESSION_RULES.md)
- [Avaliações e práticas](docs/journeys/OPENAI_ASSESSMENT_AND_PRACTICE.md)
- [Gamificação e credenciais](docs/journeys/OPENAI_GAMIFICATION_CREDENTIALS.md)

## Decisões e implementação

- [Registro de decisões](docs/decisions/DECISION_LOG.md)
- [Escopo HubSpot](docs/decisions/HUBSPOT_SCOPE_DECISION.md)
- [Bloqueadores](docs/implementation/DELIVERY_BLOCKERS.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)

## Integrações e ambientes

- [Contrato HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Bridge de identidade](docs/architecture/IDENTITY_BRIDGE.md)
- [Estratégia de ambientes](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md)
- [Portabilidade Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Arquitetura-alvo AWS](docs/architecture/AWS_TARGET_ARCHITECTURE.md)

## Gates de release

O estado de release é mantido em [`DELIVERY_BLOCKERS.md`](docs/implementation/DELIVERY_BLOCKERS.md). Código genérico, fixture, mock, adapter sem credenciais ou Terraform não aplicado não encerram requisitos de produção.
