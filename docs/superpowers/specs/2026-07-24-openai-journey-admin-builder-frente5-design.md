# OpenAI Demo Journey, Guided Admin Journey Builder, and Frente 5 — Design

> **Companion to** `docs/superpowers/specs/2026-07-23-frontend-redesign-design.md` (the
> Frente 1–6 frontend redesign spec). This document extends Frente 4/5 of that spec with
> three additions decided after Frente 3+4 shipped: (1) a real content journey
> ("Capacitação em IA para MEI/ME – Estímulo <> OpenAI"), (2) a guided admin journey
> builder replacing the raw ID/JSON `admin/produto` forms, (3) a terminology correction
> (jornada vs. trilha) that Frente 5's participant screens must apply consistently. It
> does not repeat Frente 5's already-approved screen inventory (Home, Atividade,
> Biblioteca, Perfil, Engajamento) — those proceed as specced in the companion document,
> with the terminology fix folded in.

## Terminology (binding for all work in this document and Frente 5)

- **Jornada** — the top-level enrollable, publishable unit. Database: `catalog.
  journey_definitions` / `journey_versions`. This is what gets archetype-gated
  (`eligible_archetype_codes`, Frente 3+4 Task 6) and what a participant self-enrolls
  into (Frente 3+4 Task 7/8).
- **Trilha** — a block/module *inside* a jornada. Database: `orchestration.
  path_templates`. A jornada has one or more trilhas.
- **Aula** — an activity inside a trilha. Database: `orchestration.path_steps` +
  `catalog.activity_versions`. A trilha has one or more aulas, in order.

This corrects a real inconsistency: Frente 3+4's Task 8 built a participant catalog page
at `/empreendedor/trilhas` that actually lists **jornadas** (it calls
`e14_list_eligible_journeys`, and gates at the journey_version level). The data model
was right — journeys are correctly the gated/enrollable unit — but the page's copy and
route call them "trilhas." This document's Task 1 renames that surface. Everywhere else
in the existing codebase (`admin/produto`'s "Trilha e bloco" section,
`/empreendedor/jornada/[journeyInstanceId]`) already uses this vocabulary correctly.

## Goal

1. Build the real "Capacitação em IA para MEI/ME – Estímulo <> OpenAI" jornada —
   structure and reusable content now, final instructional copy later — from the three
   source documents in `ref/estimulo-ref/estimulo-ref/trilha-0{1,2,3}-*.docx.md`.
2. Replace `admin/produto`'s flat, ID-driven, resource-by-resource forms with a single
   guided builder: create a jornada, add trilhas to it, add aulas to each trilha —
   without ever typing or pasting a UUID or raw JSON. This becomes the standard way to
   build *any* jornada from now on, not a one-off for this content.
3. Fix the trilha/jornada terminology on the participant catalog page (Frente 3+4 Task 8).
4. Everything else in Frente 5 (Home reorganization, Engajamento hub, trilha-unlock
   banner, low-tech-literacy visual pass) proceeds as already specced in the companion
   document.

## Architecture

No new backend engines are needed. Frente 3+4 and earlier work already built everything
this content needs to run on:

| Need | Existing engine |
|---|---|
| Jornada, archetype gating, self-enrollment | `catalog.journey_definitions/versions` (+ `eligible_archetype_codes`), `e14_self_enroll`, `e14_list_eligible_journeys` |
| Trilha (block) | `orchestration.path_templates` |
| Aula (activity) | `orchestration.path_steps` + `catalog.activity_versions` |
| Per-aula quiz ("avaliação rápida da aula") | `assessment.assessment_specs` / `questions` / `answer_options` |
| Trilha-closing exam (5 questions) | Same engine, one `assessment_specs` row on the closing aula's activity_version, 5 questions |
| Practice deliverable ("entrega prática") | `assessment.practice_specs` |
| Selo (badge) per trilha | `engagement.badge_definitions` / `badge_versions` (existing `issue_learning_credentials` issuance flow) |
| Reusable prompt content | `catalog.activity_versions.configuration` (jsonb) |

One small, additive schema change is needed: `orchestration.path_templates` and
`orchestration.path_steps` today have no explicit ordering column for trilhas within a
jornada (path_steps already order via `position_hint`, but path_templates has none).
Add `orchestration.path_templates.position integer not null default 0`, matching the
`position` convention already used everywhere else in this codebase (dimensions, items,
questions, answer_options, content_assets). The admin builder uses this to let an admin
reorder trilhas within a jornada by drag or up/down controls.

## Content plan for the OpenAI jornada

Read all three source documents in full. Each is a facilitator's script for a live,
timed session ("fala sugerida," minute-by-minute "roteiro," "o que mostrar na tela") —
not self-service copy. Splitting what's actually reusable from what's facilitator-only
staging:

**Reusable as final content, verbatim or near-verbatim (no further writing needed):**
- Every ChatGPT/Codex prompt block — these are meant to be copied by the participant
  into the tool directly.
