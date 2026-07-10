-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055213
-- Remote name: m13j6d_e14_event_i4
-- Remote SQL SHA-256: 614bffd6a6982326925338f884295ac279b72c0296e4b45e9052b6c07830e24b
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_event_i4(a uuid,b uuid,c jsonb,d bigint)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_ec('b5924a50-5d04-45e6-859e-e68f7ce6d81b',a,3,b,(c->>'org')::uuid,(c->>'instance')::uuid,'attempt',(c->>'attempt_id')::uuid,'attempt',(c->>'attempt_id')::uuid,d+4,'{"code":"review_rule"}'::jsonb)
$$;
