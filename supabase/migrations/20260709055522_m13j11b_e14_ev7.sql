-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055522
-- Remote name: m13j11b_e14_ev7
-- Remote SQL SHA-256: 04d9bca8d48102f8d3499473090d293e136b0021f5f4190948fb34c2c50e690f
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_ev7(a uuid,b uuid,c jsonb)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_ec('de21d6b1-7ac3-49ff-b14c-fe7adb2400d6',a,7,b,(c->>'org')::uuid,(c->>'instance')::uuid,'path_assignment',(c->>'assignment')::uuid,'path_assignment',(c->>'assignment')::uuid,2,'{}'::jsonb)
$$;
