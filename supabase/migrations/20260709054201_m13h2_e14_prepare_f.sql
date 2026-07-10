-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054201
-- Remote name: m13h2_e14_prepare_f
-- Remote SQL SHA-256: 5e3ea34c118b9b04d178bdeaa93309d5be8d66d38c7316a516a43b4a2fb08f6c
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_prepare_f(a uuid,b uuid,c text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;at uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(c);h:=app_private.e14_request_hash(jsonb_build_object('b',b));ev:=app_private.e14_command_event_id('F',a,b,k);at:=app_private.e14_deterministic_uuid(ev::text||b::text);perform app_private.e14_lock_scope('F|'||a::text||'|'||b::text);rp:=app_private.e14_assert_idempotency(ev,h);return jsonb_build_object('k',k,'h',h,'e',ev,'a',at,'p',rp);
end;$$;
