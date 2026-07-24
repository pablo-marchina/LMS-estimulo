# SDD Progress — Frontend redesign, Frente 6 and experience hardening

**Branch:** `refactor/web-frontend-rebuild`

**Plans:**
- `docs/superpowers/plans/2026-07-24-openai-journey-admin-builder-frente5.md`
- `docs/superpowers/plans/2026-07-24-frente-6-admin-restante.md`
- `docs/superpowers/plans/2026-07-24-brand-journeys-credentials-login.md`

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
| 1 — Identity resolution queue | DONE_WITH_EXTERNAL_GATE | Durable queue, authorized list/decision RPCs and plain-language Users UI shipped. Enqueue was verified live. No active HubSpot connection exists in dev, so link/create decisions deliberately remain `awaiting_integration`. |
| 2 — Library dual visibility + files | DONE | Admin supports article/link/file, private managed upload up to 6 MB, authorized download, filters, derived slug and independent `discoverable_in_library` vs journey links. |
| 3 — Gamification guided forms | DONE | Code fields and recurrence/validity JSON were removed. Frequency, limits, points and certificate validity assemble policies server-side. |
| 4 — Admin overview + operation route | DONE | `/admin` is a task-oriented dashboard; the previous operational workspace lives at `/admin/operacao`; raw result JSON was replaced by readable evidence summaries. |
| 5 — Verification and handoff | DONE | Supabase migrations applied, event schemas registered, operator permissions verified and Vercel builds reached `READY`. |

## Brand, journeys, credentials and Vercel login

| Task | Status | Result |
|---|---|---|
| 1 — Full Estímulo brand system | DONE | Vivid reusable headers, auth stage, heroes, patterns, logo capsules, multi-color accents, card motion and reduced-motion support shipped. |
| 2 — High-impact landing and login | DONE | Landing tells the journey story and highlights OpenAI; login restores an expressive Estímulo composition while preserving accessible forms. |
| 3 — Participant navigation and activity context | DONE | Jornadas and Entregas are first-class destinations; Conquistas is the wallet; activity stage tabs became a compact journey context. |
| 4 — Diagnostic profile CTA | DONE | Profile detects an unfinished diagnostic and links directly to its form, otherwise links to the journey catalog. |
| 5 — OpenAI journey visibility | DONE | Technical draft/internal-test enrollments no longer crash Home; OpenAI is ordered and visually highlighted in Home/catalog with direct enrollment CTA. |
| 6 — Unified credential wallet | DONE | Conquistas combines badges, platform certificates, external certificates and upcoming rewards; legacy Credenciais redirects into it. |
| 7 — External certificates | DONE_WITH_BINARY_ACCEPTANCE_GATE | Private governed PDF/image upload, metadata, signed download and service-only RPCs shipped. Intent verified live; real personal binary not uploaded through connected tooling. |
| 8 — Certificate templates and PDF | DONE_WITH_BINARY_ACCEPTANCE_GATE | Admin JPG template, guided overlay positions/color, built-in Estímulo fallback PDF and participant download shipped. Real JPG acceptance remains manual. |
| 9 — OpenAI completion certificate | DONE | Immutable rule/certificate version 2 uses `credential-v1`; completed synthetic context returns exactly one non-expiring certificate candidate. |
| 10 — Vercel login hardening | DONE_WITH_PRODUCTION_ACCEPTANCE_GATE | Preview/production-aware callback origin shipped; password success confirmed in Auth logs. Final Google OAuth acceptance requires production promotion and callback allowlisting confirmation. |
| 11 — Security gateway | DONE | Edge Function `authenticated-rpc` v3 is ACTIVE; new credential RPCs are service-role only and actor mismatch is rejected at the gateway. |
| 12 — Regression gates | DONE | Four new experience tests are executed by `prebuild` before every Vercel Next.js build. |

## Live OpenAI journey

- Journey definition: `1c39a8a2-791d-4ff8-870e-3bec037b8f62`
- Journey version: `a4ffebde-f7de-4a76-af6a-221a2c398dd6`
- Status: `published`
- Published at: `2026-07-24T18:55:49.521046Z`
- Open to all archetypes: yes
- Structure: 3 trilhas, 15 aulas, 25 questions, 3 practice specs, 3 path-scoped credential rules, 3 badges
- Journey completion certificate: published version 2 with `credential-v1` rule

## Latest live verification

- Supabase project: `cfpfeavjlgheqqiaqtzv`.
- Applied new migrations:
  - `20260724011100_participant_journey_listing_resilience.sql`
  - `20260724011200_credential_wallet_templates_and_openai_certificate.sql`
  - `20260724011300_fix_certificate_rule_and_validity.sql`
  - `20260724011400_lock_down_credential_rpcs.sql`
- Confirmed live:
  - OpenAI remains eligible for the participant account;
  - draft/internal-test enrollments are excluded from participant listing;
  - external-certificate upload intent creates a private object key and 8 MB limit;
  - synthetic upload intent was cleaned up;
  - new credential RPC execute privileges are `anon=false`, `authenticated=false`, `service_role=true`;
  - `authenticated-rpc` version 3 is active with JWT verification;
  - a completed OpenAI context returns one certificate candidate;
  - Vercel compiled the complete feature set, TypeScript and new routes before regression tests were wired into `prebuild`.
- New regression files:
  - `scripts/application/brand-experience-regression.test.mjs`
  - `scripts/application/participant-journey-navigation-regression.test.mjs`
  - `scripts/application/credential-wallet-regression.test.mjs`
  - `scripts/application/vercel-login-origin-regression.test.mjs`

## Documented concerns, not incomplete implementation

1. **Production OAuth acceptance.** The branch is a protected preview. Google OAuth must be manually accepted after promotion to production and confirmation that the exact callback URL is allowlisted in Supabase/Google.
2. **Real binary acceptance.** External certificate and JPG template upload contracts were verified without transmitting a real personal document through connected tooling.
3. **HubSpot institutional gate.** There is no active HubSpot connection or published contact mapping in dev; identity decisions remain durable as `awaiting_integration`.
4. **Original OpenAI facilitator scripts.** The three source `.docx.md` files remained unavailable; published instructional copy stays explicitly marked for editorial review.
5. **Two-RPC aula write.** The journey builder still creates activity and path step in separate commands; this remains a future hardening opportunity.
