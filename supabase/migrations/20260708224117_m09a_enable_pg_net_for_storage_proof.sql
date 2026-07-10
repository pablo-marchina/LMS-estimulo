-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708224117
-- Remote name: m09a_enable_pg_net_for_storage_proof
-- Remote SQL SHA-256: 720ec83cb404dd730aac48a345a1c23e26773a93a221da0f686c24bb208f46a9
-- Do not edit after reconciliation; corrections require a new migration.

create extension if not exists pg_net with schema extensions;
