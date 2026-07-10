-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055531
-- Remote name: m13j11c_e14_ev8
-- Remote SQL SHA-256: 19bf2633571b34be9be726b34ef2e5039de1f736980d66298a312622a0b8944e
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_ev8(a uuid,b uuid,c jsonb)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_ec('06398740-a20e-4b6c-a501-d1992bddf3f4',a,8,b,(c->>'org')::uuid,(c->>'instance')::uuid,'journey_instance',(c->>'instance')::uuid,'journey_instance',(c->>'instance')::uuid,(c->>'journey_version')::bigint+1,'{}'::jsonb)
$$;
