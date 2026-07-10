-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052634
-- Remote name: m13d3a_e14_response_context
-- Remote SQL SHA-256: 720762c9678940c777690f0ea5e6375ea0a3f51a0a2f6c5ec6a4d106c8f77a8b
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_context_b(a uuid,b uuid,c uuid,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare ent uuid;org uuid;inst uuid;ver_id uuid;st text;opt uuid;val jsonb;latest integer;prev uuid;
begin
 select s.entrepreneur_id,s.journey_instance_id,s.diagnostic_version_id,s.status,jd.owner_organization_id into ent,inst,ver_id,st,org
 from diagnostics.sessions s join orchestration.journey_instances ji on ji.id=s.journey_instance_id join orchestration.enrollments en on en.id=ji.enrollment_id join catalog.journey_versions jv on jv.id=en.journey_version_id join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where s.id=b for update of s;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from ent then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if st<>'in_progress' then raise exception 'SESSION_NOT_IN_PROGRESS' using errcode='P0001';end if;
 select io.id,io.value into opt,val from diagnostics.item_options io join diagnostics.items i on i.id=io.item_id where io.item_id=c and io.code=d and i.diagnostic_version_id=ver_id;
 if not found then raise exception 'INVALID_OPTION' using errcode='22023';end if;
 select coalesce(max(revision),0),(array_agg(id order by revision desc))[1] into latest,prev from diagnostics.responses where session_id=b and item_id=c;
 return jsonb_build_object('entrepreneur_id',ent,'organization_id',org,'instance_id',inst,'option_id',opt,'option_value',val,'latest_revision',latest,'previous_id',prev);
end;$$;
