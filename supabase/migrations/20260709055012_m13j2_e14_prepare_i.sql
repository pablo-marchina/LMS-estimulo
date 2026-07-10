-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055012
-- Remote name: m13j2_e14_prepare_i
-- Remote SQL SHA-256: c90a0ba4488044ae0fe6812d4c066d0c0cb14727bed8b4893f13fe426a3e51c4
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_prepare_i(a uuid,b uuid,c bigint,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;rid uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(d);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c));
 rid:=app_private.e14_deterministic_uuid(b::text||c::text);
 ev:=app_private.e14_command_event_id('I',a,rid,k);
 perform app_private.e14_lock_scope('I|'||a::text||'|'||b::text);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'r',rid,'p',rp);
end;$$;
