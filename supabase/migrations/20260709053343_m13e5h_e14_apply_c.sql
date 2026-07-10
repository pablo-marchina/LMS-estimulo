-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053343
-- Remote name: m13e5h_e14_apply_c
-- Remote SQL SHA-256: 0d1eafc610ec5c9ec236cb3f098d8a94528137e763bd893006038e5ec347bcfd
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_apply_c(a uuid,b jsonb,c jsonb,d jsonb,e uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v bigint;r uuid;dec uuid;pa uuid;si uuid;
begin
 if (c->>'n')::integer<>4 or d is null then raise exception 'DIAGNOSTIC_INCOMPLETE' using errcode='P0001';end if;
 v:=app_private.e14_complete_session(a);
 r:=app_private.e14_write_c1(a,d,c,e);
 perform app_private.e14_write_dimension(r,(b->>'version_id')::uuid,1,(c->>'x')::numeric);
 perform app_private.e14_write_dimension(r,(b->>'version_id')::uuid,2,(c->>'y')::numeric);
 dec:=app_private.e14_write_c3(b,c,d);
 pa:=app_private.e14_write_c4(b,d,r);
 si:=app_private.e14_write_step(d,pa);
 perform app_private.e14_set_current_step((b->>'instance_id')::uuid,(d->>'s')::uuid);
 return jsonb_build_object('result_id',r,'decision_id',dec,'assignment_id',pa,'step_instance_id',si,'session_aggregate_version',v,'path_code',d->>'p','low_confidence',(d->>'l')::boolean);
end;$$;
