-- Task 7: (1) remove the synthetic-participant-only restriction from the
-- admin enrollment command app_private.e14_cmd_enroll -- this product is now
-- real and functional for real users, no synthetic/test-only gating anywhere.
-- The staff-permission requirement (journey.execution.manage) and the
-- journey-owner/published-status guards are untouched; only the
-- synthetic-profile check (and its now-unused `profile jsonb` declaration)
-- is removed, replaced with a plain active-participant existence check.
-- (2) Add new self-service enrollment RPCs so a real participant can enroll
-- themselves in an archetype-eligible published journey, gated by their
-- most recent diagnostics.archetype_assignments row (or open to all when a
-- journey_version has no eligible_archetype_codes).
--
-- Security note: e14_self_enroll / e14_list_eligible_journeys are SECURITY
-- DEFINER and trust p_actor_user_account_id as a plain parameter -- this is
-- only safe because they are granted exclusively to service_role/app_worker
-- (never authenticated/anon/public), matching every other participant-facing
-- E14 RPC (e14_complete_diagnostic, e14_create_enrollment, etc). The Next.js
-- server derives the actor from the authenticated session before calling.

create or replace function app_private.e14_cmd_enroll(p_actor uuid,p_org uuid,p_person uuid,p_journey uuid,p_source text,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;req jsonb;h text;ev uuid;ev2 uuid;enr uuid;inst uuid;owner_id uuid;jstatus text;replay boolean;
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
 if not exists (select 1 from core.entrepreneurs where id=p_person and status='active') then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;
 insert into orchestration.enrollments(id,entrepreneur_id,business_id,journey_version_id,cohort_id,source,status,assigned_at,aggregate_version) values(enr,p_person,null,p_journey,null,trim(coalesce(p_source,'internal_test')),'assigned',now(),0) on conflict(id) do nothing;
 insert into orchestration.journey_instances(id,enrollment_id,status,aggregate_version) values(inst,enr,'available',0) on conflict(enrollment_id) do nothing;
 insert into orchestration.progress_projections(journey_instance_id,completed_required_steps,total_required_steps,completion_ratio,current_step_id,last_activity_at,projection_version) values(inst,0,1,0,null,null,0) on conflict(journey_instance_id) do nothing;
 perform app_private.e14_append_event(ev,'journey.enrollment.created','enrollment',enr,'user_account',p_actor,p_org,inst,'enrollment',enr,0,ev,null,jsonb_build_object('request_hash',h,'idempotency_key',k,'entrepreneur_id',p_person,'journey_version_id',p_journey));
 perform app_private.e14_append_event(ev2,'journey.instance.available','journey_instance',inst,'user_account',p_actor,p_org,inst,'journey_instance',inst,0,ev,ev,jsonb_build_object('enrollment_id',enr));
 return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',false,'data',jsonb_build_object('enrollment_id',enr,'journey_instance_id',inst,'enrollment_status','assigned','journey_status','available','progress',0));
end;$$;

create or replace function app_private.e14_cmd_self_enroll(p_actor uuid,p_journey uuid,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;req jsonb;h text;ev uuid;ev2 uuid;enr uuid;inst uuid;owner_id uuid;jstatus text;replay boolean;person uuid;eligible text[];archetype_code text;
begin
 person:=app_private.e14_entrepreneur_for_account(p_actor);
 if person is null then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;
 k:=app_private.e14_validate_idempotency_key(p_key_input);
 req:=jsonb_build_object('entrepreneur_id',person,'journey_version_id',p_journey,'source','participant_self_service');
 h:=app_private.e14_request_hash(req);
 enr:=app_private.e14_deterministic_uuid('e14:enrollment|'||person::text||'|'||p_journey::text);
 inst:=app_private.e14_deterministic_uuid('e14:journey-instance|'||enr::text);
 ev:=app_private.e14_command_event_id('CMD02-SELF',p_actor,enr,k);
 ev2:=app_private.e14_child_event_id(ev,'journey.instance.available',1);
 perform pg_advisory_xact_lock(hashtextextended('CMD02-SELF|'||p_actor::text||'|'||enr::text||'|'||k,0));
 replay:=app_private.e14_assert_idempotency(ev,h);
 if replay then return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',true,'data',jsonb_build_object('enrollment_id',enr,'journey_instance_id',inst,'status',(select status from orchestration.journey_instances where id=inst))); end if;
 select jv.status,jd.owner_organization_id,jv.eligible_archetype_codes into jstatus,owner_id,eligible from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where jv.id=p_journey;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002'; end if;
 if jstatus<>'published' then raise exception 'JOURNEY_NOT_PUBLISHED' using errcode='P0001'; end if;
 if eligible is not null and array_length(eligible,1) > 0 then
   select ad.code into archetype_code
     from diagnostics.archetype_assignments aa
     join diagnostics.archetype_versions av on av.id = aa.primary_archetype_version_id
     join diagnostics.archetype_definitions ad on ad.id = av.archetype_definition_id
    where aa.entrepreneur_id = person order by aa.assigned_at desc limit 1;
   if archetype_code is null or not (archetype_code = any(eligible)) then raise exception 'ARCHETYPE_NOT_ELIGIBLE' using errcode='P0001'; end if;
 end if;
 insert into orchestration.enrollments(id,entrepreneur_id,business_id,journey_version_id,cohort_id,source,status,assigned_at,aggregate_version) values(enr,person,null,p_journey,null,'participant_self_service','assigned',now(),0) on conflict(id) do nothing;
 insert into orchestration.journey_instances(id,enrollment_id,status,aggregate_version) values(inst,enr,'available',0) on conflict(enrollment_id) do nothing;
 insert into orchestration.progress_projections(journey_instance_id,completed_required_steps,total_required_steps,completion_ratio,current_step_id,last_activity_at,projection_version) values(inst,0,1,0,null,null,0) on conflict(journey_instance_id) do nothing;
 perform app_private.e14_append_event(ev,'journey.enrollment.created','enrollment',enr,'user_account',p_actor,owner_id,inst,'enrollment',enr,0,ev,null,jsonb_build_object('request_hash',h,'idempotency_key',k,'entrepreneur_id',person,'journey_version_id',p_journey));
 perform app_private.e14_append_event(ev2,'journey.instance.available','journey_instance',inst,'user_account',p_actor,owner_id,inst,'journey_instance',inst,0,ev,ev,jsonb_build_object('enrollment_id',enr));
 return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',false,'data',jsonb_build_object('enrollment_id',enr,'journey_instance_id',inst,'enrollment_status','assigned','journey_status','available','progress',0));
end;$$;

create or replace function public.e14_self_enroll(p_actor_user_account_id uuid,p_journey_version_id uuid,p_idempotency_key text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_cmd_self_enroll($1,$2,$3)$$;
revoke all on function app_private.e14_cmd_self_enroll(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.e14_self_enroll(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.e14_self_enroll(uuid,uuid,text) to service_role,app_worker;

create or replace function public.e14_list_eligible_journeys(p_actor_user_account_id uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 with person as (select app_private.e14_entrepreneur_for_account(p_actor_user_account_id) as id),
 archetype as (
   select ad.code from diagnostics.archetype_assignments aa
   join diagnostics.archetype_versions av on av.id = aa.primary_archetype_version_id
   join diagnostics.archetype_definitions ad on ad.id = av.archetype_definition_id
   where aa.entrepreneur_id = (select id from person)
   order by aa.assigned_at desc limit 1
 ),
 already_enrolled as (
   select en.journey_version_id from orchestration.enrollments en where en.entrepreneur_id = (select id from person)
 )
 select coalesce(jsonb_agg(jsonb_build_object('journey_version_id',jv.id,'title',jv.title,'description',jv.description,'open_to_all',(jv.eligible_archetype_codes is null or array_length(jv.eligible_archetype_codes,1) is null)) order by jv.title),'[]'::jsonb)
 from catalog.journey_versions jv
 where jv.status='published'
   and jv.id not in (select journey_version_id from already_enrolled)
   and (jv.eligible_archetype_codes is null or array_length(jv.eligible_archetype_codes,1) is null or (select code from archetype) = any(jv.eligible_archetype_codes))
$$;
revoke all on function public.e14_list_eligible_journeys(uuid) from public,anon,authenticated;
grant execute on function public.e14_list_eligible_journeys(uuid) to service_role,app_worker;
