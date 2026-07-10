-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054625
-- Remote name: m13i3a_e14_prepare_10_locked
-- Remote SQL SHA-256: b2f2a4b765cc13d2ee3eabc3d09ec05ecc4bf2bee73b19d2d4c1cc5aa8ed3601
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_prepare_10(a uuid,b uuid,c uuid,d text,e text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;r uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(e);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c,'d',d));
 r:=app_private.e14_deterministic_uuid(b::text||c::text);
 ev:=app_private.e14_command_event_id('H',a,r,k);
 perform app_private.e14_lock_scope('H|'||a::text||'|'||b::text||'|'||c::text);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'r',r,'p',rp);
end;$$;
