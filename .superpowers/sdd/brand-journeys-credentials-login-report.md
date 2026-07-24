# Brand, Journey UX, Credential Wallet and Vercel Auth — Implementation Report

Date: 2026-07-24
Branch: `refactor/web-frontend-rebuild`
Plan: `docs/superpowers/plans/2026-07-24-brand-journeys-credentials-login.md`

## Result

The requested experience package is implemented across branding, public acquisition, participant navigation, OpenAI journey visibility, credential storage, certificate generation, administrative templates and Vercel authentication origin handling.

## 1. Estímulo visual identity

- Added reusable vivid brand surfaces instead of isolated decoration:
  - primary-blue gradients;
  - cyan, magenta, green and gold accents;
  - color-logo capsules;
  - patterned hero and sidebar backgrounds;
  - subtle card lift and depth;
  - reduced-motion support.
- Rebuilt the participant header and admin sidebar around the full-color Estímulo logo.
- Rebuilt login as a branded split composition inspired by the older visual direction, while retaining current accessibility and form behavior.
- Rebuilt the landing page with a high-impact hero, journey explanation, OpenAI highlight, archetypes and stronger calls to action.

## 2. Participant journey experience

- Participant navigation now exposes:
  - Início;
  - Jornadas;
  - Biblioteca;
  - Entregas;
  - Conquistas;
  - Perfil.
- The activity-stage tab strip was replaced by a compact journey-context card with current stage, journey return link and diagnostic state.
- Profile now shows an explicit pending-diagnostic action and links directly to the correct diagnostic form when a journey instance exists.
- `e14_list_participant_journeys` now ignores draft/internal-test enrollments and isolates invalid legacy runtime instances instead of crashing the full Home.
- The OpenAI journey has a dedicated visual highlight in both Home ordering and the journey catalog, including the three published trilhas and a direct enrollment CTA.

## 3. Unified achievements and credential wallet

- `/empreendedor/conquistas` now combines:
  - platform badges;
  - platform certificates;
  - upcoming rewards;
  - certificates from external courses.
- Legacy `/empreendedor/credenciais` redirects to the unified wallet.
- External certificate upload supports PDF, PNG, JPG/JPEG and WEBP up to 8 MB.
- Files use private storage, governed upload intents, SHA-256, authorized signed downloads and server-side metadata validation.
- Direct database execution is denied to `anon` and `authenticated`; credential commands pass through the authenticated Edge Function, which validates the JWT and internal actor identity.

## 4. Certificate template and PDF

- Admin > Gamificação can upload a private horizontal JPG template.
- Certificate configuration exposes human fields for:
  - journey;
  - requirement rule;
  - participant-name vertical position;
  - journey-title vertical position;
  - blue or white text;
  - expiration in months or no expiration.
- The server generates a real landscape PDF with:
  - participant name;
  - journey name;
  - issue date;
  - verification code;
  - public verification path.
- A built-in Estímulo PDF layout is used when no uploaded image is assigned.
- OpenAI journey certificate definition/version 2 is published with a compatible immutable `credential-v1` completion rule.
- A completed synthetic OpenAI context returned exactly one certificate candidate with no expiration and a deterministic verification code.

## 5. Vercel login

- Password authentication success was confirmed in Supabase Auth logs before this package.
- OAuth callback origin resolution now uses:
  - explicit `NEXT_PUBLIC_APP_URL` when present;
  - active branch/deployment URL for `VERCEL_ENV=preview`;
  - production project URL for production;
  - canonical Vercel fallback.
- Administrative OAuth login and callback use the same origin helper.
- The protected preview prevents an unauthenticated external browser acceptance pass, but build/runtime contracts and callback routing are deployed.

## Live Supabase changes

Applied:
- `20260724011100_participant_journey_listing_resilience.sql`
- `20260724011200_credential_wallet_templates_and_openai_certificate.sql`
- `20260724011300_fix_certificate_rule_and_validity.sql`
- `20260724011400_lock_down_credential_rpcs.sql`

Edge Function:
- `authenticated-rpc` version 3 — ACTIVE, JWT verification enabled.

Verified live:
- OpenAI journey remains published and eligible for the participant account.
- Technical draft/internal-test enrollments no longer appear in participant listing.
- External credential upload intent created a private object key with 8 MB limit; the synthetic intent was aborted after validation.
- New credential RPCs: `anon=false`, `authenticated=false`, `service_role=true` for execute privilege.
- OpenAI completed context returns one valid certificate candidate.

## Regression gates and build verification

The web `prebuild` now runs:
- `brand-experience-regression.test.mjs`
- `participant-journey-navigation-regression.test.mjs`
- `credential-wallet-regression.test.mjs`
- `vercel-login-origin-regression.test.mjs`

The latest functional deployment before the CI-only commits reached Vercel `READY` at commit `9faf42ea2accde51f0967149c537b434ac66dbc0`. It successfully compiled Next.js, completed TypeScript, generated all credential/template/upload/download routes and deployed the outputs.

The final commit added only regression/CI/reporting files on top of that verified runtime. Vercel did not execute another preview because the account returned `build-rate-limit`, not a source/build failure. A GitHub Actions validation workflow was added as a second verifier; no workflow run was emitted by the repository during this session.

## Remaining acceptance conditions

- Perform a manual Google OAuth login on the production deployment after this branch is promoted to production and its exact callback URL is allowlisted in Supabase/Google if not already covered.
- Perform one real authenticated external-certificate upload and one real JPG certificate-template upload; connected tooling validated the upload-intent contracts but did not transmit personal binary documents.
- Re-run the final CI commit when the Vercel build-rate window resets so the newly wired `prebuild` tests appear in deployment logs.
- The historical OpenAI editorial-source and two-RPC aula-write concerns from prior fronts remain unchanged and unrelated to this package.
