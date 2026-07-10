-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708222033
-- Remote name: m08n_grant_pgcrypto_digest_to_worker
-- Remote SQL SHA-256: 29ec9039107a8a0bad8dd51f2da38cc31b18388b35c41bebda251089e26b01e8
-- Do not edit after reconciliation; corrections require a new migration.

grant usage on schema extensions to app_worker;
grant execute on function extensions.digest(bytea, text) to app_worker;
