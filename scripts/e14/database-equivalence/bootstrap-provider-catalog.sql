-- Provider-owned prerequisite for replaying temporary migration-export helpers.
-- This schema/table is owned by Supabase in the authorized environment and is
-- excluded from the Estímulo application-equivalence inventory.
create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text,
  created_by text,
  idempotency_key text,
  rollback text[]
);
