\set ON_ERROR_STOP on

select
  ji.id as journey_instance_id,
  en.journey_version_id,
  en.entrepreneur_id,
  e.user_account_id as actor_user_account_id,
  app_private.journey_owner_organization_id(ji.id) as organization_id
from orchestration.journey_instances ji
join orchestration.enrollments en on en.id=ji.enrollment_id
join core.entrepreneurs e on e.id=en.entrepreneur_id
where ji.status='completed'
order by coalesce(ji.fully_completed_at,ji.base_completed_at,ji.updated_at) nulls last,ji.id
limit 1
\gset credential_

select
  si.id as step_instance_id,
  si.activity_version_id,
  pa.id as path_assignment_id,
  pa.path_template_id
from orchestration.step_instances si
join orchestration.path_assignments pa on pa.id=si.path_assignment_id
join orchestration.path_steps ps on ps.id=si.path_step_id
join assessment.assessment_specs asp on asp.activity_version_id=si.activity_version_id
where pa.journey_instance_id=:'credential_journey_instance_id'::uuid
  and ps.is_required
order by ps.position_hint desc,si.id
limit 1
\gset credential_

-- Credential issuance derives path completion from the assignment status. Keep the
-- selected completed-journey fixture explicit so this suite exercises the path branch
-- even if seed data leaves the assignment active after the journey itself completes.
update orchestration.path_assignments
set status='completed'
where id=:'credential_path_assignment_id'::uuid;

create temporary table credential_context as
select
  :'credential_journey_instance_id'::uuid as journey_instance_id,
  :'credential_journey_version_id'::uuid as journey_version_id,
  :'credential_entrepreneur_id'::uuid as entrepreneur_id,
  :'credential_actor_user_account_id'::uuid as actor_user_account_id,
  :'credential_organization_id'::uuid as organization_id,
  :'credential_step_instance_id'::uuid as step_instance_id,
  :'credential_activity_version_id'::uuid as activity_version_id,
  :'credential_path_assignment_id'::uuid as path_assignment_id,
  :'credential_path_template_id'::uuid as path_template_id;

insert into orchestration.rule_definitions(id,owner_organization_id,code,rule_type,name,status)
select app_private.e14_deterministic_uuid('test:credential-rule:journey'),organization_id,
  'test_credential_journey','eligibility','Synthetic journey credential rule','active'
from credential_context
union all
select app_private.e14_deterministic_uuid('test:credential-rule:activity'),organization_id,
  'test_credential_activity','eligibility','Synthetic activity credential rule','active'
from credential_context
union all
select app_private.e14_deterministic_uuid('test:credential-rule:path-link'),organization_id,
  'test_credential_path_link','eligibility','Synthetic explicit path-link credential rule','active'
from credential_context
on conflict (owner_organization_id,code) do nothing;

insert into orchestration.rule_versions(
  id,rule_definition_id,version_number,status,language,expression,input_schema,
  output_schema,published_at,content_hash
)
select
  app_private.e14_deterministic_uuid('test:credential-rule-version:journey'),
  app_private.e14_deterministic_uuid('test:credential-rule:journey'),1,'published','credential-v1',
  jsonb_build_object(
    'scope','journey','journey_version_id',journey_version_id::text,
    'requires_completed_status',true,'requires_required_steps_completed',true,
    'requires_passed_assessment',true
  ),'{}'::jsonb,'{}'::jsonb,now(),
  app_private.e14_request_hash(jsonb_build_object('test','credential-journey-v1'))
from credential_context
union all
select
  app_private.e14_deterministic_uuid('test:credential-rule-version:activity'),
  app_private.e14_deterministic_uuid('test:credential-rule:activity'),1,'published','credential-v1',
  jsonb_build_object(
    'scope','activity','activity_version_id',activity_version_id::text,
    'requires_completed_status',true,'requires_passed_assessment',true
  ),'{}'::jsonb,'{}'::jsonb,now(),
  app_private.e14_request_hash(jsonb_build_object('test','credential-activity-v1'))
from credential_context
union all
select
  app_private.e14_deterministic_uuid('test:credential-rule-version:path-link'),
  app_private.e14_deterministic_uuid('test:credential-rule:path-link'),1,'published','credential-v1',
  jsonb_build_object(
    'scope','path',
    -- Deliberately point the rule at another path. The badge below must therefore
    -- be issued because of engagement.path_badge_links, not the legacy rule matcher.
    'path_template_id',app_private.e14_deterministic_uuid('test:credential:nonmatching-path')::text,
    'requires_completed_status',true,
    'requires_required_steps_completed',true,
    'requires_passed_assessment',true
  ),'{}'::jsonb,'{}'::jsonb,now(),
  app_private.e14_request_hash(jsonb_build_object('test','credential-explicit-path-link-v1'))
