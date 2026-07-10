# Plataforma Estímulo

Plataforma interna multi-jornada para desenvolvimento de empreendedores da Estímulo.

## Estado atual

A aplicação Next.js e a fundação PostgreSQL existem, mas o produto ainda não está autorizado para produção.

```text
Supabase = desenvolvimento e teste
AWS staging = gate obrigatório
AWS produção = ambiente oficial futuro
HubSpot = fonte autoritativa dos dados de negócio coletados e utilizados
```

O histórico M00–M15 está materializado no Git. O replay das 244 migrations, a equivalência estrutural, os 18 contratos públicos e o backend E2E passaram.

A decisão atual exige:

- todo dado de negócio coletado persistido no HubSpot;
- toda função de negócio usando dados provenientes do HubSpot;
- PostgreSQL restrito a outbox, idempotência, cache HubSpot-sourced, auditoria e reconciliação;
- formulário, arquétipos, políticas e regras de uso editáveis e versionados no HubSpot;
- quantidade e nomes de arquétipos sem hardcode.

A porta `HubSpotDataGateway`, o adapter determinístico de teste e o gate `write → readback → use` estão implementados. O motor configurável suporta formulários versionados, quantidade variável de arquétipos, classificação declarativa com abstenção, recálculo, override append-only e ativações persistidas.

O legado de RPCs e helpers do banco também está contido. Após a primeira substituição física aplicada e reconciliada, restam 106 helpers privados e 8 RPCs públicos com argumentos opacos. Os identificadores remotos `e14_*` permanecem apenas como compatibilidade com o histórico aplicado.

## Estrutura

```text
apps/web/                              aplicação Next.js
apps/web/lib/hubspot/                  contratos e porta HubSpot autoritativa
apps/web/lib/configurable-product/     formulário, classificação e ativações configuráveis
apps/web/lib/journey-runtime/          fronteira semântica da jornada e compatibilidade RPC
supabase/migrations/                   histórico executável de migrations
supabase/canonical-migrations/         SQL canônico, manifests e baseline estrutural
supabase/functions/                    adapters ativos apenas no Supabase de teste
docs/                                  documentação canônica atual
scripts/application/                   validações da aplicação
scripts/database/                      replay, contratos, equivalência e E2E
scripts/integrations/                  contratos de integrações
scripts/product/                       testes do motor configurável
```

Artefatos de execução, outputs de testes, relatórios locais e exports de banco não são versionados.

## Desenvolvimento web

Pré-requisitos:

- Node.js 22 ou superior;
- npm 10.9.2, conforme `packageManager`;
- projeto Supabase autorizado somente para desenvolvimento/teste.

```bash
cp apps/web/.env.example apps/web/.env.local
npm ci --ignore-scripts
npm run validate:semantic-naming
npm run typecheck:web
npm run test:application-foundation
npm run test:hubspot-contracts
npm run test:configurable-product
npm run test:legacy-rpc-containment
npm run build:web
```

O `package-lock.json` v3 é canônico. A configuração `.npmrc` omite URLs específicas de registry, e o CI prova `npm ci` limpo com a mesma árvore de dependências em Ubuntu e Windows.

## Validações

```bash
npm run validate:repository
npm run validate:dependency-lock
npm run validate:semantic-naming
npm run validate:migration-history
npm run validate:public-rpc-contracts
npm run validate:legacy-rpc-containment
npm run test:backend-e2e
npm run test:database-gates
npm run test:hubspot-contracts
npm run test:configurable-product
npm run test:legacy-rpc-containment
npm run validate:application-foundation
npm run test:application-foundation
npm run test:migration-history
npm run test:public-rpc-contracts
npm run typecheck:web
npm run build:web
```

`npm run validate:semantic-naming` impede novos caminhos, scripts, workflows e identificadores ativos baseados em fases de entrega. Nomes de migrations aplicadas e RPCs remotos legados são tratados como compatibilidade histórica, não como padrão para novos componentes.

`npm run test:database-gates` executa as 244 migrations em PostgreSQL 17.6 compatível com o Supabase, prova equivalência estrutural, valida os 18 contratos públicos e reproduz o backend E2E.

## Documentação

- [Índice atual do projeto](PROJECT_INDEX.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [ADR HubSpot autoritativo](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md)
- [Registro de decisões](docs/decisions/DECISION_LOG.md)
- [Registro de bloqueadores](docs/implementation/DELIVERY_BLOCKERS.md)
- [Delta de schema](docs/implementation/SCHEMA_DELTA.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Contenção dos helpers opacos](docs/implementation/OPAQUE_HELPER_CONTAINMENT.md)
- [Fluxo lógico HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Contrato do adapter HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Inventário bloqueante do HubSpot](docs/integrations/HUBSPOT_INVENTORY_REQUEST.md)
- [Backend E2E](docs/implementation/BACKEND_E2E.md)
- [Estratégia Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Guia de contribuição](CONTRIBUTING.md)

## Regras essenciais

- não fazer commit direto em `main`;
- não criar branch, issue ou PR sem trabalho independente e necessário;
- fechar PRs substituídos e excluir branches depois do merge;
- não versionar planos operacionais, outputs gerados, dados pessoais, credenciais ou exports locais;
- migrations aplicadas nunca são editadas;
- novas escritas remotas exigem autorização explícita;
- nenhuma decisão de negócio usa dado local sem origem HubSpot comprovada;
- nenhuma capacidade é concluída sem teste e evidência reproduzível;
- Supabase nunca é produção oficial.
