-- Provider-owned prerequisites for replaying the application migration history.
-- These objects are owned by Supabase in the authorized environment and are
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

-- The PostgreSQL-only CI service exposes a reduced auth.users catalog, while
-- the real Supabase Auth schema includes these lifecycle columns. Keep the
-- replay provider shim faithful to the provider contract so application
-- migrations and hardening tests exercise the same confirmation semantics.
alter table auth.users
  add column if not exists email_confirmed_at timestamptz,
  add column if not exists deleted_at timestamptz;
