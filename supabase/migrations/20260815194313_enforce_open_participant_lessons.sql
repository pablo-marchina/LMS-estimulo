begin;

-- Product policy: participants may consume lessons in any order. Completion
-- still drives progress, points, badges and certificates, but never gates access.
create or replace function app_private.enforce_open_step_instance_availability()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.status = 'locked' then
    new.status := 'available';
    new.available_at := coalesce(new.available_at, now());
  end if;
  return new;
end;
$$;

revoke all on function app_private.enforce_open_step_instance_availability() from public, anon, authenticated, service_role;

drop trigger if exists trg_enforce_open_step_instance_availability on orchestration.step_instances;
create trigger trg_enforce_open_step_instance_availability
before insert or update of status on orchestration.step_instances
for each row
execute function app_private.enforce_open_step_instance_availability();

-- Keep the historical reconciliation entry point because completion flows call
-- it, but redefine its contract: reconciliation now means ensuring every lesson
-- in the live journey is available, not unlocking only the next sequential step.
create or replace function app_private.reconcile_participant_step_availability(
  p_journey_instance_id uuid
) returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update orchestration.step_instances step_instance
     set status = 'available',
         available_at = coalesce(step_instance.available_at, now()),
         aggregate_version = step_instance.aggregate_version + 1,
         updated_at = now()
    from orchestration.path_assignments assignment
   where assignment.id = step_instance.path_assignment_id
     and assignment.journey_instance_id = p_journey_instance_id
     and assignment.status = 'active'
     and assignment.valid_from <= now()
     and (assignment.valid_until is null or assignment.valid_until > now())
     and step_instance.status = 'locked';

  perform app_private.refresh_participant_journey_progress(p_journey_instance_id);
end;
$$;

-- Open lessons that were already sequentially locked in active participant journeys.
update orchestration.step_instances step_instance
   set status = 'available',
       available_at = coalesce(step_instance.available_at, now()),
       aggregate_version = step_instance.aggregate_version + 1,
       updated_at = now()
  from orchestration.path_assignments assignment,
       orchestration.journey_instances journey
 where assignment.id = step_instance.path_assignment_id
   and journey.id = assignment.journey_instance_id
   and assignment.status = 'active'
   and assignment.valid_from <= now()
   and (assignment.valid_until is null or assignment.valid_until > now())
   and journey.status in ('available', 'in_progress')
   and step_instance.status = 'locked';

do $$
declare
  v_journey_instance_id uuid;
begin
  for v_journey_instance_id in
    select distinct assignment.journey_instance_id
      from orchestration.path_assignments assignment
      join orchestration.journey_instances journey
        on journey.id = assignment.journey_instance_id
     where assignment.status = 'active'
       and assignment.valid_from <= now()
       and (assignment.valid_until is null or assignment.valid_until > now())
       and journey.status in ('available', 'in_progress')
  loop
    perform app_private.refresh_participant_journey_progress(v_journey_instance_id);
  end loop;
end;
$$;

commit;
