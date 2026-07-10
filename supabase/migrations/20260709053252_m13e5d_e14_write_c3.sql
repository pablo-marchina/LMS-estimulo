-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053252
-- Remote name: m13e5d_e14_write_c3
-- Remote SQL SHA-256: 357137c4f39cb0df9217cb3394b9d2b18d57830a6ae5209f1dd897493d6b66ea
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_write_c3(a jsonb,b jsonb,c jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare r uuid;q numeric;
begin
 r:=app_private.e14_deterministic_uuid((a->>'instance_id')||'d');q:=case when (c->>'l')::boolean then 0.5 else 1.0 end;
 insert into orchestration.personalization_decisions(id,entrepreneur_id,journey_instance_id,decision_type,rule_version_id,input_snapshot,output,confidence,status,decided_at)
 values(r,(a->>'entrepreneur_id')::uuid,(a->>'instance_id')::uuid,'path_selection',app_private.e14_deterministic_uuid('e14:rule-version:always-eligible:v1'),b,jsonb_build_object('p',c->>'p','l',(c->>'l')::boolean),q,'applied',now())
 on conflict(id) do nothing;
 return r;
end;$$;
