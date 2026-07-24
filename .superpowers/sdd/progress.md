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
| 1 — Full Estímulo brand system | DONE | Vivid reusable headers, animated authenticated stages, heroes, patterns, logo capsules, palette accents, tactile cards/buttons and reduced-motion support shipped across participant and admin surfaces. |
| 2 — High-impact landing and login | DONE | Landing tells the journey story and highlights OpenAI; login restores an expressive Estímulo composition while preserving accessible forms. |
| 3 — Participant navigation and activity context | DONE | Jornadas and Entregas are first-class destinations; Conquistas is the wallet; activity stage tabs became an expressive compact journey context. |
| 4 — Diagnostic profile CTA | DONE | One server action reuses or creates a journey enrollment, starts the journey when needed and opens the diagnostic form directly. |
| 5 — OpenAI journey visibility | DONE | OpenAI remains visible before and after enrollment, is pinned in the catalog and Home, exposes all three trilhas and offers direct diagnostic enrollment. |
| 6 — Home announcement carousel | DONE | Image carousel is the first Home element, auto-plays with controls, uses live announcements when available and has three Estímulo fallback campaigns when the database is empty. |
| 7 — Unified credential wallet | DONE | Conquistas combines badges, platform certificates, external certificates and upcoming rewards; legacy Credenciais redirects into it. |
| 8 — External certificates | DONE_WITH_BINARY_ACCEPTANCE_GATE | Private governed PDF/image upload, metadata, signed download and service-only RPCs shipped. Intent verified live; real personal binary not uploaded through connected tooling. |
| 9 — Certificate templates and PDF | DONE_WITH_BINARY_ACCEPTANCE_GATE | Admin JPG template, guided overlay positions/color, built-in Estímulo fallback PDF and participant download shipped. Real JPG acceptance remains manual. |
| 10 — OpenAI completion certificate | DONE | Immutable rule/certificate version 2 uses `credential-v1`; completed synthetic context returns exactly one non-expiring certificate candidate. |
| 11 — Redirect and Vercel login hardening | CODE_DONE_WITH_HOSTED_CONFIG_GATE | Localhost, active previews, Vercel production and custom HTTPS domains resolve consistently. Hosted Supabase URL Configuration and custom-domain DNS still require dashboard access. |
| 12 — Official OpenAI diagnostic | DONE | A service-only experience read supplies the published 12-question archetype diagnostic when the immutable OpenAI journey has no explicit diagnostic reference. |
| 13 — Security gateway | DONE | Edge Function `authenticated-rpc` v4 is ACTIVE; credential and diagnostic helper RPCs are service-role only and actor mismatch is rejected at the gateway. |
| 14 — Regression gates | CODE_DONE_WITH_RUNNER_GATE | Regression files and one consolidated workflow cover branding, carousel order, journeys, diagnostic CTA, credentials and redirect origins. GitHub jobs failed before checkout with no steps/logs; Vercel is temporarily rejecting new builds because of account build-rate limits. |

## Live OpenAI journey

- Journey definition: `1c39a8a2-791d-4ff8-870e-3bec037b8f62`
- Journey version: `a4ffebde-f7de-4a76-af6a-221a2c398dd6`
- Status: `published`
- Published at: `2026-07-24T18:55:49.521046Z`
- Open to all archetypes: yes
- Structure: 3 trilhas, 15 aulas, 25 questions, 3 practice specs, 3 path-scoped credential rules, 3 badges
- Journey completion certificate: published version 2 with `credential-v1` rule
- Official diagnostic fallback: published version `0396acf7-40bb-4f6f-a433-510d32e5c9c3`, 12 items

## Latest live verification

- Supabase project: `cfpfeavjlgheqqiaqtzv`.
- Applied new migrations:
  - `20260724011100_participant_journey_listing_resilience.sql`
  - `20260724011200_credential_wallet_templates_and_openai_certificate.sql`
  - `20260724011300_fix_certificate_rule_and_validity.sql`
  - `20260724011400_lock_down_credential_rpcs.sql`
  - `20260724011500_openai_default_diagnostic.sql`
- Confirmed live:
  - OpenAI remains published and eligible for the participant account;
  - draft/internal-test enrollments are excluded from participant listing;
  - official diagnostic has 12 items;
  - diagnostic helper execute privileges are `anon=false`, `authenticated=false`, `service_role=true`;
  - `authenticated-rpc` version 4 is active with JWT verification;
  - external-certificate upload intent creates a private object key and 8 MB limit;
  - synthetic upload intent was cleaned up;
  - credential RPC execute privileges are `anon=false`, `authenticated=false`, `service_role=true`;
  - a completed OpenAI context returns one certificate candidate;
  - Supabase Auth logs show successful production signup/confirmation/login traffic from `lms-estimulo-web.vercel.app`;
  - Vercel reports no recent runtime-error clusters for the currently deployed version.
- Regression files:
  - `scripts/application/brand-experience-regression.test.mjs`
  - `scripts/application/participant-journey-navigation-regression.test.mjs`
  - `scripts/application/credential-wallet-regression.test.mjs`
  - `scripts/application/vercel-login-origin-regression.test.mjs`
- Draft handoff PR: `#94`.

## Documented external gates and concerns

1. **Hosted Supabase Auth configuration.** Code and `supabase/config.toml` contain localhost, Vercel and `plataforma.estimulo.org` redirects, but this connector cannot mutate hosted Auth > URL Configuration. The exact Site URL/Redirect URL values are documented in `docs/deployment/estimulo-domain-and-auth.md`.
2. **Custom domain and DNS.** `plataforma.estimulo.org` is the recommended branded URL. Attaching it to Vercel requires access to the Estímulo DNS zone and Vercel Domains settings, neither exposed by the connected actions.
3. **Latest deployment build.** The last functional preview before this follow-up was `READY`; later source changes are not yet deployed because Vercel returned `build-rate-limit`. GitHub Actions jobs also terminated before checkout with no executable steps/logs.
4. **Participant enrollment mutation.** The connected database tool blocked invoking the user-enrollment command directly. The UI action is implemented, but this session did not silently enroll the user account.
5. **Real binary acceptance.** External certificate and JPG template upload contracts were verified without transmitting a real personal document through connected tooling.
6. **HubSpot institutional gate.** There is no active HubSpot connection or published contact mapping in dev; identity decisions remain durable as `awaiting_integration`.
7. **Original OpenAI facilitator scripts.** The three source `.docx.md` files remained unavailable; published instructional copy stays explicitly marked for editorial review.
8. **Two-RPC aula write.** The journey builder still creates activity and path step in separate commands; this remains a future hardening opportunity.
