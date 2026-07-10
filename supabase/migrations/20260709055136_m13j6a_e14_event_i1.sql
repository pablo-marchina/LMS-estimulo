-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055136
-- Remote name: m13j6a_e14_event_i1
-- Remote SQL SHA-256: 704be0fa2bc8097c3e930a34e06290f75d6c384a778a1335dbbe7a066eb38773
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_event_i1(a uuid,b uuid,c jsonb,d bigint,e text,f text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_emit_g('316e30d0-d03e-42d1-a0e4-fe62f8568716',a,b,(c->>'org')::uuid,(c->>'instance')::uuid,'attempt',(c->>'attempt_id')::uuid,'attempt',(c->>'attempt_id')::uuid,d+1,a,null,jsonb_build_object('request_hash',e,'idempotency_key',f))
$$;
