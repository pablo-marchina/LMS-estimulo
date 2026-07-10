-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054441
-- Remote name: m13h5e_e14_vf
-- Remote SQL SHA-256: 62065a7368737ccd7de95401acf238c6290dc4055f41e6cdc830b51c588255a6
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_vf(a uuid,b uuid) returns jsonb language sql volatile security definer set search_path=pg_catalog as $$select app_private.e14_validate_f(a,b)$$;
