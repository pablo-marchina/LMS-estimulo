-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052201
-- Remote name: m13d1c_e14_instance_transition
-- Remote SQL SHA-256: d3bae690632fc017b01c95b02ab66fafdfde30fcbac6764d2283725c9a1df0ff
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_instance_transition(p_instance uuid)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare v bigint;
begin
 update orchestration.journey_instances set status='in_progress',started_at=coalesce(started_at,now()),aggregate_version=aggregate_version+1,updated_at=now() where id=p_instance returning aggregate_version into v;
 return v;
end;$$;
revoke all on function app_private.e14_instance_transition(uuid) from public,anon,authenticated;
