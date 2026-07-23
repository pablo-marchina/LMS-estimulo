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

Estado atual: `/entrar` (email+senha) e `/cadastro` (nome/empresa/email/senha) são dois
formulários genéricos, sem nenhuma lógica de HubSpot, CPF ou UTM implementada — apenas
contratos/políticas (`apps/web/lib/hubspot/{contracts,sync-policy,gateway}.ts`) existem.

**Novo fluxo, ponto único de acesso (`/entrar`):**

1. Campo único: **email** → botão "Continuar". O sistema decide o próximo passo, a
   pessoa nunca escolhe entre "entrar" ou "cadastrar".
2. Email já vinculado a conta Supabase → campo de senha, autentica, vai para Home (ou
   Diagnóstico se primeiro login).
3. Email sem conta → formulário de identificação: **nome, CPF, telefone, CNPJ
   (opcional)**. Ao enviar, roda resolução de identidade contra HubSpot, seguindo os
   match states de `IDENTITY_BRIDGE.md`:
   - `single_match` (cliente de crédito já existente no HubSpot) → vincula conta interna
     ao HubSpot ID existente.
   - `no_match_create` → cria contato novo no HubSpot com os dados coletados, vincula
     conta interna ao ID novo. Progresso/arquétipo futuro cai no mesmo contato.
   - `multiple_matches_manual_resolution` / `conflict_blocked` → **nunca** faz link
     automático (regra do doc — nunca mesclar por coincidência de email). Cai numa fila
     de "identidades a resolver", visível na tela admin de Usuários. A pessoa vê uma
     tela neutra ("estamos confirmando seus dados"), sem linguagem técnica.
   - Casos `existing_contact_new_company` / `existing_contact_existing_credit` tratados
     conforme a mesma lógica documentada, sem tela nova dedicada nesta rodada.
4. Matching nunca usa email isolado — sempre CPF+email+telefone combinados.
5. **UTM**: capturado silenciosamente da querystring em `/entrar` (sem campo visível),
   persistido junto ao evento de resolução de identidade.

**Implementação técnica:**
- Lógica de matching implementada contra a interface já existente
  (`gateway.ts`/`contracts.ts`), testável via `in-memory-adapter.ts`. Ligar no HubSpot
  real via `http-adapter.ts` é troca de configuração, não código novo — destrava sozinho
  quando o sandbox for liberado (ver gates).
- `sync-policy.ts`: adicionar UTM (`utm_source/medium/campaign/term/content`) como
  `engagement_signal` no allowlist. Campos hoje bloqueados (arquétipo, maturidade)
  continuam bloqueados — nenhuma mudança de classificação além de UTM.
- CPF precisa de HMAC + criptografia (`DATA_CLASSIFICATION_AND_HANDLING.md`) — verificar
  se já existe utilitário no repo antes de implementar; se não, é peça nova.

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
Hoje: 4 campos `<Textarea className="font-mono text-xs">` de JSON cru
(`configuration`, `dimensions`, `items`, `archetypes`). Substituído por fluxo em etapas:

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

Hoje: `admin/produto/page.tsx` usa textareas JSON para `configuration`,
`asset_accessibility`, `allowed_evidence_types`, `metadata`, e um motor de regra genérico
(`expression`/`input_schema`/`output_schema`). Substituído por:

1. **Dados da trilha** — nome, descrição, capa.
2. **Acesso** — chips de arquétipo(s) ou "Todos" (mapeia para o `AssignmentPolicy` já
   existente no domain model, sem expressão livre).
3. **Blocos** — lista expansível/reordenável, cada bloco com título + descrição/label.
4. **Atividades por bloco** — nome, tipo de conteúdo, seleção de item da Biblioteca de
   Conteúdo por busca (não colar configuração), obrigatória sim/não, pontos. Atividades
   de um bloco não precisam ordem entre si.

Regra de desbloqueio de selo/certificado: 100% de progresso na trilha — já modelada via
critérios de badge/certificado, só a UI precisa deixar isso óbvio (barra de progresso +
mensagem persistente).

---

## Frente 5 — Telas do participante

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
