# Plataforma Estímulo

Plataforma interna multi-jornada para desenvolvimento de empreendedores da Estímulo.

## Estado atual

A fundação técnica existe e é reproduzível, mas o produto oficial ainda não está autorizado para produção.

```text
Supabase = desenvolvimento e teste
AWS staging = gate obrigatório
AWS produção = ambiente oficial
PostgreSQL = banco operacional do LMS, eventos e outbox
HubSpot = User 360 e projeções de relacionamento
```

Já foram comprovados:

- 244 migrations executáveis e replay limpo;
- equivalência estrutural do banco;
- 18 contratos públicos de RPC;
- backend E2E com publicação, matrícula, diagnóstico, atividade, avaliação, progresso, pontos, eventos e outbox;
- aplicação Next.js com rotas iniciais de participante e operação;
- motor configurável de formulários, arquétipos e ativações;
- porta HubSpot e adapter em memória;
- instalação reproduzível em Ubuntu e Windows.

Ainda faltam as entradas oficiais, os must-haves do LMS, identidade/site, adapter HubSpot real, browser E2E e AWS staging.

## Prioridade vigente

```text
1. aprovar e carregar formulário, 4 arquétipos e Jornada OpenAI
2. substituir a vertical sintética pela vertical oficial
3. completar frontend, comentários, uploads, provas, selos e certificados
4. integrar identidade/site e HubSpot real
5. validar navegador, acessibilidade e AWS staging
6. liberar produção controlada
```

Dívida técnica contida e refatorações cosméticas não interrompem essa sequência.

## Estrutura

```text
apps/web/                              aplicação Next.js
apps/web/lib/hubspot/                  porta e utilitários HubSpot
apps/web/lib/configurable-product/     formulário, classificação e ativações
apps/web/lib/journey-runtime/          runtime da jornada e compatibilidade RPC
supabase/migrations/                   histórico executável
supabase/canonical-migrations/         manifests e SQL canônico
supabase/functions/                    adapters ativos em desenvolvimento/teste
docs/                                  documentação atual
scripts/application/                   validações da aplicação
scripts/database/                      replay, contratos, equivalência e E2E
scripts/integrations/                  testes de integração
scripts/product/                       testes do motor configurável
```

## Desenvolvimento web

Pré-requisitos:

- Node.js 22 ou superior;
- npm 10.9.2;
- projeto Supabase autorizado somente para desenvolvimento/teste.

```bash
cp apps/web/.env.example apps/web/.env.local
npm ci --ignore-scripts
npm run typecheck:web
npm run test:application-foundation
npm run test:configurable-product
npm run build:web
```

## Validações principais

```bash
npm run validate:repository
npm run validate:dependency-lock
npm run validate:migration-history
npm run validate:public-rpc-contracts
npm run validate:legacy-rpc-containment
npm run test:database-gates
npm run test:application-foundation
npm run test:configurable-product
npm run typecheck:web
npm run build:web
```

Validações específicas de integração continuam disponíveis quando a área correspondente for modificada:

```bash
npm run test:hubspot-contracts
npm run test:legacy-rpc-containment
npm run test:migration-history
npm run test:public-rpc-contracts
```

## Documentação principal

- [Índice do projeto](PROJECT_INDEX.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [Registro de decisões](docs/decisions/DECISION_LOG.md)
- [Bloqueadores da entrega](docs/implementation/DELIVERY_BLOCKERS.md)
- [Delta de schema](docs/implementation/SCHEMA_DELTA.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)
- [Backend E2E](docs/implementation/BACKEND_E2E.md)
- [ADR HubSpot](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md)
- [Fluxo HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Inventário mínimo HubSpot](docs/integrations/HUBSPOT_INVENTORY_REQUEST.md)
- [Estratégia Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)

## Regras essenciais

- documentos oficiais da Estímulo prevalecem sobre ADRs, código e protótipos;
- não fazer commit direto em `main`;
- migrations aplicadas nunca são editadas;
- Supabase nunca é produção oficial;
- dados relevantes são projetados ao HubSpot por outbox e reconciliação;
- readback é reservado para escritas CRM críticas;
- nenhuma capacidade é concluída sem teste e evidência proporcionais;
- não criar planos, documentos ou refatorações sem necessidade concreta para a entrega.