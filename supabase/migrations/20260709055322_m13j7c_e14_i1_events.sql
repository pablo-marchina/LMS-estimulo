-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055322
-- Remote name: m13j7c_e14_i1_events
-- Remote SQL SHA-256: f9e54b6af47272920a38aae303c650a5465451b00c9409aee8fe38491f010706
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_i1_events(a uuid,b uuid,c jsonb,d uuid,e text,f text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with x1 as (select app_private.e14_event_i1(d,a,c,(c->>'attempt_version')::bigint,e,f) v),
 x2 as (select app_private.e14_event_i2(d,a,c,(c->>'attempt_version')::bigint,100) v),
 x3 as (select app_private.e14_event_i3(d,a,c,(c->>'attempt_version')::bigint,'5e9e983c-980c-4c33-9e0b-0f88ad310c38',true) v)
 select jsonb_build_array(x1.v,x2.v,x3.v) from x1,x2,x3
$$;
