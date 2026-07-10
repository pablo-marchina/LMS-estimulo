-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054709
-- Remote name: m13i5_e14_emit_h
-- Remote SQL SHA-256: dd99eb52eb065304b731fedb0d2b982501cb4dc06cafabe000b541c0b9110509
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_emit_h(a uuid,b uuid,c jsonb,d uuid,e uuid,f text,g text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_emit_g('e85a6dae-d34f-45cb-9171-f67ce9a0d217',a,b,(c->>'org')::uuid,(c->>'instance')::uuid,'response',d,'attempt',e,(c->>'attempt_version')::bigint+1,a,null,jsonb_build_object('request_hash',f,'idempotency_key',g))
$$;
