-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055514
-- Remote name: m13j11a_e14_ev4
-- Remote SQL SHA-256: 1f93d13e041d9f13680a0e91ec4e23aa25a7bcb286916ea499bed6a1c256f121
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_ev4(a uuid,b uuid,c jsonb)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_ec('92a76bac-6b22-4e8a-98ac-c529000d210e',a,4,b,(c->>'org')::uuid,(c->>'instance')::uuid,'step',(c->>'step')::uuid,'step',(c->>'step')::uuid,(c->>'step_version')::bigint+1,jsonb_build_object('n',(c->>'sections')::integer))
$$;
