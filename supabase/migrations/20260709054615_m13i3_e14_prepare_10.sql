-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054615
-- Remote name: m13i3_e14_prepare_10
-- Remote SQL SHA-256: 6972e2434d9a145d3c2ffc53dfad856794513c6b81691578ff9959338a41bfbc
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_prepare_10(a uuid,b uuid,c uuid,d text,e text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;r uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(e);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c,'d',d));
 r:=app_private.e14_deterministic_uuid(b::text||c::text);
 ev:=app_private.e14_command_event_id('H',a,r,k);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'r',r,'p',rp);
end;$$;
