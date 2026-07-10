-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053059
-- Remote name: m13e1_e14_generic_event_emitter
-- Remote SQL SHA-256: b2e008c5d26a698cf76cf3da28272a58afa500a530461a69e1ff3f763ad82d4d
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_emit_g(a uuid,b uuid,c uuid,d uuid,e uuid,f text,g uuid,h text,i uuid,j bigint,k uuid,l uuid,m jsonb)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_append_event(b,app_private.e14_event_name(a),f,g,'user_account',c,d,e,h,i,j,k,l,m)
$$;
