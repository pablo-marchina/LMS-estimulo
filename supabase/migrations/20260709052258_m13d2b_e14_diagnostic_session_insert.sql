-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052258
-- Remote name: m13d2b_e14_diagnostic_session_insert
-- Remote SQL SHA-256: bd43ed0d8c40290e81f170f929824c7e23f745f6417136f4fb16bfea73cdea0c
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_insert_diagnostic_session(p_session uuid,p_diag uuid,p_person uuid,p_instance uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 insert into diagnostics.sessions(id,diagnostic_version_id,entrepreneur_id,business_id,journey_instance_id,status,started_at,aggregate_version)
 values(p_session,p_diag,p_person,null,p_instance,'in_progress',now(),0)
 on conflict(id) do nothing
$$;
revoke all on function app_private.e14_insert_diagnostic_session(uuid,uuid,uuid,uuid) from public,anon,authenticated;
