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
order by ji.completed_at nulls last,ji.id
limit 1
\gset credential_

select si.id as step_instance_id,si.activity_version_id
from orchestration.step_instances si
join orchestration.path_assignments pa on pa.id=si.path_assignment_id
join orchestration.path_steps ps on ps.id=si.path_step_id
join assessment.assessment_specs asp on asp.activity_version_id=si.activity_version_id
where pa.journey_instance_id=:'credential_journey_instance_id'::uuid
  and ps.is_required
order by ps.position_hint desc,si.id
limit 1
\gset credential_

insert into orchestration.rule_definitions(id,owner_organization_id,code,rule_type,name,status)
values
  (app_private.e14_deterministic_uuid('test:credential-rule:journey'),
   :'credential_organization_id'::uuid,'test_credential_journey','eligibility',
   'Synthetic journey credential rule','active'),
  (app_private.e14_deterministic_uuid('test:credential-rule:activity'),
   :'credential_organization_id'::uuid,'test_credential_activity','eligibility',
   'Synthetic activity credential rule','active')
on conflict (owner_organization_id,code) do nothing;

insert into orchestration.rule_versions(
  id,rule_definition_id,version_number,status,language,expression,input_schema,
  output_schema,published_at,content_hash
)
values
  (app_private.e14_deterministic_uuid('test:credential-rule-version:journey'),
   app_private.e14_deterministic_uuid('test:credential-rule:journey'),1,'published','credential-v1',
   jsonb_build_object(
     'scope','journey','journey_version_id',:'credential_journey_version_id'::text,
     'requires_completed_status',true,'requires_required_steps_completed',true,
     'requires_passed_assessment',true
   ),'{}'::jsonb,'{}'::jsonb,now(),
   app_private.e14_request_hash(jsonb_build_object('test','credential-journey-v1'))),
  (app_private.e14_deterministic_uuid('test:credential-rule-version:activity'),
   app_private.e14_deterministic_uuid('test:credential-rule:activity'),1,'published','credential-v1',
   jsonb_build_object(
     'scope','activity','activity_version_id',:'credential_activity_version_id'::text,
     'requires_completed_status',true,'requires_passed_assessment',true
   ),'{}'::jsonb,'{}'::jsonb,now(),
   app_private.e14_request_hash(jsonb_build_object('test','credential-activity-v1')))
on conflict (rule_definition_id,version_number) do nothing;

insert into engagement.badge_definitions(id,owner_organization_id,code,name,status)
values
  (app_private.e14_deterministic_uuid('test:badge-definition:journey'),
   :'credential_organization_id'::uuid,'test_journey_badge','Synthetic journey badge','active'),
  (app_private.e14_deterministic_uuid('test:badge-definition:activity'),
   :'credential_organization_id'::uuid,'test_activity_badge','Synthetic activity badge','active')
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
   app_private.e14_deterministic_uuid('test:credential-rule-version:activity'),null,now())
on conflict (badge_definition_id,version_number) do nothing;

insert into engagement.certificate_definitions(id,owner_organization_id,code,name,status)
values(
  app_private.e14_deterministic_uuid('test:certificate-definition'),
  :'credential_organization_id'::uuid,'test_journey_certificate',
  'Certificado sintético de jornada','active'
)
on conflict (owner_organization_id,code) do nothing;

insert into engagement.certificate_versions(
  id,certificate_definition_id,version_number,status,journey_version_id,
  requirements_rule_version_id,template_file_object_id,validity_policy,published_at
)
values(
  app_private.e14_deterministic_uuid('test:certificate-version'),
  app_private.e14_deterministic_uuid('test:certificate-definition'),1,'published',
  :'credential_journey_version_id'::uuid,
  app_private.e14_deterministic_uuid('test:credential-rule-version:journey'),
  null,'{}'::jsonb,now()
)
on conflict (certificate_definition_id,version_number) do nothing;

create temporary table credential_issue_result as
select public.issue_learning_credentials(
  :'credential_actor_user_account_id'::uuid,
  :'credential_journey_instance_id'::uuid,
  :'credential_step_instance_id'::uuid,
  'credential-e2e-issue-0001'
) as envelope;

do $$
declare v jsonb;
begin
  select envelope into v from credential_issue_result;
  if (v->>'replayed')::boolean then raise exception 'expected first issuance'; end if;
  if jsonb_array_length(v->'data'->'badges')<>2 then raise exception 'expected two badges'; end if;
  if jsonb_array_length(v->'data'->'certificates')<>1 then raise exception 'expected one certificate'; end if;
  if not (v->'data'->>'journey_completed')::boolean then raise exception 'journey should be completed'; end if;
  if not (v->'data'->>'required_assessments_passed')::boolean then raise exception 'assessment evidence missing'; end if;
end $$;

create temporary table credential_replay_result as
select public.issue_learning_credentials(
  :'credential_actor_user_account_id'::uuid,
  :'credential_journey_instance_id'::uuid,
  :'credential_step_instance_id'::uuid,
  'credential-e2e-issue-0001'
) as envelope;

do $$
declare v jsonb;
begin
  select envelope into v from credential_replay_result;
  if not (v->>'replayed')::boolean then raise exception 'expected issuance replay'; end if;
  if (select count(*) from engagement.badge_awards
      where journey_instance_id=:'credential_journey_instance_id'::uuid)<>2 then
    raise exception 'badge issuance duplicated';
  end if;
  if (select count(*) from engagement.certificate_issuances
      where journey_instance_id=:'credential_journey_instance_id'::uuid)<>1 then
    raise exception 'certificate issuance duplicated';
  end if;
end $$;

do $$
begin
  perform public.issue_learning_credentials(
    :'credential_actor_user_account_id'::uuid,
    :'credential_journey_instance_id'::uuid,
    null,
    'credential-e2e-issue-0001'
  );
  raise exception 'expected idempotency reuse failure';
exception when unique_violation then null;
end $$;

do $$
begin
  perform public.issue_learning_credentials(
    '00000000-0000-0000-0000-000000000001'::uuid,
    :'credential_journey_instance_id'::uuid,
    :'credential_step_instance_id'::uuid,
    'credential-e2e-forbidden-0001'
  );
  raise exception 'expected forbidden issuance';
exception when insufficient_privilege then null;
end $$;

create temporary table credential_list_result as
select public.list_participant_credentials(
  :'credential_actor_user_account_id'::uuid
) as data;

do $$
declare v jsonb; code text; verification jsonb;
begin
  select data into v from credential_list_result;
  if jsonb_array_length(v->'badges')<2 then raise exception 'participant badges missing'; end if;
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
