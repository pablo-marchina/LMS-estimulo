# Revisão completa do projeto — 2026-08-19

Revisão de arquitetura, organização, limpeza e funcionalidade de todo o repositório, solicitada por Pablo Marchina. Metodologia: (1) execução dos gates automatizados do próprio repositório que rodam sem infraestrutura viva; (2) checagem ao vivo de segurança/performance do banco via Supabase Advisors; (3) cinco agentes de revisão independentes, cada um cobrindo um domínio (frontend, banco/migrations, scripts/tooling, docs-vs-código, segurança/RBAC), com achados verificados por citação de `arquivo:linha` — nada reportado aqui é presunção não checada no código real. Achados já catalogados em `DELIVERY_BLOCKERS.md`, `RISK_REGISTER.md`, `PRODUCTION_QUALITY_BASELINE.md` e `PERMISSION_MODEL.md` foram deliberadamente excluídos: este documento cobre apenas o que é novo ou tem drift em relação ao que já está documentado.

## O que foi verificado vs. o que não foi

**Rodado e verificado nesta revisão:** `validate:dependency-lock`, `lint:source`, `validate:repository`, `validate:application-foundation`, `validate:platform-contract`, `validate:migration-history`, `typecheck:web`, `test:repository-tooling`, `test:application`, `scan:secrets`, além de leitura direta de código/migrations e consulta ao vivo ao Supabase Advisors (security + performance) do projeto de desenvolvimento.

**Não verificado nesta revisão** (exigem infraestrutura/ambiente que este agente não tinha disponível — não inferir "funcional" a partir da leitura de código para os itens abaixo): `test:database` (gates reais contra Postgres), `verify:supabase`, `verify:deployment`, `test:capacity`, `test:integrations`, `replay:database-clean`, `validate:schema-equivalence`, e todos os scripts em `scripts/e2e/**` (exigem servidor rodando + browser). Esses continuam sendo os gates de CI, não substituídos por esta revisão.

---

## Funcionalidade

### 1. [ALTO] Fluxo de conclusão de atividade deixa a mensagem de sucesso órfã
`apps/web/app/empreendedor/atividade/[stepInstanceId]/completion-action.ts:18-23,48-52` — o mapa `completionAnchor` tem entradas para `conteudo_pendente`, `avaliacao_pendente`, `pratica_pendente` e `falha`, mas **não** para o caso de sucesso. No sucesso (linha 48-49), o redirect vai para `/empreendedor/jornada/${journey}?conclusao=ok` sem âncora, enquanto todo caso de bloqueio/falha (linha 52) inclui `#${completionAnchor[outcome]}`. Confirmado por dois caminhos independentes:
- O próprio teste de contrato do repositório está vermelho: `scripts/application/final-completion-performance-contract.test.mjs:24` espera `ok: "concluir-aula"` no mapa, que não existe.
- Rastreamento do runtime mostra que ninguém no lado de renderização lê `conclusao=ok`: `apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx` só repassa `conclusao` adiante quando `query.conteudo` também resolve para uma atividade ainda aberta; a mensagem "Aula concluída, seus pontos estão sendo atualizados" que o fix `#257` claramente pretendia mostrar nunca é renderizada.
- Efeito colateral: `apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx:49-54` mantém `completionMessages.ok` e o branch `completionTarget === "ok"` (linha ~323) como código morto, já que nada mais aciona esse caminho.

Provável lacuna deixada pelo commit recente `fix: corrigir fluxos de conclusão do participante (#257)`. Direção: ou o outline da jornada passa a ler `conclusao` e renderizar o painel de sucesso, ou o redirect de sucesso permanece na página de atividade (espelhando os outros branches) em vez de ir para a jornada.

