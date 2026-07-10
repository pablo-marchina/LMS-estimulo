-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053746
-- Remote name: m13f3_e14_step_transition
-- Remote SQL SHA-256: 48a5af541837cd537a17b80ed452c79fd84d18258b158462982fec4512ecf562
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_step_transition(a uuid,b bigint)
returns bigint language sql security definer set search_path=pg_catalog as $$
 update orchestration.step_instances set status='in_progress',started_at=coalesce(started_at,now()),aggregate_version=aggregate_version+1,updated_at=now()
 where id=a and status='available' and aggregate_version=b
 returning aggregate_version
$$;
