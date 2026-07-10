-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052142
-- Remote name: m13d1b_e14_start_context
-- Remote SQL SHA-256: 393d36dc33ebf437e6c1970be3ed38747a9960f983a9f92d519dfe6e56c91462
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_start_context(p_actor uuid,p_instance uuid,p_expected bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare ent uuid;enr uuid;org uuid;ver bigint;st text;
begin
 select e.entrepreneur_id,e.id,jd.owner_organization_id,ji.aggregate_version,ji.status into ent,enr,org,ver,st
 from orchestration.journey_instances ji join orchestration.enrollments e on e.id=ji.enrollment_id join catalog.journey_versions jv on jv.id=e.journey_version_id join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where ji.id=p_instance;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(p_actor) is distinct from ent then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if ver<>p_expected then raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode='P0001';end if;
 if st<>'available' then raise exception 'INVALID_STATE' using errcode='P0001';end if;
 return jsonb_build_object('entrepreneur_id',ent,'enrollment_id',enr,'organization_id',org,'aggregate_version',ver);
end;$$;
revoke all on function app_private.e14_start_context(uuid,uuid,bigint) from public,anon,authenticated;
