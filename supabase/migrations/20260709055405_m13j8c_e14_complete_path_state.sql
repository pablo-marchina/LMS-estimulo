-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055405
-- Remote name: m13j8c_e14_complete_path_state
-- Remote SQL SHA-256: 6499d216bb30c915b5da2813bbf0261cc8e1f1397dd6a7f24d6cc8c16c73ce8e
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_complete_path_state(a uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 update orchestration.path_assignments set status='completed',valid_until=now() where id=a and status='active'
$$;
