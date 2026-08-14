begin;

-- Keep sequential lesson availability as a database invariant. A lesson can be
-- completed by content progress, an assessment, a practice flow, or another
-- command path; every completion must unlock any now-eligible next lesson.
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
    from orchestration.path_assignments assignment,
         orchestration.path_steps path_step
   where assignment.id = step_instance.path_assignment_id
     and assignment.journey_instance_id = p_journey_instance_id
     and assignment.status = 'active'
     and assignment.valid_from <= now()
     and (assignment.valid_until is null or assignment.valid_until > now())
     and path_step.id = step_instance.path_step_id
     and path_step.path_template_id = assignment.path_template_id
     and step_instance.status = 'locked'
     and not exists (
       select 1
       from orchestration.path_steps previous_step
       left join orchestration.step_instances previous_instance
         on previous_instance.path_assignment_id = assignment.id
        and previous_instance.path_step_id = previous_step.id
       where previous_step.path_template_id = assignment.path_template_id
         and previous_step.is_required
         and (previous_step.position_hint, previous_step.id) < (path_step.position_hint, path_step.id)
         and coalesce(previous_instance.status, 'locked') <> 'completed'
     );

  perform app_private.refresh_participant_journey_progress(p_journey_instance_id);
end;
$$;

create or replace function app_private.reconcile_after_step_completion()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_journey_instance_id uuid;
begin
  select assignment.journey_instance_id
    into v_journey_instance_id
    from orchestration.path_assignments assignment
   where assignment.id = new.path_assignment_id;

  if v_journey_instance_id is not null then
    perform app_private.reconcile_participant_step_availability(v_journey_instance_id);
  end if;

  return null;
end;
$$;

-- Run after the transaction's completion command has finished writing its own
-- progress projection. Constraint triggers cannot use UPDATE OF columns, so
-- the transition predicate below limits execution to real completions.
drop trigger if exists trg_reconcile_after_step_completion on orchestration.step_instances;
create constraint trigger trg_reconcile_after_step_completion
after update on orchestration.step_instances
deferrable initially deferred
for each row
when (new.status = 'completed' and old.status is distinct from new.status)
execute function app_private.reconcile_after_step_completion();

-- Repair journeys that were already left with completed content followed by a
-- locked eligible lesson while the completion trigger was absent.
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
       and journey.status in ('available', 'in_progress', 'completed')
  loop
    perform app_private.reconcile_participant_step_availability(v_journey_instance_id);
  end loop;
end;
$$;

commit;
