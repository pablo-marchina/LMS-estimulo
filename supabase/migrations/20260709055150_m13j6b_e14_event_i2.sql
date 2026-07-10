-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055150
-- Remote name: m13j6b_e14_event_i2
-- Remote SQL SHA-256: 5c7f625ec63b4ac26e69052a480992a469cc97e0061123954f16465939daacae
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_event_i2(a uuid,b uuid,c jsonb,d bigint,e integer)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_ec('3ad33088-ba40-4265-9f4d-d4363244bebe',a,1,b,(c->>'org')::uuid,(c->>'instance')::uuid,'attempt',(c->>'attempt_id')::uuid,'attempt',(c->>'attempt_id')::uuid,d+2,jsonb_build_object('score',e))
$$;
