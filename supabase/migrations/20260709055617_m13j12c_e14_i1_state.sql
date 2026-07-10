-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055617
-- Remote name: m13j12c_e14_i1_state
-- Remote SQL SHA-256: 51c1dd747d38bafebaf5112b08b2241530c556eaee18de8cb6d7dfc3dd3e407a
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_i1_state(a jsonb,b uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare sv bigint;jv bigint;t integer;
begin
 perform app_private.e14_close_activity_session((a->>'activity_session')::uuid);
 sv:=app_private.e14_complete_step_state((a->>'step')::uuid,(a->>'step_version')::bigint);
 perform app_private.e14_complete_path_state((a->>'assignment')::uuid);
 jv:=app_private.e14_complete_journey_state((a->>'instance')::uuid,(a->>'journey_version')::bigint);
 perform app_private.e14_complete_progress((a->>'instance')::uuid);
 t:=app_private.e14_sum_i(a);
 perform app_private.e14_upsert_i(a,b,t);
 return jsonb_build_object('point_balance',t,'step_aggregate_version',sv,'journey_aggregate_version',jv,'journey_status','completed','progress',1);
end;$$;
