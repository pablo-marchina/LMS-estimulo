-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055543
-- Remote name: m13j12a_e14_branch_i0
-- Remote SQL SHA-256: 34770f48ccb9b3476ff0d20c977f44a55fbf04cdc719d76ee909e7eb6d4485f2
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_branch_i0(a uuid,b uuid,c jsonb,d uuid,e text,f text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with ev as (select app_private.e14_i0_events(a,b,c,d,e,f) ids),
 wr as (select app_private.e14_i0_write(b,c,d) x)
 select wr.x||jsonb_build_object('e',ev.ids) from ev,wr
$$;
