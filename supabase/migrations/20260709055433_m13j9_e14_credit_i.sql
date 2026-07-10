-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055433
-- Remote name: m13j9_e14_credit_i
-- Remote SQL SHA-256: ec2bdf968d1642eee1519672c1b92b82a2bc3134b772be5a633a55bded985994
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_credit_i(a uuid,b jsonb,c uuid,d integer,e uuid,f integer,g text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare lid uuid;eid uuid;idem text;
begin
 lid:=app_private.e14_deterministic_uuid((b->>'instance')||'|'||g);
 idem:='e14|'||(b->>'instance')||'|'||g;
 eid:=app_private.e14_ec('759ce3da-8b1f-4977-b2de-183775004afc',c,d,a,(b->>'org')::uuid,(b->>'instance')::uuid,'point_ledger',lid,'point_ledger',lid,0,jsonb_build_object('amount',f,'code',g));
 insert into engagement.point_ledger(id,entrepreneur_id,journey_instance_id,point_rule_version_id,amount,source_event_id,idempotency_key,reason,occurred_at)
 values(lid,(b->>'person')::uuid,(b->>'instance')::uuid,e,f,eid,idem,g,now())
 on conflict(idempotency_key) do nothing;
 return jsonb_build_object('ledger_id',lid,'event_id',eid,'amount',f);
end;$$;
