-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055755
-- Remote name: m13j14e_e14_ci
-- Remote SQL SHA-256: f832595bdf941c6d16c4d93b9edc88d70ffb85e47d088e295e2a48b23a2d945f
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_ci(a uuid,b uuid,c jsonb,d uuid,e text,f text) returns jsonb language sql volatile security definer set search_path=pg_catalog as $$select app_private.e14_choose_i(a,b,c,d,e,f)$$;
