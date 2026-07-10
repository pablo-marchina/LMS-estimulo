-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052659
-- Remote name: m13d3c_e14_prepare_b
-- Remote SQL SHA-256: c3784b2b4ab75ed322c8fa2a9e2a97a24e49001e5804933a9d7399949c17c730
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_prepare_b(a uuid,b uuid,c uuid,d text,e integer,f integer,g text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;rid uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(g);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c,'d',d,'e',e,'f',f));
 rid:=app_private.e14_deterministic_uuid(b::text||c::text||e::text);
 ev:=app_private.e14_command_event_id('C5',a,rid,k);
 perform app_private.e14_lock_scope('C5|'||a::text||'|'||b::text||'|'||c::text);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'r',rid,'p',rp);
end;$$;
