-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053323
-- Remote name: m13e5f_e14_write_step
-- Remote SQL SHA-256: 8141fc33391a4e2ed6306983c1bc5b815a38530638d16d88ec9672e4dcbc8f6b
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_write_step(a jsonb,b uuid)
returns uuid language sql security definer set search_path=pg_catalog as $$
 insert into orchestration.step_instances(id,path_assignment_id,path_step_id,activity_version_id,status,available_at,attempt_count,aggregate_version)
 values(app_private.e14_deterministic_uuid(b::text||(a->>'s')),b,(a->>'s')::uuid,(a->>'v')::uuid,'available',now(),0,0)
 on conflict(path_assignment_id,path_step_id) do update set path_assignment_id=excluded.path_assignment_id
 returning id
$$;
