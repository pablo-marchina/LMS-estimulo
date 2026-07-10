-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055631
-- Remote name: m13j12d_e14_i1_assess
-- Remote SQL SHA-256: 7bab271f16063c000485b8ad5609a6e31db901ed26a56df4f7dcf594804fca7d
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_i1_assess(a uuid,b uuid,c jsonb,d uuid,e text,f text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 select app_private.e14_i1_write(b,c,d)||jsonb_build_object('ae',app_private.e14_i1_events(a,b,c,d,e,f))
$$;
