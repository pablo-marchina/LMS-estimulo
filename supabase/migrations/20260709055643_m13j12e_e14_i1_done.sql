-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055643
-- Remote name: m13j12e_e14_i1_done
-- Remote SQL SHA-256: 8ba0be5abe2442625b9ba96fa773f449fc4d18238f7c182618253ce8e6c96ba4
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_i1_done(a uuid,b uuid,c jsonb,d uuid,e text,f text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare z jsonb;p1 jsonb;p2 jsonb;q jsonb;x4 uuid;x7 uuid;x8 uuid;
begin
 z:=app_private.e14_i1_assess(a,b,c,d,e,f);
 x4:=app_private.e14_ev4(d,a,c);
 p1:=app_private.e14_credit_i(a,c,d,5,app_private.e14_deterministic_uuid('e14:point-version:activity:v1'),5,'a5');
 p2:=app_private.e14_credit_i(a,c,d,6,app_private.e14_deterministic_uuid('e14:point-version:check:v1'),2,'q2');
 x7:=app_private.e14_ev7(d,a,c);
 x8:=app_private.e14_ev8(d,a,c);
 q:=app_private.e14_i1_state(c,(p2->>'ledger_id')::uuid);
 return z||q||jsonb_build_object('ce',jsonb_build_array(x4,p1->'event_id',p2->'event_id',x7,x8),'pe',jsonb_build_array(p1,p2));
end;$$;
