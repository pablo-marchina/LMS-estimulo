-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055739
-- Remote name: m13j14c_e14_si
-- Remote SQL SHA-256: cdfee25e1bab955eda9964a703682dc1b8b1da5866467b2f2172da424178bd48
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_si(a uuid) returns jsonb language sql stable security definer set search_path=pg_catalog as $$select app_private.e14_snapshot_i(a)$$;