from credential_context
on conflict (rule_definition_id,version_number) do nothing;

insert into engagement.badge_definitions(id,owner_organization_id,code,name,status)
select app_private.e14_deterministic_uuid('test:badge-definition:journey'),organization_id,
  'test_journey_badge','Synthetic journey badge','active'
from credential_context
union all
select app_private.e14_deterministic_uuid('test:badge-definition:activity'),organization_id,
  'test_activity_badge','Synthetic activity badge','active'
from credential_context
union all
select app_private.e14_deterministic_uuid('test:badge-definition:path-link'),organization_id,
  'test_path_link_badge','Synthetic explicit path-link badge','active'
from credential_context
on conflict (owner_organization_id,code) do nothing;

insert into engagement.badge_versions(
  id,badge_definition_id,version_number,status,title,description,
  criteria_rule_version_id,asset_file_object_id,published_at
)
values
  (app_private.e14_deterministic_uuid('test:badge-version:journey'),
   app_private.e14_deterministic_uuid('test:badge-definition:journey'),1,'published',
   'Jornada sintética concluída','Selo técnico usado somente no E2E.',
   app_private.e14_deterministic_uuid('test:credential-rule-version:journey'),null,now()),
  (app_private.e14_deterministic_uuid('test:badge-version:activity'),
   app_private.e14_deterministic_uuid('test:badge-definition:activity'),1,'published',
   'Atividade sintética concluída','Selo técnico usado somente no E2E.',
   app_private.e14_deterministic_uuid('test:credential-rule-version:activity'),null,now()),
  (app_private.e14_deterministic_uuid('test:badge-version:path-link'),
   app_private.e14_deterministic_uuid('test:badge-definition:path-link'),1,'published',
   'Trilha sintética concluída','Selo técnico de vínculo explícito usado somente no E2E.',
   app_private.e14_deterministic_uuid('test:credential-rule-version:path-link'),null,now())
on conflict (badge_definition_id,version_number) do nothing;

-- The rule attached to this badge intentionally does not match this path. This
-- row is the only reason the path badge can become an issuance candidate.
insert into engagement.path_badge_links(path_template_id,badge_version_id,created_at,updated_at)
select path_template_id,app_private.e14_deterministic_uuid('test:badge-version:path-link'),now(),now()
from credential_context
on conflict(path_template_id) do update
set badge_version_id=excluded.badge_version_id,
    updated_at=excluded.updated_at;

insert into engagement.certificate_definitions(id,owner_organization_id,code,name,status)
select app_private.e14_deterministic_uuid('test:certificate-definition'),organization_id,
  'test_journey_certificate','Certificado sintético de jornada','active'
from credential_context
on conflict (owner_organization_id,code) do nothing;

insert into engagement.certificate_versions(
  id,certificate_definition_id,version_number,status,journey_version_id,
  requirements_rule_version_id,template_file_object_id,validity_policy,published_at
)
select
  app_private.e14_deterministic_uuid('test:certificate-version'),
  app_private.e14_deterministic_uuid('test:certificate-definition'),1,'published',
  journey_version_id,
  app_private.e14_deterministic_uuid('test:credential-rule-version:journey'),
  null,'{}'::jsonb,now()
from credential_context
on conflict (certificate_definition_id,version_number) do nothing;

-- Certificate eligibility is now selected by the journey, not inferred merely
-- from all compatible published certificates. Make this fixture explicit before
-- invoking the issuer. The fixture journey can already be published, so preserve
-- the normal immutable-row guard and use the same transaction-local live-edit flag
-- as the production journey editor.
begin;
select set_config('app.admin_live_edit','on',true);
update catalog.journey_versions jv
set configuration=jsonb_set(
  coalesce(jv.configuration,'{}'::jsonb),
  '{completion_certificate}',
  jsonb_build_object(
    'enabled',true,
    'certificate_version_id',app_private.e14_deterministic_uuid('test:certificate-version'),
    'trigger_event','journey.instance.completed',
    'data_fields',jsonb_build_array('participant_name','journey_title','issued_at','verification_code')
  ),
  true
)
from credential_context c
where jv.id=c.journey_version_id;
commit;

