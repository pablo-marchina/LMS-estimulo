-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052545
-- Remote name: m13d2h_e14_prepare_a
-- Remote SQL SHA-256: 7de980c9168d1930af5460159b58627e48b66610cd1b41a8bc9d35c95577b005
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_prepare_a(a uuid,b uuid,c uuid,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;sid uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(d);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c));
 sid:=app_private.e14_deterministic_uuid(b::text||c::text);
 ev:=app_private.e14_command_event_id('C4',a,sid,k);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'s',sid,'r',rp);
end;$$;
