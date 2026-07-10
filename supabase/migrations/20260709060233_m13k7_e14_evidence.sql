-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060233
-- Remote name: m13k7_e14_evidence
-- Remote SQL SHA-256: 1ce51ac5444718ca0faa1410e08e8f202ec3882e91d97b6d9db9f332c1ae199b
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_evidence(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(jsonb_agg(jsonb_build_object('event_id',e.event_id,'event_name',e.event_name,'aggregate_type',e.aggregate_type,'aggregate_id',e.aggregate_id,'aggregate_version',e.aggregate_version,'occurred_at',e.occurred_at) order by e.received_at),'[]'::jsonb)
 from eventing.events e where e.journey_instance_id=a
$$;
