# Fundação atual da aplicação

**Revisado em:** 2026-07-29  
**Status:** desenvolvimento/teste funcional; migração AWS estruturada e produção bloqueada

## Forma do sistema

O repositório contém um monorepo npm com um workspace `apps/web/`. A aplicação é um monólito modular Next.js 16 com App Router, React 19 e TypeScript. Server Components, route handlers, server actions e módulos server-only compõem os casos de uso; não existe backend de domínio paralelo.

## Providers de plataforma

A aplicação possui um selector server-only:

```text
PLATFORM_RUNTIME_PROVIDER=supabase
PLATFORM_RUNTIME_PROVIDER=aws
```

- `supabase` mantém o ambiente atual de desenvolvimento/teste;
- `aws` é obrigatório para staging e produção;
- `APP_ENV=production` com provider Supabase é rejeitado;
- um provider inválido falha fechado.

A política está em `apps/web/lib/platform/runtime-provider.ts` e é verificada por `npm run validate:platform-contract`.

## Runtime Supabase atual

O caminho funcional de desenvolvimento/teste usa:

- Supabase Auth e cookies SSR;
- Supabase Storage;
- Edge Function `authenticated-rpc`;
- RPC/PostgREST;
- Supabase PostgreSQL como estado operacional, event store e outbox;
- adapter HTTP HubSpot, ainda sem inventário, worker ou sandbox real.

O gateway RPC possui timeout controlado e uma fronteira única. A implementação Supabase continua ativa; o caminho AWS falha explicitamente até o adapter RDS existir.

Não existem rotas de login de teste, identidade sintética, banco falso, storage local alternativo ou bypass de RPC.

## Arquitetura AWS aprovada

A produção seguirá a [`DEC-075`](../decisions/AWS_PRODUCTION_ARCHITECTURE.md):

```text
CloudFront/edge + WAF
→ API Gateway HTTP API
→ Lambda alias
→ Next.js + Lambda Web Adapter
→ Cognito/OIDC
→ RDS Proxy + RDS PostgreSQL
→ S3 privado e upload direto
→ SQS + Lambdas consumidoras + DLQ
```

O `Dockerfile.lambda` seleciona o provider AWS e usa `/api/health/ready`. A readiness AWS permanece `503` até probes reais de Cognito/IdP, RDS Proxy/PostgreSQL e S3 serem implementados; portanto, a imagem não pode aceitar tráfego produtivo por engano.

## Superfícies funcionais

### Participante

- cadastro, confirmação e login no adapter Supabase;
- conclusão com CPF protegido;
- home, jornadas, atividades, diagnóstico, perfil, biblioteca e conquistas;
- progresso, avaliações, práticas, comentários, arquivos, pontos e credenciais.

### Administração

- entrada separada por Google OAuth no adapter Supabase;
- e-mail confirmado `@estimulo.org`;
- organização interna e RBAC;
- produto, diagnóstico, gamificação, engajamento, biblioteca, usuários, relatórios e operação.

A existência das telas não aprova conteúdo, metodologia, identidade institucional ou integração externa para usuários reais.

## Módulos principais

```text
apps/web/lib/platform/
apps/web/lib/auth/
apps/web/lib/identity/
apps/web/lib/admin/
apps/web/lib/diagnostics/
apps/web/lib/journey-runtime/
apps/web/lib/engagement/
apps/web/lib/credentials/
apps/web/lib/library/
apps/web/lib/storage/
apps/web/lib/hubspot/
apps/web/lib/configurable-product/
```

## Banco

- `supabase/migrations/` é o histórico executável e imutável;
- `supabase/canonical-migrations/` contém baselines recuperadas e manifests;
- migrations posteriores corrigem o estado sem editar migrations aplicadas;
- contratos públicos permanecem em `docs/implementation/public-rpc-contracts-v1.json`.

Os gates atuais usam Supabase PostgreSQL. A prova em RDS, incluindo extensões, roles, grants, RLS, funções, índices, RDS Proxy, PITR e restore, ainda não existe.

## Build e container

### Desenvolvimento/ECS anterior

O `Dockerfile` standalone permanece versionado, mas o Terraform ECS correspondente não é mais arquitetura-alvo.

### Lambda

`Dockerfile.lambda`:

- usa Node.js 22 e Next.js standalone;
- inclui AWS Lambda Web Adapter;
- configura `PLATFORM_RUNTIME_PROVIDER=aws`;
- usa readiness fail-closed;
- expõe erros `500-599` como falha;
- usa `/tmp` apenas para cache descartável;
- não incorpora secrets server-only.

O workflow tenta construir a imagem com `docker buildx`, arquitetura explícita e provenance desativada para compatibilidade Lambda. Os runners ainda encerram antes dos steps, portanto o build não está comprovado.

## Validações permanentes

```bash
npm run validate:repository
npm run validate:dependency-lock
npm run validate:platform-contract
npm run validate:migration-history
npm run test:repository-tooling
npm run test:application
npm run test:product
npm run test:integrations
npm run test:database
npm run typecheck:web
npm run build:web
```

`npm run verify:deployment` é atualmente um smoke test autenticado read-only. Ele verifica health, login, navegação, páginas administrativas, responsividade e identidade real do ambiente informado. Ele não comprova criação transacional, upload, outbox, SQS ou HubSpot e não deve ser descrito como E2E full-stack completo.

## Limites atuais

Não estão implementados ou comprovados:

- inventário da AWS corporativa;
- adapter Cognito/OIDC;
- adapter PostgreSQL via RDS Proxy;
- replay/equivalência em RDS;
- S3 e uploads diretos;
- SQS, workers, DLQ e reconciliação;
- infraestrutura Lambda/front door aplicada;
- build e execução da imagem Lambda;
- observabilidade, SLOs, backup, restore e rollback;
- E2E transacional AWS;
- conteúdo e diagnóstico oficiais;
- HubSpot sandbox;
- aprovações de segurança, privacidade e acessibilidade.

O estado de liberação está em [`DELIVERY_BLOCKERS.md`](DELIVERY_BLOCKERS.md).