### 2. [ALTO] Gate de integridade de migrations está quebrado na `main` (verificado rodando o script isoladamente, fora do problema de CRLF local)
Rodei `node scripts/database/migration-history/validate-active-migrations.mjs` diretamente — fora da cadeia `validate:migration-history`, que morre antes por causa do artefato de CRLF local descrito em Limpeza #6 — e reproduzi o mesmo `AssertionError` de forma independente: `unexpected migration exists after the approved release boundary`. Causa exata: `scripts/database/migration-history/active-release-boundary.mjs:3` fixa `expectedLastMigration = '20260817125313_admin_landing_page_selection.sql'`, mas `supabase/migrations/20260817192700_fix_archive_active_track_assignments.sql` ordena depois desse timestamp, então `files.at(-1)` (script, linha 66) não bate com o esperado — não é artefato de checkout, o blob é o mesmo no git independente de line endings. Adicionalmente (sem disparar essa asserção específica, já que ordenam antes do boundary): `20260817083000_restore_journey_lifecycle_product_routes.sql` e `20260817083500_register_journey_unpublish_event_schema.sql` também não constam em `requiredFinalReleaseMigrations`, então o manifesto já estava incompleto mesmo antes do arquivo das 19:27. Como `validate:release-candidate` encadeia este script por último, o gate de release está vermelho hoje assim que a validação chega até aqui. Vale investigar por que a CI não pegou isso — se `repository-governance.yml` roda esse gate, deveria ter falhado no PR que introduziu esses arquivos.

### 3. [ALTO] 54 foreign keys sem índice de cobertura, concentradas fora do sweep original
Verificado ao vivo via Supabase Advisors (performance). Causa raiz identificada: `supabase/migrations/20260708222355_m08p_cover_unindexed_foreign_keys.sql:26` lista um allowlist de schemas (`iam, core, catalog, orchestration, diagnostics, assessment, engagement, intervention, eventing, integration, intelligence, governance`) que **nunca incluiu** `experience`, `behavior`, `app_private` ou `public`. Tudo que foi construído em `experience.*` depois disso (páginas/grupos B2B, extension_commands, platform_settings, tracking_links, interface_content, admin_content_revisions) ficou permanentemente fora da varredura automática. Isso também explica o padrão de "limpeza" #3 abaixo (9 migrations avulsas ao longo de 5 semanas tentando cobrir isso peça por peça, nunca o conjunto todo). Direção: rodar um sweep genérico tipo `m08p` cobrindo todos os schemas, e transformar isso num check de CI (via Advisors) em vez de migration manual.

### 4. [MÉDIO] Página de atividade não degrada graciosamente em 3 de 4 buscas paralelas
`apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx:124-131` — dentro do `Promise.all`, `practiceRuntime.listParticipant(...)` tem `.then/.catch` e degrada para um banner "temporariamente indisponível" mantendo a página renderizada. `journeyRuntime.listActivityComments`, `utilityRatingRuntime.get` e `journeyRuntime.getParticipantExperience` não têm essa proteção (confirmado que nenhum dos dois RPCs tem fallback interno). Uma falha transitória em comentários ou avaliação de utilidade — nenhum dos dois essencial para o propósito central da página — derruba a aula inteira para a tela genérica de erro em vez de degradar como a seção de prática já faz.

### 5. [MÉDIO] RLS habilitado sem nenhuma política em 52 tabelas, incluindo dado sensível
Verificado ao vivo via Supabase Advisors (security): 52 tabelas têm RLS habilitado e zero políticas — padrão deliberado (acesso só via RPCs `SECURITY DEFINER`, comentário em `20260730212300_enable_extension_rls.sql`: "fail-closed for direct Data API access"), mas não documentado em `RLS_IMPLEMENTATION.md` como padrão intencional, então cada revisão futura vai continuar sinalizando isso como se fosse gap. Mais relevante: `iam.user_cpf_identifiers` (dado `sensitive_personal` por `DATA_CLASSIFICATION_AND_HANDLING.md`) está nesse grupo — depende inteiramente de toda função `SECURITY DEFINER` que a toca estar corretamente escopada, sem camada de defesa adicional via política de RLS.

### 6. [BAIXO] Rota de download de asset de atividade provavelmente não funciona
`get_activity_asset_download` está na allowlist de `supabase/functions/authenticated-rpc/index.ts` e de `platform-extensions-rpc/index.ts`, e é referenciada em `apps/web/lib/journey-runtime/rpc.ts:256`, mas nenhuma migration em `supabase/migrations/` define `CREATE FUNCTION public.get_activity_asset_download`. Falharia fail-closed (Postgres "function does not exist"), sem risco de segurança, mas `/api/activity-assets/[assetId]/download` provavelmente está quebrada. Não confirmado ponta-a-ponta (precisa checar se existe sob outro nome ou via view) — vale um teste manual rápido.

