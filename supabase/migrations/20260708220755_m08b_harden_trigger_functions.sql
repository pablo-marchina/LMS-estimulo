-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708220755
-- Remote name: m08b_harden_trigger_functions
-- Remote SQL SHA-256: ad4360c6a1c02e27f196e1a2e4075d1fbadb46c542863ffa200e52b829f17710
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function governance.set_updated_at() returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create or replace function governance.reject_mutation() returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'table %.% is append-only', tg_table_schema, tg_table_name;
end
$$;
