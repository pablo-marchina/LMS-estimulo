# Permanent authentication and signup hardening

Released on 2026-07-27.

## Invariants

- Public account creation collects only name, email, password, and consent before email confirmation.
- CPF, phone, and optional business identifiers are accepted only in an authenticated profile-completion session.
- Production deployments fail when CPF cryptographic keys are absent, malformed, reused, or when database signup contracts are unavailable.
- Repeated signup responses that contain an obfuscated Supabase user are treated as an existing or linked account, never as a CPF failure.
- Missing or consumed PKCE state after a successful email confirmation recovers through password login.
- A recreated Google identity is automatically relinked only for a verified `estimulo.org` Workspace account when exactly one stale internal identity exists and no prior Auth identity remains active.
- Consumer Google accounts and ambiguous identity histories continue to require manual review.

## Regression gates

- Application regression tests cover the two-step signup, CPF runtime self-test, PKCE recovery, gateway allowlist, and deployment readiness.
- Database transaction tests cover allowed tenant recovery, consumer-account rejection, active-identity rejection, and readiness contracts.
