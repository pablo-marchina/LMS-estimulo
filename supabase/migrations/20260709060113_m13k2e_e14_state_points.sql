-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060113
-- Remote name: m13k2e_e14_state_points
-- Remote SQL SHA-256: c8cbfa0fbc3e3333746cc6103133b1276943d744af78aa728727cbdbb8e8deb4
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_state_points(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('balance',coalesce((select bp.balance from engagement.point_balance_projections bp where bp.entrepreneur_id=x.entrepreneur_id and bp.journey_instance_id=x.journey_instance_id),0),'ledger_count',(select count(*) from engagement.point_ledger pl where pl.entrepreneur_id=x.entrepreneur_id and pl.journey_instance_id=x.journey_instance_id),'ledger_sum',coalesce((select sum(pl.amount) from engagement.point_ledger pl where pl.entrepreneur_id=x.entrepreneur_id and pl.journey_instance_id=x.journey_instance_id),0)) from app_private.e14_instance_context x where x.journey_instance_id=a
$$;
