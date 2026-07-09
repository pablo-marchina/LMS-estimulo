# E14 runtime source recovery

This workflow restores the migration SQL already applied to the Supabase development/test project into the official Git repository. It does not apply DDL, modify remote migration history, or promote Supabase to production.

## Safety model

- export is performed inside a read-only transaction;
- the automated workflow requires a dedicated read-only database credential;
- credentials are supplied only through GitHub encrypted secrets or local environment variables;
- raw exports use the `.local.jsonl` suffix and must not be committed;
- raw exports are removed before the GitHub artifact is uploaded;
- every migration is checked by byte length and SHA-256;
- generated files are never overwritten when content differs;
- migration versions and names come from the remote history without renaming;
- the workflow does not push commits automatically;
- replay and schema equivalence are separate required gates.

## Authorized environment

```text
Provider: Supabase
Project ref: cfpfeavjlgheqqiaqtzv
Classification: development/test only
```

Do not run this workflow against staging or production. Supabase remains prohibited as the official production environment.

## Automated GitHub workflow

Workflow:

```text
.github/workflows/e14-runtime-history-export.yml
```

Required repository secret:

```text
E14_SUPABASE_DB_URL_READ_ONLY
```

The secret must belong to a PostgreSQL role that can only:

- connect to the authorized development/test database;
- read `supabase_migrations.schema_migrations`;
- use the `extensions.digest` function needed for verification;
- start read-only transactions.

It must not be a service-role API key, Supabase access token, owner connection, migration role, or production credential.

The workflow requires the operator to type the expected project ref before execution. It then:

1. validates that the secret identifies the authorized project;
2. forces `default_transaction_read_only=on`;
3. exports M13 and M14/M14b separately;
4. materializes exact remote versions in an isolated artifact directory;
5. validates the M13 global fingerprint;
6. validates the exact M14/M14b hashes;
7. removes raw JSONL exports;
8. records provenance;
9. uploads a compressed artifact for review;
10. performs no automatic Git write.

The generated artifact is retained for 14 days. Only its reviewed `m13` and `m14` directories may be copied to a feature branch.

## Local prerequisites

- PostgreSQL `psql` client compatible with PostgreSQL 17;
- Node.js 22 or newer;
- a database connection with read access to `supabase_migrations.schema_migrations`;
- the connection must point only to the authorized Supabase development/test project.

Do not use a production database URL. Do not paste credentials into commands, documentation, commits, logs, or pull requests.

## 1. Export M13 history locally

### PowerShell

```powershell
$env:PGOPTIONS = "-c default_transaction_read_only=on"
$ExportFile = ".artifacts/e14/m13-migration-history.local.jsonl"
New-Item -ItemType Directory -Force (Split-Path $ExportFile) | Out-Null

psql $env:E14_SUPABASE_DB_URL_READ_ONLY `
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

psql "$E14_SUPABASE_DB_URL_READ_ONLY" \
  -X -q -A -t \
  -v ON_ERROR_STOP=1 \
  -v from_version=20260709051056 \
  -v to_version=20260709060330 \
  -f scripts/e14/runtime-source-recovery/export-migration-history.sql \
  > .artifacts/e14/m13-migration-history.local.jsonl
```

Expected invariants:

```text
migration_count = 165
statement_count = 165
total_remote_sql_bytes = 123636
first_version = 20260709051056
last_version = 20260709060330
combined_remote_fingerprint_sha256 = 6df68289eb6de6a47f84f6bb8dae0761c75f148132dd99341e739e8f4a62f144
```

Any difference must be investigated against the authorized environment before files are materialized.

## 2. Materialize exact versions

```powershell
node scripts/e14/runtime-source-recovery/materialize-migration-history.mjs `
  --input .artifacts/e14/m13-migration-history.local.jsonl `
  --migrations-dir .artifacts/e14/recovered/supabase/migrations `
  --canonical-file .artifacts/e14/recovered/supabase/canonical-migrations/20260709051056_m13_e14_runtime_canonical.sql `
  --manifest .artifacts/e14/recovered/supabase/canonical-migrations/M13_RUNTIME_MANIFEST.json `
  --from-version 20260709051056 `
  --to-version 20260709060330
```

The command generates:

- one timestamped SQL file per remote version;
- a deterministic consolidated SQL artifact;
- a manifest with remote and materialized SHA-256 fingerprints.

No generated file is silently replaced. A content conflict stops the command.

## 3. Validate recovered M13 history

```powershell
node scripts/e14/runtime-source-recovery/validate-recovered-history.mjs `
  --manifest .artifacts/e14/recovered/supabase/canonical-migrations/M13_RUNTIME_MANIFEST.json `
  --migrations-dir .artifacts/e14/recovered/supabase/migrations `
  --canonical-file .artifacts/e14/recovered/supabase/canonical-migrations/20260709051056_m13_e14_runtime_canonical.sql
```

Validation fails when:

- a migration is missing or duplicated;
- order differs from the remote history;
- a file is modified after materialization;
- byte totals differ;
- a migration hash differs;
- the combined remote fingerprint differs;
- the canonical SQL artifact differs from the manifest.

## 4. Export and reconcile M14

Run the same process for:

```text
from_version = 20260709183504
to_version = 20260709184749
```

Expected remote files:

```text
20260709183504_m14_step5_application_read_surfaces.sql
20260709184749_m14b_step5_operator_workspace.sql
```

The current local files have equivalent SQL after repository file normalization, but their timestamps differ. The remote filenames must replace the local filenames only after the generated artifact is reviewed. Never edit the remote history to match local names.

## 5. Validate the tooling

```powershell
npm run test:e14-runtime-recovery
```

The tests use temporary synthetic data and never connect to Supabase. They cover:

- export metadata validation;
- deterministic materialization;
- idempotent second execution;
- overwrite protection;
- M14 SQL equivalence;
- successful manifest validation;
- rejection of tampered migration files;
- rejection of altered aggregate fingerprints.

## 6. Artifact review checklist

Before copying generated files into the feature branch:

```text
provenance_matches_expected_project = true
raw_exports_absent = true
m13_manifest_valid = true
m13_migration_count = 165
m13_combined_fingerprint_matches = true
m14_exact_versions_present = true
m14_exact_hashes_match = true
unexpected_files = 0
credentials_or_secrets_found = 0
```

Copying files must happen in a dedicated commit using a Conventional Commit title. Do not combine the recovered history with schema changes or helper refactoring.

## 7. Required follow-up gates

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
- using an owner or migration credential for the export workflow;
- enabling automatic Git commits from the database export job;
- combining migration recovery with the four-archetype implementation;
- renaming recovered remote versions for cosmetic consistency;
- expanding opaque `app_private.e14_*` helper naming during recovery.
