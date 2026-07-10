-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053227
-- Remote name: m13e5b_e14_write_c1
-- Remote SQL SHA-256: 4194b8679cd183a535696d02b1b7310dcc8e5637fad714577713c68f15e34802
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_write_c1(a uuid,b jsonb,c jsonb,d uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare r uuid;
begin
 r:=app_private.e14_deterministic_uuid(a::text||'r');
 insert into diagnostics.results(id,session_id,calculation_version,status,operational_readiness,data_quality,recommended_start,calculated_at,source_event_high_watermark)
 values(r,a,'v1','completed',jsonb_build_object('x',c->>'x','y',c->>'y'),jsonb_build_object('n',c->>'n','u',c->>'u'),jsonb_build_object('p',b->>'p'),now(),d)
 on conflict(session_id,calculation_version) do nothing;
 return r;
end;$$;
