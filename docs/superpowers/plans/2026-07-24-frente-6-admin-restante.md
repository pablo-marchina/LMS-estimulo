# Frente 6 — Admin restante

Data: 2026-07-24
Branch: `refactor/web-frontend-rebuild`
Companion spec: `docs/superpowers/specs/2026-07-23-frontend-redesign-design.md`

## Objetivo

Concluir o redesign administrativo para pessoas leigas em tecnologia sem alterar as telas explicitamente fora de escopo. A Frente 6 cobre: Usuários/identidades, Biblioteca, Gamificação e Home administrativa.

## Princípios de implementação

- Nenhum fluxo normal exige código, UUID ou JSON.
- Toda escrita sensível é autorizada, idempotente e auditada.
- HubSpot continua sendo um gate externo: a UI registra decisões e usa `integration.external_object_mappings`/`sync_jobs`; não simula criação remota.
- Associação a jornada e descoberta na Biblioteca são eixos independentes.
- A Home é um painel de entrada; a operação existente muda para `/admin/operacao` sem ser reconstruída.
- Migrações são aditivas e verificadas ao vivo no Supabase dev.

## Task 1 — Fila de identidades pendentes

### Backend

- Criar `integration.identity_resolution_cases` com estados `pending`, `awaiting_integration`, `queued`, `resolved`, `dismissed`.
- Armazenar somente identificadores necessários, motivo e candidatos já retornados pelo matching; nunca CPF bruto.
- Criar `enqueue_identity_resolution_case` para o processo de matching/integration worker.
- Criar `list_admin_identity_resolution_cases` para leitura administrativa segura.
- Criar `resolve_admin_identity_resolution_case`:
  - `link_existing`: cria/atualiza `integration.external_object_mappings` quando existir conexão HubSpot ativa; caso contrário mantém a decisão como `awaiting_integration`.
  - `create_new`: cria `integration.sync_jobs` quando conexão e mapping publicados existirem; caso contrário mantém `awaiting_integration`.
  - `dismiss`: encerra o caso com justificativa.
- Permissão: `iam.accounts.manage` ou `integration.manage`.

### Web

- Adicionar runtime TypeScript e ações de servidor.
- Em `/admin/usuarios`, manter gestão de papéis e adicionar seção/filtro de identidades pendentes.
- Ações em linguagem cotidiana: “Vincular a este contato”, “Criar novo contato” e “Arquivar caso”.

## Task 2 — Biblioteca com upload e dois eixos

### Backend

- Adicionar a `catalog.library_item_versions`:
  - `discoverable_in_library boolean not null default true`;
  - `file_object_id uuid null`.
- Expandir `content_kind` para `article`, `external_link`, `file`.
- Atualizar `save_library_content_draft`, `list_operator_library_content`, `list_library_content` e `get_library_content`.
- O catálogo livre filtra `discoverable_in_library = true`; vínculos com jornadas continuam independentes.
- Criar perfil de upload `library_content` e RPCs específicos de intenção/confirmação reutilizando `core.file_upload_*`/`file_objects`.

### Web

- Adicionar upload privado para PDF, imagens, texto e DOCX até 6 MB.
- Remover slug editável; derivá-lo no servidor.
- Adicionar toggle “Liberado na Biblioteca do participante”.
- Adicionar filtros administrativos por termo, label, tipo, status e liberação.
- Mostrar claramente associação a jornadas e navegação livre como dois estados separados.

## Task 3 — Gamificação sem JSON e códigos

- Derivar códigos no servidor.
- Substituir `recurrence_policy` por campos:
  - frequência (`uma vez`, `por atividade`, `por avaliação`, `diária`, `semanal`, `ilimitada`);
  - máximo de concessões;
  - pontos por ação.
- Substituir `validity_policy` por:
  - sem validade ou validade em meses;
  - data de expiração calculada pelo motor, não digitada como JSON.
- Manter seleção de regras/versionamento existente, com rótulos humanos.
- Adicionar testes garantindo ausência de textareas JSON e campos de código.

## Task 4 — Home administrativa

- Mover a tela operacional atual para `/admin/operacao`.
- Fazer `/admin` virar “Visão geral” com cards:
  - usuários;
  - jornadas publicadas;
  - diagnósticos em rascunho;
  - identidades pendentes;
  - práticas aguardando revisão;
  - comentários visíveis para moderação.
- Cada card leva à tela/âncora correspondente.
- Atualizar navegação: “Visão geral” e “Operação” separados.
- Remover o `<pre>{JSON.stringify(...)}</pre>` da operação e apresentar evidência selecionada como campos legíveis.

## Task 5 — Verificação e handoff

- Aplicar migrações no Supabase dev e testar os RPCs com casos sintéticos transacionais/limpeza.
- Adicionar testes Node estruturais para as quatro superfícies.
- Rodar build Vercel e confirmar TypeScript/rotas.
- Registrar `.superpowers/sdd/frente-6-report.md` e atualizar `.superpowers/sdd/progress.md`.

## Critérios de aceite

1. Nenhuma das quatro telas pede JSON, código ou UUID em fluxo normal.
2. A Biblioteca permite arquivo/link/artigo e separa associação de jornada da descoberta livre.
3. Uma decisão de identidade nunca é perdida quando HubSpot está desconectado.
4. A Home mostra prioridades em cards e a operação continua disponível separadamente.
5. Build de produção e migrações chegam a estado verificado.