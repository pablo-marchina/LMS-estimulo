-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052405
-- Remote name: m13d2c_e14_event_name_lookup
-- Remote SQL SHA-256: 0a3cd6d8dcd369ead4700cf251aa18cd191279e223dec1d5bc593f3fd5d4163d
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_event_name(p_schema_id uuid)
returns text language sql stable security definer set search_path=pg_catalog as $$
 select event_name from eventing.event_schemas where id=p_schema_id and status='published'
$$;
