\set ON_ERROR_STOP on

begin;
set local statement_timeout = '120s';
set local lock_timeout = '10s';

create temporary table e14_test_results (
  name text primary key,
  value jsonb not null
) on commit drop;

create or replace function pg_temp.e14_assert(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if coalesce(p_condition, false) is not true then
    raise exception 'E14_E2E_ASSERTION_FAILED: %', p_message;
  end if;
end;
$$;

select
  app_private.e14_deterministic_uuid('e14:user:operator')::text as operator_id,
  app_private.e14_deterministic_uuid('e14:user:participant')::text as participant_id,
  app_private.e14_deterministic_uuid('e14:entrepreneur')::text as entrepreneur_id,
  app_private.e14_deterministic_uuid('e14:organization')::text as organization_id,
  app_private.e14_deterministic_uuid('e14:journey-version:v1')::text as journey_version_id,
  app_private.e14_deterministic_uuid('e14:diagnostic-version:v1')::text as diagnostic_version_id,
  app_private.e14_deterministic_uuid('e14:assessment-question')::text as assessment_question_id,
  app_private.e14_deterministic_uuid('e14:e2e:unauthorized-user')::text as unauthorized_user_id
\gset e14_

select content_hash as journey_content_hash
from catalog.journey_versions
where id = :'e14_journey_version_id'::uuid
\gset e14_

select count(*)::text as events_before from eventing.events \gset e14_
select count(*)::text as outbox_before from eventing.outbox \gset e14_

select pg_temp.e14_assert(
  (select status = 'draft' from catalog.journey_versions where id = :'e14_journey_version_id'::uuid),
  'fixture journey must start as draft'
);
select pg_temp.e14_assert(
  not exists (
    select 1
    from orchestration.enrollments
    where entrepreneur_id = :'e14_entrepreneur_id'::uuid
      and journey_version_id = :'e14_journey_version_id'::uuid
  ),
  'clean replay must not contain a runtime enrollment'
);

insert into e14_test_results(name, value)
select 'publish', public.e14_publish_vertical(
  :'e14_operator_id'::uuid,
  :'e14_organization_id'::uuid,
  :'e14_journey_version_id'::uuid,
  :'e14_journey_content_hash',
  'e14-e2e-publish-v1'
);

select pg_temp.e14_assert((select value->>'replayed' = 'false' from e14_test_results where name='publish'), 'publish must not be replayed');
select pg_temp.e14_assert((select value#>>'{data,status}' = 'published' from e14_test_results where name='publish'), 'journey must be published');
select pg_temp.e14_assert((select count(*) - :'e14_events_before'::bigint = 4 from eventing.events), 'publish must append four events');

insert into e14_test_results(name, value)
select 'publish_replay', public.e14_publish_vertical(
  :'e14_operator_id'::uuid,
  :'e14_organization_id'::uuid,
  :'e14_journey_version_id'::uuid,
  :'e14_journey_content_hash',
  'e14-e2e-publish-v1'
);
select pg_temp.e14_assert((select value->>'replayed' = 'true' from e14_test_results where name='publish_replay'), 'publish replay flag must be true');
select pg_temp.e14_assert((select count(*) - :'e14_events_before'::bigint = 4 from eventing.events), 'publish replay must not append events');

do $$
begin
  begin
    perform public.e14_publish_vertical(
      :'e14_operator_id'::uuid,
      :'e14_organization_id'::uuid,
      :'e14_journey_version_id'::uuid,
      repeat('0', 64),
      'e14-e2e-publish-v1'
    );
    raise exception 'expected IDEMPOTENCY_KEY_REUSED';
  exception when others then
    if sqlerrm <> 'IDEMPOTENCY_KEY_REUSED' then raise; end if;
  end;

  begin
    perform public.e14_publish_vertical(
      :'e14_participant_id'::uuid,
      :'e14_organization_id'::uuid,
      :'e14_journey_version_id'::uuid,
      :'e14_journey_content_hash',
      'e14-e2e-forbidden-publish'
    );
    raise exception 'expected FORBIDDEN';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;

  begin
    update catalog.journey_versions
    set title = title || ' altered'
    where id = :'e14_journey_version_id'::uuid;
    raise exception 'expected PUBLISHED_VERSION_IMMUTABLE';
  exception when others then
    if sqlerrm <> 'PUBLISHED_VERSION_IMMUTABLE' then raise; end if;
  end;
end;
$$;

insert into e14_test_results(name, value)
select 'enrollment', public.e14_create_enrollment(
  :'e14_operator_id'::uuid,
  :'e14_organization_id'::uuid,
  :'e14_entrepreneur_id'::uuid,
  :'e14_journey_version_id'::uuid,
  'backend_e2e',
  'e14-e2e-enrollment-v1'
);
select pg_temp.e14_assert((select value->>'replayed' = 'false' from e14_test_results where name='enrollment'), 'enrollment must not be replayed');
select value#>>'{data,journey_instance_id}' as journey_instance_id
from e14_test_results where name='enrollment'
\gset e14_

insert into e14_test_results(name, value)
select 'start_journey', public.e14_start_journey(
  :'e14_participant_id'::uuid,
  :'e14_journey_instance_id'::uuid,
  0,
  'e14-e2e-start-journey-v1'
);
select pg_temp.e14_assert((select value->>'replayed' = 'false' from e14_test_results where name='start_journey'), 'journey start must not be replayed');

do $$
begin
  begin
    perform public.e14_start_journey(
      :'e14_participant_id'::uuid,
      :'e14_journey_instance_id'::uuid,
      0,
      'e14-e2e-stale-journey-v1'
    );
    raise exception 'expected AGGREGATE_VERSION_CONFLICT';
  exception when others then
    if sqlerrm <> 'AGGREGATE_VERSION_CONFLICT' then raise; end if;
  end;
end;
$$;

insert into e14_test_results(name, value)
select 'start_diagnostic', public.e14_start_diagnostic(
  :'e14_participant_id'::uuid,
  :'e14_journey_instance_id'::uuid,
  :'e14_diagnostic_version_id'::uuid,
  'e14-e2e-start-diagnostic-v1'
);

insert into e14_test_results(name, value)
select 'state_after_diagnostic_start', public.e14_get_participant_state(
  :'e14_participant_id'::uuid,
  :'e14_journey_instance_id'::uuid
);
select value#>>'{d,session_id}' as diagnostic_session_id
from e14_test_results where name='state_after_diagnostic_start'
\gset e14_

insert into e14_test_results(name, value)
select 'diagnostic_answer_' || row_number() over (order by i.position),
       public.e14_record_diagnostic_response(
         :'e14_participant_id'::uuid,
         :'e14_diagnostic_session_id'::uuid,
         i.id,
         'o2',
         1,
         100,
         'e14-e2e-diagnostic-item-' || i.position
       )
from diagnostics.items i
where i.diagnostic_version_id = :'e14_diagnostic_version_id'::uuid
order by i.position;

insert into e14_test_results(name, value)
select 'state_before_diagnostic_complete', public.e14_get_participant_state(
  :'e14_participant_id'::uuid,
  :'e14_journey_instance_id'::uuid
);
select value#>>'{d,aggregate_version}' as diagnostic_aggregate_version
from e14_test_results where name='state_before_diagnostic_complete'
\gset e14_

insert into e14_test_results(name, value)
select 'complete_diagnostic', public.e14_complete_diagnostic(
  :'e14_participant_id'::uuid,
  :'e14_diagnostic_session_id'::uuid,
  :'e14_diagnostic_aggregate_version'::bigint,
  'e14-e2e-complete-diagnostic-v1'
);

insert into e14_test_results(name, value)
select 'state_after_diagnostic', public.e14_get_participant_state(
  :'e14_participant_id'::uuid,
  :'e14_journey_instance_id'::uuid
);
select pg_temp.e14_assert((select value#>>'{d,status}' = 'completed' from e14_test_results where name='state_after_diagnostic'), 'diagnostic must complete');
select pg_temp.e14_assert((select value#>>'{d,path_code}' = 'standard' from e14_test_results where name='state_after_diagnostic'), 'o2 answers must select standard path');
select pg_temp.e14_assert((select (value#>>'{d,low_confidence}')::boolean is false from e14_test_results where name='state_after_diagnostic'), 'standard path must not be low confidence');
select value#>>'{s,step_instance_id}' as step_instance_id,
       value#>>'{s,aggregate_version}' as step_aggregate_version
from e14_test_results where name='state_after_diagnostic'
\gset e14_

do $$
begin
  begin
    perform public.e14_get_participant_state(
      :'e14_operator_id'::uuid,
      :'e14_journey_instance_id'::uuid
    );
    raise exception 'expected FORBIDDEN';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
end;
$$;

insert into e14_test_results(name, value)
select 'start_activity', public.e14_start_activity(
  :'e14_participant_id'::uuid,
  :'e14_step_instance_id'::uuid,
  :'e14_step_aggregate_version'::bigint,
  'e14-e2e-start-activity-v1'
);

insert into e14_test_results(name, value)
select 'state_after_activity_start', public.e14_get_participant_state(
  :'e14_participant_id'::uuid,
  :'e14_journey_instance_id'::uuid
);
select value#>>'{s,session_id}' as activity_session_id
from e14_test_results where name='state_after_activity_start'
\gset e14_

insert into e14_test_results(name, value)
select 'section_' || section_code,
       public.e14_acknowledge_section(
         :'e14_participant_id'::uuid,
         :'e14_activity_session_id'::uuid,
         section_code,
         true,
         'e14-e2e-section-' || section_code
       )
from unnest(array['input','rule','output','human_validation']) as section_code;

select count(*)::text as events_before_duplicate_section from eventing.events \gset e14_
insert into e14_test_results(name, value)
select 'section_duplicate', public.e14_acknowledge_section(
  :'e14_participant_id'::uuid,
  :'e14_activity_session_id'::uuid,
  'input',
  true,
  'e14-e2e-section-input-duplicate'
);
select pg_temp.e14_assert((select count(*) = :'e14_events_before_duplicate_section'::bigint from eventing.events), 'duplicate section must not append an event');

insert into e14_test_results(name, value)
select 'start_quick_check_1', public.e14_start_quick_check(
  :'e14_participant_id'::uuid,
  :'e14_step_instance_id'::uuid,
  'e14-e2e-start-check-1'
);
insert into e14_test_results(name, value)
select 'state_check_1', public.e14_get_participant_state(:'e14_participant_id'::uuid, :'e14_journey_instance_id'::uuid);
select value#>>'{q,attempt_id}' as attempt_1_id
from e14_test_results where name='state_check_1'
\gset e14_

insert into e14_test_results(name, value)
select 'answer_check_1', public.e14_record_quick_check_answer(
  :'e14_participant_id'::uuid,
  :'e14_attempt_1_id'::uuid,
  :'e14_assessment_question_id'::uuid,
  'a',
  'e14-e2e-answer-check-1'
);
insert into e14_test_results(name, value)
select 'state_before_submit_1', public.e14_get_participant_state(:'e14_participant_id'::uuid, :'e14_journey_instance_id'::uuid);
select value#>>'{q,aggregate_version}' as attempt_1_aggregate_version
from e14_test_results where name='state_before_submit_1'
\gset e14_

insert into e14_test_results(name, value)
select 'submit_check_1', public.e14_submit_quick_check(
  :'e14_participant_id'::uuid,
  :'e14_attempt_1_id'::uuid,
  :'e14_attempt_1_aggregate_version'::bigint,
  'e14-e2e-submit-check-1'
);
insert into e14_test_results(name, value)
select 'state_after_fail', public.e14_get_participant_state(:'e14_participant_id'::uuid, :'e14_journey_instance_id'::uuid);
select pg_temp.e14_assert((select value#>>'{q,status}' = 'failed' from e14_test_results where name='state_after_fail'), 'first quick check must fail');
select pg_temp.e14_assert((select (value#>>'{q,score}')::numeric = 0 from e14_test_results where name='state_after_fail'), 'failed quick check score must be zero');
select pg_temp.e14_assert((select (value->>'progress')::numeric = 0 from e14_test_results where name='state_after_fail'), 'failed quick check must not advance progress');
select pg_temp.e14_assert((select coalesce((value#>>'{p,balance}')::integer,0) = 0 from e14_test_results where name='state_after_fail'), 'failed quick check must not award points');

insert into e14_test_results(name, value)
select 'start_quick_check_2', public.e14_start_quick_check(
  :'e14_participant_id'::uuid,
  :'e14_step_instance_id'::uuid,
  'e14-e2e-start-check-2'
);
insert into e14_test_results(name, value)
select 'state_check_2', public.e14_get_participant_state(:'e14_participant_id'::uuid, :'e14_journey_instance_id'::uuid);
select value#>>'{q,attempt_id}' as attempt_2_id
from e14_test_results where name='state_check_2'
\gset e14_

insert into e14_test_results(name, value)
select 'answer_check_2', public.e14_record_quick_check_answer(
  :'e14_participant_id'::uuid,
  :'e14_attempt_2_id'::uuid,
  :'e14_assessment_question_id'::uuid,
  'b',
  'e14-e2e-answer-check-2'
);
insert into e14_test_results(name, value)
select 'state_before_submit_2', public.e14_get_participant_state(:'e14_participant_id'::uuid, :'e14_journey_instance_id'::uuid);
select value#>>'{q,aggregate_version}' as attempt_2_aggregate_version
from e14_test_results where name='state_before_submit_2'
\gset e14_

insert into e14_test_results(name, value)
select 'submit_check_2', public.e14_submit_quick_check(
  :'e14_participant_id'::uuid,
  :'e14_attempt_2_id'::uuid,
  :'e14_attempt_2_aggregate_version'::bigint,
  'e14-e2e-submit-check-2'
);
select value#>>'{request_id}' as successful_submit_request_id
from e14_test_results where name='submit_check_2'
\gset e14_

select count(*)::text as events_before_submit_replay from eventing.events \gset e14_
select count(*)::text as points_before_submit_replay from engagement.point_ledger \gset e14_
insert into e14_test_results(name, value)
select 'submit_check_2_replay', public.e14_submit_quick_check(
  :'e14_participant_id'::uuid,
  :'e14_attempt_2_id'::uuid,
  :'e14_attempt_2_aggregate_version'::bigint,
  'e14-e2e-submit-check-2'
);
select pg_temp.e14_assert((select value->>'replayed' = 'true' from e14_test_results where name='submit_check_2_replay'), 'successful submit replay flag must be true');
select pg_temp.e14_assert((select count(*) = :'e14_events_before_submit_replay'::bigint from eventing.events), 'submit replay must not append events');
select pg_temp.e14_assert((select count(*) = :'e14_points_before_submit_replay'::bigint from engagement.point_ledger), 'submit replay must not duplicate points');

insert into e14_test_results(name, value)
select 'final_state', public.e14_get_participant_state(:'e14_participant_id'::uuid, :'e14_journey_instance_id'::uuid);
insert into e14_test_results(name, value)
select 'operator_result', public.e14_get_operator_result(:'e14_operator_id'::uuid, :'e14_organization_id'::uuid, :'e14_journey_instance_id'::uuid);

select pg_temp.e14_assert((select value->>'journey_status' = 'completed' from e14_test_results where name='final_state'), 'journey must complete');
select pg_temp.e14_assert((select (value->>'progress')::numeric = 1 from e14_test_results where name='final_state'), 'progress must be one');
select pg_temp.e14_assert((select value#>>'{s,status}' = 'completed' from e14_test_results where name='final_state'), 'step must complete');
select pg_temp.e14_assert((select (value#>>'{s,accepted_sections}')::integer = 4 from e14_test_results where name='final_state'), 'exactly four sections must be accepted');
select pg_temp.e14_assert((select value#>>'{q,status}' = 'passed' from e14_test_results where name='final_state'), 'second quick check must pass');
select pg_temp.e14_assert((select (value#>>'{q,attempt_number}')::integer = 2 from e14_test_results where name='final_state'), 'passing attempt must be number two');
select pg_temp.e14_assert((select (value#>>'{q,score}')::numeric = 100 from e14_test_results where name='final_state'), 'passing score must be 100');
select pg_temp.e14_assert((select (value#>>'{p,balance}')::integer = 7 from e14_test_results where name='final_state'), 'point balance must be seven');
select pg_temp.e14_assert((select (value#>>'{p,ledger_count}')::integer = 2 from e14_test_results where name='final_state'), 'point ledger must have two entries');
select pg_temp.e14_assert((select (value#>>'{p,ledger_sum}')::integer = 7 from e14_test_results where name='final_state'), 'point ledger sum must be seven');
select pg_temp.e14_assert((select value->>'journey_status' = 'completed' from e14_test_results where name='operator_result'), 'operator result must expose completed journey');
select pg_temp.e14_assert((select value#>>'{participant,synthetic}' = 'true' from e14_test_results where name='operator_result'), 'operator result must identify synthetic participant');

select pg_temp.e14_assert((select count(*) - :'e14_events_before'::bigint = 39 from eventing.events), 'full flow must append 39 events including publication');
select pg_temp.e14_assert((select count(*) - :'e14_outbox_before'::bigint = 39 from eventing.outbox), 'full flow must append 39 outbox rows');
select pg_temp.e14_assert((select count(*) = 35 from eventing.events where journey_instance_id = :'e14_journey_instance_id'::uuid), 'journey-scoped evidence must contain 35 events');
select pg_temp.e14_assert((select count(*) = 35 from eventing.outbox o join eventing.events e on e.event_id=o.event_id where e.journey_instance_id = :'e14_journey_instance_id'::uuid), 'journey-scoped events must each have an outbox row');
select pg_temp.e14_assert((select count(*) = 8 from eventing.events where correlation_id = :'e14_successful_submit_request_id'::uuid), 'successful submission must atomically emit eight correlated events');
select pg_temp.e14_assert((select count(*) = 2 and sum(amount)=7 from engagement.point_ledger where journey_instance_id = :'e14_journey_instance_id'::uuid), 'points ledger must remain exact');

set local role app_runtime;
select set_config('app.user_account_id', :'e14_participant_id', true);
select set_config('app.organization_id', :'e14_organization_id', true);
select set_config('app.request_id', 'e14-e2e-rls-own', true);
select set_config('app.actor_type', 'user', true);
do $$
begin
  if (select count(*) from core.entrepreneurs where id=:'e14_entrepreneur_id'::uuid) <> 1 then
    raise exception 'RLS participant cannot read own entrepreneur';
  end if;
  if (select count(*) from orchestration.journey_instances where id=:'e14_journey_instance_id'::uuid) <> 1 then
    raise exception 'RLS participant cannot read own journey instance';
  end if;
end;
$$;
select set_config('app.user_account_id', :'e14_unauthorized_user_id', true);
select set_config('app.organization_id', '', true);
select set_config('app.request_id', 'e14-e2e-rls-denied', true);
do $$
declare affected integer;
begin
  if (select count(*) from core.entrepreneurs where id=:'e14_entrepreneur_id'::uuid) <> 0 then
    raise exception 'RLS exposed entrepreneur to unrelated actor';
  end if;
  if (select count(*) from orchestration.journey_instances where id=:'e14_journey_instance_id'::uuid) <> 0 then
    raise exception 'RLS exposed journey instance to unrelated actor';
  end if;
  update orchestration.journey_instances set status='paused' where id=:'e14_journey_instance_id'::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS allowed unrelated write'; end if;
end;
$$;
reset role;

set local role authenticated;
do $$
begin
  begin
    perform public.e14_get_participant_state(:'e14_participant_id'::uuid, :'e14_journey_instance_id'::uuid);
    raise exception 'authenticated role unexpectedly executed server-only RPC';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

select jsonb_build_object(
  'status','passed',
  'journey_instance_id',:'e14_journey_instance_id',
  'events_total_delta',(select count(*) - :'e14_events_before'::bigint from eventing.events),
  'journey_events',(select count(*) from eventing.events where journey_instance_id=:'e14_journey_instance_id'::uuid),
  'outbox_total_delta',(select count(*) - :'e14_outbox_before'::bigint from eventing.outbox),
  'points',(select sum(amount) from engagement.point_ledger where journey_instance_id=:'e14_journey_instance_id'::uuid),
  'final_state',(select value from e14_test_results where name='final_state')
) as e14_backend_e2e_result;

rollback;

do $$
begin
  if (select status from catalog.journey_versions where id=app_private.e14_deterministic_uuid('e14:journey-version:v1')) <> 'draft' then
    raise exception 'E14_E2E_CLEANUP_FAILED: journey publication was not rolled back';
  end if;
  if exists (
    select 1 from orchestration.enrollments
    where entrepreneur_id=app_private.e14_deterministic_uuid('e14:entrepreneur')
      and journey_version_id=app_private.e14_deterministic_uuid('e14:journey-version:v1')
  ) then
    raise exception 'E14_E2E_CLEANUP_FAILED: enrollment remained after rollback';
  end if;
end;
$$;
