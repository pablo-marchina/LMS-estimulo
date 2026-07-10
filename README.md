# Plataforma Estímulo

Plataforma interna multi-jornada para desenvolvimento de empreendedores da Estímulo.

## Estado atual

O projeto está no workstream **E14**. A aplicação Next.js e a fundação PostgreSQL existem, mas o produto ainda não está autorizado para produção.

```text
Supabase = desenvolvimento e teste
AWS staging = gate obrigatório
AWS produção = ambiente oficial futuro
HubSpot = fonte autoritativa dos dados de negócio coletados e utilizados
```

O histórico M00–M14 está materializado no Git. Replay das 243 migrations, equivalência estrutural, 18 contratos públicos e backend E2E passaram.

A decisão atual exige:

- todo dado de negócio coletado persistido no HubSpot;
- toda função de negócio usando dados provenientes do HubSpot;
- PostgreSQL restrito a outbox, idempotência, cache HubSpot-sourced, auditoria e reconciliação;
- formulário, arquétipos, políticas e regras de uso editáveis e versionados no HubSpot;
- quantidade e nomes de arquétipos sem hardcode.

A porta `HubSpotDataGateway`, o adapter determinístico de teste e o gate `write → readback → use` estão implementados. O motor lógico configurável também suporta formulários versionados, quantidade variável de arquétipos, classificação declarativa com abstenção, recálculo, override append-only e ativações persistidas. O bloqueio prioritário permanece o inventário da conta HubSpot, o modelo físico e o adapter real.

O legado de helpers E14 também está contido: 107 helpers privados e 8 RPCs públicos com argumentos opacos foram inventariados, congelados e isolados atrás de uma fronteira semântica. O primeiro delta técnico reduz o runtime efêmero para 106 helpers privados e preserva os contratos e o E2E, mas ainda não foi aplicado ao Supabase remoto.

## Estrutura

```text
apps/web/                              aplicação Next.js
apps/web/lib/hubspot/                  contratos e porta HubSpot autoritativa
apps/web/lib/configurable-product/     formulário, classificação e ativações configuráveis
supabase/migrations/                   histórico executável de migrations
supabase/pending-migrations/           deltas técnicos testados, ainda não aplicados remotamente
supabase/canonical-migrations/         SQL canônico, manifests e baseline estrutural
supabase/functions/                    adapters ativos apenas no Supabase de teste
docs/                                  documentação canônica atual
scripts/e14/                           validação, replay, contratos e E2E
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
npm run typecheck:web
npm run test:e14-step5
npm run test:e14-hubspot-contracts
npm run test:e14-configurable-product
npm run test:e14-opaque-helper-containment
npm run build:web
```

O `package-lock.json` v3 é canônico. A configuração `.npmrc` omite URLs específicas de registry, e o CI prova `npm ci` limpo com a mesma árvore de dependências em Ubuntu e Windows.

## Validações

```bash
npm run validate:repository
npm run validate:dependency-lock
npm run validate:e14-runtime-history
npm run validate:e14-public-contracts
npm run validate:e14-opaque-helper-containment
npm run test:e14-first-semantic-replacement
npm run test:e14-backend-e2e
npm run test:e14-database-gates
npm run test:e14-hubspot-contracts
npm run test:e14-configurable-product
npm run test:e14-opaque-helper-containment
npm run validate:e14-step5
npm run test:e14-step5
npm run test:e14-runtime-recovery
npm run test:e14-public-contracts
npm run typecheck:web
npm run build:web
```

`npm run validate:dependency-lock` confirma lockfile v3, sincronização com os manifests e ausência de URLs HTTP de registry ou mirror.

`npm run test:e14-database-gates` exige PostgreSQL 17.6 compatível com o Supabase. Ele executa o histórico recuperado, prova equivalência e contratos, aplica o delta técnico pendente somente no banco efêmero e então repete os contratos públicos e o backend E2E.

`npm run test:e14-hubspot-contracts` não exige acesso ao HubSpot. Ele compila os contratos TypeScript e prova origem, readback, idempotência, retry, consistência eventual, concorrência e rejeição de snapshots inválidos.

`npm run test:e14-configurable-product` também não exige acesso ao HubSpot. Ele prova publicação, respostas, número variável de arquétipos, abstenção, retirada operacional, recálculo, override, histórico append-only e persistência das ativações.

`npm run validate:e14-opaque-helper-containment` congela o inventário das funções com argumentos de uma letra e garante que os oito RPCs públicos legados só sejam chamados pela fronteira semântica da aplicação.

`npm run test:e14-first-semantic-replacement` pressupõe o replay limpo já executado. Ele aplica o delta pendente no PostgreSQL efêmero, confirma a remoção do primeiro helper opaco e reduz o contador de 115 para 114.

## Documentação

- [Índice atual do projeto](PROJECT_INDEX.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [ADR HubSpot autoritativo](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md)
- [Registro de decisões](docs/decisions/DECISION_LOG.md)
- [Registro de bloqueadores](docs/implementation/E14_BLOCKER_REGISTER.md)
- [Delta de schema E14](docs/implementation/SCHEMA_DELTA_E14.md)
- [Motor configurável E14](docs/implementation/E14_CONFIGURABLE_PRODUCT_ENGINE.md)
- [Contenção dos helpers opacos](docs/implementation/E14_OPAQUE_HELPER_CONTAINMENT.md)
- [Fluxo lógico HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Contrato do adapter HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Inventário bloqueante do HubSpot](docs/integrations/HUBSPOT_INVENTORY_REQUEST.md)
- [Backend E2E E14](docs/implementation/E14_BACKEND_E2E.md)
- [Estratégia Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Guia de contribuição](CONTRIBUTING.md)

## Regras essenciais

- não fazer commit direto em `main`;
- não criar branch, issue ou PR sem trabalho independente e necessário;
- fechar PRs substituídos e excluir branches depois do merge;
- não versionar outputs gerados, dados pessoais, credenciais ou exports locais;
- migrations aplicadas nunca são editadas;
- migrations pendentes não são aplicadas remotamente sem autorização explícita;
- nenhuma decisão de negócio usa dado local sem origem HubSpot comprovada;
- nenhuma capacidade é concluída sem teste e evidência reproduzível;
- Supabase nunca é produção oficial.
