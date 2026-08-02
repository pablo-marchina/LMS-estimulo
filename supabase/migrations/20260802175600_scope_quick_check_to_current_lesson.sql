begin;

create or replace function app_private.e14_state_check(a uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
  with current_step as (
    select nullif(app_private.e14_state_step(a)->>'step_instance_id','')::uuid as step_instance_id
  )
  select jsonb_build_object(
    'attempt_id',attempt.id,
    'attempt_number',attempt.attempt_number,
    'status',attempt.status,
    'aggregate_version',attempt.aggregate_version,
    'score',result.normalized_score,
    'passed',result.passed
  )
  from current_step
  join assessment.attempts attempt
    on attempt.step_instance_id=current_step.step_instance_id
  left join assessment.results result
    on result.attempt_id=attempt.id
  order by attempt.attempt_number desc,attempt.started_at desc,attempt.id desc
  limit 1
$function$;

revoke all on function app_private.e14_state_check(uuid) from public,anon,authenticated;
grant execute on function app_private.e14_state_check(uuid) to service_role;

commit;
