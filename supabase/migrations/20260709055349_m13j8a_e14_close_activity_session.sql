-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055349
-- Remote name: m13j8a_e14_close_activity_session
-- Remote SQL SHA-256: 9a01585b9c0042f264ec3eccf253efec95e16a0c89d07ff7a6d3c9ec82bb463a
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_close_activity_session(a uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 update orchestration.activity_sessions set ended_at=now(),last_seen_at=now() where id=a and ended_at is null
$$;
