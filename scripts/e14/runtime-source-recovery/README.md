# E14 runtime source recovery

This workflow restores the migration SQL already applied to the Supabase development/test project into the official Git repository. It does not apply DDL, modify remote migration history, or promote Supabase to production.

## Safety model

- export is performed inside a read-only transaction;
- credentials are supplied only through environment variables;
- raw exports use the `.local.jsonl` suffix and must not be committed;
- every migration is checked by byte length and SHA-256;
- generated files are never overwritten when content differs;
- migration versions and names come from the remote history without renaming;
- replay and schema equivalence are separate required gates.

## Prerequisites

- PostgreSQL `psql` client compatible with PostgreSQL 17;
- Node.js 22 or newer;
- a database connection with read access to `supabase_migrations.schema_migrations`;
- the connection must point only to the authorized Supabase development/test project.

Do not use a production database URL. Do not paste credentials into commands, documentation, commits, logs, or pull requests.

## 1. Export M13 history

### PowerShell

```powershell
$env:PGOPTIONS = "-c default_transaction_read_only=on"
$ExportFile = ".artifacts/e14/m13-migration-history.local.jsonl"
New-Item -ItemType Directory -Force (Split-Path $ExportFile) | Out-Null

psql $env:SUPABASE_DB_URL `
  -X -q -A -t `
  -v ON_ERROR_STOP=1 `
  -v from_version=20260709051056 `
  -v to_version=20260709060330 `
  -f scripts/e14/runtime-source-recovery/export-migration-history.sql |
  Set-Content -Path $ExportFile -Encoding utf8
```

### Bash

```bash
export PGOPTIONS='-c default_transaction_read_only=on'
mkdir -p .artifacts/e14

psql "$SUPABASE_DB_URL" \
  -X -q -A -t \
  -v ON_ERROR_STOP=1 \
  -v from_version=20260709051056 \
  -v to_version=20260709060330 \
  -f scripts/e14/runtime-source-recovery/export-migration-history.sql \
  > .artifacts/e14/m13-migration-history.local.jsonl
```

Expected initial invariants:

```text
migration_count = 165
total_remote_sql_bytes = 123636
first_version = 20260709051056
last_version = 20260709060330
```

The expected byte count is an audit signal, not a permanent constant. Any difference must be investigated against the authorized environment before files are materialized.

## 2. Materialize exact versions

```powershell
node scripts/e14/runtime-source-recovery/materialize-migration-history.mjs `
  --input .artifacts/e14/m13-migration-history.local.jsonl `
  --migrations-dir supabase/migrations `
  --canonical-file supabase/canonical-migrations/20260709051056_m13_e14_runtime_canonical.sql `
  --manifest supabase/canonical-migrations/M13_RUNTIME_MANIFEST.json `
  --from-version 20260709051056 `
  --to-version 20260709060330
```

The command generates:

- one timestamped SQL file per remote version under `supabase/migrations`;
- a deterministic consolidated SQL artifact under `supabase/canonical-migrations`;
- a manifest with remote and materialized SHA-256 fingerprints.

No generated file is silently replaced. A content conflict stops the command.

## 3. Export and reconcile M14

Run the same process for:

```text
from_version = 20260709183504
to_version = 20260709184749
```

The remote filenames must replace the local files that use divergent timestamps only after SQL content and hashes are compared. Never edit the remote history to match local names.

## 4. Validate the tooling

```powershell
npm run test:e14-runtime-recovery
```

The tests use temporary synthetic data and never connect to Supabase.

## 5. Required follow-up gates

Materialization alone does not close issue #38. The pull request must also prove:

```text
remote_versions_missing_locally = 0
local_versions_not_expected_remotely = 0
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
```

Replay must occur in a disposable PostgreSQL environment. AWS staging remains a later, mandatory portability gate.

## Prohibited actions

- applying a new functional migration before reconciliation;
- deleting or rewriting remote migration history;
- committing `.local.jsonl` exports or database URLs;
- using real participant data;
- combining migration recovery with the four-archetype implementation;
- renaming recovered remote versions for cosmetic consistency;
- expanding opaque `app_private.e14_*` helper naming during recovery.
