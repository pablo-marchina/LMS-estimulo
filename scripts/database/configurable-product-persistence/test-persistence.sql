\set ON_ERROR_STOP on

set statement_timeout = '120s';
set lock_timeout = '10s';

create temporary table configurable_product_test_results(
  name text primary key,
  value jsonb not null
) on commit preserve rows;

create or replace function pg_temp.configurable_product_assert(
  p_condition boolean,
  p_message text
) returns void
language plpgsql
as $$
begin
  if coalesce(p_condition, false) is not true then
    raise exception 'CONFIGURABLE_PRODUCT_ASSERTION_FAILED: %', p_message;
  end if;
end;
$$;

create or replace function pg_temp.configurable_product_expect_error(
  p_sql text,
  p_expected text
) returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm = p_expected then
      return;
    end if;
    raise;
  end;
  raise exception 'CONFIGURABLE_PRODUCT_EXPECTED_ERROR_NOT_RAISED: %', p_expected;
end;
$$;

select
  app_private.e14_deterministic_uuid('e14:user:participant')::text participant_actor_id,
  app_private.e14_deterministic_uuid('e14:entrepreneur')::text entrepreneur_id,
  app_private.e14_deterministic_uuid('e14:organization')::text organization_id,
  app_private.e14_deterministic_uuid('configurable-product:test:submission')::text submission_id,
  app_private.e14_deterministic_uuid('configurable-product:test:assignment')::text assignment_id,
  app_private.e14_deterministic_uuid('configurable-product:test:policy')::text policy_version_id,
  app_private.e14_deterministic_uuid('configurable-product:test:archetype-definition:1')::text archetype_definition_1,
  app_private.e14_deterministic_uuid('configurable-product:test:archetype-definition:2')::text archetype_definition_2,
  app_private.e14_deterministic_uuid('configurable-product:test:archetype-definition:3')::text archetype_definition_3,
  app_private.e14_deterministic_uuid('configurable-product:test:archetype-definition:4')::text archetype_definition_4,
  app_private.e14_deterministic_uuid('configurable-product:test:archetype-version:1')::text archetype_version_1,
  app_private.e14_deterministic_uuid('configurable-product:test:archetype-version:2')::text archetype_version_2,
  app_private.e14_deterministic_uuid('configurable-product:test:archetype-version:3')::text archetype_version_3,
  app_private.e14_deterministic_uuid('configurable-product:test:archetype-version:4')::text archetype_version_4,
  app_private.e14_deterministic_uuid('configurable-product:test:unauthorized-user')::text unauthorized_actor_id,
  app_private.e14_deterministic_uuid('configurable-product:test:invalid-submission')::text invalid_submission_id,
  app_private.e14_deterministic_uuid('configurable-product:test:invalid-assignment')::text invalid_assignment_id,
  app_private.e14_deterministic_uuid('configurable-product:test:missing-archetype')::text missing_archetype_id,
  app_private.e14_deterministic_uuid('configurable-product:test:unauthorized-submission')::text unauthorized_submission_id,
  app_private.e14_deterministic_uuid('configurable-product:test:unauthorized-assignment')::text unauthorized_assignment_id
\gset cp_

select dv.id::text diagnostic_version_id
  from diagnostics.diagnostic_versions dv
  join diagnostics.diagnostic_definitions dd on dd.id = dv.diagnostic_definition_id
 where dd.owner_organization_id = :'cp_organization_id'::uuid
   and dv.status = 'published'
 order by dv.version_number desc
 limit 1
\gset cp_

select ji.id::text journey_instance_id
  from orchestration.journey_instances ji
  join orchestration.enrollments en on en.id = ji.enrollment_id
 where en.entrepreneur_id = :'cp_entrepreneur_id'::uuid
 order by ji.created_at desc
 limit 1
\gset cp_

select pg_temp.configurable_product_assert(
  :'cp_diagnostic_version_id' is not null,
  'published diagnostic fixture is required'
);
select pg_temp.configurable_product_assert(
  :'cp_journey_instance_id' is not null,
  'backend E2E journey instance is required'
);

-- Explicitly synthetic test records; they never represent the official Estimulo archetypes.
insert into diagnostics.archetype_definitions(
  id, owner_organization_id, code, name, description, status
) values
  (:'cp_archetype_definition_1'::uuid, :'cp_organization_id'::uuid, 'synthetic_test_profile_1', 'Synthetic Test Profile 1', 'Ephemeral database test fixture.', 'active'),
  (:'cp_archetype_definition_2'::uuid, :'cp_organization_id'::uuid, 'synthetic_test_profile_2', 'Synthetic Test Profile 2', 'Ephemeral database test fixture.', 'active'),
  (:'cp_archetype_definition_3'::uuid, :'cp_organization_id'::uuid, 'synthetic_test_profile_3', 'Synthetic Test Profile 3', 'Ephemeral database test fixture.', 'active'),
  (:'cp_archetype_definition_4'::uuid, :'cp_organization_id'::uuid, 'synthetic_test_profile_4', 'Synthetic Test Profile 4', 'Ephemeral database test fixture.', 'active')
