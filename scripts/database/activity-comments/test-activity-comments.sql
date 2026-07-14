\set ON_ERROR_STOP on

set statement_timeout = '120s';
set lock_timeout = '10s';

create temporary table activity_comment_test_results(
  name text primary key,
  value jsonb not null
) on commit preserve rows;

create or replace function pg_temp.activity_comment_assert(
  p_condition boolean,
  p_message text
) returns void
language plpgsql
as $$
begin
  if coalesce(p_condition, false) is not true then
    raise exception 'ACTIVITY_COMMENT_ASSERTION_FAILED: %', p_message;
  end if;
end;
$$;

create or replace function pg_temp.activity_comment_expect_error(
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
  raise exception 'ACTIVITY_COMMENT_EXPECTED_ERROR_NOT_RAISED: %', p_expected;
end;
$$;

select
  app_private.e14_deterministic_uuid('e14:user:operator')::text operator_id,
  app_private.e14_deterministic_uuid('e14:user:participant')::text participant_id,
  app_private.e14_deterministic_uuid('e14:e2e:unauthorized-user')::text unauthorized_id,
  app_private.e14_deterministic_uuid('e14:organization')::text organization_id
\gset comment_

select si.id::text step_instance_id
from orchestration.step_instances si
join orchestration.path_assignments pa on pa.id = si.path_assignment_id
join orchestration.journey_instances ji on ji.id = pa.journey_instance_id
join orchestration.enrollments en on en.id = ji.enrollment_id
where en.entrepreneur_id = app_private.e14_deterministic_uuid('e14:entrepreneur')
order by si.created_at desc
limit 1
\gset comment_

select pg_temp.activity_comment_assert(
  :'comment_step_instance_id' is not null,
  'backend E2E step fixture is required'
);

select count(*)::text as events_before from eventing.events
\gset comment_
select count(*)::text as outbox_before from eventing.outbox
\gset comment_

insert into activity_comment_test_results(name, value)
values (
  'create',
  public.create_activity_comment(
    :'comment_participant_id'::uuid,
    :'comment_step_instance_id'::uuid,
    '  Uso o ChatGPT de vez em quando.  ',
    'activity-comment-create-v1'
  )
);

select value #>> '{data,id}' as comment_id,
       value ->> 'request_id' as create_event_id
from activity_comment_test_results
where name = 'create'
\gset comment_

select pg_temp.activity_comment_assert(
  (select value ->> 'replayed' = 'false' from activity_comment_test_results where name = 'create'),
  'first creation must not be replayed'
);
select pg_temp.activity_comment_assert(
  (select value #>> '{data,body}' = 'Uso o ChatGPT de vez em quando.' from activity_comment_test_results where name = 'create'),
  'comment body must be trimmed'
);
select pg_temp.activity_comment_assert(
  (select count(*) = 1 from engagement.activity_comments where id = :'comment_comment_id'::uuid),
  'comment row missing'
);
select pg_temp.activity_comment_assert(
  (select count(*) = 1 from eventing.events where event_id = :'comment_create_event_id'::uuid and event_name = 'learning.activity.comment.created'),
  'creation event missing'
);
select pg_temp.activity_comment_assert(
  (select count(*) = 1 from eventing.outbox where event_id = :'comment_create_event_id'::uuid),
  'creation outbox item missing'
);

insert into activity_comment_test_results(name, value)
values (
  'create_replay',
  public.create_activity_comment(
    :'comment_participant_id'::uuid,
    :'comment_step_instance_id'::uuid,
    'Uso o ChatGPT de vez em quando.',
    'activity-comment-create-v1'
  )
);

select pg_temp.activity_comment_assert(
  (select value ->> 'replayed' = 'true' from activity_comment_test_results where name = 'create_replay'),
  'creation replay flag missing'
);
select pg_temp.activity_comment_assert(
  (select count(*) = 1 from engagement.activity_comments where id = :'comment_comment_id'::uuid),
  'creation replay duplicated row'
);
select pg_temp.activity_comment_assert(
  (select count(*) = :'comment_events_before'::bigint + 1 from eventing.events),
  'creation replay duplicated event'
);
select pg_temp.activity_comment_assert(
  (select count(*) = :'comment_outbox_before'::bigint + 1 from eventing.outbox),
  'creation replay duplicated outbox'
);

select pg_temp.activity_comment_expect_error(
  format(
    'select public.create_activity_comment(%L::uuid,%L::uuid,%L,%L)',
    :'comment_participant_id',
    :'comment_step_instance_id',
    'Outro texto',
    'activity-comment-create-v1'
  ),
  'IDEMPOTENCY_KEY_REUSED'
);

select pg_temp.activity_comment_expect_error(
  format(
    'select public.create_activity_comment(%L::uuid,%L::uuid,%L,%L)',
    :'comment_unauthorized_id',
    :'comment_step_instance_id',
    'Tentativa indevida',
    'activity-comment-forbidden-v1'
  ),
  'FORBIDDEN'
);

insert into activity_comment_test_results(name, value)
values (
  'participant_list',
  public.list_activity_comments(
    :'comment_participant_id'::uuid,
    :'comment_step_instance_id'::uuid
  )
);

select pg_temp.activity_comment_assert(
  (select jsonb_array_length(value -> 'comments') = 1 from activity_comment_test_results where name = 'participant_list'),
  'participant list must contain visible comment'
);
select pg_temp.activity_comment_assert(
  (select value #>> '{comments,0,is_own}' = 'true' from activity_comment_test_results where name = 'participant_list'),
  'participant list must identify own comment'
);

insert into activity_comment_test_results(name, value)
values (
  'operator_list',
  public.list_operator_activity_comments(
    :'comment_operator_id'::uuid,
    :'comment_organization_id'::uuid,
    50
  )
);
select pg_temp.activity_comment_assert(
  (select jsonb_array_length(value -> 'comments') = 1 from activity_comment_test_results where name = 'operator_list'),
  'operator list must contain comment'
);

insert into activity_comment_test_results(name, value)
values (
  'hide',
  public.moderate_activity_comment(
    :'comment_operator_id'::uuid,
    :'comment_organization_id'::uuid,
    :'comment_comment_id'::uuid,
    'hidden',
    'Conteúdo removido no teste de moderação.',
    'activity-comment-hide-v1'
  )
);

select value ->> 'request_id' as hide_event_id
from activity_comment_test_results
where name = 'hide'
\gset comment_

select pg_temp.activity_comment_assert(
  (select value #>> '{data,status}' = 'hidden' from activity_comment_test_results where name = 'hide'),
  'moderation must hide comment'
);
select pg_temp.activity_comment_assert(
  (select value #>> '{data,changed}' = 'true' from activity_comment_test_results where name = 'hide'),
  'first moderation must change state'
);
select pg_temp.activity_comment_assert(
  (select count(*) = 1 from engagement.activity_comment_moderations where comment_id = :'comment_comment_id'::uuid),
  'moderation history missing'
);
select pg_temp.activity_comment_assert(
  (select count(*) = 1 from eventing.events where event_id = :'comment_hide_event_id'::uuid and event_name = 'learning.activity.comment.moderated'),
  'moderation event missing'
);
select pg_temp.activity_comment_assert(
  (select count(*) = 1 from eventing.outbox where event_id = :'comment_hide_event_id'::uuid),
  'moderation outbox item missing'
);

insert into activity_comment_test_results(name, value)
values (
  'hide_replay',
  public.moderate_activity_comment(
    :'comment_operator_id'::uuid,
    :'comment_organization_id'::uuid,
    :'comment_comment_id'::uuid,
    'hidden',
    'Conteúdo removido no teste de moderação.',
    'activity-comment-hide-v1'
  )
);
select pg_temp.activity_comment_assert(
  (select value ->> 'replayed' = 'true' from activity_comment_test_results where name = 'hide_replay'),
  'moderation replay flag missing'
);
select pg_temp.activity_comment_assert(
  (select count(*) = 1 from engagement.activity_comment_moderations where comment_id = :'comment_comment_id'::uuid),
  'moderation replay duplicated history'
);

insert into activity_comment_test_results(name, value)
values (
  'participant_list_hidden',
  public.list_activity_comments(
    :'comment_participant_id'::uuid,
    :'comment_step_instance_id'::uuid
  )
);
select pg_temp.activity_comment_assert(
  (select jsonb_array_length(value -> 'comments') = 0 from activity_comment_test_results where name = 'participant_list_hidden'),
  'hidden comment must not be listed to participant'
);

select pg_temp.activity_comment_expect_error(
  format(
    'select public.moderate_activity_comment(%L::uuid,%L::uuid,%L::uuid,%L,%L,%L)',
    :'comment_participant_id',
    :'comment_organization_id',
    :'comment_comment_id',
    'visible',
    '',
    'activity-comment-participant-moderation-v1'
  ),
  'FORBIDDEN'
);

insert into activity_comment_test_results(name, value)
values (
  'restore',
  public.moderate_activity_comment(
    :'comment_operator_id'::uuid,
    :'comment_organization_id'::uuid,
    :'comment_comment_id'::uuid,
    'visible',
    '',
    'activity-comment-restore-v1'
  )
);
select pg_temp.activity_comment_assert(
  (select value #>> '{data,status}' = 'visible' from activity_comment_test_results where name = 'restore'),
  'comment must be restorable'
);
select pg_temp.activity_comment_assert(
  (select count(*) = 2 from engagement.activity_comment_moderations where comment_id = :'comment_comment_id'::uuid),
  'restore history missing'
);

select jsonb_build_object(
  'status', 'ok',
  'comment_id', :'comment_comment_id',
  'comment_rows', (select count(*) from engagement.activity_comments),
  'moderation_rows', (select count(*) from engagement.activity_comment_moderations),
  'comment_events', (
    select count(*) from eventing.events
    where event_name in ('learning.activity.comment.created', 'learning.activity.comment.moderated')
  )
) as activity_comments_e2e;