### 7. [BAIXO] Proteção contra senha vazada desabilitada no Supabase Auth
Confirmado ao vivo via Advisors: `auth_leaked_password_protection` está desligado. É configuração do painel do Supabase Auth, não de migration. Relevante dado que `iam.user_accounts` guarda acesso a dados comportamentais/PII.

### 8. [BAIXO] Índice duplicado confirmado ao vivo
Advisors (performance) aponta `certificate_template_active_scope` (`20260730211500_platform_growth_engagement_tables.sql:123`) e `uq_certificate_template_assignments_active_scope` (`20260816011759_complete_vanessa_video_remediation.sql:172`) como funcionalmente idênticos sobre `engagement.certificate_template_assignments`.

### 9. [BAIXO] `validate:release-candidate` não cobre os testes de comportamento nem o scan de segredos
`package.json:21` — o script só encadeia gates `validate:*` (lock, lint, hygiene, migration-history, application-foundation, platform-contract, runtime-hardening). Não roda `test:application`, `test:database`, `test:product`, `test:integrations`, `scan:secrets` nem nenhum `verify:*`. Quem rodar isso localmente achando que é "o gate completo de release" tem falsa confiança — os testes de comportamento reais só rodam separadamente na CI.

---

## Organização

### 1. [ALTO] Campo de admin implementado via DOM-scraping montado globalmente
`apps/web/app/admin/journey-banner-label-field.tsx`, montado em `apps/web/app/admin/layout.tsx:5,19` — roda em toda página `/admin/*`, mas só é relevante para `apps/web/app/admin/produto/page.tsx`. Localiza seu ponto de montagem via `document.querySelector` + `MutationObserver` em `document.body` + `cta?.parentElement?.parentElement` (linha 39-40) para injetar um campo (`presentation_eyebrow`) via `createPortal`. Qualquer mudança de aninhamento JSX na página de produto quebra o campo silenciosamente, sem erro, sem checagem de tipo. Direção: substituir por um `<Input name="presentation_eyebrow">` comum, direto em `admin/produto/page.tsx`, ao lado de `presentation_cta`/`presentation_badge` (que já são inputs normais ali), e remover a montagem global do layout.

### 2. [ALTO] Numeração de migrations abandonada na metade sem atualizar a estratégia documentada
O esquema `m00`/`m08a-p`/`m13a-k` é abandonado por completo depois de `20260710165530_m15a_e14_semantic_activity_session_close.sql`; tudo depois disso é timestamp solto + descrição livre. Pior: `20260729203000_m17_runtime_hardening.sql` reintroduz um rótulo `m17` sem `m16` correspondente em `supabase/migrations` (m16 só existe em `supabase/canonical-migrations`) — o esquema não foi só abandonado, foi retomado de forma inconsistente. `docs/data/database/DATABASE_MIGRATION_STRATEGY.md` ainda descreve M00-M08 como se estivesse regendo tudo. Direção: documentar formalmente o fim do esquema `mNN`, ou parar de usar rótulos `mNN` avulsos em nomes de arquivo novos.

### 3. [MÉDIO] Um componente admin reimplementa uma camada de dados própria em vez de usar o padrão do resto do admin
`apps/web/components/admin-program-manager.tsx` usa `useState` manual + `fetch` direto para `/api/admin/programs`, sem idempotency key, enquanto o resto do admin (`journey-action.ts`, `track-actions.ts`, `publish-action.ts` etc.) usa Server Actions com `<form action={...}>` + `PendingSubmitButton` + idempotency key de forma consistente.

