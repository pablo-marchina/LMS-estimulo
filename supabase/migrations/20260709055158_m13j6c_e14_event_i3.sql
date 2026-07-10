-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055158
-- Remote name: m13j6c_e14_event_i3
-- Remote SQL SHA-256: ae132ed19b21872ea3dbf47dae7f79a251a4aff3beb7675501c6e70ea538e0de
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_event_i3(a uuid,b uuid,c jsonb,d bigint,e uuid,f boolean)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_ec(e,a,2,b,(c->>'org')::uuid,(c->>'instance')::uuid,'attempt',(c->>'attempt_id')::uuid,'attempt',(c->>'attempt_id')::uuid,d+3,jsonb_build_object('passed',f))
$$;
