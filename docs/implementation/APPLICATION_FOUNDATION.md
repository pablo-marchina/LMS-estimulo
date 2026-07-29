# Fundação atual da aplicação

**Revisado em:** 2026-07-29  
**Status:** desenvolvimento/teste funcional; produção AWS bloqueada

## Forma do sistema

O repositório contém um monorepo npm com um workspace `apps/web/`. A aplicação é um monólito modular Next.js 16 com App Router, React 19 e TypeScript. Server Components, route handlers, server actions e módulos server-only compõem os casos de uso; não existe backend de domínio paralelo.

## Providers de plataforma

```text
PLATFORM_RUNTIME_PROVIDER=supabase
PLATFORM_RUNTIME_PROVIDER=aws
```

- `supabase` é permitido em local, test e preview;
- `aws` é obrigatório em staging e produção;
- qualquer consulta ao provider aplica a política de ambiente;
- os próprios clientes Supabase rejeitam execução no provider AWS;
- provider inválido ou combinação proibida falha fechado.

A política está em `apps/web/lib/platform/runtime-provider.ts` e é verificada por `npm run validate:platform-contract`.

## Runtime Supabase de teste

O caminho funcional de desenvolvimento/teste usa:

- Supabase Auth e cookies SSR;
- Supabase Storage;
- Edge Function `authenticated-rpc`;
- RPC/PostgREST;
- Supabase PostgreSQL como estado operacional, event store e outbox;
- adapter HTTP HubSpot, ainda sem inventário, worker ou sandbox real.

O gateway RPC possui timeout controlado e uma fronteira única. Não existem rotas de login de teste, identidade sintética, banco falso, storage local alternativo ou bypass de RPC.

O ambiente real pode ser verificado, sem mutações, por:

```bash
npm run verify:supabase
```

O comando verifica Auth, readiness do PostgreSQL e proteção da Edge Function autenticada.

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

No provider AWS, identidade, gateway PostgreSQL e storage permanecem fail-closed até os adapters reais existirem.

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
apps/web/lib/supabase/
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

- `supabase/migrations/` é o único histórico executável e imutável;
- `supabase/canonical-migrations/` contém baselines recuperadas e manifests;
- migrations posteriores corrigem o estado sem editar migrations aplicadas;
- contratos públicos permanecem em `docs/implementation/public-rpc-contracts-v1.json`;
- após o replay, os gates aceitam somente arquivos SQL `test-*`.

A prova em RDS, incluindo extensões, roles, grants, RLS, funções, índices, RDS Proxy, PITR e restore, ainda não existe.

## Container

Existe somente `Dockerfile.lambda`.

Ele:

- usa Node.js 22 e Next.js standalone;
- inclui AWS Lambda Web Adapter;
- configura `APP_ENV=production` e `PLATFORM_RUNTIME_PROVIDER=aws`;
- incorpora somente `NEXT_PUBLIC_APP_URL` como configuração pública;
- não incorpora configuração Supabase ou secrets;
- usa `/api/health/live` para inicialização do servidor;
- mantém `/api/health/ready` como gate externo fail-closed;
- usa `/tmp` apenas para cache descartável.

A stack Terraform ECS/Fargate e o Dockerfile genérico foram removidos.

O Web CI deve construir a aplicação Supabase de teste e, separadamente, construir, inspecionar e iniciar o container Lambda. Os runners ainda precisam executar os steps para que essa evidência exista.

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
npm run verify:supabase
```

`npm run verify:deployment` é um smoke test autenticado read-only. Ele não comprova criação transacional, upload, outbox, SQS ou HubSpot.

## Limites atuais

Não estão implementados ou comprovados:

- inventário da AWS corporativa;
- adapter Cognito/OIDC;
- adapter PostgreSQL via RDS Proxy;
- replay/equivalência em RDS;
- S3 e uploads diretos;
- SQS, workers, DLQ e reconciliação;
- infraestrutura Lambda/front door aplicada;
- build e execução da imagem Lambda em CI;
- observabilidade, SLOs, backup, restore e rollback;
- E2E transacional AWS;
- conteúdo e diagnóstico oficiais;
- HubSpot sandbox;
- aprovações de segurança, privacidade e acessibilidade.

O estado de liberação está em [`DELIVERY_BLOCKERS.md`](DELIVERY_BLOCKERS.md).
