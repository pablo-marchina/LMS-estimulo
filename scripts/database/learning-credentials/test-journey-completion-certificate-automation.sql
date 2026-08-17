\set ON_ERROR_STOP on

-- This suite runs immediately after test-learning-credentials.sql in the same
-- psql session, so credential_context is the already-proven completed fixture.
create temporary table journey_completion_automation_context as
select
  c.*,
  app_private.ensure_journey_completion_rule(c.journey_version_id) as completion_rule_version_id,
  app_private.e14_deterministic_uuid('test:auto-certificate-definition') as certificate_definition_id,
  app_private.e14_deterministic_uuid('test:auto-certificate-version') as certificate_version_id
from credential_context c;

-- Every published journey must now expose at least one published, active,
-- journey-scoped credential rule that the certificate editor can select.
do $$
begin
  if exists (
    select 1
    from catalog.journey_versions jv
    join catalog.journey_definitions jd
      on jd.id = jv.journey_definition_id
    where jv.status = 'published'
      and not exists (
        select 1
        from orchestration.rule_versions rv
        join orchestration.rule_definitions rd
          on rd.id = rv.rule_definition_id
        where rd.owner_organization_id = jd.owner_organization_id
          and rd.status = 'active'
          and rd.rule_type = 'credential'
          and rv.status = 'published'
          and rv.language = 'credential-v1'
          and rv.expression->>'scope' = 'journey'
          and rv.expression->>'journey_version_id' = jv.id::text
      )
  ) then
    raise exception 'published journey is missing a selectable completion rule';
  end if;
end $$;

insert into engagement.certificate_definitions(
  id,
  owner_organization_id,
  code,
  name,
  status
)
select
  certificate_definition_id,
  organization_id,
  'test_auto_journey_certificate',
  'Certificado automático de conclusão',
  'active'
from journey_completion_automation_context
on conflict (owner_organization_id, code) do nothing;

insert into engagement.certificate_versions(
  id,
  certificate_definition_id,
  version_number,
  status,
  journey_version_id,
  requirements_rule_version_id,
  template_file_object_id,
  validity_policy,
  published_at
)
select
  certificate_version_id,
  certificate_definition_id,
  1,
  'published',
  journey_version_id,
  completion_rule_version_id,
  null,
  '{}'::jsonb,
  clock_timestamp()
from journey_completion_automation_context
on conflict (certificate_definition_id, version_number) do nothing;

-- Re-open the already-proven fixture only inside this disposable replay database,
-- then complete it again with a new aggregate version. The state transition must
-- emit journey.instance.completed and the event consumer must issue the new
-- certificate without an explicit application call to issue_learning_credentials.
update orchestration.journey_instances ji
set
  status = 'active',
  aggregate_version = ji.aggregate_version + 1,
  updated_at = clock_timestamp()
from journey_completion_automation_context c
where ji.id = c.journey_instance_id;

update orchestration.journey_instances ji
set
  status = 'completed',
  aggregate_version = ji.aggregate_version + 1,
  fully_completed_at = coalesce(ji.fully_completed_at, clock_timestamp()),
  updated_at = clock_timestamp()
from journey_completion_automation_context c
where ji.id = c.journey_instance_id;

create temporary table journey_completion_automation_result as
select
  c.journey_instance_id,
  c.certificate_version_id,
  ji.aggregate_version,
  app_private.e14_deterministic_uuid(
    'journey.instance.completed:' || ji.id::text || ':' || ji.aggregate_version::text
  ) as expected_completion_event_id
from journey_completion_automation_context c
join orchestration.journey_instances ji
  on ji.id = c.journey_instance_id;

do $$
declare
  r journey_completion_automation_result%rowtype;
begin
  select * into r from journey_completion_automation_result;

  if not exists (
    select 1
    from eventing.events ev
    where ev.event_id = r.expected_completion_event_id
      and ev.event_name = 'journey.instance.completed'
      and ev.aggregate_type = 'journey_instance'
      and ev.aggregate_id = r.journey_instance_id
      and ev.journey_instance_id = r.journey_instance_id
      and ev.payload->>'completion_source' = 'journey_state_transition'
  ) then
    raise exception 'canonical journey.instance.completed event was not emitted';
  end if;

  if (
    select count(*)
    from engagement.certificate_issuances ci
    where ci.journey_instance_id = r.journey_instance_id
      and ci.certificate_version_id = r.certificate_version_id
  ) <> 1 then
    raise exception 'journey completion did not issue exactly one automatic certificate';
  end if;
end $$;

-- Updating an already-completed row must not create a second completion event or
-- duplicate the certificate issuance.
update orchestration.journey_instances ji
set updated_at = clock_timestamp()
from journey_completion_automation_context c
where ji.id = c.journey_instance_id;

do $$
declare
  r journey_completion_automation_result%rowtype;
begin
  select * into r from journey_completion_automation_result;

  if (
    select count(*)
    from eventing.events ev
    where ev.event_id = r.expected_completion_event_id
      and ev.event_name = 'journey.instance.completed'
  ) <> 1 then
    raise exception 'journey completion event was duplicated';
  end if;

  if (
    select count(*)
    from engagement.certificate_issuances ci
    where ci.journey_instance_id = r.journey_instance_id
      and ci.certificate_version_id = r.certificate_version_id
  ) <> 1 then
    raise exception 'automatic certificate issuance was duplicated';
  end if;
end $$;

select 'journey completion certificate automation e2e passed' as result;