- Every "Avaliação rápida da aula" question + correct answer (one per non-closing aula).
- Every trilha's "Avaliação final da trilha" (5 questions + correct answers).
- Every "Checklist da entrega prática" (the practice deliverable's requirements list).
- Trilha/aula titles, tool names ("Ferramenta principal"), and the Selo names
  ("Selo Marketing e Vendas com IA," "Selo Gestão com IA," "Selo Desenvolvimento
  Avançado com Codex").

**Needs adaptation (seed as an explicit draft, not a locked answer):** the instructional
paragraph a participant reads before/around each prompt. Adapted from the facilitator's
"fala sugerida" lines into direct-address, self-service copy (drop timing, drop "o que
mostrar na tela," drop live-session framing). Every seeded aula description carries the
same "Rascunho — pendente de revisão" marker Task 5 established for the diagnostic
content, and is fully editable through the new builder — this is explicitly a
best-effort draft advancing the work, not final copy.

**Structure:**

```
Jornada: Capacitação em IA para MEI/ME – Estímulo <> OpenAI
  (eligible_archetype_codes = null — open to everyone; nothing in the source targets
  a specific archetype)
  Trilha 1 — Marketing e Vendas com IA (position 1)
    Aula 1 — Introdução da trilha e caso de uso         (content)
    Aula 2 — Mão na massa: marketing com IA             (content, 6 prompts)
    Aula 3 — Mão na massa: vendas com IA                (content, 4 prompts)
    Aula 4 — Fechamento e avaliação                     (assessment: 5 questions,
                                                          practice: entrega checklist,
                                                          unlocks Selo Marketing e
                                                          Vendas com IA)
  Trilha 2 — Gestão com IA (position 2)
    Aula 1..4 — content aulas
    Aula 5 — Fechamento e avaliação (5 total incl. closing; assessment + practice +
             Selo Gestão com IA)
  Trilha 3 — Desenvolvimento Avançado com Codex (position 3)
    Aula 1..5 — content aulas (6 total incl. closing)
    Aula 6 — Fechamento e avaliação (assessment + practice + Selo Desenvolvimento
             Avançado com Codex)
```

Every non-closing aula also gets its one-question "avaliação rápida" via the same
`assessment_specs` engine (a 1-question spec on that aula's activity_version) — this is
not a separate mechanism from the closing exam, just a shorter instance of it.

## Guided admin journey builder

Replaces the current `admin/produto` page's four flat, independent forms (Jornada /
Atividade / Trilha e bloco / Regra), which require picking related resources by UUID
from a dropdown and pasting raw JSON into `configuration`/`metadata` fields. The new
builder follows Task 5's proven staged-`<details>`-sections pattern, extended one level
deeper for the jornada → trilha → aula hierarchy:

1. **Dados da jornada** — nome, descrição, programa. (Existing fields, unchanged.)
2. **Acesso** — arquétipo(s) elegíveis ou "Todos" (already built in Frente 3+4 Task 6,
   carried over unchanged).
3. **Trilhas** — an expandable list. "Adicionar trilha" appends a block with
   nome/descrição and reorder controls (feeding the new `position` column). Each trilha
   block expands to:
4. **Aulas** (nested inside each trilha) — an expandable list. "Adicionar aula" appends
   an activity with: título, tipo (conteúdo / avaliação+prática de encerramento),
   descrição (the draft instructional text), and — for content aulas — a repeatable
   "prompt" field group (título do prompt + texto do prompt, stored in
   `configuration.prompts`). A closing aula additionally shows: campos de quiz (lista de
   perguntas com alternativas, marcando a correta), campos de entrega prática
   (checklist), and the Selo this aula unlocks (nome, ícone).
5. **Publicar** — draft/published per jornada version, same convention as every other
   resource type in this codebase.

No dropdown ever asks the admin to pick a UUID for a resource created earlier in the
same flow — trilhas and aulas are always created and edited in the context of the
jornada/trilha they belong to. This is now the only way to build a jornada in the admin
area; the old flat "Trilha e bloco"/"Atividade" standalone forms are retired once this
ships (their underlying RPCs are unchanged — `save_admin_product_resource`'s
`path_step`/`activity` branches are reused by the new UI, not replaced).

## Testing

Same discipline as Frente 3+4: every SQL change applied and verified live against the
Supabase dev project via MCP before task review, not hand-traced. `node --test` coverage
for the new builder's structured-field assembly (mirroring Task 5's
`admin-diagnostico-page.test.mjs` pattern: no raw JSON textareas, no UUID text inputs
where a nested "add" action should exist instead). The seeded jornada is verified through
the full read path (`get_admin_product_workspace`, `e14_list_eligible_journeys`) and
through an end-to-end self-enrollment, exactly as Frente 3+4 Task 7 did for its
verification fixture.

## Out of scope

- Final, reviewed instructional copy for the OpenAI jornada's aulas — explicitly
  deferred; the draft seeded here is a starting point for whoever writes it, not the
  final version.
- Retiring `orchestration.rule_definitions`/`rule_versions` generic json-logic engine —
  still used by `path_step` availability/completion rules elsewhere; only the archetype
  gating and jornada-builder UI avoid it, per the existing Frente 4 decision.
- Any change to `diagnostics.*` or archetype classification (Frente 3+4, already shipped
  and out of this document's scope).