### 4. [MÉDIO] Testes de contrato nomeados por incidente/sprint em vez de por feature, gerando cobertura duplicada espalhada
Arquivos como `vanessa-remediation-contract.test.mjs`, `vanessa-refined-ui-and-signup-contract.test.mjs`, `final-production-visual-runtime-remediation.test.mjs`, `final-review-remediation.test.mjs`, `consolidated-audit-remediation.test.mjs`, `admin-consolidation-corrections.test.mjs` fazem `readFile` + regex sobre os mesmos arquivos de produção em paralelo (ex.: `certificate-template-previews/[fileObjectId]/route.ts` é testado em 4 arquivos diferentes; `certificate-template-manager.tsx` em pelo menos 3). Duas asserções são literalmente duplicadas byte-a-byte em arquivos diferentes: `final-completion-performance-contract.test.mjs:32-39` / `final-review-remediation.test.mjs:87-93` (outline-runtime), e `diagnostic-result-configuration-contract.test.mjs:12` / `consolidated-product-corrections.test.mjs:68` (diagnostic-result-dashboard). Como os arquivos são nomeados pelo fix/data em vez da feature, não existe um lugar único para "o teste de certificados" — a cobertura cresce de lado em vez de estender uma suíte.

### 5. [MÉDIO] `test:repository-tooling` mistura tooling real com contrato de UI/produto
`package.json:32` roda `scripts/runtime/*.test.mjs`, que mistura tooling genuíno (`load-root-env.test.mjs`, `http-public-origin.test.mjs`) com testes de conteúdo/UI que nada têm a ver com "repository tooling" (`admin-gamification-definitive.test.mjs`, `consolidated-product-corrections.test.mjs`, `definitive-platform-content-progress-certificates.test.mjs`). Quem lê o nome do script em `repository-governance.yml` não espera que ele valide copy de UI do participante.

### 6. [BAIXO] `apps/web/components/` é um diretório flat com 54+ arquivos
Já existe agrupamento de fato por prefixo (`activity-*`, `admin-*`, `diagnostic-*`, `interface-*`, `participant-*`, `quick-check-*`). Não é urgente, mas promover esses prefixos a subpastas reais (como já existe `ui/`) ajudaria se o diretório continuar crescendo.

### 7. [BAIXO] `scripts/e2e/` é o único subdiretório sem wrapper `npm run`
Os 6 scripts em `scripts/e2e/` só são invocados via `node scripts/e2e/....mjs` direto dentro de `.github/workflows/production-authenticated-audit.yml` e `production-visual-capture.yml` — sem `test:e2e`/`verify:e2e` local, é preciso reverse-engenheirar o comando exato a partir do YAML para reproduzir localmente.

---

## Limpeza

### 1. [MÉDIO] Quatro componentes órfãos confirmados (nenhuma referência de import em todo `apps/web`)
- `apps/web/components/activity-compact-workspace.tsx` — nav flutuante de seção, substituído pelo layout inline atual.
- `apps/web/components/activity-content-progress.tsx` — duplica o mapa de mensagens de conclusão e o form "Concluir aula" agora inline em `page.tsx`; carrega a mesma chave `"ok"` morta do achado de Funcionalidade #1, e seu form de conclusão (linha ~77-83) nem inclui `idempotency_key`.
- `apps/web/components/activity-workspace-frame.tsx` — seu JSX está duplicado verbatim em `apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.tsx:4-9`, que importa `layout.module.css` diretamente em vez de usar este componente.
- `apps/web/components/diagnostic-dimension-chart.tsx` — lógica de renderização de barra de dimensão duplicada (não reaproveitada) em `diagnostic-result-dashboard.tsx:77,102`, que é o componente de fato usado.

