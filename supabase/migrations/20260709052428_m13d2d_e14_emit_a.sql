-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052428
-- Remote name: m13d2d_e14_emit_a
-- Remote SQL SHA-256: 2113eb6d5c193891b574cbf7e078646c04ba533180fa0171f3c723902198ac95
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_emit_a(a uuid,b uuid,c uuid,d uuid,e uuid,f uuid,g text,h text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_append_event(a,app_private.e14_event_name('5b3dbd7f-718e-4081-990e-37d96fa638de'),'session',e,'user_account',b,c,d,'session',e,0,a,null,jsonb_build_object('request_hash',g,'idempotency_key',h,'version_id',f))
$$;
