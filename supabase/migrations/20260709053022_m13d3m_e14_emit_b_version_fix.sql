-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053022
-- Remote name: m13d3m_e14_emit_b_version_fix
-- Remote SQL SHA-256: 6ff0ca6c3f263f1ab2ecc4b6a90be9fc77e111988d354ce7f74d226c7b1ff459
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_emit_b(a uuid,b uuid,c uuid,d uuid,e uuid,f uuid,g integer,h text,i text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_append_event(a,app_private.e14_event_name('5107a3f3-36a8-43db-9ff0-628e92372c70'),'response',e,'user_account',b,c,d,'session',f,app_private.e14_session_version(f)+1,a,null,jsonb_build_object('request_hash',h,'idempotency_key',i))
$$;
