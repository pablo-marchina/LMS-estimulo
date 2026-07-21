begin;

do $$
declare
  v_participant uuid:=app_private.e14_deterministic_uuid('e14:user:participant');
  v_unauthorized uuid:=app_private.e14_deterministic_uuid('e14:e2e:unauthorized-user');
  v_step uuid;
  v_first jsonb;
  v_replay jsonb;
  v_event uuid;
  v_revision_id uuid;
begin
  select si.id into strict v_step
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
  join orchestration.enrollments en on en.id=ji.enrollment_id
  join catalog.activity_versions av on av.id=si.activity_version_id
  where en.entrepreneur_id=app_private.e14_deterministic_uuid('e14:entrepreneur')
    and si.status in ('in_progress','completed')
    and coalesce((select max(ac.accepted_observation_count) from orchestration.activity_sessions ac where ac.step_instance_id=si.id),0)
        >= jsonb_array_length(coalesce(av.configuration->'content_sections','[]'::jsonb))
    and jsonb_array_length(coalesce(av.configuration->'content_sections','[]'::jsonb))>0
  order by si.created_at desc
  limit 1;

  v_first:=public.rate_activity_utility(v_participant,v_step,4,'utility-rating-0001');
  if coalesce((v_first->>'replayed')::boolean,true) then raise exception 'first rating was replayed'; end if;
  v_event:=(v_first->>'request_id')::uuid;

  if not exists (
    select 1 from engagement.activity_utility_ratings
    where step_instance_id=v_step and actor_user_account_id=v_participant
      and rating=4 and revision=1 and latest_event_id=v_event
  ) then raise exception 'current utility rating projection was not created'; end if;
  if (select count(*) from engagement.activity_utility_rating_revisions where step_instance_id=v_step and actor_user_account_id=v_participant)<>1 then
    raise exception 'first utility rating revision was not preserved';
  end if;
  if not exists (select 1 from eventing.events where event_name='learning.activity.utility.rated' and event_id=v_event) then
    raise exception 'utility rating event was not appended';
  end if;
  if not exists (select 1 from eventing.outbox where event_id=v_event) then
    raise exception 'utility rating event was not added to outbox';
  end if;

  v_replay:=public.rate_activity_utility(v_participant,v_step,4,'utility-rating-0001');
  if not coalesce((v_replay->>'replayed')::boolean,false) then raise exception 'identical utility rating replay was not recognized'; end if;
  if (select count(*) from engagement.activity_utility_rating_revisions where step_instance_id=v_step and actor_user_account_id=v_participant)<>1 then
    raise exception 'idempotent replay created a revision';
  end if;

  perform public.rate_activity_utility(v_participant,v_step,2,'utility-rating-0002');
  if not exists (
    select 1 from engagement.activity_utility_ratings
    where step_instance_id=v_step and actor_user_account_id=v_participant and rating=2 and revision=2
  ) then raise exception 'updated utility rating projection is incorrect'; end if;
  if (select count(*) from engagement.activity_utility_rating_revisions where step_instance_id=v_step and actor_user_account_id=v_participant)<>2 then
    raise exception 'utility rating history did not preserve both revisions';
  end if;
  if (public.get_activity_utility_rating(v_participant,v_step)->>'rating')::integer<>2 then
    raise exception 'utility rating read API did not return current rating';
  end if;

  begin
    perform public.rate_activity_utility(v_participant,v_step,3,'utility-rating-0001');
    raise exception 'conflicting idempotency replay unexpectedly succeeded';
  exception when unique_violation then
    if sqlerrm<>'IDEMPOTENCY_KEY_REUSED' then raise; end if;
  end;

  begin
    perform public.rate_activity_utility(v_participant,v_step,null,'utility-rating-null');
    raise exception 'null rating unexpectedly succeeded';
  exception when invalid_parameter_value then
    if sqlerrm<>'ACTIVITY_UTILITY_RATING_INVALID' then raise; end if;
  end;

  begin
    perform public.rate_activity_utility(v_participant,v_step,6,'utility-rating-invalid');
    raise exception 'out-of-range rating unexpectedly succeeded';
  exception when invalid_parameter_value then
    if sqlerrm<>'ACTIVITY_UTILITY_RATING_INVALID' then raise; end if;
  end;

  begin
    perform public.rate_activity_utility(v_unauthorized,v_step,5,'utility-rating-unauthorized');
    raise exception 'unauthorized rating unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_activity_utility_rating(v_unauthorized,v_step);
    raise exception 'unauthorized rating read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  select id into strict v_revision_id
  from engagement.activity_utility_rating_revisions
  where step_instance_id=v_step and actor_user_account_id=v_participant and revision=1;
  begin
    update engagement.activity_utility_rating_revisions set rating=5 where id=v_revision_id;
    raise exception 'append-only utility revision was updated';
  exception when others then
    if sqlerrm not like '%append%' and sqlerrm not like '%mutation%' then raise; end if;
  end;

  if has_function_privilege('authenticated','public.rate_activity_utility(uuid,uuid,integer,text)','execute')
     or has_function_privilege('anon','public.get_activity_utility_rating(uuid,uuid)','execute') then
    raise exception 'browser roles must not execute utility rating APIs';
  end if;
  if not has_function_privilege('service_role','public.rate_activity_utility(uuid,uuid,integer,text)','execute') then
    raise exception 'service_role must execute utility rating API';
  end if;
end;
$$;

rollback;
