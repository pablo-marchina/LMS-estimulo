-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055747
-- Remote name: m13j14d_e14_vi
-- Remote SQL SHA-256: affadebc48ea980ffe8337fd14e2736b3ef64bd25c525f8feea451e853d59a58
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_vi(a uuid,b uuid,c bigint) returns jsonb language sql volatile security definer set search_path=pg_catalog as $$select app_private.e14_validate_i(a,b,c)$$;
