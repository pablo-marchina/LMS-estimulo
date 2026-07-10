-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708224455
-- Remote name: m09c_remove_proof_http_extensions
-- Remote SQL SHA-256: dccc897da942e079038b31c0f2aae10e58fe6f859bcf11ef812835aba9f27d57
-- Do not edit after reconciliation; corrections require a new migration.

drop extension if exists http;
drop extension if exists pg_net;
