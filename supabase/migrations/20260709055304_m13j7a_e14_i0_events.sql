-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055304
-- Remote name: m13j7a_e14_i0_events
-- Remote SQL SHA-256: b1ed0ce7b7c2b6fad0dd448064c7d143afad923bc6bc527efb8462d7c985d3db
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_i0_events(a uuid,b uuid,c jsonb,d uuid,e text,f text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with x1 as (select app_private.e14_event_i1(d,a,c,(c->>'attempt_version')::bigint,e,f) v),
 x2 as (select app_private.e14_event_i2(d,a,c,(c->>'attempt_version')::bigint,0) v),
 x3 as (select app_private.e14_event_i3(d,a,c,(c->>'attempt_version')::bigint,'dbb838f7-04cb-4974-8bd4-d74652dc3974',false) v),
 x4 as (select app_private.e14_event_i4(d,a,c,(c->>'attempt_version')::bigint) v)
 select jsonb_build_array(x1.v,x2.v,x3.v,x4.v) from x1,x2,x3,x4
$$;
