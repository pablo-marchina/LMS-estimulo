# Redesign intuitivo do frontend — Plataforma Estímulo

Data: 2026-07-23
Status: aprovado para plano de implementação

## Objetivo

A interface atual funciona mas não é intuitiva. O objetivo máximo desta iniciativa é
tornar a plataforma simples e óbvia de usar, tanto para o participante quanto para o
administrador — **antes** de qualquer preocupação estética. O critério de aceite de
cada tela é: fluxo lógico linear, próxima ação óbvia, nenhum elemento que não ajude a
pessoa a avançar. Beleza visual é aplicada **depois** que o fluxo de uma tela está
correto, como reforço de hierarquia e clareza — nunca como decoração que compete com a
função. A skill `impeccable` é usada tela a tela durante a implementação, sempre depois
de a estrutura/fluxo estar definida, nunca antes.

Este documento cobre 6 frentes de trabalho, decompostas a partir de um pedido único
porque tocam subsistemas distintos (identidade/HubSpot, conteúdo, gamificação, admin),
mas compartilham um único design system e devem ser entregues como uma revisão
coerente da plataforma.

**Público-alvo — leigo em tecnologia, dos dois lados.** Tanto o participante quanto o
administrador da Estímulo são pessoas leigas em tecnologia. Isso vale para toda
decisão de interface nas 6 frentes, não só para a remoção de JSON do admin:
- Nenhuma tela exige que a pessoa entenda um conceito técnico (IDs, status internos,
  nomenclatura de sistema, sigla de área) para completar sua tarefa.
- Nenhuma ação exige mais de uma interpretação — o rótulo do botão/link já diz o que
  vai acontecer, sem a pessoa precisar inferir.
- Mensagens de erro/estado (ex.: identidade pendente de resolução, conteúdo bloqueado)
  são escritas em linguagem cotidiana, nunca com termos como "match", "payload",
  "sync", "webhook" etc., mesmo quando o código internamente usa esses termos.
- Onde uma tela precisar de uma ação avançada/pouco frequente, ela fica secundária
  (menos destaque visual), nunca no mesmo nível de prioridade que a ação principal.

## Autoridade e fontes

Por ordem de precedência (`CONTRIBUTING.md`): `premissas-desenvolvimento.md` (raiz do
repo) > outros docs de produto > decisões aprovadas posteriores > issues > ADRs/código.
Para o diagnóstico especificamente, `DIAGNOSTIC_PURPOSE_AND_GUARDRAILS.md` insere
`ref/estimulo-ref/estimulo-ref/trabalho.md` e `arquetipos_estimulo.md` entre premissas e
o resto. Onde este spec toma uma decisão de UX que não está em nenhum doc canônico, isso
está marcado explicitamente como decisão de produto desta revisão, não como fato
pré-existente.

Docs consultados: `premissas-desenvolvimento.md`, `docs/architecture/IDENTITY_BRIDGE.md`,
`docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md`,
`docs/decisions/HUBSPOT_SCOPE_DECISION.md`, `docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md`,
`docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md`, `docs/research/DIAGNOSTIC_*.md`,
`docs/domain/PERMISSION_MODEL.md`, `docs/domain/DOMAIN_MODEL.md`,
`docs/product/MULTI_JOURNEY_PRODUCT_SCOPE.md`, `docs/journeys/OPENAI_*.md`,
`docs/data/database/GAMIFICATION_LEDGER_MODEL.md`,
`docs/security/DATA_CLASSIFICATION_AND_HANDLING.md`,
`docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md`,
`ref/estimulo-ref/estimulo-ref/arquetipos_estimulo.md` e demais arquivos da mesma pasta,
código atual de `apps/web/app/**`, `apps/web/lib/hubspot/**`, `apps/web/components/**`.

## Fora de escopo (explícito)

- Telas de admin **Operação, Relatórios, Maturidade, Integrações, Anúncios** — permanecem
  como estão. Só recebem tratamento se surgir necessidade trivial durante o trabalho.
- Motor de regra genérica (`expression`/`input_schema`/`output_schema` em JSON-logic) para
  acesso a trilha — substituído por um seletor de arquétipo(s)/"todos". Se alguma trilha
  hoje depender de uma regra mais complexa que isso, precisa ser identificada e migrada
  manualmente antes de remover a superfície JSON (a verificar na implementação).
