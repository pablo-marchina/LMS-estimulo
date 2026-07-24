# Estímulo Brand, Journey UX, Credential Wallet and Vercel Auth Plan

Date: 2026-07-24
Branch: `refactor/web-frontend-rebuild`

## Goals

1. Use the full Estímulo palette and visual language across public, participant and admin surfaces without reducing accessibility.
2. Make the OpenAI journey reliably visible and reachable even when old technical enrollments contain incomplete runtime state.
3. Replace the activity stage tabs with a compact journey context and move incomplete-diagnostic guidance to Profile.
4. Keep Deliveries as a first-class participant destination.
5. Consolidate achievements, internal credentials and uploaded external certificates in one credential wallet.
6. Let administrators upload a certificate template and generate downloadable participant PDFs with the learner and journey data.
7. Make participant password and administrative Google login work across the canonical Vercel deployment and previews.

## Workstreams

### 1. Brand system and public experience
- Add reusable vivid brand backgrounds, accent rails, motion and high-contrast surfaces using the official primary, cyan, magenta, green and gold tokens.
- Rebuild AuthLayout as a branded split composition with the official color logo.
- Rebuild the landing hero and supporting sections to communicate value, journey flow and proof more strongly.
- Use a color-logo capsule in dark application headers instead of monochrome inversion.
- Add restrained hover/motion treatment to cards and CTA areas, respecting reduced-motion preferences.

### 2. Participant navigation and journey resilience
- Add Jornadas and Entregas to the participant navigation; expose Conquistas as the unified wallet destination.
- Replace JourneyProgressNav on activity pages with a compact journey-context component.
- Add an actionable Profile empty state that links directly to the pending diagnostic.
- Make participant journey listing skip invalid internal-test runtime instances instead of failing the whole Home.
- Highlight the published OpenAI journey in the catalog and Home.

### 3. Credential wallet and external certificates
- Add a governed external-credential table backed by private file objects and upload intents.
- Add participant upload, list and authorized download APIs.
- Merge rewards, badges, platform certificates and external certificates into `/empreendedor/conquistas`.
- Redirect legacy credential and engagement routes to the unified wallet while preserving Deliveries separately.

### 4. Certificate templates and PDF generation
- Add a managed private upload profile for certificate background templates.
- Extend certificate versions with template layout metadata and expose template upload in Admin > Gamificação.
- Preserve a built-in Estímulo certificate layout when no image template is supplied.
- Generate a real landscape PDF containing participant name, journey, issue date and verification code.
- Publish a journey-completion certificate definition for the OpenAI journey.
- Add participant PDF download and keep public verification accessible without a signed-in session.

### 5. Vercel authentication hardening
- Resolve the public origin from forwarded request headers or Vercel deployment variables with an allowlisted HTTPS fallback.
- Use the request-aware origin for Google OAuth redirects.
- Keep Supabase cookies synchronized and redirect authenticated users away from login pages.
- Verify participant password and administrative Google paths against Vercel/Supabase logs.

## Verification

- Apply migrations to Supabase and run security/performance advisors.
- Add structural regression tests for branding, navigation, journey resilience, credential wallet, certificate templates/PDF and Vercel origin handling.
- Verify live OpenAI eligibility for the participant test account.
- Require a full Vercel Next.js build, TypeScript pass, generated routes and READY deployment.
