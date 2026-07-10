-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052647
-- Remote name: m13d3b_e14_emit_b
-- Remote SQL SHA-256: a705dbcfaa7998ef36ff68e4d08a6da87e3d7c9bb8250643c52af613dbc58db1
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_emit_b(a uuid,b uuid,c uuid,d uuid,e uuid,f uuid,g integer,h text,i text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_append_event(a,app_private.e14_event_name('5107a3f3-36a8-43db-9ff0-628e92372c70'),'response',e,'user_account',b,c,d,'session',f,g,a,null,jsonb_build_object('request_hash',h,'idempotency_key',i))
$$;
