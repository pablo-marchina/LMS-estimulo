-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053827
-- Remote name: m13f6_e14_snapshot_d
-- Remote SQL SHA-256: abd7ea359bd98cecc25b95ad2bef4267d52d946bf9e8bbc41c3835e22d18c6ea
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_snapshot_d(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('i',x.step_instance_id,'s',x.step_status,'v',x.step_version,'a',z.id,'n',coalesce(z.accepted_observation_count,0))
 from app_private.e14_step_context x left join orchestration.activity_sessions z on z.step_instance_id=x.step_instance_id and z.ended_at is null where x.step_instance_id=a
$$;
