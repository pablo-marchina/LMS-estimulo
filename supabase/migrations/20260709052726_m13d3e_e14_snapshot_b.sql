-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052726
-- Remote name: m13d3e_e14_snapshot_b
-- Remote SQL SHA-256: 54e94ed2339de25af82f383e9b015d74cce87c3ef0a473c85cbd0cc571c6b01a
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_snapshot_b(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('response_id',r.id,'revision',r.revision,'response_value',r.response_value,'session_aggregate_version',s.aggregate_version) from diagnostics.responses r join diagnostics.sessions s on s.id=r.session_id where r.source_event_id=a
$$;
