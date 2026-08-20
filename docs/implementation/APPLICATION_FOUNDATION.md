# Fundação atual da aplicação

**Revisado em:** 2026-08-20  
**Status:** implementação atual documentada; arquitetura AWS institucional ainda pendente

## Forma do sistema

O repositório contém um monorepo npm com o workspace `apps/web/`. A aplicação é um monólito modular Next.js 16 com App Router, React 19 e TypeScript. Server Components, route handlers, server actions e módulos server-only compõem os casos de uso.

A organização do código é orientada por feature. Não existe uma obrigação de replicar globalmente diretórios `domain/application/infrastructure`; uma feature só deve criar subcamadas adicionais quando a complexidade justificar. Os adapters de framework em `apps/web/app/` devem permanecer finos: autenticação da requisição, composição de tela, redirects/revalidation e delegação para módulos de aplicação.

### Fronteiras de módulos

As fronteiras verificáveis ficam em [`config/repository/module-boundaries.json`](../../config/repository/module-boundaries.json) e são validadas por `npm run validate:module-boundaries`.

Regras atuais:

- `apps/web/lib/auth/` contém autenticação e identidade e não deve possuir orquestração de features irmãs;
- `apps/web/lib/request-context/` é a camada explícita para composição dependente da requisição, como autenticação combinada ao preview administrativo;
- `apps/web/lib/admin/` pode coordenar casos de uso administrativos que agregam jornadas, biblioteca e extensões;
- `apps/web/app/**/page.tsx` compõe a interface e delega carregamento e transformação de dados para módulos de aplicação;
- adapters de Server Action devem validar o ator, chamar um caso de uso e lidar com redirect/revalidation, evitando concentrar persistência e integração diretamente no arquivo de rota.

`apps/web/lib/auth/context.ts` permanece apenas como facade de compatibilidade. A implementação request-aware vive em `apps/web/lib/request-context/auth-context.ts`, evitando que o domínio de autenticação seja o proprietário de dependências de preview e extensões.

A superfície `/admin/produto` segue o mesmo princípio: `page.tsx` é composição, `apps/web/lib/admin/product-page-model.ts` carrega e transforma o modelo da página, e as seções de informações, conteúdo e publicação são componentes separados. O salvamento de jornada é executado por `apps/web/lib/admin/journey-save.ts`; o Server Action conserva somente responsabilidades HTTP/Next.js.

## Runtime ativo

O caminho funcional atual usa:

- Supabase Auth e cookies SSR;
- Supabase PostgreSQL, Storage e Edge Functions;
- gateway autenticado para RPCs;
- Vercel para build e implantação web;
- PostgreSQL como estado operacional, event store, auditoria e outbox.

O gateway valida sessão, identidade interna, allowlist, tamanho, timeout e sanitização de erros. Erros de domínio seguros, como validações do score, são preservados como códigos sem expor detalhes internos.

## Jornadas

Cada jornada possui um único registro operacional e dois estados visíveis, `draft` e `published`.

- publicação não clona conteúdo;
- jornada publicada pode ser editada diretamente;
- despublicação retorna a mesma jornada a rascunho e encerra acessos ativos conforme o contrato;
- somente rascunhos podem ser excluídos;
- nomes internos legados são mantidos apenas onde a compatibilidade relacional exige.

Consulte [`JOURNEY_LIFECYCLE.md`](../journeys/JOURNEY_LIFECYCLE.md).

## Experiência web

- a tela de aula usa toda a largura disponível do layout participante, preservando a estrutura de conteúdo e índice lateral;
- a navegação de toda a plataforma usa uma barra global de progresso;
- skeletons de página foram removidos do carregamento inicial e das transições;
- a área de Interface possui preview administrativo dedicado das páginas participantes;
- o preview não depende de uma identidade participante e não grava dados.

Consulte [`INTERFACE_PREVIEW_AND_LOADING.md`](INTERFACE_PREVIEW_AND_LOADING.md).

## Score comportamental

O score é configurável por organização e aceita somente métricas e operações permitidas. A configuração controla fórmula, normalização, confiança, dimensões, pesos e classificações.

Validação ocorre no editor, no gateway e no PostgreSQL. O banco impede:

- peso total igual a zero;
- códigos duplicados;
- normalização invertida;
- classificações fora de 0–100;
- lacunas ou sobreposição entre faixas.

Eventos brutos, configuração, valores intermediários, snapshots e histórico são preservados para análise e ETL. O score não interfere na experiência ou em crédito.

## Superfícies funcionais

### Participante

- cadastro, autenticação, termos e perfil;
- home, jornadas, aula, diagnóstico, resultado, biblioteca, entregas, recompensas e conquistas;
- progresso, avaliações, práticas, comentários e arquivos;
- pontos, selos, certificados e páginas B2B.

### Administração

- OAuth corporativo e RBAC;
- jornadas, trilhas, aulas e conteúdos;
- diagnóstico, CMS, biblioteca, campanhas, B2B, recompensas, certificados, usuários e relatórios;
- editor do score comportamental;
- preview isolado da interface;
- auditoria e operações protegidas.

## Banco e integridade

- `supabase/migrations/` é o histórico executável;
- migrations aplicadas não são editadas; correções são aditivas;
- RLS, grants, idempotência e autorização são parte do contrato;
- Edge Functions usam service role somente no servidor;
- views analíticas não são expostas a `anon` ou `authenticated`;
- replay e contratos do banco fazem parte do gate de release.

## Testes e invariantes

Testes que inspecionam texto-fonte continuam permitidos apenas para invariantes estáticos que realmente dependem da forma do source. Regras de comportamento devem preferir funções executáveis, testes de integração, gates de banco ou E2E.

A política de higiene do repositório foi separada do runner em `scripts/repository/hygiene-policy.mjs`, permitindo testes comportamentais das regras sem depender de regex aplicada ao próprio arquivo do validator. Novos contratos devem seguir a mesma preferência: comportamento antes de correspondência textual.

## AWS

AWS continua sendo o destino institucional planejado. `Dockerfile.lambda` é o único artefato aprovado, mas não define entrada pública, identidade, banco, armazenamento, rede, segredos, observabilidade ou continuidade. O provider AWS permanece *fail-closed* até essas decisões.

## Validações permanentes

```bash
npm run validate:release-candidate
npm run validate:module-boundaries
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

## Limites atuais

Ainda dependem de decisão ou evidência adicional:

- arquitetura AWS completa;
- E2E transacional no ambiente AWS definitivo;
- capacidade, SLOs, observabilidade e recuperação no ambiente final;
- operação institucional de chaves e segredos;
- aprovações formais de conteúdo, segurança, privacidade e acessibilidade.
