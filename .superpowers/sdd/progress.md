# SDD Progress — Frontend redesign through Frente 6

**Branch:** `refactor/web-frontend-rebuild`

**Plans:**
- `docs/superpowers/plans/2026-07-24-openai-journey-admin-builder-frente5.md`
- `docs/superpowers/plans/2026-07-24-frente-6-admin-restante.md`

**Designs:**
- `docs/superpowers/specs/2026-07-23-frontend-redesign-design.md`
- `docs/superpowers/specs/2026-07-24-openai-journey-admin-builder-frente5-design.md`

## OpenAI journey + Frente 5

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
| 10 — Jornada terminology | DONE | Participant catalog moved from `/empreendedor/trilhas` to `/empreendedor/jornadas`. |
| 11 — Home + unlock banner | DONE | Home prioritizes next action, announcements and eligible jornadas; journey detail shows credential-unlock progress. |
| 12 — Engagement hub | DONE | `/empreendedor/engajamento` consolidates accomplishments, rewards, points, ranking and submissions. |

## Frente 6 — Admin restante

| Task | Status | Result |
|---|---|---|
| 1 — Identity resolution queue | DONE_WITH_EXTERNAL_GATE | Durable queue, authorized list/decision RPCs and plain-language Users UI shipped. Enqueue was verified live. No active HubSpot connection exists in dev, so link/create decisions deliberately remain `awaiting_integration`; the tool also blocked invoking the sensitive resolution action during validation. |
| 2 — Library dual visibility + files | DONE | Admin supports article/link/file, private managed upload up to 6 MB, authorized download, filters, derived slug and independent `discoverable_in_library` vs journey links. Upload intent was verified live and the synthetic intent cleaned up. |
| 3 — Gamification guided forms | DONE | Code fields and recurrence/validity JSON were removed. Frequency, limits, points and certificate validity now assemble the existing policies server-side. |
| 4 — Admin overview + operation route | DONE | `/admin` is a task-oriented dashboard; the previous operational workspace lives at `/admin/operacao`; raw result JSON was replaced by readable evidence summaries. |
| 5 — Verification and handoff | DONE | Supabase migrations applied, event schemas registered, operator permissions verified, Vercel production builds reached `READY`, and four structural regression tests were added. |

## Live OpenAI journey

- Journey definition: `1c39a8a2-791d-4ff8-870e-3bec037b8f62`
- Journey version: `a4ffebde-f7de-4a76-af6a-221a2c398dd6`
- Status: `published`
- Published at: `2026-07-24T18:55:49.521046Z`
- Open to all archetypes: yes
- Structure: 3 trilhas, 15 aulas, 25 questions, 3 practice specs, 3 path-scoped credential rules, 3 badges

## Frente 6 live verification

- Supabase project: `cfpfeavjlgheqqiaqtzv`.
- Applied migrations:
  - `20260724010500_admin_identity_resolution_queue.sql`
  - `20260724010600_library_dual_visibility_and_files.sql`
  - `20260724010700_operator_identity_permissions.sql`
  - `20260724010800_frente6_event_schemas.sql`
  - `20260724010900_fix_library_upload_extension.sql`
  - `20260724011000_fix_library_upload_event_versions.sql`
- Confirmed live:
  - `e14_operator` has `iam.accounts.manage`, `integration.manage`, `library.manage`;
  - identity queue/table and audit schemas exist;
  - library discovery/file columns and authorized download RPC exist;
  - upload profile accepts PDF/images/TXT/DOCX up to `6291456` bytes;
  - a valid `.txt` upload intent was created with private object key and then cleaned up;
  - Vercel compiled Next.js, completed TypeScript and deployed the full route set.
- Regression files:
  - `scripts/application/admin-frente6-identities.test.mjs`
  - `scripts/application/admin-frente6-library.test.mjs`
  - `scripts/application/admin-frente6-gamification.test.mjs`
  - `scripts/application/admin-frente6-dashboard.test.mjs`

## Documented concerns, not incomplete implementation

1. **HubSpot institutional gate.** There is no active HubSpot connection or published contact mapping in dev. Decisions are intentionally durable as `awaiting_integration`; no fake remote contact is created.
2. **Sensitive-action validation limit.** The connected database tool allowed queue creation but blocked invoking the manual identity-resolution and upload-abort actions. Their permission/idempotency/audit contracts were inspected and production-built; the synthetic database records created for validation were removed or marked aborted directly.
3. **Actual binary upload.** The private storage route, MIME/extension/size validation, confirmation RPC and authorized download build successfully. Live validation exercised the upload-intent contract, not a real user document.
4. **Original OpenAI facilitator scripts.** The three source `.docx.md` files remained unavailable; the published instructional copy stays explicitly marked for editorial review.
5. **Two-RPC aula write.** The journey builder still creates activity and path step in separate commands; this remains a future hardening opportunity.