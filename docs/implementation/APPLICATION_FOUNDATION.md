# Fundação atual da aplicação

**Revisado em:** 2026-08-20  
**Status:** implementação atual documentada; arquitetura AWS institucional ainda pendente

## Forma do sistema

O repositório contém um monorepo npm com o workspace `apps/web/`. A aplicação é um monólito modular Next.js 16 com App Router, React 19 e TypeScript. Server Components, route handlers, server actions e módulos server-only compõem os casos de uso.

A organização é orientada por capacidades, sem uma divisão horizontal global em `domain/application/infrastructure`. As fronteiras são aplicadas onde agregam clareza:

- `apps/web/app/` é a camada de entrada e composição: rotas, páginas, route handlers e server actions;
- `apps/web/components/` contém UI compartilhada;
- `apps/web/lib/<feature>/` concentra modelos, regras e orquestração da capacidade;
- `apps/web/lib/platform/`, `supabase/`, `rpc/` e `storage/` representam contratos e adapters de infraestrutura;
- fluxos de tela com transformação relevante usam modelos próprios em `lib/`, deixando `page.tsx` responsável por autenticação, composição e renderização;
- dependências proibidas entre módulos são descritas em `config/module-boundaries.json` e verificadas por `npm run validate:module-boundaries`.

O editor administrativo de jornadas segue esse padrão: a rota compõe a tela, `product-page-model.ts` prepara o modelo da página, regras puras ficam em `product-page-core.mjs` e cada etapa visual possui um componente dedicado. Esse padrão deve ser replicado quando outras páginas ultrapassarem a responsabilidade de composição.

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
- o preview não depende de uma identidade participante e não grava dados;
- a resolução da identidade de preview pertence ao módulo `interface-preview`, evitando que o contexto de autenticação conheça diretamente a implementação de outras capacidades.

Consulte [`INTERFACE_PREVIEW_AND_LOADING.md`](INTERFACE_PREVIEW_AND_LOADING.md).

## Testes e contratos

Regras puras com resultado observável são testadas diretamente. Testes baseados em leitura de source permanecem somente para invariantes estáticos que não têm uma superfície comportamental mais apropriada, como wiring de segurança, ausência de exposição e contratos de migration.

Essa separação reduz falsos positivos durante refactors sem remover os gates que protegem invariantes arquiteturais e de segurança.

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

## Higiene e arquitetura do repositório

A higiene do repositório é declarativa em `config/repository-hygiene-policy.json`. O script `validate-hygiene.mjs` executa essas regras, mas não mantém listas históricas embutidas no código. A estrutura de dependências da aplicação é declarada separadamente em `config/module-boundaries.json`.

`npm run validate:repository` executa ambos os gates. Assim, limpeza e arquitetura permanecem verificáveis sem concentrar toda a política em um único script crescente.

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