- Prova ao vivo da integração HubSpot (sandbox) — pendente de liberação institucional,
  tratada como gate externo (ver "Riscos e gates institucionais").
- Conteúdo oficial do questionário de diagnóstico (redação/pontuação aprovada) — pendente
  de aprovação institucional; esta revisão entrega o motor + admin editável, semeado com
  o rascunho existente.

---

## Frente 1 — Login & Identidade (HubSpot)

> **Correção pós-verificação profunda (2026-07-23):** a primeira pesquisa (agentes
> Explore, leitura por amostragem) errou o estado atual desta frente. Releitura completa
> dos arquivos e dos testes (`scripts/application/auth-entrypoints.test.mjs`,
> `identity-policy.test.mjs`) mostrou que boa parte já existe e é testada. A seção abaixo
> reflete o estado real.

**Já implementado e testado — reaproveitar, não recriar:**
- `/cadastro` (nome, empresa opcional, email, senha) → `client.auth.signUp` com
  `emailRedirectTo` → `/auth/confirm` (confirmação por PKCE, com recuperação de
  `bad_code_verifier`, reenvio com rate-limit tratado, tudo testado).
- `/cadastro/concluir` (pós-confirmação): já coleta **nome** e **CPF** (obrigatório,
  validado por dígito verificador, protegido via `apps/web/lib/identity/cpf.ts` —
  `protectCpf`/`isValidCpf`, AES-GCM + HMAC independentes, nunca grava o CPF bruto em
  metadata/URL/log) e **nome do negócio** (opcional). Já trata `CPF_ALREADY_LINKED_TO_
  ANOTHER_ACCOUNT` e `CPF_CHANGE_REQUIRES_IDENTITY_REVIEW` como erros de dedup interno.
- **UTM** já é capturado: `apps/web/lib/auth/first-touch.ts` lê `utm_source/medium/
  campaign/term/content` da URL quando a pessoa chega em `/cadastro`, guarda em cookie
  HttpOnly (`estimulo_first_touch`), e `/cadastro/concluir` já lê esse cookie e passa a
  atribuição para `provisionPublicSignupParticipant`.
- Login admin (`/entrar/administracao`) já é Google-OAuth-only, domínio
  `@estimulo.org` verificado via claims + RBAC ativo — nada a mudar aqui.
- `sync-policy.ts` já classifica CPF como `linking_identifier` e já tem UTM/engagement
  tratados — conferir na implementação se falta algum campo específico antes de mexer.

**Genuinamente ausente (confirmado por grep no repo inteiro — zero ocorrências de
`single_match`/`no_match_create`/`multiple_matches`/`conflict_blocked` fora dos docs):**
- **Nenhuma lógica de busca/match de contato no HubSpot existe.** `apps/web/lib/hubspot/
  {contracts,sync-policy,gateway}.ts` são contrato/política, não implementação — não há
  código que busque um contato existente por CPF/email/telefone e decida vincular vs.
  criar. Isso é trabalho novo, a construir contra a interface já existente
  (`gateway.ts`), testável via `in-memory-adapter.ts` (ligar `http-adapter.ts` no
  HubSpot real é troca de configuração, não código novo).
- **Telefone e CNPJ não são coletados em nenhum lugar hoje.**

**Decisão de escopo revisada:** dado que o fluxo atual (`/cadastro` → confirmação →
`/cadastro/concluir`) já é testado e cobre PKCE/reenvio/rate-limit, **não vamos
substituí-lo por um campo único de email** como eu tinha desenhado antes — isso jogaria
fora cobertura de teste real por uma "mágica" de roteamento que pode inclusive confundir
mais um usuário leigo (ela não vê o que está acontecendo). Mantemos os dois pontos de
entrada visíveis, claros ("Entrar" / "Criar conta"), e:
1. Adicionamos **telefone** e **CNPJ (opcional)** em `/cadastro/concluir`, junto ao CPF
   já coletado ali.