on conflict (id) do nothing;

insert into diagnostics.archetype_versions(
  id, archetype_definition_id, version_number, model_reference,
  status, validation_status, published_at
) values
  (:'cp_archetype_version_1'::uuid, :'cp_archetype_definition_1'::uuid, 1, 'synthetic-test-only', 'published', 'synthetic_test_only', now()),
  (:'cp_archetype_version_2'::uuid, :'cp_archetype_definition_2'::uuid, 1, 'synthetic-test-only', 'published', 'synthetic_test_only', now()),
  (:'cp_archetype_version_3'::uuid, :'cp_archetype_definition_3'::uuid, 1, 'synthetic-test-only', 'published', 'synthetic_test_only', now()),
  (:'cp_archetype_version_4'::uuid, :'cp_archetype_definition_4'::uuid, 1, 'synthetic-test-only', 'published', 'synthetic_test_only', now())
on conflict (id) do nothing;

create temporary table configurable_product_payloads as
with answers as (
  select jsonb_agg(
    jsonb_build_object(
      'questionVersionId', i.id::text,
      'value', 'o2'
    ) order by i.position
  ) as value
  from diagnostics.items i
  where i.diagnostic_version_id = :'cp_diagnostic_version_id'::uuid
), submission as (
  select jsonb_build_object(
    'submissionId', :'cp_submission_id',
    'participantObjectId', :'cp_entrepreneur_id',
    'formVersionId', :'cp_diagnostic_version_id',
    'answers', answers.value,
    'submittedAt', '2026-07-14T17:00:00.000Z'
  ) as value
  from answers
), assignment as (
  select jsonb_build_object(
    'assignmentId', :'cp_assignment_id',
    'submissionObjectId', :'cp_submission_id',
    'formVersionId', :'cp_diagnostic_version_id',
    'classificationPolicyVersionId', :'cp_policy_version_id',
    'archetypeVersionId', :'cp_archetype_version_1',
    'confidence', null,
    'reason', 'classified',
    'supersedesAssignmentId', null,
    'scores', jsonb_build_array(
      jsonb_build_object('archetypeVersionId', :'cp_archetype_version_1', 'score', 10),
      jsonb_build_object('archetypeVersionId', :'cp_archetype_version_2', 'score', 3),
      jsonb_build_object('archetypeVersionId', :'cp_archetype_version_3', 'score', 1),
      jsonb_build_object('archetypeVersionId', :'cp_archetype_version_4', 'score', 0)
    ),
    'inputSnapshotHashes', jsonb_build_array(repeat('a', 64), repeat('b', 64)),
    'decisionRequestSnapshotHash', repeat('c', 64),
    'createdAt', '2026-07-14T17:00:01.000Z',
    'override', null
  ) as value
), activation as (
  select jsonb_build_object(
    'batchId', 'synthetic-activation-batch-1',
    'assignmentId', :'cp_assignment_id',
    'executions', jsonb_build_array(
      jsonb_build_object(
        'executionId', 'synthetic-activation-execution-1',
        'activationRuleVersionId', 'synthetic-activation-rule-1',
        'assignmentId', :'cp_assignment_id',
        'inputSnapshotHashes', jsonb_build_array(repeat('a', 64), repeat('b', 64), repeat('c', 64)),
        'action', jsonb_build_object(
          'type', 'recommend_content',
          'parameters', jsonb_build_object('contentKey', 'synthetic-test-content')
        ),
        'executedAt', '2026-07-14T17:00:01.000Z',
        'status', 'planned'
      )
    ),
    'createdAt', '2026-07-14T17:00:01.000Z'
  ) as value
), evidence as (
  select jsonb_build_object(
    'configurationHash', repeat('a', 64),
    'submissionHash', repeat('b', 64),
    'decisionRequestHash', repeat('c', 64),
    'assignmentHash', repeat('d', 64),
    'activationHash', repeat('e', 64)
  ) as value
), projections as (
  select jsonb_build_array(
    jsonb_build_object(
      'projectionId', 'synthetic-submission-projection-1',
      'projectionType', 'diagnostic_submission_summary',
      'subjectObjectId', :'cp_entrepreneur_id',
      'idempotencyKey', 'crm:synthetic:submission:1',
      'sourceRecordHash', repeat('b', 64),
      'payload', jsonb_build_object('submissionId', :'cp_submission_id'),
      'requiresReadback', false,
      'createdAt', '2026-07-14T17:00:01.000Z'
    ),
    jsonb_build_object(
      'projectionId', 'synthetic-assignment-projection-1',
      'projectionType', 'archetype_assignment_summary',
      'subjectObjectId', :'cp_entrepreneur_id',
      'idempotencyKey', 'crm:synthetic:assignment:1',
      'sourceRecordHash', repeat('d', 64),
      'payload', jsonb_build_object('assignmentId', :'cp_assignment_id'),
      'requiresReadback', false,
      'createdAt', '2026-07-14T17:00:01.000Z'
    ),
    jsonb_build_object(
      'projectionId', 'synthetic-activation-projection-1',
      'projectionType', 'activation_summary',
      'subjectObjectId', :'cp_entrepreneur_id',
      'idempotencyKey', 'crm:synthetic:activation:1',
      'sourceRecordHash', repeat('e', 64),
      'payload', jsonb_build_object('batchId', 'synthetic-activation-batch-1'),
      'requiresReadback', false,
      'createdAt', '2026-07-14T17:00:01.000Z'
    )
  ) as value
)
select
  submission.value as submission,
  assignment.value as assignment,
  activation.value as activation_batch,
  evidence.value as evidence,
  projections.value as crm_projections
