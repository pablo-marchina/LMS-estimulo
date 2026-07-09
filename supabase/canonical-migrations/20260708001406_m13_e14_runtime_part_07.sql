-- remote migration 20260709052248: m13d2a_e14_diagnostic_context
create or replace function app_private.e14_diagnostic_context(p_actor uuid,p_instance uuid,p_diag uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare ent uuid;org uuid;expected_diag uuid;st text;
begin
 select e.entrepreneur_id,jd.owner_organization_id,(jv.configuration->>'diagnostic_version_id')::uuid,ji.status into ent,org,expected_diag,st
 from orchestration.journey_instances ji join orchestration.enrollments e on e.id=ji.enrollment_id join catalog.journey_versions jv on jv.id=e.journey_version_id join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where ji.id=p_instance;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(p_actor) is distinct from ent then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if st<>'in_progress' or expected_diag<>p_diag or not exists(select 1 from diagnostics.diagnostic_versions where id=p_diag and status='published') then raise exception 'DIAGNOSTIC_NOT_AVAILABLE' using errcode='P0001';end if;
 return jsonb_build_object('entrepreneur_id',ent,'organization_id',org);
end;$$;
revoke all on function app_private.e14_diagnostic_context(uuid,uuid,uuid) from public,anon,authenticated;