Todos parecem sobras do refactor de "restaurar tela de aula aprovada" (#257/#251). Direção: apagar os quatro.

### 2. [MÉDIO] Rotas de documento público duplicadas e com links inconsistentes
`apps/web/app/privacidade/page.tsx`, `apps/web/app/termos/page.tsx` e `apps/web/app/documentos/[tipo]/page.tsx` delegam todos ao mesmo `GovernedDocumentPage`, com `/documentos/[tipo]` cobrindo o mesmo conteúdo das duas rotas dedicadas. Pior: em `apps/web/app/cadastro/page.tsx`, o link "voltar a ver os termos" (linha 92) aponta para `/termos?version=...` (rota direta) enquanto o link de privacidade (linha 96) aponta para `/documentos/privacidade?version=...` (rota catch-all), mesmo `/privacidade` já aceitando `version` diretamente — sobra de uma migração só parcialmente concluída para fora do antigo redirect `/privacidade → /documentos/privacidade` (removido de `next.config.ts`).

### 3. [MÉDIO] 9 migrations avulsas ao longo de 5 semanas tentando cobrir FKs sem índice
`m08p_cover_unindexed_foreign_keys` (08/08), `m09d_cover_storage_foreign_keys`, `m11q_cover_scheduler_foreign_keys`, `m12h_cover_governance_foreign_keys`, `content_library_fk_indexes` (15/07), `fk_covering_indexes`/`announcement_fk_indexes`/`cover_remaining_foreign_keys` (20/07), `release_readiness_fk_indexes` (29/07), `behavior_score_fk_indexes` (31/07), `index_vanessa_remediation_foreign_keys` (15/08). Mesma causa raiz do achado de Funcionalidade #3 — o sweep original nunca cobriu todos os schemas, então o mesmo problema foi remendado peça por peça em vez de resolvido de uma vez.

### 4. [BAIXO] Regra de domínio corporativo duplicada em dois módulos
`"estimulo.org"` está hardcoded independentemente em `apps/web/lib/auth/administrative-access.ts:6` (`corporateGoogleDomain`) e `apps/web/lib/auth/administrative-email.ts:1` (`ESTIMULO_ADMIN_DOMAIN`, usada em ~19 arquivos de `app/admin/**/actions.ts`). Não é falha de segurança hoje (ambas checagens são consistentes e o gate real é a permissão RBAC checada depois), mas é fácil atualizar um e esquecer o outro se o domínio mudar.

### 5. [BAIXO] O próprio gate de higiene do repositório dá falso positivo
`npm run validate:repository` acusa `.env` e `.claude/settings.local.json` como "tracked" — confirmado via `git ls-files`/`git check-ignore` que **nenhum dos dois está versionado**. `scripts/repository/validate-hygiene.mjs` varre o filesystem local com `readdir` (linha 62-66) em vez de consultar `git ls-files`, então não respeita `.gitignore` e falha para qualquer dev com um `.env` local normal.

### 6. [BAIXO] `lint-source.mjs` não cobre `supabase/migrations/` para quebra de linha
Confirmado: `supabase/migrations/20260708220357_m00_extensions_schemas_context.sql` está com CRLF neste checkout (`core.autocrlf=true` local, blob no git é limpo em LF — `git show HEAD:...` confirma), mas `lint:source` não sinaliza isso porque só varre `scripts/database/*.sql` e não `supabase/migrations/*.sql`. O erro que aparece é o críptico "materialized file hash mismatch" do gate de migration-history, sem apontar a causa real (line-ending). Em checkouts Windows com `autocrlf=true` (padrão comum), isso pode travar `validate:release-candidate` sem pista nenhuma do motivo.

### 7. [BAIXO] Script órfão nunca invocado fora do próprio teste
`scripts/database/migration-history/materialize-migration-history.mjs` não é referenciado por nenhum `npm run`, script ou workflow de CI — só pela sua própria `materialize-migration-history.test.mjs`.

### 8. [BAIXO] Nome possivelmente pessoal em histórico permanente de schema
`index_vanessa_remediation_foreign_keys` e `complete_vanessa_video_remediation` (migrations) usam "vanessa" como identificador. Se for nome de pessoa real (não de curso/conteúdo), fica permanentemente em git ao lado de "video remediation" — vale confirmar a intenção, dado o cuidado do resto do schema com PII.

### 9. [BAIXO] Grant revogado e re-concedido sem explicação
`verify_certificate(text)` teve o `execute` revogado de `anon,authenticated` em `20260715161140_learning_credentials_verify_hardening.sql` (nome do arquivo é literalmente "verify_hardening") e foi re-concedido silenciosamente 3 semanas depois em `20260806023000_definitive_platform_content_progress_certificates.sql:~689`, sem comentário explicando a reversão. Confirmado ao vivo: `anon`/`authenticated` conseguem executar hoje. Provavelmente intencional (verificação pública de certificado), mas sem rastro do porquê.

### 10. [INFO] Drift de documentação: estado `retired` de jornada existe em produção mas não está documentado
`docs/journeys/JOURNEY_LIFECYCLE.md:10-14` e `APPLICATION_FOUNDATION.md:24` descrevem só dois estados visíveis (`draft`/`published`). O código tem um terceiro estado terminal, `retired`, com RPC própria (`retire_admin_journey`, `supabase/migrations/20260730183100_admin_journey_and_diagnostic_lifecycle.sql:41-46`), server action dedicada (`apps/web/app/admin/produto/retire-journey-action.ts`) e uso no dashboard (`apps/web/app/admin/page.tsx:51`). Também note que arquivar uma jornada usa a mesma permissão de editá-la (`journey.definition.manage`), sem separação de papéis — o que `PERMISSION_MODEL.md` seção 7 recomenda para outras ações equivalentes.

---

## Segurança (achados adicionais, fora dos já listados acima)

A postura geral é sólida — toda rota de admin/participante rastreada da página Next.js até a RPC Postgres correspondente revalida autorização no servidor (`app_private.e14_actor_has_permission` ou checagem explícita de posse do recurso), então uma checagem rasa no lado do Next.js não é, por si só, explorável aqui. Dois achados de baixa severidade:

- **[BAIXO] Rollout incompleto do fix `bb30f38e`**: o commit removeu o gate por domínio `@estimulo.org` (`isEstimuloAdministrativeEmail`) de `admin/layout.tsx`, `extension-actions.ts` e `auth/admin/callback/route.ts`, substituindo por membership + permissão RBAC. Isso **não** se propagou para outras server actions administrativas, que ainda chamam o gate antigo *além* da checagem nova: `admin/produto/actions.ts:77`, `journey-action.ts:68`, `delete-journey-action.ts:17`, `publish-action.ts:17`, `unpublish-action.ts:17`, `track-save-action.ts:19`, `gamificacao/actions.ts:42`, `experiencia/actions.ts:33`, `diagnostico/actions.ts:25`, `configuracoes/platform-settings-actions.ts:43`, `recompensas/reward-actions.ts:25`. Não é explorável (o gate antigo só torna a checagem mais restritiva), mas é inconsistência que pode confundir quem copiar um desses arquivos como modelo: a UI (`page.tsx`, já migrada) mostra controles editáveis para um membro permissionado fora do domínio `@estimulo.org`, e a action correspondente rejeita silenciosamente.
- **[BAIXO] `.env.example` com valor real em vez de placeholder**: `config/supabase-test/.env.example:1` tem `SUPABASE_URL=https://cfpfeavjlgheqqiaqtzv.supabase.co` em vez de um placeholder como o `.env.example` da raiz usa. Impacto mínimo (chave e DATABASE_URL do mesmo arquivo estão vazias, e esse project ref já está documentado como dev/test-only em outros lugares), mas viola a política de `SECRETS_ENCRYPTION_KEY_MANAGEMENT.md` de que `.env.example` só deve ter placeholders.

Verificado sem achados: IDOR em rotas de download de arquivo (todas filtram por `entrepreneur_id` resolvido no servidor), proteção de CPF (AES-256-GCM + IV aleatório + AAD por conta + HMAC com chave independente), RPCs de RBAC (sem caminho de auto-concessão), gateways RPC (allowlist + reescrita do actor no servidor, nunca confia no actor enviado pelo cliente), logging (nenhum log de body/token/CPF encontrado), segredos hardcoded (nenhum encontrado), CORS/cookies (`httpOnly`/`sameSite`/`secure` corretos; única função com CORS wildcard serve conteúdo público sem credenciais).

---

## Recomendação de priorização

Se for atacar só três coisas primeiro:

1. **Funcionalidade #1** (mensagem de conclusão órfã) — é o único item desta lista que um participante real encontra no uso normal da plataforma.
2. **Funcionalidade #2** (gate de migration-history quebrado) — bloqueia qualquer `validate:release-candidate` limpo até ser corrigido; potencialmente também expõe um buraco na CI que vale investigar.
3. **Funcionalidade #3 / Limpeza #3** (sweep de FK indexes) — mesma causa raiz, alto número de tabelas afetadas (54 FKs), e resolve de uma vez um padrão que já gerou 9 migrations de remendo.

Os achados de Organização/Limpeza restantes são de baixo risco individual, mas coletivamente indicam um padrão real: partes deste código evoluem por remendo incidente-a-incidente (testes nomeados por sprint, migrations de índice avulsas, refactors que deixam componentes órfãos) em vez de consolidação. Vale considerar uma passada de consolidação depois de resolver os itens de alto impacto acima.
