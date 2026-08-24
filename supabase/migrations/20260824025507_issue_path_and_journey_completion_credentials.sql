create or replace function app_private.issue_credentials_from_path_completed_state()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_actor_user_account_id uuid;
  v_entrepreneur_id uuid;
  v_step_instance_id uuid;
begin
  select e.user_account_id, en.entrepreneur_id
    into v_actor_user_account_id, v_entrepreneur_id
    from orchestration.journey_instances ji
    join orchestration.enrollments en on en.id = ji.enrollment_id
    join core.entrepreneurs e on e.id = en.entrepreneur_id
   where ji.id = new.journey_instance_id;

  if v_actor_user_account_id is null
     or app_private.e14_entrepreneur_for_account(v_actor_user_account_id) is distinct from v_entrepreneur_id then
    return new;
  end if;

  select si.id
    into v_step_instance_id
    from orchestration.step_instances si
   where si.path_assignment_id = new.id
     and si.status = 'completed'
   order by si.completed_at desc nulls last, si.id
   limit 1;

  if v_step_instance_id is null then
    return new;
  end if;

  perform public.issue_learning_credentials(
    v_actor_user_account_id,
    new.journey_instance_id,
    v_step_instance_id,
    'path-completed-state-v1:' || new.id::text
  );

  return new;
end;
$function$;

revoke all on function app_private.issue_credentials_from_path_completed_state() from public;
revoke all on function app_private.issue_credentials_from_path_completed_state() from anon, authenticated;

drop trigger if exists trg_issue_credentials_on_path_completed_state on orchestration.path_assignments;
create trigger trg_issue_credentials_on_path_completed_state
after update of status on orchestration.path_assignments
for each row
when (old.status is distinct from new.status and new.status = 'completed')
execute function app_private.issue_credentials_from_path_completed_state();

comment on function app_private.issue_credentials_from_path_completed_state() is
  'Issues configured learning credentials after a path assignment actually transitions to completed, so path badges are evaluated against the final state.';

do $block$
declare
  v_row record;
begin
  for v_row in
    select
      pa.id as path_assignment_id,
      pa.journey_instance_id,
      en.entrepreneur_id,
      e.user_account_id,
      step.id as step_instance_id
    from orchestration.path_assignments pa
    join orchestration.journey_instances ji on ji.id = pa.journey_instance_id
    join orchestration.enrollments en on en.id = ji.enrollment_id
    join core.entrepreneurs e on e.id = en.entrepreneur_id
    join lateral (
      select si.id
      from orchestration.step_instances si
      where si.path_assignment_id = pa.id
        and si.status = 'completed'
      order by si.completed_at desc nulls last, si.id
      limit 1
    ) step on true
    where pa.status = 'completed'
      and app_private.e14_entrepreneur_for_account(e.user_account_id) = en.entrepreneur_id
    order by pa.id
  loop
    perform public.issue_learning_credentials(
      v_row.user_account_id,
      v_row.journey_instance_id,
      v_row.step_instance_id,
      'path-completion-backfill-v1:' || v_row.path_assignment_id::text
    );
  end loop;

  for v_row in
    select ji.id as journey_instance_id, en.entrepreneur_id, e.user_account_id
    from orchestration.journey_instances ji
    join orchestration.enrollments en on en.id = ji.enrollment_id
    join core.entrepreneurs e on e.id = en.entrepreneur_id
    where ji.status = 'completed'
      and app_private.e14_entrepreneur_for_account(e.user_account_id) = en.entrepreneur_id
    order by ji.id
  loop
    perform public.issue_learning_credentials(
      v_row.user_account_id,
      v_row.journey_instance_id,
      null,
      'journey-completion-backfill-v1:' || v_row.journey_instance_id::text
    );
  end loop;
end;
$block$;
