-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053800
-- Remote name: m13f4_e14_session_insert
-- Remote SQL SHA-256: d2b2fad5e6027f924cdb7fdaf94ef122de17cd7033a8e113475339c3087d12ee
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_session_insert_d(a uuid,b uuid)
returns uuid language sql security definer set search_path=pg_catalog as $$
 insert into orchestration.activity_sessions(id,step_instance_id,entrepreneur_id,started_at,last_seen_at,device_class,channel,accepted_observation_count)
 values(app_private.e14_deterministic_uuid(a::text||b::text),a,b,now(),now(),'synthetic','web',0)
 on conflict(id) do update set last_seen_at=excluded.last_seen_at
 returning id
$$;
