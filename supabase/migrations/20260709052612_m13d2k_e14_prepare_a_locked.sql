-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052612
-- Remote name: m13d2k_e14_prepare_a_locked
-- Remote SQL SHA-256: 01490e33c504d7d65a4f4ebb089517a3eafcb9d96057ba5c05750ef5c23eb765
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_prepare_a(a uuid,b uuid,c uuid,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;sid uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(d);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c));
 sid:=app_private.e14_deterministic_uuid(b::text||c::text);
 ev:=app_private.e14_command_event_id('C4',a,sid,k);
 perform app_private.e14_lock_scope('C4|'||a::text||'|'||sid::text||'|'||k);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'s',sid,'r',rp);
end;$$;