2. Nesse mesmo passo (depois que a conta já está confirmada e os dados coletados),
   chamamos a nova lógica de matching contra o HubSpot:
   - contato existente (cliente de crédito) → vincula ao HubSpot ID existente.
   - nenhum contato → cria contato novo, vincula ao ID novo.
   - ambíguo/conflito → nunca vincula automaticamente; cai numa fila de "identidades a
     resolver" visível na tela admin de Usuários; a pessoa vê uma mensagem neutra
     ("estamos confirmando seus dados"), sem linguagem técnica.
   - matching nunca usa email isolado — sempre CPF+email+telefone combinados.

---

## Frente 2 — Landing page (`/`)

Hoje é um redirect de uma linha para `/entrar`. Vira página de marketing real:

- Topo: logo + **um único** CTA "Entrar" (não dois botões concorrentes — quem nunca
  acessou não deveria ter que decidir "entrar vs cadastrar").
- Hero: headline + subheadline curtas.
- Bloco de números institucionais (3–4 números, não uma lista longa) — a confirmar
  contra os docs institucionais (`ref/estimulo-ref/estimulo-ref/Estímulo-Institucional.md`,
  `teoria-mudança*.md`) antes de finalizar a redação, não inventar números na
  implementação.
- Teaser "descubra seu arquétipo empreendedor" com os 4 ícones (🔨💪🧱🧭), uma frase
  cada, sem jargão.
- Rodapé simples: links institucionais + CTA "Entrar" repetido.
- Usa os tokens de marca já existentes em `apps/web/app/globals.css` (paleta já
  reconciliada com o brand book) — sem re-extração de cores do PDF/AI do brand book.

---

## Frente 3 — Diagnóstico de arquétipo (usuário + admin)

### Lado participante
- Já é orientado a dados (`journeyRuntime`), não hardcoded — mantido.
- Uma pergunta por tela (não formulário de rolagem longa), barra de progresso "N de 12",
  botão "Pular por agora" sempre visível e discreto.
- **Resultado**: arquétipo com ícone/nome/frase + explicação curta do que significa para
  a jornada. Sem tabela de pontuação, sem exposição das 5 dimensões cruas nesta tela.
- **Novo — "Ver minhas respostas"** (acessível a partir do Resultado e também do Perfil,
  só para quem completou o formulário):
  - Lista as 12 perguntas com a resposta dada, em linguagem legível (nunca peso/código
    numérico).
  - Agrupadas pelas 5 dimensões (Gestão financeira, Disciplina/hábito,
    Visão/planejamento, Perfil empreendedor, Crédito/risco).
  - **Gráfico de desempenho por dimensão** (radar ou barras horizontais, a decidir na
    implementação usando a skill `dataviz`): mostra o perfil da pessoa nas 5 dimensões
    de forma qualitativa (ex.: preenchimento proporcional/faixa baixo-médio-alto) — **sem
    expor pontuação numérica bruta, pesos ou os cortes que definem o arquétipo**. O
    gráfico comunica "como você se saiu", não "como isso foi calculado" — mantém a
    lógica de corte/pontuação como informação de calibração do produto, não do
    participante.

### Lado admin (`admin/diagnostico`)

> **Correção:** confirmado por leitura integral do arquivo — os 4 campos JSON são reais
> (`configuration`, `dimensions`, `items`, `archetypes`, salvos via `saveAdminProductResource`
> → RPC `save_admin_product_resource` → tabelas `diagnostics.diagnostic_definitions/
> diagnostic_versions/dimensions/items/item_options/archetype_definitions/
> archetype_versions`). **Este editor NÃO usa o motor `lib/configurable-product/*`**
> (`FormDefinition/FormVersion/...`) descrito em `CONFIGURABLE_PRODUCT_ENGINE.md` — esse
> motor é uma peça lógica separada e não integrada às rotas (`application_routes_
> integrated = false`, conforme o próprio doc). Também existe um artefato estático
> independente, `config/official-diagnostic/v3/manifest.json`, validado por
> `scripts/product/official-diagnostic/validate-configuration.mjs` (gate de CI
> `test:official-diagnostic`) — esse manifesto **não tem nenhuma ligação de código com
> o editor admin**; é uma checagem de compliance separada sobre um arquivo estático.
> **Decisão:** construir a nova UI em cima do RPC `save_admin_product_resource` que o
> editor já usa (é o sistema vivo/editável), sem tentar integrar o motor
> configurable-product nem o manifesto estático — isso fica fora de escopo, é uma
> divergência arquitetural pré-existente para o time decidir separadamente, não algo
> que esta revisão de UX precisa resolver.

