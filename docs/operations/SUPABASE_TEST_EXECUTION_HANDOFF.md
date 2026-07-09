# Supabase test execution handoff

## Safe inputs

The project URL has already been registered.

For API tests, set locally or in CI:

```bash
export SUPABASE_URL="https://cfpfeavjlgheqqiaqtzv.supabase.co"
export SUPABASE_PUBLISHABLE_KEY="..."
node scripts/e12/supabase-api-smoke.mjs
```

The publishable/anon key is intended for client use, but it should still be configured through environment variables rather than committed.

## Sensitive input

For database validation, set the connection only in a protected local/CI environment:

```bash
export DATABASE_URL="postgresql://..."
bash scripts/e12/supabase-ddl-transaction-smoke.sh
```

Do not paste or upload:

- database password;
- full `DATABASE_URL`;
- service-role/secret API key;
- AWS access keys.

## Expected outputs to share safely

The following outputs contain no secret by design and can be returned for analysis:

- `supabase-api-smoke-report.json`;
- `supabase-db-preflight-report.txt`;
- `supabase-ddl-smoke-report.txt`;
- migration error messages after removing connection strings and tokens.
