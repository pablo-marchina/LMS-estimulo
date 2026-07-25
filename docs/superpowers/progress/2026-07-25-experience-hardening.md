# Experience hardening — 2026-07-25

Branch: `refactor/web-frontend-rebuild`
PR: `#94`

## Requested changes

1. Initial signup now collects CPF, phone and optional CNPJ. CPF is validated and encrypted before email confirmation, reused during final provisioning and removed from temporary Auth metadata.
2. Decorative multicolor gradients were removed. The authenticated product now uses solid Estímulo blue, single-color geometry, dots, edge accents, pastel single-color cards and reduced-motion support.
3. File upload preview is reusable across Library files, external certificates and certificate templates. It renders images, PDFs, file metadata and clears the underlying input when removed.
4. The journey builder follows the real admin flow: Journey → Paths → Lessons → Publish. Library explains that paths and lessons belong under Journeys, not the free Library.
5. The authenticated gateway now allows journey discovery, self-enrollment and the official 12-question diagnostic fallback.
6. Participant navigation was simplified into a top bar. Administration moved from a sidebar to a top navigation bar.
7. Organization selectors were removed from principal admin surfaces. The Estímulo organization is derived from the authenticated identity.
8. Synthetic accounts were disabled; technical enrollments cancelled; technical journey/program/diagnostic definitions retired. Published immutable versions remain in audit history but are excluded from operational metrics.
9. Participant Points displays actions, amounts and frequency directly from the latest published admin point rules.
10. Admin Home, Journeys, Library, Gamification, Diagnostics, Users, Operation, Announcements, Reports, Maturity and Integrations use progressive disclosure or task-specific views.

## Live Supabase

Project: `cfpfeavjlgheqqiaqtzv`

Applied migrations:
- `20260725010000_real_estimulo_workspace_and_participant_point_rules.sql`
- `20260725010100_exclude_retired_test_fixtures_from_admin_reporting.sql`
- `20260725010200_fix_participant_point_frequency_labels.sql`
- `20260725010300_lock_admin_library_and_identity_rpcs.sql`

Authenticated Edge Function:
- `authenticated-rpc` version 7
- JWT verification enabled
- participant journey discovery/self-enrollment, diagnostic fallback, admin journey publication, identity-resolution workflows and Library upload/download commands allowlisted
- related non-E14 RPCs executable only by `service_role`

Confirmed live:
- real participant listing contains no technical enrollments;
- OpenAI journey remains published and eligible;
- official diagnostic version has 12 published items;
- point rules return 5 points for completing an activity and 2 for passing an assessment;
- admin report returns zero synthetic participants/enrollments;
- organization is displayed as Estímulo;
- new administrative/Library RPCs are not directly executable by `anon` or `authenticated`.

## Build verification

Verified source commit: `462331946f6dd349e1698b727b7c002f992bf3fb`
Vercel deployment: `dpl_6KoonBw7i4ccDL3RpUb9sMLjn13T` (`READY`)

- 26/26 regression tests passed;
- Next.js optimized compilation passed;
- TypeScript passed;
- static page generation passed;
- all participant, admin, upload and download routes were generated.

Commits after the verified source commit modify only this handoff document.

## Remaining manual acceptance

An end-to-end click-through that creates and publishes a disposable journey through the protected admin UI was not completed because this session did not have an administrative browser session or user credentials. No authentication bypass or persistent test backdoor was introduced. The exact gateway operations that previously blocked this flow are now allowlisted, protected and covered by regression tests.