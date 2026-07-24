# SDD Progress — OpenAI Journey Admin Builder + Frente 5

**Branch:** `refactor/web-frontend-rebuild`

**Plan:** `docs/superpowers/plans/2026-07-24-openai-journey-admin-builder-frente5.md`

**Design:** `docs/superpowers/specs/2026-07-24-openai-journey-admin-builder-frente5-design.md`

## Final task state

| Task | Status | Result |
|---|---|---|
| 1 — Trilha position + nested workspace read | DONE | Applied live; the workspace read returns ordered trilhas with nested aulas, assessments, practices and path badges. |
| 2 — `path_template` resource type | DONE | Applied live and used to create all three OpenAI trilhas through the admin save RPC. |
| 3 — Per-activity assessment payload | DONE | Applied live and used to create 25 questions with valid alternatives across 15 aulas. |
| 4 — Path-scoped credentials | DONE | Applied live; 3 path-scoped rules and 3 badges were published and point to the exact trilha IDs. |
| 5 — Guided jornada/trilha builder | DONE | Builder saves human-facing fields without exposing code, slug, UUID or raw JSON; includes an explicit validated publication stage. |
| 6 — Aulas nested inside trilhas | DONE_WITH_CONCERN | Structured prompt/quiz/practice flow shipped and production-built. Activity + path-step creation still uses two RPC calls and is not transactionally atomic. |
| 7 — Marketing e Vendas com IA | DONE_WITH_EDITORIAL_CONCERN | Published: 4 aulas, 8 questions, 1 practice, path badge. See `task-7-report.md`. |
| 8 — Gestão com IA | DONE_WITH_EDITORIAL_CONCERN | Published: 5 aulas, 9 questions, 1 practice, path badge. See `task-8-report.md`. |
| 9 — Codex + journey publication | DONE_WITH_EDITORIAL_CONCERN | Published: 6 aulas, 8 questions, 1 practice, path badge. Generic audited publisher added; full journey published. See `task-9-report.md`. |
| 10 — Jornada terminology | DONE | Participant catalog moved from `/empreendedor/trilhas` to `/empreendedor/jornadas`; all visible copy says jornada for the enrollable unit. |
| 11 — Home + unlock banner | DONE | Home now prioritizes the next action, announcements, eligible jornadas and compact engagement preview; journey detail shows persistent 100% credential-unlock progress. |
| 12 — Engagement hub | DONE | `/empreendedor/engajamento` consolidates accomplishments, pending rewards, point history, ranking and submissions; top navigation has one Engagement destination. |

## Live OpenAI journey

- Journey definition: `1c39a8a2-791d-4ff8-870e-3bec037b8f62`
- Journey version: `a4ffebde-f7de-4a76-af6a-221a2c398dd6`
- Status: `published`
- Published at: `2026-07-24T18:55:49.521046Z`
- Open to all archetypes: yes
- Eligible catalog: confirmed through `e14_list_eligible_journeys`
- Structure: 3 trilhas, 15 aulas, 25 questions, 3 practice specs, 3 path-scoped credential rules, 3 badges
- Publication event: confirmed with matching `path_count=3`, `step_count=15`, `published_activity_count=15`, `published_rule_count=3`, `published_badge_count=3`
- Publication idempotency: replay call returned `replayed=true` without duplicate events or resources

## Verification

- Supabase migrations and RPC behavior verified against project `cfpfeavjlgheqqiaqtzv`.
- Vercel preview production build passed after the completed code set: Next.js compilation, TypeScript, page generation and deployment all reached `READY`.
- Structural Node regression tests were added for:
  - nested jornada/trilha/aula builder;
  - no raw technical fields in the guided builder;
  - admin publication stage;
  - jornada catalog terminology;
  - Home reorganization and unlock banner;
  - consolidated engagement hub.
- GitHub Actions did not run because this repository/branch produced no Actions workflow run; Vercel was the independent production build verifier.

## Documented concerns, not incomplete tasks

1. **Original facilitator scripts unavailable.** The three `trilha-0{1,2,3}-*.docx.md` files were not present in the branch or available file library. Seeded instructional copy, prompts and distractors are explicitly marked `draft_reconstructed_pending_review` and are not claimed as verbatim. Exact payloads and live IDs are recorded in `task7-seed-payload.json`, `task8-seed-payload.json`, `task9-seed-payload.json` and `openai-journey-seed.sql`.
2. **Two-RPC aula write.** The interactive builder creates an activity and then its path step in separate calls. A future hardening task may wrap them in one backend command or add compensating orphan cleanup; this does not block the completed journey or participant surfaces.
