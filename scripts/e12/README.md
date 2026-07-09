# E12 technical proof scripts

## Static and contract tests

- `verify-migration-set.py`: validates M00–M10 ordering, checksums, counts and forbidden provider coupling.
- `contracts/provider-contracts.test.mjs`: provider-neutral contracts.
- `adapters/supabase-identity-provider.test.mjs`: JWT verification and normalization.
- `adapters/supabase-storage-provider.test.mjs`: signed upload, SHA-256, MIME/size, quarantine, release and signed download.

## Remote/local database execution

- `run-database-migrations.ps1`: applies M00–M10 in order using `DATABASE_URL` from the current session.
- `verify-live-database.sql`: verifies live object counts, RLS and outbox functions.
- `supabase-api-smoke.mjs`: Auth/REST/Storage gateway smoke test.
- `supabase-db-preflight.sql`: PostgreSQL preflight.

No script prints API keys or database connection strings. Local reports are excluded from version control by convention and must be reviewed before sharing.

## Fila e worker

- `adapters/supabase-queue-provider.mjs`: adapter provider-neutral sobre RPCs server-side.
- `workers/internal-worker-auth.mjs`: fixture legado preservado apenas como teste histórico; o runtime atual usa token de dispatch de uso único.
- `workers/proof-file-scanner.mjs`: scanner técnico isolado para testes de integridade/EICAR.
- `node --test scripts/e12/**/*.test.mjs`: testes de contratos, adapters e worker.

O scanner técnico e o dispatcher Supabase não são componentes de produção AWS.
