revoke all on function public.e14_publish_vertical(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.e14_publish_vertical(uuid,uuid,uuid,text,text) to service_role,app_worker;

-- remote migration 20260709051922: m13c2_e14_enrollment_command
create or replace function app_private.e14_cmd_enroll(p_actor uuid,p_org uuid,p_person uuid,p_journey uuid,p_source text,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;req jsonb;h text;ev uuid;ev2 uuid;enr uuid;inst uuid;owner_id uuid;jstatus text;replay boolean;profile jsonb;
begin
 k:=app_private.e14_validate_idempotency_key(p_key_input);
 req:=jsonb_build_object('organization_id',p_org,'entrepreneur_id',p_person,'journey_version_id',p_journey,'source',trim(coalesce(p_source,'internal_test')));
 h:=app_private.e14_request_hash(req);
 enr:=app_private.e14_deterministic_uuid('e14:enrollment|'||p_person::text||'|'||p_journey::text);
 inst:=app_private.e14_deterministic_uuid('e14:journey-instance|'||enr::text);
 ev:=app_private.e14_command_event_id('CMD02',p_actor,enr,k);
 ev2:=app_private.e14_child_event_id(ev,'journey.instance.available',1);
 perform pg_advisory_xact_lock(hashtextextended('CMD02|'||p_actor::text||'|'||enr::text||'|'||k,0));
 replay:=app_private.e14_assert_idempotency(ev,h);
 if replay then return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',true,'data',jsonb_build_object('enrollment_id',enr,'journey_instance_id',inst,'status',(select status from orchestration.journey_instances where id=inst))); end if;
 if not app_private.e14_actor_has_permission(p_actor,p_org,'journey.execution.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select jv.status,jd.owner_organization_id into jstatus,owner_id from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where jv.id=p_journey;
 if not found or owner_id<>p_org then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002'; end if;
 if jstatus<>'published' then raise exception 'JOURNEY_NOT_PUBLISHED' using errcode='P0001'; end if;
 select profile_data into profile from core.entrepreneurs where id=p_person and status='active';
 if not found or coalesce((profile->>'synthetic')::boolean,false)=false or (profile->>'owner_organization_id')::uuid<>p_org then raise exception 'INTERNAL_PARTICIPANT_REQUIRED' using errcode='P0001'; end if;
 insert into orchestration.enrollments(id,entrepreneur_id,business_id,journey_version_id,cohort_id,source,status,assigned_at,aggregate_version) values(enr,p_person,null,p_journey,null,trim(coalesce(p_source,'internal_test')),'assigned',now(),0) on conflict(id) do nothing;
 insert into orchestration.journey_instances(id,enrollment_id,status,aggregate_version) values(inst,enr,'available',0) on conflict(enrollment_id) do nothing;
 insert into orchestration.progress_projections(journey_instance_id,completed_required_steps,total_required_steps,completion_ratio,current_step_id,last_activity_at,projection_version) values(inst,0,1,0,null,null,0) on conflict(journey_instance_id) do nothing;
 perform app_private.e14_append_event(ev,'journey.enrollment.created','enrollment',enr,'user_account',p_actor,p_org,inst,'enrollment',enr,0,ev,null,jsonb_build_object('request_hash',h,'idempotency_key',k,'entrepreneur_id',p_person,'journey_version_id',p_journey));
 perform app_private.e14_append_event(ev2,'journey.instance.available','journey_instance',inst,'user_account',p_actor,p_org,inst,'journey_instance',inst,0,ev,ev,jsonb_build_object('enrollment_id',enr));
 return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',false,'data',jsonb_build_object('enrollment_id',enr,'journey_instance_id',inst,'enrollment_status','assigned','journey_status','available','progress',0));
end;$$;

create or replace function public.e14_create_enrollment(p_actor_user_account_id uuid,p_organization_id uuid,p_entrepreneur_id uuid,p_journey_version_id uuid,p_source text,p_idempotency_key text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_cmd_enroll($1,$2,$3,$4,$5,$6)$$;
revoke all on function app_private.e14_cmd_enroll(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.e14_create_enrollment(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.e14_create_enrollment(uuid,uuid,uuid,uuid,text,text) to service_role,app_worker;

-- remote migration 20260709052119: m13d1a_e14_start_command_shell
create or replace function app_private.e14_cmd_start(p_actor uuid,p_instance uuid,p_expected bigint,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
begin
 return jsonb_build_object('status','not_configured');
end;$$;
revoke all on function app_private.e14_cmd_start(uuid,uuid,bigint,text) from public,anon,authenticated;

-- remote migration 20260709052142: m13d1b_e14_start_context
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

-- remote migration 20260709052201: m13d1c_e14_instance_transition
create or replace function app_private.e14_instance_transition(p_instance uuid)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare v bigint;
begin
 update orchestration.journey_instances set status='in_progress',started_at=coalesce(started_at,now()),aggregate_version=aggregate_version+1,updated_at=now() where id=p_instance returning aggregate_version into v;
 return v;
end;$$;
revoke all on function app_private.e14_instance_transition(uuid) from public,anon,authenticated;

-- remote migration 20260709052211: m13d1d_e14_enrollment_transition
create or replace function app_private.e14_enrollment_transition(p_enrollment uuid)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare v bigint;
begin
 update orchestration.enrollments set status='active',accepted_at=coalesce(accepted_at,now()),aggregate_version=aggregate_version+1 where id=p_enrollment returning aggregate_version into v;
 return v;
end;$$;
revoke all on function app_private.e14_enrollment_transition(uuid) from public,anon,authenticated;

-- remote migration 20260709052219: m13d1e_e14_progress_touch
create or replace function app_private.e14_progress_touch(p_instance uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 update orchestration.progress_projections set last_activity_at=now(),projection_version=projection_version+1,updated_at=now() where journey_instance_id=p_instance
$$;
