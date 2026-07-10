-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053811
-- Remote name: m13f5_e14_prepare_d
-- Remote SQL SHA-256: d6b547dfd3b6621dfb0dff34fc5d768687012a73cd39fa1e004ab53c5fabd697
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_prepare_d(a uuid,b uuid,c bigint,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(d);h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c));ev:=app_private.e14_command_event_id('C7',a,app_private.e14_deterministic_uuid(b::text||c::text),k);perform app_private.e14_lock_scope('C7|'||a::text||'|'||b::text);rp:=app_private.e14_assert_idempotency(ev,h);return jsonb_build_object('k',k,'h',h,'e',ev,'p',rp);
end;$$;