Hoje: 4 campos `<Textarea className="font-mono text-xs">` de JSON cru
(`configuration`, `dimensions`, `items`, `archetypes`). Substituído por fluxo em etapas,
mantendo a mesma RPC de leitura/escrita já existente:

1. **Arquétipos** — nome/ícone/tom, os 4 já seedados (Fazedor, Batalhador, Construtor,
   Navegador).
2. **Dimensões** — as 5 já seedadas.
3. **Perguntas** — lista das 12, cada uma com enunciado/opções/tipo/dimensão associada;
   adicionar/editar/remover/reordenar por formulário normal, não JSON.
4. **Critério de pontuação** — tabela editável dimensão→arquétipo (não JSON-logic).
5. **Publicar** — rascunho → preview → publicado, versionado (o motor de versionamento
   já existe via `FormDefinition/FormVersion/...` em `CONFIGURABLE_PRODUCT_ENGINE.md`,
   só a UI muda).

Semeado com o conteúdo de `arquetipos_estimulo.md` (12 perguntas, 5 dimensões), com
aviso permanente "Rascunho — pendente de aprovação institucional" até publicação
deliberada.

---

## Frente 4 — Trilha com acesso por arquétipo (admin Produto)

> **Correção — esta é a maior mudança de escopo da revisão.** Eu tinha assumido, com
> base na documentação (`DOMAIN_MODEL.md`'s `AssignmentPolicy`), que o gating por
> arquétipo já existia no domain model e só faltava UI. **Isso está errado.** Grep
> completo do repositório (código + migrações) confirma: `orchestration.path_templates`
> e `orchestration.path_steps` não têm nenhuma coluna de arquétipo/segmento;
> `orchestration.assignment_policies` existe como tabela mas não tem nenhuma UI em
> `admin/produto` nem é lido por nenhum RPC de leitura de jornada; `diagnostics.
> archetype_assignments` registra o arquétipo do participante mas nada hoje o consome
> para filtrar acesso a trilha. **Hoje o acesso a trilha não é restrito por arquétipo de
> forma nenhuma** — só existe `is_default` (um único caminho padrão por versão de
> jornada) e regras json-logic genéricas não usadas para isso.
>
> Isso significa que a Frente 4 é **trabalho novo de schema + RPC**, não só uma troca de
> JSON por UI. Dado o princípio de simplicidade (leigos dos dois lados), a recomendação é
> **não** tentar reaproveitar o motor de regra genérica json-logic (`rule_definitions`/
> `rule_versions`) para isso — é overkill e reintroduz complexidade técnica. Em vez
> disso: adicionar uma coluna/tabela de associação direta e simples (ex.:
> `path_templates.eligible_archetype_codes text[]`, `null`/vazio = todos), expor como
> chips na UI, e filtrar por ela no read-path que hoje decide qual caminho/jornada o
> participante vê (esse read-path ainda precisa ser localizado durante o planejamento —
> não foi confirmado nesta rodada de pesquisa).

Hoje: `admin/produto/page.tsx` usa textareas JSON para `configuration`,
`asset_accessibility`, `allowed_evidence_types`, `metadata` (blocos `journey`/`activity`/
`path_step`), e um motor de regra genérico (`expression`/`input_schema`/`output_schema`
no recurso `rule`). Substituído por:

1. **Dados da trilha** — nome, descrição, capa.
2. **Acesso** — chips de arquétipo(s) ou "Todos", gravados na nova coluna/tabela simples
   descrita acima (sem expressão livre, sem passar pelo motor de regra genérico).
3. **Blocos** — lista expansível/reordenável, cada bloco com título + descrição/label.
4. **Atividades por bloco** — nome, tipo de conteúdo, seleção de item da Biblioteca de
   Conteúdo por busca (não colar configuração), obrigatória sim/não, pontos. Atividades
   de um bloco não precisam ordem entre si.

Regra de desbloqueio de selo/certificado: 100% de progresso na trilha — a emissão em si
(`issue_learning_credentials`) já existe e funciona; o que falta é só sinalizar isso de
forma óbvia dentro da própria tela de trilha (ver correção na Frente 5 — hoje esse aviso
só aparece na tela separada de Credenciais).

---

## Frente 5 — Telas do participante

> **Correção — a maior parte já existe e funciona; o trabalho real aqui é menor do que
> eu tinha desenhado.** Leitura completa dos testes de banco + das páginas confirma:
> - **Comentários** na atividade: já implementado ponta a ponta (thread real, moderação,
>   RPCs `create_activity_comment`/`list_activity_comments`).
> - **Avaliação 5 estrelas**: já implementada (`rate_activity_utility`, UI de rádio
>   1–5 já renderizada).
> - **Pergunta curta de verificação de aprendizagem**: **já existe, e já é mais robusta
>   do que eu tinha pedido** — é um quiz de múltipla escolha (`submitQuickCheckAction`),
>   com nota mínima, limite de tentativas e trava por seção lida (`canAssess`). Não é
>   trabalho novo, é reaproveitar o que já está na página de atividade.
> - **Entregas**: página já construída ponta a ponta (upload, scan, revisão, status).
> - **Certificados**: emissão e verificação pública já funcionam
>   (`issue_learning_credentials`, `verify_certificate`). Só a **revogação** tem schema
>   pronto (`revoked_at`/`revocation_reason`) mas nenhuma RPC de escrita — gap pequeno,
>   incluir só se o usuário quiser revogação nesta rodada.
> - **Trilha em blocos expansíveis**: já implementada (`<details>/<summary>` por módulo,
>   com barra de progresso por módulo e abertura automática do módulo atual). O que
>   falta aqui é só o aviso de "100% libera selo/certificado" **dentro** dessa página —
>   hoje essa informação só aparece na tela separada `/empreendedor/credenciais`.
> - **Biblioteca (participante)**: já totalmente construída (busca/filtro/paginação +
>   página de detalhe).
>
> O trabalho real da Frente 5, portanto, é: (a) o hub único de Engajamento (item novo de
> IA, ver abaixo), (b) o aviso de desbloqueio dentro da tela de trilha, (c) confirmar o
> estado da Home (não verificado nesta rodada — ver nota), e (d) o passe visual/IA de
> simplificação sobre telas que já funcionam mas não foram desenhadas pensando em
> usuário leigo.
>
> **Sobre a Biblioteca (participante) e o mecanismo de dois eixos que você confirmou:**
> hoje não existe um toggle "liberado para navegação livre" separado — o que existe é o
> status de versão do item (`draft`/`published`/`retired`, em `catalog.
> library_item_versions`) mais uma `visibility` (`authenticated`/`organization`, que
> define QUEM pode ver, não SE aparece). A listagem do participante filtra estritamente
> por `status = 'published'`. Não confirmei nesta rodada se uma atividade de trilha
> consegue referenciar um item ainda em `draft` (não publicado) — se conseguir, o
> mecanismo de dois eixos que você pediu já existe naturalmente (draft = só usável em
> trilha, published = também aparece na Biblioteca livre); se não conseguir, é preciso
> um campo novo. Vou verificar isso como primeira tarefa da Frente 4/6 no plano, não
> preciso de decisão sua agora — é um detalhe técnico a confirmar, não um ponto de
> produto em aberto.
>
> **Home — verificada, leitura completa do arquivo.** Já tem: carrossel de anúncios,
> card "Continue de onde parou" com progresso e CTA, resumo da rota (próximas 3
> atividades), grid de "outras jornadas" já atribuídas, prévia de recompensas com "ver
> todas", prévia de ranking com "ver histórico", resumo de credenciais. Está bem mais
> pronta do que eu tinha assumido. O que falta: (a) hoje "outras jornadas" mostra só
> jornadas já instanciadas/atribuídas ao participante — não existe uma listagem
> "Trilhas" navegável e independente da Home (catálogo de trilhas disponíveis para
> começar, filtrado por arquétipo); isso nasce naturalmente junto da Frente 4, quando o
> read-path de elegibilidade por arquétipo for criado. (b) reordenar/simplificar a
> densidade visual desta home pensando em usuário leigo (ela já tem muita informação
> por tela — candidata a reorganização, não a reconstrução).

### Home
Ordem por prioridade de ação: menu superior → "Continue de onde parou" (card único com
trilha em andamento + progresso + botão, omitido se não houver nenhuma) → carrossel de
anúncios → trilhas disponíveis para o arquétipo da pessoa (grid) → prévia de recompensas
(1 linha, não duplica a tela de Engajamento). Sem widgets não pedidos.

### Trilhas (lista)
Grid de trilhas com progresso, filtrado automaticamente por arquétipo — nunca mostra
trilhas sem acesso.

### Trilha (detalhe)
Cabeçalho (nome/descrição/progresso geral) → blocos expansíveis (accordion) com
título+descrição/label → atividades dentro (nome, ícone de tipo, status), ordem livre →
banner persistente "100% libera selo e certificado" com barra de progresso.

### Atividade (detalhe)
Breadcrumb (trilha > bloco > atividade) → visualizador de conteúdo adaptado ao tipo
(vídeo/PDF/link externo, interno ou de terceiro) → pergunta curta de verificação de
aprendizagem (resposta imediata, não bloqueia avanço, não é nota) → avaliação 5 estrelas
→ comentários (lista + novo comentário). Botão "Marcar como concluída" sempre visível.

### Biblioteca (participante)
Grid/lista só dos conteúdos com o toggle "liberado" ativo no admin, filtro por label. Sem
distinção "próprio vs terceiro" (irrelevante para o participante).

### Perfil
Três blocos: **Certificados** (lista + download/print), **Resultado do formulário**
(arquétipo + link "Ver minhas respostas" com o detalhe/gráficos da Frente 3, só se tiver
respondido), **Histórico de engajamento** (resumo curto + link "ver tudo" para o hub de
Engajamento, sem duplicar conteúdo).

### Engajamento (hub único)
Uma tela com 5 seções: **Conquistas** (selos/certificados obtidos), **O que você pode
ganhar** (conquistas disponíveis, não obtidas), **Histórico de pontuação** (extrato),
**Ranking** (posição + lista, sem comparação agressiva), **Entregas** (submissões de
atividades práticas por trilha, com status de revisão). Substitui os 3 itens hoje
separados no menu (Pontuação/Conquistas/Entregas) — menu superior passa a ter um único
item "Engajamento" no lugar dos 3.

---

## Frente 6 — Admin restante

- **Usuários** — mantém estrutura simples atual; adiciona aba/filtro "Identidades
  pendentes de resolução" (da Frente 1), com ação "vincular a este contato" / "criar novo
  contato", sem expor a lógica de matching ao admin.
- **Biblioteca (admin)** — upload de conteúdo (nome, tipo, arquivo ou link, labels),
  toggle "Liberado na Biblioteca do participante" por item, filtros por label/tipo/status
  de liberação. Um conteúdo pode estar associado a uma trilha sem estar liberado para
  navegação livre, e vice-versa — dois eixos de visibilidade independentes.
- **Gamificação** — troca `recurrence_policy`/`validity_policy` em JSON por campos de
  formulário (frequência, validade, pontos por ação).
- **Home do admin** — troca `<pre>{JSON.stringify(...)}</pre>` por cards-resumo
  (usuários, trilhas ativas, diagnósticos pendentes de publicação, identidades
  pendentes), cada card levando à tela relevante.

---

## Riscos e gates institucionais (não resolvidos por código)

- **Sandbox/API do HubSpot**: pendente de liberação institucional. A lógica de matching
  é implementada e testável contra o adaptador em memória; a ativação do adaptador HTTP
  real é configuração, não trabalho de código novo, mas não pode ser "provada" em
  produção até o sandbox ser liberado.
- **Conteúdo oficial do diagnóstico**: redação/pontuação final ainda não aprovadas pela
  Estímulo — o admin recebe o motor + rascunho seedado, marcado como tal.
- Nenhum destes bloqueia a entrega de código; ambos devem ser sinalizados como
  pendências externas, não reportados como concluídos.

## Ordem de implementação

1. Login/Identidade + UTM (fundação — o resto depende de saber quem é o usuário e seu
   arquétipo).
2. Landing page.
3. Diagnóstico (admin + participante) + acesso a trilha por arquétipo.
4. Telas do participante (Home, Trilhas, Trilha, Atividade, Biblioteca, Perfil,
   Engajamento).
5. Admin restante (Usuários, Biblioteca admin, Gamificação, Home admin).
6. Auditoria visual final de consistência entre todas as telas (skill `impeccable`
   aplicada continuamente desde a Frente 2 em diante, tela por tela, não como fase
   isolada no fim).
