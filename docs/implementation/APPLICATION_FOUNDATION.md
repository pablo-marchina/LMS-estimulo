# Fundação atual da aplicação

**Revisado em:** 2026-07-29  
**Status:** implementada no repositório; liberação de produção bloqueada

## Forma do sistema

O repositório contém um monorepo npm com um workspace de aplicação:

```text
apps/web/
```

A aplicação é um monólito modular Next.js 16 com App Router, React 19 e TypeScript. Não existe um backend paralelo separado: server actions, route handlers e módulos server-only compõem os casos de uso.

## Runtime ativo

O runtime versionado usa:

- Supabase Auth para participantes e administração;
- Supabase Storage para arquivos privados;
- Supabase RPC/PostgREST e Edge Function `authenticated-rpc`;
- PostgreSQL como estado operacional, event store e outbox;
- adapters server-only para HubSpot, ainda sem inventário ou sandbox real;
- configuração de ambiente a partir do `.env` da raiz.

Supabase permanece desenvolvimento/teste. O runtime ainda não usa RDS, S3 ou um provedor de identidade AWS.

Não existem no runtime rotas de login de teste, identidade sintética, banco falso, storage local alternativo ou desvio de RPC para testes de navegador.

## Superfícies

### Participante

- cadastro público, confirmação de e-mail e login por senha;
- conclusão de cadastro com CPF protegido;
- home, jornadas, atividades, diagnóstico, perfil, biblioteca e conquistas;
- progresso, avaliações, práticas, comentários, arquivos, pontos e credenciais.

### Administração

- entrada separada por Google OAuth;
- validação de e-mail confirmado `@estimulo.org`;
- autorização RBAC;
- gestão de produto, diagnóstico, gamificação, engajamento, biblioteca, usuários, relatórios e operação.

A existência das telas não aprova conteúdo, regras, identidade institucional ou integrações externas para usuários reais.

## Módulos principais

```text
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
- migrations posteriores corrigem o estado final sem alterar migrations aplicadas;
- contratos públicos versionados permanecem em `docs/implementation/public-rpc-contracts-v1.json`.

A quantidade de migrations não é mantida manualmente na documentação. O estado é verificado por `npm run validate:migration-history` e `npm run test:database`.

## Build e container

- Node.js 22 e npm 10.9.2;
- Next.js `output: "standalone"`;
- Docker multi-stage;
- execução como UID/GID 1001;
- liveness em `/api/health/live`;
- readiness fail-closed em `/api/health/ready`;
- nenhum secret server-only incorporado à imagem.

O Dockerfile constrói uma imagem executável, mas a imagem ainda precisa ser construída, escaneada e implantada no ambiente AWS aprovado.

## Validações permanentes

```bash
npm run validate:repository
npm run validate:dependency-lock
npm run validate:migration-history
npm run test:repository-tooling
npm run test:application
npm run test:product
npm run test:integrations
npm run test:database
npm run typecheck:web
npm run build:web
```

A verificação autenticada de um ambiente implantado é separada:

```bash
npm run verify:deployment
```

Ela usa identidade, aplicação, banco e storage reais do ambiente informado. Não altera o runtime da aplicação para facilitar o teste.

Os quatro workflows permanentes cobrem governança, dependências, aplicação web e banco. No estado observado em 29 de julho de 2026, os jobs do GitHub Actions encerravam antes do primeiro step e sem logs; portanto, não constituem validação atual da branch.

## Limites

Não estão comprovados:

- AWS staging ou produção;
- adapters ativos para RDS, S3 e identidade de produção;
- conteúdo oficial integral da Jornada OpenAI;
- diagnóstico e regras oficiais aprovados;
- HubSpot sandbox;
- verificação autenticada completa no ambiente-alvo;
- backup, restore, rollback e observabilidade operacional;
- aprovação jurídica, de privacidade, segurança e acessibilidade.

O estado de liberação é mantido em [`DELIVERY_BLOCKERS.md`](DELIVERY_BLOCKERS.md).