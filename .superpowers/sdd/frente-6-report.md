# Frente 6 — Implementation Report

Date: 2026-07-24
Branch: `refactor/web-frontend-rebuild`
Plan: `docs/superpowers/plans/2026-07-24-frente-6-admin-restante.md`

## Result

Frente 6 is implemented across the four approved admin surfaces. Normal admin flows no longer require code, UUID or JSON input.

## 1. Users and identity resolution

### Delivered

- Durable `integration.identity_resolution_cases` queue.
- Service-only enqueue command for ambiguous/no-match/conflict outcomes.
- Authorized admin list and decision commands.
- Existing-contact decisions use `integration.external_object_mappings` when HubSpot is active.
- New-contact decisions use `integration.sync_jobs` when an active connection and published mapping exist.
- Missing integration never loses the decision: state becomes `awaiting_integration`.
- `/admin/usuarios` now combines role management with a plain-language identity workspace:
  - status filter and counters;
  - candidate cards;
  - “Vincular a este contato”;
  - “Criar novo contato”;
  - “Arquivar caso”.
- `e14_operator` received `iam.accounts.manage` and `integration.manage` so the shipped UI is reachable.

### Verification

- Queue and audit schemas exist live.
- Operator permissions were confirmed live for the Estímulo admin account.
- A synthetic case was enqueued successfully and removed after verification.
- The connected tool blocked invoking the sensitive resolution action; no workaround was attempted.
- No active HubSpot connection exists in dev, which is an external institutional gate rather than missing code.

## 2. Library

### Delivered

- `discoverable_in_library` is independent from journey associations.
- `file_object_id` adds first-class managed files.
- Supported delivery modes: article, external HTTPS link, private file.
- Admin upload supports PDF, PNG, JPG/JPEG, WEBP, TXT and DOCX up to 6 MB.
- Files use a private bucket, upload intentions, SHA-256, clean release state and signed download URLs.
- Participant listing shows only published + discoverable items.
- A non-discoverable item remains accessible inside a linked journey when the participant is enrolled.
- Admin page now provides:
  - upload preparation;
  - human fields only (slug derived server-side);
  - release toggle;
  - journey checkboxes;
  - filters by term, topic, kind, status and release state;
  - separate columns for free-library release and journey use.
- Participant detail renders an authorized download action for file content.

### Defects found and fixed during live validation

1. Audit event schemas were initially missing; registered in `20260724010800_frente6_event_schemas.sql`.
2. File extension extraction was over-escaped and rejected valid `.txt`; corrected in `20260724010900_fix_library_upload_extension.sql`.
3. Requested and confirmed/aborted events initially used the same aggregate version; corrected to `1 → 2` in `20260724011000_fix_library_upload_event_versions.sql`.

### Verification

- Live schema/RPC checks passed.
- A `.txt` upload intent produced the expected private key and `6291456` byte limit.
- The synthetic intent was marked aborted after validation.
- Actual binary upload was not performed through the connected tool; the full route/storage/confirmation/download path passed the production TypeScript build.

## 3. Gamification

### Delivered

- Removed visible code fields.
- Removed `recurrence_policy` and `validity_policy` JSON textareas.
- Point rule fields now cover:
  - points per action;
  - once/per activity/per assessment/daily/weekly/unlimited;
  - maximum awards in the period.
- Certificate validity is now “does not expire” or a number of months.
- Technical policies and stable codes are assembled server-side.
- Existing definition code is preserved when editing an existing item.

## 4. Admin home and operation

### Delivered

- `/admin` is now “Visão geral”.
- Dashboard cards show, according to permission:
  - participants;
  - published journeys;
  - draft diagnostics;
  - pending identities;
  - practices awaiting review;
  - visible comments.
- Each card links directly to the actionable screen/section.
- Previous operational workspace is preserved at `/admin/operacao`.
- Navigation separates “Visão geral” and “Operação”.
- Legacy action redirects reaching `/admin?...` are forwarded to `/admin/operacao?...`.
- Raw `<pre>{JSON.stringify(...)}</pre>` evidence was replaced by readable field summaries.

## Verification artifacts

- Plan: `docs/superpowers/plans/2026-07-24-frente-6-admin-restante.md`
- Migrations: `20260724010500` through `20260724011000` listed in `progress.md`.
- Structural tests:
  - `admin-frente6-identities.test.mjs`
  - `admin-frente6-library.test.mjs`
  - `admin-frente6-gamification.test.mjs`
  - `admin-frente6-dashboard.test.mjs`
- Vercel independent verifier: Next.js compilation and TypeScript passed on the complete code set; final handoff deployment is tracked after this report commit.

## Remaining external conditions

- Connect and configure the institutional HubSpot environment and publish a contact mapping before queued identity decisions can execute remotely.
- Run a manual authenticated browser acceptance pass with a real test file and a real ambiguous identity case after that environment is available.

These are activation/acceptance gates, not unfinished Frente 6 implementation.