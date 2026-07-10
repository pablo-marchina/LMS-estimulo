-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053519
-- Remote name: m13e8a_e14_first_c_fix
-- Remote SQL SHA-256: 9713e6accd84087dde28d7f6535fad666eeecde0ef13c9b30d536a5df7ddafef
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_first_c(a uuid,b uuid,c jsonb,d uuid,e bigint,f text,g text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_emit_g('041e646a-d96f-4fe9-b0bd-1401f97bf153',a,b,(c->>'organization_id')::uuid,(c->>'instance_id')::uuid,'session',d,'session',d,e,a,null,jsonb_build_object('request_hash',f,'idempotency_key',g))
$$;
