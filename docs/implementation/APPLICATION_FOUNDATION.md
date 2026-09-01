# Fundação atual da aplicação

**Revisado em:** 2026-09-01  
**Status:** implementação atual documentada; arquitetura AWS institucional ainda pendente

## Forma do sistema

Monorepo npm com `apps/web/`, monólito modular Next.js 16/React 19/TypeScript. `app/` contém entradas/composição, `components/` UI compartilhada e `lib/` regras, modelos e adapters. `config/module-boundaries.json` verifica dependências permitidas.

## Runtime ativo

- Supabase Auth/cookies SSR;
- Supabase PostgreSQL, Storage e Edge Functions;
- gateway autenticado para RPCs;
- Vercel para build/deploy web autorizado;
- PostgreSQL como estado operacional, histórico, auditoria e outbox.

Integrações externas não são dependência síncrona do domínio.

## Autenticação

Participante usa `/entrar`; administração usa `/entrar/administracao`. O callback administrativo valida Google pelo registro verificado de `getUser()`, resolve a identidade interna e exige membership Estímulo. Capabilities são RBAC. A detecção do provider não depende de `getClaims()`/AMR.

## Jornada

Jornada é entidade operacional única `draft ↔ published`. Publicada pode ser editada ao vivo; publicação não cria clone. Nomenclatura física `journey_version*` permanece como compatibilidade.

## Experiência participante

- home mantém destaque elegível sem tornar a consulta opcional de elegibilidade um requisito para renderizar a página;
- cards de jornada e áreas principais de aula possuem alvo de abertura previsível;
- ajuda preserva shell/header participante;
- ranking expõe identificação mascarada;
- popup de badge anuncia somente awards novos por `award_id`.

## Diagnóstico

O motor é configurável. O runtime usa média dos scores das respostas por dimensão e thresholds configurados como limites superiores inclusivos, avaliados da faixa menor para a maior. Essa semântica é execução da configuração, não definição de metodologia oficial.

## Quick check

`multiple_choice` usa igualdade exata do conjunto selecionado com o conjunto correto. O web canonicaliza a ordem para idempotência e o banco valida existência/deduplicação.

## Banco e legado

- migrations são fonte executável;
- baselines de RPC pública/helpers opacos/equivalência são machine-readable;
- correções de legado não podem criar nova superfície opaca quando substituição semântica segura do helper existente resolve;
- grants de facades privilegiadas permanecem fechados para browser roles;
- replay e regressões fazem parte do gate.

## E-mail de confirmação

`supabase/templates/confirmation.html` é versionado. `npm run sync:supabase-confirmation-email` aplica assunto/HTML ao Supabase hospedado e lê a configuração de volta para verificar igualdade. Credenciais pertencem ao ambiente.

## AWS

AWS continua destino institucional planejado. `Dockerfile.lambda` é o único artefato aprovado; identidade, banco, storage, rede, segredos, observabilidade e continuidade ainda exigem decisão/implementação. Não existe fallback automático para Supabase.

## Validação

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
```

Veja [`CURRENT_PLATFORM_BEHAVIOR.md`](CURRENT_PLATFORM_BEHAVIOR.md) para invariantes observáveis recentes.