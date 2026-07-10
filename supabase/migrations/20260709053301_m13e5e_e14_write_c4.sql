-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053301
-- Remote name: m13e5e_e14_write_c4
-- Remote SQL SHA-256: dd13cfd6dafe9da34634cb108840612cd9e2801b8f60694b8bf60ee6d2759fe1
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_write_c4(a jsonb,b jsonb,c uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare r uuid;q numeric;
begin
 r:=app_private.e14_deterministic_uuid((a->>'instance_id')||'a');q:=case when (b->>'l')::boolean then 0.5 else 1.0 end;
 insert into orchestration.path_assignments(id,journey_instance_id,path_template_id,assignment_policy_id,status,reason,confidence,valid_from)
 values(r,(a->>'instance_id')::uuid,(b->>'t')::uuid,null,'active',jsonb_build_object('result_id',c,'technical_only',true),q,now())
 on conflict(id) do nothing;
 return r;
end;$$;
