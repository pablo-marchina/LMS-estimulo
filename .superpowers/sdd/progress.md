# SDD Progress — OpenAI Journey Admin Builder + Frente 5

**Branch:** `refactor/web-frontend-rebuild`

**Plan:** `docs/superpowers/plans/2026-07-24-openai-journey-admin-builder-frente5.md`

**Design:** `docs/superpowers/specs/2026-07-24-openai-journey-admin-builder-frente5-design.md`

## Current state

| Task | Status | Notes |
|---|---|---|
| 1 — Trilha position + nested workspace read | PRESENT_ON_BRANCH | Migration, TypeScript types, and structural test are committed. Not re-audited in this continuation. |
| 2 — `path_template` resource type | PRESENT_ON_BRANCH | Migration is committed. Not re-audited in this continuation. |
| 3 — Per-activity assessment payload | PRESENT_ON_BRANCH | Migration is committed. Its live shape was inspected while implementing Task 6. |
| 4 — Path-scoped credentials | PRESENT_ON_BRANCH | Migration is committed. Real Selo creation remains part of seed tasks. |
| 5 — Jornada + trilhas guided builder | PRESENT_ON_BRANCH | Existing branch implementation was used as the starting point. |
| 6 — Aulas nested inside trilhas | DONE_WITH_CONCERNS | Implemented and Vercel production build/TypeScript verified at commit `68cbf3d79c90593d36ee293f2c85ef39eb58a4da`. See `task-6-report.md`. |
| 7 — Seed Marketing e Vendas com IA | NOT_PRESENT_IN_DEV_DATA | The expected jornada code is absent from Supabase dev. Exact source content is unavailable through the committed branch. |
| 8 — Seed Gestão com IA | BLOCKED | Depends on Task 7's jornada/version IDs and exact source document content. Do not create a duplicate jornada or invent prompts/checklists. |
| 9 — Seed Codex + publish | BLOCKED | Depends on Tasks 7–8 and source content. |
| 10–12 — Frente 5 participant surfaces | NOT_STARTED_IN_THIS_CONTINUATION | Resume after the content journey state is made consistent, or explicitly reprioritize. |

## Latest branch handoff

- Task 6 implementation commits:
  - `c50a8a550fac802a7c186960758f488e46e1be09` — structured aula save action
  - `410215d4b9cad012c6e74aa8391e60d0536b158a` — nested aula builder component
  - `c374e6e87f70bda35693991cfc68be04938d325a` — jornada page integration/removal of standalone forms
  - `e7065e8917deb9f7f00d7081b9178a2c15de6110` — structural regression test
  - `68cbf3d79c90593d36ee293f2c85ef39eb58a4da` — semantic/accessibility cleanup
- Vercel preview for `68cbf3d...`: READY; Next.js compilation, TypeScript, page-data collection, and route generation passed.
- GitHub Actions: no workflow run was created for the branch.

## Resume requirements for Task 7/8

1. Restore or provide the exact source files:
   - `ref/estimulo-ref/estimulo-ref/trilha-01-marketing-e-vendas-com-ia.docx.md`
   - `ref/estimulo-ref/estimulo-ref/trilha-02-gestao-com-ia.docx.md`
   - `ref/estimulo-ref/estimulo-ref/trilha-03-desenvolvimento-avancado-com-codex.docx.md`
2. Reconcile the missing Task 7 state:
   - either recover the exact seed payload/report from the previous local SDD workspace;
   - or rerun Task 7 from the restored source documents, creating one jornada only.
3. Persist exact payload artifacts (`task7-seed-payload.json`, `task8-seed-payload.json`) and verify through `get_admin_product_workspace` before moving to publication.

## Non-blocking Task 6 concern

Aula creation currently uses two RPC calls (activity, then path step). This is production-build-valid but not transactionally atomic; a later backend hardening task should combine them or clean up an orphan activity when the link step fails.
