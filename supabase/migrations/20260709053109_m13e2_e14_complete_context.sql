-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053109
-- Remote name: m13e2_e14_complete_context
-- Remote SQL SHA-256: 6cc2be5e6b528815a35423e4877807e6c4c5e46ee10171c177d8fd9d6e1a26b4
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_context_c(a uuid,b uuid,c bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare ent uuid;inst uuid;dv uuid;st text;ver bigint;org uuid;jv uuid;
begin
 select s.entrepreneur_id,s.journey_instance_id,s.diagnostic_version_id,s.status,s.aggregate_version,jd.owner_organization_id,en.journey_version_id into ent,inst,dv,st,ver,org,jv
 from diagnostics.sessions s join orchestration.journey_instances ji on ji.id=s.journey_instance_id join orchestration.enrollments en on en.id=ji.enrollment_id join catalog.journey_versions j on j.id=en.journey_version_id join catalog.journey_definitions jd on jd.id=j.journey_definition_id where s.id=b for update of s;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from ent then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if st<>'in_progress' then raise exception 'SESSION_NOT_IN_PROGRESS' using errcode='P0001';end if;
 if ver<>c then raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode='P0001';end if;
 return jsonb_build_object('entrepreneur_id',ent,'instance_id',inst,'version_id',dv,'organization_id',org,'journey_version_id',jv,'aggregate_version',ver);
end;$$;