from submission, assignment, activation, evidence, projections;

insert into configurable_product_test_results(name, value)
select 'initial', public.persist_configurable_product_result(
  :'cp_participant_actor_id'::uuid,
  :'cp_organization_id'::uuid,
  :'cp_journey_instance_id'::uuid,
  submission,
  assignment,
  activation_batch,
  evidence,
  crm_projections,
  'configurable-product-persistence-initial-v1'
)
from configurable_product_payloads;

select value #>> '{data,submission_id}' persisted_submission_id,
       value ->> 'request_id' request_id
from configurable_product_test_results where name = 'initial'
\gset cp_

select pg_temp.configurable_product_assert(
  (select value ->> 'replayed' = 'false' from configurable_product_test_results where name = 'initial'),
  'first persistence must not be a replay'
);
select pg_temp.configurable_product_assert(
  (select value #>> '{data,response_count}' = '4' from configurable_product_test_results where name = 'initial'),
  'all four synthetic answers must be persisted'
);
select pg_temp.configurable_product_assert(
  (select value #>> '{data,activation_count}' = '1' from configurable_product_test_results where name = 'initial'),
  'one activation must be persisted'
);
select pg_temp.configurable_product_assert(
  (select value #>> '{data,projection_count}' = '3' from configurable_product_test_results where name = 'initial'),
  'three CRM projections must be queued'
);
select pg_temp.configurable_product_assert(
  (select count(*) = 1 from diagnostics.sessions where id = :'cp_submission_id'::uuid and status = 'completed'),
  'completed diagnostic session was not persisted'
);
select pg_temp.configurable_product_assert(
  (select count(*) = 4 from diagnostics.responses where session_id = :'cp_submission_id'::uuid),
  'diagnostic responses were not persisted'
);
select pg_temp.configurable_product_assert(
  (select count(*) = 1 from diagnostics.results where session_id = :'cp_submission_id'::uuid),
  'diagnostic result was not persisted'
);
select pg_temp.configurable_product_assert(
  (select count(*) = 1 from diagnostics.archetype_assignments where id = :'cp_assignment_id'::uuid),
  'archetype assignment was not persisted'
);
select pg_temp.configurable_product_assert(
  (select count(*) = 1 from orchestration.personalization_decisions where output #>> '{parameters,contentKey}' = 'synthetic-test-content'),
  'activation decision was not persisted'
);
select pg_temp.configurable_product_assert(
  (select count(*) = 3
     from eventing.outbox o
     join eventing.events e on e.event_id = o.event_id
    where o.route_key = 'integration.hubspot'
      and e.correlation_id = :'cp_request_id'::uuid),
  'CRM projection outbox items were not persisted'
);

select count(*)::text events_before_replay from eventing.events \gset cp_
select count(*)::text outbox_before_replay from eventing.outbox \gset cp_
select count(*)::text assignments_before_replay from diagnostics.archetype_assignments \gset cp_
select count(*)::text decisions_before_replay from orchestration.personalization_decisions \gset cp_

insert into configurable_product_test_results(name, value)
select 'replay', public.persist_configurable_product_result(
  :'cp_participant_actor_id'::uuid,
  :'cp_organization_id'::uuid,
  :'cp_journey_instance_id'::uuid,
  submission,
  assignment,
  activation_batch,
  evidence,
  crm_projections,
  'configurable-product-persistence-initial-v1'
)
from configurable_product_payloads;

select pg_temp.configurable_product_assert(
  (select value ->> 'replayed' = 'true' from configurable_product_test_results where name = 'replay'),
  'same request must replay'
);
select pg_temp.configurable_product_assert(
  (select count(*) = :'cp_events_before_replay'::bigint from eventing.events),
  'replay duplicated events'
);
select pg_temp.configurable_product_assert(
  (select count(*) = :'cp_outbox_before_replay'::bigint from eventing.outbox),
  'replay duplicated outbox items'
);
select pg_temp.configurable_product_assert(
  (select count(*) = :'cp_assignments_before_replay'::bigint from diagnostics.archetype_assignments),
  'replay duplicated assignments'
);
select pg_temp.configurable_product_assert(
  (select count(*) = :'cp_decisions_before_replay'::bigint from orchestration.personalization_decisions),
  'replay duplicated activations'
);

select pg_temp.configurable_product_expect_error(
  format(
    'select public.persist_configurable_product_result(%L::uuid,%L::uuid,%L::uuid,%L::jsonb,%L::jsonb,%L::jsonb,%L::jsonb,%L::jsonb,%L)',
    :'cp_participant_actor_id',
    :'cp_organization_id',
    :'cp_journey_instance_id',
    submission::text,
    jsonb_set(assignment, '{scores,0,score}', '999'::jsonb)::text,
    activation_batch::text,
    evidence::text,
    crm_projections::text,
    'configurable-product-persistence-initial-v1'
  ),
  'IDEMPOTENCY_KEY_REUSED'
)
from configurable_product_payloads;

select pg_temp.configurable_product_expect_error(
  format(
    'select public.persist_configurable_product_result(%L::uuid,%L::uuid,%L::uuid,%L::jsonb,%L::jsonb,%L::jsonb,%L::jsonb,%L::jsonb,%L)',
    :'cp_unauthorized_actor_id',
    :'cp_organization_id',
    :'cp_journey_instance_id',
    jsonb_set(submission, '{submissionId}', to_jsonb(:'cp_unauthorized_submission_id'::text))::text,
    jsonb_set(
      jsonb_set(
        jsonb_set(assignment, '{assignmentId}', to_jsonb(:'cp_unauthorized_assignment_id'::text)),
        '{submissionObjectId}', to_jsonb(:'cp_unauthorized_submission_id'::text)
      ),
      '{reason}', '"classified"'::jsonb
    )::text,
    null,
    evidence::text,
    '[]'::jsonb::text,
    'configurable-product-persistence-unauthorized-v1'
  ),
  'FORBIDDEN'
)
from configurable_product_payloads;

select pg_temp.configurable_product_assert(
  not exists(select 1 from diagnostics.sessions where id = :'cp_unauthorized_submission_id'::uuid),
  'unauthorized request wrote a diagnostic session'
);

select pg_temp.configurable_product_expect_error(
  format(
    'select public.persist_configurable_product_result(%L::uuid,%L::uuid,%L::uuid,%L::jsonb,%L::jsonb,%L::jsonb,%L::jsonb,%L::jsonb,%L)',
    :'cp_participant_actor_id',
    :'cp_organization_id',
    :'cp_journey_instance_id',
    jsonb_set(submission, '{submissionId}', to_jsonb(:'cp_invalid_submission_id'::text))::text,
    jsonb_set(
      jsonb_set(
        jsonb_set(assignment, '{assignmentId}', to_jsonb(:'cp_invalid_assignment_id'::text)),
        '{submissionObjectId}', to_jsonb(:'cp_invalid_submission_id'::text)
      ),
      '{archetypeVersionId}', to_jsonb(:'cp_missing_archetype_id'::text)
    )::text,
    null,
    evidence::text,
    '[]'::jsonb::text,
    'configurable-product-persistence-invalid-archetype-v1'
  ),
  'ARCHETYPE_VERSION_NOT_PUBLISHED'
)
from configurable_product_payloads;

select pg_temp.configurable_product_assert(
  not exists(select 1 from diagnostics.sessions where id = :'cp_invalid_submission_id'::uuid),
  'invalid archetype request left a partial diagnostic session'
);
select pg_temp.configurable_product_assert(
  not exists(select 1 from diagnostics.archetype_assignments where id = :'cp_invalid_assignment_id'::uuid),
  'invalid archetype request left a partial assignment'
);

select jsonb_build_object(
  'configurable_product_persistence_passed', true,
  'submission_id', :'cp_submission_id',
  'assignment_id', :'cp_assignment_id',
  'crm_outbox_items', 3,
  'replay_preserved_counts', true,
  'unauthorized_write_blocked', true,
  'invalid_archetype_rolled_back', true
) as result;
