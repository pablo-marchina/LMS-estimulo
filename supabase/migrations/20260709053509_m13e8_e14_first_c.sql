-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053509
-- Remote name: m13e8_e14_first_c
-- Remote SQL SHA-256: 52a45372ad56ec2068ba9ee65c05f336863b5d38a33808e5d507b0776f7160eb
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_first_c(a uuid,b uuid,c jsonb,d bigint,e text,f text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_emit_g('041e646a-d96f-4fe9-b0bd-1401f97bf153',a,b,(c->>'organization_id')::uuid,(c->>'instance_id')::uuid,'session',d::text::uuid,'session',d::text::uuid,0,a,null,jsonb_build_object('request_hash',e,'idempotency_key',f))
$$;
