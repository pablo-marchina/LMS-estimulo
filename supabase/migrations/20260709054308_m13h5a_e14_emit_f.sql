-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054308
-- Remote name: m13h5a_e14_emit_f
-- Remote SQL SHA-256: 9324c0a1c43df6976d6eaeae7f9faa5abb28ec2e99879bdbb44f39abb0c25cb0
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_emit_f(a uuid,b uuid,c jsonb,d uuid,e text,f text,g integer)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_emit_g('358595b5-2c75-4d25-aab7-98a8ddbe00b6',d,a,(c->>'org')::uuid,(c->>'instance')::uuid,'attempt',b,'attempt',b,0,d,null,jsonb_build_object('request_hash',e,'idempotency_key',f,'attempt_number',g))
$$;
