-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055357
-- Remote name: m13j8b_e14_complete_step_state
-- Remote SQL SHA-256: e6cf35abad4ea70edb8cf58c4896bf2db7b63c8b72dfef7cda298e5cc5d11682
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_complete_step_state(a uuid,b bigint)
returns bigint language sql security definer set search_path=pg_catalog as $$
 update orchestration.step_instances set status='completed',completed_at=now(),aggregate_version=b+1,updated_at=now() where id=a and aggregate_version=b returning aggregate_version
$$;
