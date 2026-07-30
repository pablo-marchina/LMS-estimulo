# Fundação atual da aplicação

**Revisado em:** 2026-07-30  
**Status:** implementação atual documentada; Gate A é avaliado por SHA; produção AWS bloqueada por arquitetura

## Forma do sistema

O repositório contém um monorepo npm com o workspace `apps/web/`. A aplicação é um monólito modular Next.js 16 com App Router, React 19 e TypeScript. Server Components, route handlers, server actions e módulos server-only compõem os casos de uso; não existe backend de domínio paralelo.

## Providers

```text
PLATFORM_RUNTIME_PROVIDER=supabase
PLATFORM_RUNTIME_PROVIDER=aws
```

- `supabase` é permitido em development, test e preview;
- `aws` é obrigatório em staging e production;
- qualquer consulta ao provider aplica a política de ambiente;
- os clientes Supabase rejeitam execução no provider AWS;
- combinação inválida falha fechado;
- o provider AWS permanece `not_ready` enquanto sua arquitetura estiver pendente.

A política está em `apps/web/lib/platform/runtime-provider.ts` e é validada por `npm run validate:platform-contract`.

## Runtime Supabase/Vercel de teste

O caminho funcional de desenvolvimento, teste e preview usa:

- Supabase Auth e cookies SSR;
- Supabase Storage;
- Edge Function `authenticated-rpc`;
- RPC/PostgREST;
- Supabase PostgreSQL como estado operacional, event store e outbox;
- Vercel somente para previews controlados;
- adapter HTTP HubSpot sem autorização de produção.

O gateway autenticado valida sessão, identidade interna e correspondência do ator, aplica allowlist, limita payload e timeout e sanitiza erros. Toda RPC usada pela aplicação deve estar coberta pelo gate `validate:rpc-gateway-coverage`.

O ambiente de teste pode ser verificado sem mutações por:

```bash
npm run verify:supabase
```

A verificação consulta Auth, readiness do PostgreSQL e a proteção do gateway autenticado. Isso não constitui prova de produção.

## Estado AWS

As únicas decisões aprovadas são:

1. AWS será o ambiente definitivo de produção;
2. a aplicação será empacotada por `Dockerfile.lambda`;
3. Supabase e Vercel não podem ser usados como fallback ou produção oficial.

Entrada pública, identidade, banco, conexão, armazenamento, processamento assíncrono, rede, segredos, observabilidade, deploy e continuidade ainda precisam de ADR. Consulte [`AWS_ARCHITECTURE_STATUS.md`](../architecture/AWS_ARCHITECTURE_STATUS.md).

No provider AWS:

- `/api/health/live` pode apenas comprovar que o processo HTTP iniciou;
- `/api/health/ready` retorna `503` com `aws_architecture_pending`;
- autenticação protegida retorna indisponibilidade;
- operações de dados e armazenamento não executam em Supabase;
- nenhum serviço AWS específico é presumido pelo código ou documentação.

## Superfícies funcionais

### Participante

- cadastro, aceite versionado de termos e política, confirmação e login;
- recuperação e redefinição de senha sem revelar existência de conta;
- conclusão de perfil com CPF protegido;
- home, jornadas, atividades, diagnóstico, resultado, perfil, biblioteca e conquistas;
- diagnóstico guiado, uma pergunta por etapa, com conclusão e visualização acessível dos resultados;
- progresso, avaliações, práticas, comentários e arquivos;
- pontos, recompensas, selos, certificados internos e credenciais externas;
- ajuda global, página de suporte e textos legais operacionais.

### Administração

- entrada separada pelo provider de teste e OAuth corporativo;
- contas `@estimulo.org` orientadas ao acesso federado, sem senha temporária;
- organização interna e capacidades RBAC;
- produto, jornadas, trilhas, aulas, diagnóstico, CMS, gamificação, engajamento, biblioteca, usuários, relatórios e operação;
- templates persistentes de certificado e posicionamento visual;
- arquivamento seguro de conteúdos de biblioteca e trilhas, preservando histórico e bloqueando dependências;
- recuperação de acesso por e-mail para contas não federadas;
- diferenciação explícita entre catálogo vazio e indisponibilidade do backend.

A existência das telas não aprova conteúdo, metodologia, identidade institucional, privacidade ou integração externa para usuários reais.

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

## Banco e integridade

- `supabase/migrations/` é o único histórico executável;
- `supabase/canonical-migrations/` contém baselines recuperadas e manifests;
- replay estrutural não depende de conteúdo editorial, contas ou estado remoto não versionado;
- correções de ambiente já migrado usam migrations aditivas e idempotentes;
- testes comportamentais usam fixtures controladas depois do replay;
- contratos públicos permanecem em `public-rpc-contracts-v1.json`;
- após o replay, os gates aceitam somente suítes SQL de teste;
- idempotência, constraints, RLS, RBAC e autorização devem ser provadas sob concorrência;
- regras event-driven, templates de certificado e operações de arquivamento pertencem ao histórico canônico.

A tecnologia e a operação do banco AWS ainda não estão decididas. Qualquer prova futura deve cobrir replay, equivalência, extensões, roles, grants, RLS, conexão, failover, backup e restore no desenho aprovado.

## Container

Existe somente `Dockerfile.lambda`. Ele:

- usa Node.js 22 e Next.js standalone;
- inclui AWS Lambda Web Adapter;
- configura `APP_ENV=production` e `PLATFORM_RUNTIME_PROVIDER=aws`;
- não incorpora configuração Supabase ou segredos;
- usa `/api/health/live` para inicialização do processo;
- preserva `/api/health/ready` como gate externo fail-closed;
- usa `/tmp` apenas para cache descartável;
- executa como usuário não-root.

A imagem não define a arquitetura AWS ao redor da função.

## Validações permanentes

```bash
npm run validate:release-candidate
npm run test:repository-tooling
npm run test:application
npm run test:product
npm run test:integrations
npm run test:database
npm run typecheck:web
npm run build:web
npm run scan:secrets
npm run test:secret-scanning
npm run verify:supabase
```

O CI também deve reconstruir o banco desde zero, construir e inspecionar a imagem e preservar evidências associadas ao mesmo SHA. O status de um candidato não é mantido manualmente neste documento.

## Capacidade e performance

O harness de carga produz throughput, taxa de erro e percentis. O cenário curto de `/api/health/live` valida o artefato e o processo HTTP sob limites definidos. Prontidão multiusuário requer, no ambiente AWS decidido:

- leitura e escrita autenticadas;
- diagnóstico e progresso concorrentes;
- administração e publicação;
- arquivos;
- processamento assíncrono e integrações;
- múltiplas organizações e testes negativos;
- ramp, spike e soak;
- métricas de memória, conexões, backlog, erros e custo.

Resultados numéricos de um candidato ficam nos artefatos do workflow.

## Limites atuais

Ainda não estão aprovados ou comprovados:

- arquitetura AWS completa;
- adapters e infraestrutura de produção;
- E2E transacional no ambiente definitivo;
- perfil de carga, limites e SLOs validados no ambiente final;
- observabilidade e resposta a incidentes;
- backup, restore e rollback;
- operação institucional das chaves do CPF;
- integração externa em sandbox e produção;
- conteúdo e diagnóstico oficiais aprovados;
- aprovações de segurança, privacidade e acessibilidade.

O estado de liberação está em [`DELIVERY_BLOCKERS.md`](DELIVERY_BLOCKERS.md).