create temporary table credential_issue_result as
select public.issue_learning_credentials(
  actor_user_account_id,journey_instance_id,step_instance_id,'credential-e2e-issue-0001'
) as envelope
from credential_context;

do $$
declare v jsonb; path_badge uuid:=app_private.e14_deterministic_uuid('test:badge-version:path-link');
begin
  select envelope into v from credential_issue_result;
  if (v->>'replayed')::boolean then raise exception 'expected first issuance'; end if;
  if jsonb_array_length(v->'data'->'badges')<>3 then raise exception 'expected three badges including explicit path badge'; end if;
  if jsonb_array_length(v->'data'->'certificates')<>1 then raise exception 'expected one certificate'; end if;
  if not (v->'data'->>'journey_completed')::boolean then raise exception 'journey should be completed'; end if;
  if not (v->'data'->>'required_assessments_passed')::boolean then raise exception 'assessment evidence missing'; end if;
  if not exists (
    select 1
    from jsonb_array_elements(v->'data'->'badges') item
    where (item->>'badge_version_id')::uuid=path_badge
      and item->>'scope'='path'
  ) then
    raise exception 'explicit path badge missing from issuance candidates';
  end if;
end $$;

create temporary table credential_replay_result as
select public.issue_learning_credentials(
  actor_user_account_id,journey_instance_id,step_instance_id,'credential-e2e-issue-0001'
) as envelope
from credential_context;

do $$
declare v jsonb; journey_id uuid; path_badge uuid:=app_private.e14_deterministic_uuid('test:badge-version:path-link');
begin
  select envelope into v from credential_replay_result;
  select journey_instance_id into journey_id from credential_context;
  if not (v->>'replayed')::boolean then raise exception 'expected issuance replay'; end if;
  if (select count(*) from engagement.badge_awards where journey_instance_id=journey_id)<>3 then
    raise exception 'badge issuance duplicated or explicit path badge missing';
  end if;
  if not exists (
    select 1 from engagement.badge_awards
    where journey_instance_id=journey_id and badge_version_id=path_badge
  ) then
    raise exception 'explicit path badge award was not persisted';
  end if;
  if (select count(*) from engagement.certificate_issuances where journey_instance_id=journey_id)<>1 then
    raise exception 'certificate issuance duplicated';
  end if;
end $$;

do $$
declare c credential_context%rowtype;
begin
  select * into c from credential_context;
  perform public.issue_learning_credentials(
    c.actor_user_account_id,c.journey_instance_id,null,'credential-e2e-issue-0001'
  );
  raise exception 'expected idempotency reuse failure';
exception when unique_violation then null;
end $$;

do $$
declare c credential_context%rowtype;
begin
  select * into c from credential_context;
  perform public.issue_learning_credentials(
    '00000000-0000-0000-0000-000000000001'::uuid,
    c.journey_instance_id,c.step_instance_id,'credential-e2e-forbidden-0001'
  );
  raise exception 'expected forbidden issuance';
exception when insufficient_privilege then null;
end $$;

create temporary table credential_list_result as
select public.list_participant_credentials(actor_user_account_id) as data
from credential_context;

do $$
declare v jsonb; code text; verification jsonb; path_badge uuid:=app_private.e14_deterministic_uuid('test:badge-version:path-link');
begin
  select data into v from credential_list_result;
  if jsonb_array_length(v->'badges')<3 then raise exception 'participant badges missing'; end if;
  if not exists (
    select 1
    from jsonb_array_elements(v->'badges') item
    where (item->>'badge_version_id')::uuid=path_badge
  ) then
    raise exception 'participant credential list is missing explicit path badge';
  end if;
  if jsonb_array_length(v->'certificates')<1 then raise exception 'participant certificate missing'; end if;
  code:=v->'certificates'->0->>'verification_code';
  verification:=public.verify_certificate(code);
  if not (verification->>'valid')::boolean then raise exception 'certificate should validate'; end if;
  if public.verify_certificate('INVALID')->>'reason'<>'invalid_code' then
    raise exception 'invalid certificate code should be rejected';
  end if;
  if public.verify_certificate('EST-00000000000000000000')->>'reason'<>'not_found' then
    raise exception 'unknown certificate should not validate';
  end if;
end $$;

select 'learning credentials e2e passed' as result;