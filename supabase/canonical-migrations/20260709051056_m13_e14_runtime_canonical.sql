-- Canonical reconstruction of the E14 runtime migration range.
-- Generated deterministically from the Supabase migration history export.
-- This file is documentation/replay evidence; executable history remains
-- represented by the timestamped files under supabase/migrations.

-- BEGIN 20260709051056_m13a_e14_command_foundation
-- Remote SQL SHA-256: fbe854b2b65623c8c6beb65b5ee818342446de32d2eb89c57b4069a5e6cfc8c5
-- Plataforma Estímulo — E14 Step 4 — command foundation, immutability and internal fixture
set lock_timeout = '5s';
set statement_timeout = '5min';

create or replace function app_private.e14_request_hash(p_payload jsonb)
returns text
language sql
immutable
security definer
set search_path = pg_catalog
as $$
  select encode(extensions.digest(convert_to(coalesce(p_payload, '{}'::jsonb)::text, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function app_private.e14_deterministic_uuid(p_value text)
returns uuid
language plpgsql
immutable
security definer
set search_path = pg_catalog
as $$
declare
  v_hex text;
begin
  if p_value is null or length(trim(p_value)) = 0 then
    raise exception 'DETERMINISTIC_UUID_INPUT_REQUIRED' using errcode = '22023';
  end if;
  v_hex := encode(extensions.digest(convert_to(trim(p_value), 'UTF8'), 'sha256'), 'hex');
  v_hex := substr(v_hex, 1, 12) || '5' || substr(v_hex, 14, 3) || 'a' || substr(v_hex, 18, 15);
  return (
    substr(v_hex, 1, 8) || '-' || substr(v_hex, 9, 4) || '-' || substr(v_hex, 13, 4) || '-' ||
    substr(v_hex, 17, 4) || '-' || substr(v_hex, 21, 12)
  )::uuid;
end;
$$;

create or replace function app_private.e14_command_event_id(
  p_command text,
  p_actor_id uuid,
  p_target_id uuid,
  p_idempotency_key text
) returns uuid
language sql
immutable
security definer
set search_path = pg_catalog
as $$
  select app_private.e14_deterministic_uuid(
    'e14|' || trim(p_command) || '|' || coalesce(p_actor_id::text, '-') || '|' ||
    coalesce(p_target_id::text, '-') || '|' || trim(p_idempotency_key)
  );
$$;

create or replace function app_private.e14_child_event_id(
  p_command_event_id uuid,
  p_event_name text,
  p_ordinal integer
) returns uuid
language sql
immutable
security definer
set search_path = pg_catalog
as $$
  select app_private.e14_deterministic_uuid(
    'e14-child|' || p_command_event_id::text || '|' || trim(p_event_name) || '|' || p_ordinal::text
  );
$$;

create or replace function app_private.e14_assert_idempotency(
  p_event_id uuid,
  p_request_hash text
) returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_stored_hash text;
begin
  select e.payload ->> 'request_hash'
    into v_stored_hash
    from eventing.events e
   where e.event_id = p_event_id;

  if not found then
    return false;
  end if;
  if v_stored_hash is distinct from p_request_hash then
    raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = 'P0001';
  end if;
  return true;
end;
$$;

create or replace function app_private.e14_actor_has_permission(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_permission_code text
) returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
      from iam.organization_memberships om
      join iam.membership_roles mr on mr.membership_id = om.id
      join iam.role_definitions rd on rd.id = mr.role_id
      join iam.role_permissions rp on rp.role_id = rd.id
      join iam.permission_definitions pd on pd.id = rp.permission_id
     where om.user_account_id = p_actor_user_account_id
       and om.organization_id = p_organization_id
       and om.status = 'active'
       and rd.status = 'active'
       and om.valid_from <= now()
       and (om.valid_until is null or om.valid_until > now())
       and mr.valid_from <= now()
       and (mr.valid_until is null or mr.valid_until > now())
       and pd.code = p_permission_code
       and coalesce(mr.scope @> '{"all": true}'::jsonb, false)
  );
$$;

create or replace function app_private.e14_entrepreneur_for_account(p_user_account_id uuid)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select e.id
    from core.entrepreneurs e
   where e.user_account_id = p_user_account_id
     and e.status = 'active'
   limit 1;
$$;

create or replace function app_private.e14_event_schema_id(p_event_name text)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select es.id
    from eventing.event_schemas es
   where es.event_name = p_event_name
     and es.event_version = 1
     and es.status = 'published';
$$;

create or replace function app_private.e14_append_event(
  p_event_id uuid,
  p_event_name text,
  p_subject_type text,
  p_subject_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_organization_id uuid,
  p_journey_instance_id uuid,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_aggregate_version bigint,
  p_correlation_id uuid,
  p_causation_id uuid,
  p_payload jsonb
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_schema_id uuid;
begin
  v_schema_id := app_private.e14_event_schema_id(p_event_name);
  if v_schema_id is null then
    raise exception 'EVENT_SCHEMA_NOT_FOUND:%', p_event_name using errcode = 'P0001';
  end if;

  return eventing.append_event(
    p_event_id,
    p_event_name,
    1,
    now(),
    'estimulo.e14.application',
    p_subject_type,
    p_subject_id,
    p_actor_type,
    p_actor_id,
    p_organization_id,
    p_journey_instance_id,
    p_aggregate_type,
    p_aggregate_id,
    coalesce(p_aggregate_version, 0),
    coalesce(p_organization_id::text, 'e14-internal'),
    p_correlation_id,
    p_causation_id,
    null,
    'observed',
    'internal',
    coalesce(p_payload, '{}'::jsonb),
    v_schema_id,
    array['e14.domain-events']::text[]
  );
end;
$$;

create or replace function app_private.e14_reject_published_row_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.status = 'published' then
    raise exception 'PUBLISHED_VERSION_IMMUTABLE' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function app_private.e14_reject_published_diagnostic_child()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_version_id uuid;
  v_status text;
begin
  if tg_table_name = 'dimensions' then
    v_version_id := coalesce(new.diagnostic_version_id, old.diagnostic_version_id);
  elsif tg_table_name = 'items' then
    v_version_id := coalesce(new.diagnostic_version_id, old.diagnostic_version_id);
  else
    select i.diagnostic_version_id into v_version_id
      from diagnostics.items i
     where i.id = coalesce(new.item_id, old.item_id);
  end if;

  select dv.status into v_status from diagnostics.diagnostic_versions dv where dv.id = v_version_id;
  if v_status = 'published' then
    raise exception 'PUBLISHED_DIAGNOSTIC_IMMUTABLE' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function app_private.e14_reject_published_assessment_child()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_activity_version_id uuid;
  v_status text;
begin
  if tg_table_name = 'assessment_specs' then
    v_activity_version_id := coalesce(new.activity_version_id, old.activity_version_id);
  elsif tg_table_name = 'questions' then
    v_activity_version_id := coalesce(new.activity_version_id, old.activity_version_id);
  else
    select q.activity_version_id into v_activity_version_id
      from assessment.questions q
     where q.id = coalesce(new.question_id, old.question_id);
  end if;

  select av.status into v_status from catalog.activity_versions av where av.id = v_activity_version_id;
  if v_status = 'published' then
    raise exception 'PUBLISHED_ASSESSMENT_IMMUTABLE' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function app_private.e14_reject_published_path_child()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_template_id uuid;
  v_status text;
begin
  if tg_table_name = 'path_templates' then
    if tg_op = 'INSERT' then
      select jv.status into v_status from catalog.journey_versions jv where jv.id = new.journey_version_id;
      if v_status = 'published' then
        raise exception 'PUBLISHED_JOURNEY_IMMUTABLE' using errcode = '55000';
      end if;
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_template_id := coalesce(new.path_template_id, old.path_template_id);
  select pt.status into v_status from orchestration.path_templates pt where pt.id = v_template_id;
  if v_status = 'published' then
    raise exception 'PUBLISHED_PATH_IMMUTABLE' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_e14_journey_version_immutable on catalog.journey_versions;
create trigger trg_e14_journey_version_immutable before update or delete on catalog.journey_versions for each row execute function app_private.e14_reject_published_row_mutation();
drop trigger if exists trg_e14_activity_version_immutable on catalog.activity_versions;
create trigger trg_e14_activity_version_immutable before update or delete on catalog.activity_versions for each row execute function app_private.e14_reject_published_row_mutation();
drop trigger if exists trg_e14_diagnostic_version_immutable on diagnostics.diagnostic_versions;
create trigger trg_e14_diagnostic_version_immutable before update or delete on diagnostics.diagnostic_versions for each row execute function app_private.e14_reject_published_row_mutation();
drop trigger if exists trg_e14_path_template_immutable on orchestration.path_templates;
create trigger trg_e14_path_template_immutable before update or delete on orchestration.path_templates for each row execute function app_private.e14_reject_published_row_mutation();
drop trigger if exists trg_e14_point_rule_version_immutable on engagement.point_rule_versions;
create trigger trg_e14_point_rule_version_immutable before update or delete on engagement.point_rule_versions for each row execute function app_private.e14_reject_published_row_mutation();
drop trigger if exists trg_e14_rule_version_immutable on orchestration.rule_versions;
create trigger trg_e14_rule_version_immutable before update or delete on orchestration.rule_versions for each row execute function app_private.e14_reject_published_row_mutation();
drop trigger if exists trg_e14_diagnostic_dimensions_immutable on diagnostics.dimensions;
create trigger trg_e14_diagnostic_dimensions_immutable before insert or update or delete on diagnostics.dimensions for each row execute function app_private.e14_reject_published_diagnostic_child();
drop trigger if exists trg_e14_diagnostic_items_immutable on diagnostics.items;
create trigger trg_e14_diagnostic_items_immutable before insert or update or delete on diagnostics.items for each row execute function app_private.e14_reject_published_diagnostic_child();
drop trigger if exists trg_e14_diagnostic_options_immutable on diagnostics.item_options;
create trigger trg_e14_diagnostic_options_immutable before insert or update or delete on diagnostics.item_options for each row execute function app_private.e14_reject_published_diagnostic_child();
drop trigger if exists trg_e14_assessment_specs_immutable on assessment.assessment_specs;
create trigger trg_e14_assessment_specs_immutable before insert or update or delete on assessment.assessment_specs for each row execute function app_private.e14_reject_published_assessment_child();
drop trigger if exists trg_e14_assessment_questions_immutable on assessment.questions;
create trigger trg_e14_assessment_questions_immutable before insert or update or delete on assessment.questions for each row execute function app_private.e14_reject_published_assessment_child();
drop trigger if exists trg_e14_assessment_options_immutable on assessment.answer_options;
create trigger trg_e14_assessment_options_immutable before insert or update or delete on assessment.answer_options for each row execute function app_private.e14_reject_published_assessment_child();
drop trigger if exists trg_e14_path_steps_immutable on orchestration.path_steps;
create trigger trg_e14_path_steps_immutable before insert or update or delete on orchestration.path_steps for each row execute function app_private.e14_reject_published_path_child();
drop trigger if exists trg_e14_path_templates_parent_immutable on orchestration.path_templates;
create trigger trg_e14_path_templates_parent_immutable before insert on orchestration.path_templates for each row execute function app_private.e14_reject_published_path_child();

create unique index if not exists uq_e14_enrollment_logical on orchestration.enrollments (entrepreneur_id, business_id, journey_version_id, cohort_id) nulls not distinct;
create unique index if not exists uq_e14_active_diagnostic_session on diagnostics.sessions (journey_instance_id) where status = 'in_progress';
create unique index if not exists uq_e14_active_path_assignment on orchestration.path_assignments (journey_instance_id) where status = 'active';
create unique index if not exists uq_e14_active_activity_session on orchestration.activity_sessions (step_instance_id) where ended_at is null;
create unique index if not exists uq_e14_active_assessment_attempt on assessment.attempts (step_instance_id) where status = 'in_progress';
create unique index if not exists uq_e14_point_balance_scope on engagement.point_balance_projections (entrepreneur_id, journey_instance_id) nulls not distinct;

do $$
declare
  v_event_name text;
  v_schema jsonb;
begin
  foreach v_event_name in array array[
    'catalog.journey_version.published','catalog.activity_version.published','catalog.diagnostic_version.published','catalog.assessment_version.published','journey.enrollment.created','journey.enrollment.activated','journey.instance.available','journey.instance.started','diagnostic.session.started','diagnostic.response.recorded','diagnostic.session.completed','diagnostic.result.generated','personalization.uncertainty.recorded','journey.path.assigned','journey.path.started','journey.step.available','learning.activity.started','learning.activity.progressed','assessment.attempt.started','assessment.answer.recorded','assessment.attempt.submitted','assessment.attempt.scored','assessment.attempt.passed','assessment.attempt.failed','assessment.feedback.available','learning.activity.completed','engagement.points.awarded','journey.path.completed','journey.instance.completed'
  ]::text[] loop
    v_schema := jsonb_build_object('$schema','https://json-schema.org/draft/2020-12/schema','title',v_event_name,'type','object','additionalProperties',true);
    insert into eventing.event_schemas(event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at)
    values(v_event_name,1,'urn:estimulo:event:' || v_event_name || ':1',v_schema,app_private.e14_request_hash(v_schema),'published',now())
    on conflict (event_name,event_version) do nothing;
  end loop;
end $$;
-- END 20260709051056_m13a_e14_command_foundation

-- BEGIN 20260709051242_m13b1_e14_fixture_identity
-- Remote SQL SHA-256: 2274454180105c13a579ab556e7cd71ad0c9a6df8f4de98aed6b0bf8d0cd9337
insert into iam.permission_definitions(id,code,resource_type,action,description)
values(app_private.e14_deterministic_uuid('e14:permission:journey.definition.publish'),'journey.definition.publish','journey_definition','publish','Publish an immutable journey version graph')
on conflict (code) do nothing;

insert into iam.organizations(id,organization_type,slug,legal_name,display_name,status,metadata)
values(app_private.e14_deterministic_uuid('e14:organization'),'internal_test','estimulo-e14-internal','Plataforma Estímulo — validação técnica interna','Estímulo E14 Interno','active','{"synthetic":true,"internal_test_only":true}'::jsonb)
on conflict (slug) do nothing;

insert into iam.user_accounts(id,email_normalized,status)
values
(app_private.e14_deterministic_uuid('e14:user:operator'),'e14.operator@invalid.example','active'),
(app_private.e14_deterministic_uuid('e14:user:participant'),'e14.participant@invalid.example','active')
on conflict (email_normalized) do nothing;

insert into core.entrepreneurs(id,user_account_id,preferred_name,email_normalized,status,profile_data)
values(app_private.e14_deterministic_uuid('e14:entrepreneur'),app_private.e14_deterministic_uuid('e14:user:participant'),'Participante sintético E14','e14.participant@invalid.example','active',jsonb_build_object('synthetic',true,'internal_test_only',true,'owner_organization_id',app_private.e14_deterministic_uuid('e14:organization')))
on conflict (user_account_id) do nothing;

insert into iam.organization_memberships(id,organization_id,user_account_id,status,valid_from)
values(app_private.e14_deterministic_uuid('e14:membership:operator'),app_private.e14_deterministic_uuid('e14:organization'),app_private.e14_deterministic_uuid('e14:user:operator'),'active','2026-07-09T00:00:00Z')
on conflict do nothing;

insert into iam.role_definitions(id,organization_id,code,name,description,status)
values(app_private.e14_deterministic_uuid('e14:role:operator'),app_private.e14_deterministic_uuid('e14:organization'),'e14_operator','E14 internal operator','Controls the synthetic E14 vertical only','active')
on conflict (organization_id,code) do nothing;

insert into iam.role_permissions(role_id,permission_id)
select app_private.e14_deterministic_uuid('e14:role:operator'),pd.id from iam.permission_definitions pd
where pd.code in ('journey.definition.publish','journey.execution.manage','journey.execution.read','participant.manage','participant.read')
on conflict do nothing;

insert into iam.membership_roles(membership_id,role_id,scope,valid_from)
values(app_private.e14_deterministic_uuid('e14:membership:operator'),app_private.e14_deterministic_uuid('e14:role:operator'),'{"all":true}'::jsonb,'2026-07-09T00:00:00Z')
on conflict do nothing;

insert into catalog.programs(id,owner_organization_id,code,name,description,status,valid_from)
values(app_private.e14_deterministic_uuid('e14:program'),app_private.e14_deterministic_uuid('e14:organization'),'e14_runtime_validation','Validação técnica E14','Programa sintético interno para prova do runtime','active','2026-07-09')
on conflict (owner_organization_id,code) do nothing;

insert into orchestration.rule_definitions(id,owner_organization_id,code,rule_type,name,status)
values(app_private.e14_deterministic_uuid('e14:rule-definition:always-eligible'),app_private.e14_deterministic_uuid('e14:organization'),'e14_always_eligible','eligibility','E14 always eligible','active')
on conflict (owner_organization_id,code) do nothing;

insert into orchestration.rule_versions(id,rule_definition_id,version_number,status,language,expression,input_schema,output_schema,published_at,content_hash)
values(app_private.e14_deterministic_uuid('e14:rule-version:always-eligible:v1'),app_private.e14_deterministic_uuid('e14:rule-definition:always-eligible'),1,'published','json-logic','{"==":[1,1]}'::jsonb,'{"type":"object"}'::jsonb,'{"type":"boolean"}'::jsonb,now(),app_private.e14_request_hash('{"code":"e14_always_eligible","version":1}'::jsonb))
on conflict (rule_definition_id,version_number) do nothing;
-- END 20260709051242_m13b1_e14_fixture_identity

-- BEGIN 20260709051310_m13b2a_e14_activity_definition
-- Remote SQL SHA-256: 08ad1b16b3498728dec646d628bfa9a6eb2e92aea5254f48f20831bc6a94fd83
insert into catalog.activity_definitions(id,owner_organization_id,code,activity_type,name,status)
values(app_private.e14_deterministic_uuid('e14:activity-definition'),app_private.e14_deterministic_uuid('e14:organization'),'inputs_rules_outputs','text_activity','Entradas regras saidas e validacao humana','active')
on conflict (owner_organization_id,code) do nothing;
-- END 20260709051310_m13b2a_e14_activity_definition

-- BEGIN 20260709051322_m13b2b_e14_activity_version
-- Remote SQL SHA-256: 395d8e8e04f65d7038292da7178c19c4edf295b2cb410ae73fbb427896012577
insert into catalog.activity_versions(id,activity_definition_id,version_number,status,title,description,activity_type,configuration,estimated_minutes,published_at,content_hash,created_by)
values(
 app_private.e14_deterministic_uuid('e14:activity-version:v1'),
 app_private.e14_deterministic_uuid('e14:activity-definition'),
 1,
 'draft',
 'Entradas regras saidas e validacao humana',
 'Distinguir entrada regra saida e validacao humana.',
 'text_activity',
 '{"visibility":"internal_test_only","language":"pt-BR","content_sections":[{"code":"input","heading":"Entrada","body":"Entrada e a informacao fornecida ao processo."},{"code":"rule","heading":"Regra","body":"Regra e a condicao aplicada a entrada."},{"code":"output","heading":"Saida","body":"Saida e o resultado produzido apos aplicar a regra."},{"code":"human_validation","heading":"Validacao humana","body":"A pessoa verifica entrada regra e saida antes de usar o resultado."}],"guided_context":{"estimated_minutes":2,"body":"No caminho guiado cada componente e destacado separadamente."},"accessibility":{"text_first":true,"requires_audio":false,"requires_video":false,"keyboard_only_supported":true,"screen_reader_labels_required":true,"color_not_sole_indicator":true},"real_participant_use_authorized":false}'::jsonb,
 6,
 null,
 app_private.e14_request_hash('{"visibility":"internal_test_only","language":"pt-BR","content_sections":[{"code":"input"},{"code":"rule"},{"code":"output"},{"code":"human_validation"}]}'::jsonb),
 app_private.e14_deterministic_uuid('e14:user:operator')
)
on conflict (activity_definition_id,version_number) do nothing;
-- END 20260709051322_m13b2b_e14_activity_version

-- BEGIN 20260709051333_m13b2c_e14_assessment_fixture
-- Remote SQL SHA-256: a101f749fecf891f0a9f03581035fa43b43757f900985a311ea055d806d53c17
insert into assessment.assessment_specs(activity_version_id,grading_mode,passing_score,max_attempts,time_limit_seconds,randomization_policy,feedback_policy)
values(app_private.e14_deterministic_uuid('e14:activity-version:v1'),'automatic',100,3,null,'{"shuffle_questions":false,"shuffle_options":false}'::jsonb,'{"mode":"immediate_per_option","show_correct_after":"final_failed_attempt"}'::jsonb)
on conflict (activity_version_id) do nothing;

insert into assessment.questions(id,activity_version_id,code,question_type,prompt,points,position,configuration)
values(app_private.e14_deterministic_uuid('e14:assessment-question'),app_private.e14_deterministic_uuid('e14:activity-version:v1'),'inputs_rules_outputs_check','single_choice','Qual elemento representa a regra do processo?',1,1,'{"required":true}'::jsonb)
on conflict (activity_version_id,code) do nothing;

insert into assessment.answer_options(id,question_id,code,label,value,is_correct,position) values
(app_private.e14_deterministic_uuid('e14:assessment-option:a'),app_private.e14_deterministic_uuid('e14:assessment-question'),'a','O valor do pedido','{"feedback":"O valor do pedido e a entrada."}'::jsonb,false,1),
(app_private.e14_deterministic_uuid('e14:assessment-option:b'),app_private.e14_deterministic_uuid('e14:assessment-question'),'b','A condicao valor do pedido maior ou igual a 100','{"feedback":"Correto. A condicao define o processamento."}'::jsonb,true,2),
(app_private.e14_deterministic_uuid('e14:assessment-option:c'),app_private.e14_deterministic_uuid('e14:assessment-question'),'c','O resultado frete gratis','{"feedback":"Frete gratis e a saida."}'::jsonb,false,3),
(app_private.e14_deterministic_uuid('e14:assessment-option:d'),app_private.e14_deterministic_uuid('e14:assessment-question'),'d','A conferencia final','{"feedback":"A conferencia e a validacao humana."}'::jsonb,false,4)
on conflict (question_id,code) do nothing;
-- END 20260709051333_m13b2c_e14_assessment_fixture

-- BEGIN 20260709051346_m13b3a_e14_diagnostic_structure
-- Remote SQL SHA-256: 888617f8245bf04a25f42f6efda231082a54eaf251c05a92f195107488ab8d54
insert into diagnostics.diagnostic_definitions(id,owner_organization_id,code,name,purpose,status)
values(app_private.e14_deterministic_uuid('e14:diagnostic-definition'),app_private.e14_deterministic_uuid('e14:organization'),'e14_runtime_readiness_diagnostic','Diagnostico tecnico E14','Selecionar caminho sintetico sem inferencia externa.','active')
on conflict (owner_organization_id,code) do nothing;

insert into diagnostics.diagnostic_versions(id,diagnostic_definition_id,version_number,status,configuration,published_at,content_hash)
values(
 app_private.e14_deterministic_uuid('e14:diagnostic-version:v1'),
 app_private.e14_deterministic_uuid('e14:diagnostic-definition'),
 1,
 'draft',
 '{"visibility":"internal_test_only","purpose":"Selecao de caminho tecnico sem validade psicometrica educacional ou de credito","assignment_rule":{"low_confidence_when":"uncertain_answer_count >= 2","guided_when":"low_confidence OR tool_familiarity <= 2 OR review_autonomy <= 2","standard_when":"NOT low_confidence AND tool_familiarity >= 3 AND review_autonomy >= 3","fallback_path":"guided"}}'::jsonb,
 now(),
 app_private.e14_request_hash('{"visibility":"internal_test_only","assignment_rule":{"fallback_path":"guided"}}'::jsonb)
)
on conflict (diagnostic_definition_id,version_number) do nothing;

insert into diagnostics.dimensions(id,diagnostic_version_id,code,name,description,minimum_answer_ratio,position) values
(app_private.e14_deterministic_uuid('e14:dimension:tool'),app_private.e14_deterministic_uuid('e14:diagnostic-version:v1'),'tool_familiarity','Familiaridade com ferramentas','Soma interna de duas respostas na faixa de zero a quatro.',1,1),
(app_private.e14_deterministic_uuid('e14:dimension:review'),app_private.e14_deterministic_uuid('e14:diagnostic-version:v1'),'review_autonomy','Autonomia de revisao','Soma interna de duas respostas na faixa de zero a quatro.',1,2)
on conflict (diagnostic_version_id,code) do nothing;
-- END 20260709051346_m13b3a_e14_diagnostic_structure

-- BEGIN 20260709051610_m13b4_e14_points_and_journey
-- Remote SQL SHA-256: 08c5a9502bd32bb63e64eae62f0d0054818fd8fa8cb9bd29d797a7205c8ffa9f
insert into engagement.point_rule_definitions(id,owner_organization_id,code,name,status) values
(app_private.e14_deterministic_uuid('e14:point-definition:activity'),app_private.e14_deterministic_uuid('e14:organization'),'e14_activity_complete_v1','E14 activity completion','active'),
(app_private.e14_deterministic_uuid('e14:point-definition:check'),app_private.e14_deterministic_uuid('e14:organization'),'e14_quick_check_pass_v1','E14 quick check pass','active')
on conflict (owner_organization_id,code) do nothing;

insert into engagement.point_rule_versions(id,point_rule_definition_id,version_number,status,amount,eligibility_rule_version_id,recurrence_policy,published_at) values
(app_private.e14_deterministic_uuid('e14:point-version:activity:v1'),app_private.e14_deterministic_uuid('e14:point-definition:activity'),1,'draft',5,app_private.e14_deterministic_uuid('e14:rule-version:always-eligible:v1'),'{"scope":"enrollment_activity","maximum":1,"transferable":false}'::jsonb,now()),
(app_private.e14_deterministic_uuid('e14:point-version:check:v1'),app_private.e14_deterministic_uuid('e14:point-definition:check'),1,'draft',2,app_private.e14_deterministic_uuid('e14:rule-version:always-eligible:v1'),'{"scope":"enrollment_assessment","maximum":1,"transferable":false}'::jsonb,now())
on conflict (point_rule_definition_id,version_number) do nothing;

insert into catalog.journey_definitions(id,program_id,owner_organization_id,code,slug,name,purpose,status)
values(app_private.e14_deterministic_uuid('e14:journey-definition'),app_private.e14_deterministic_uuid('e14:program'),app_private.e14_deterministic_uuid('e14:organization'),'e14_runtime_validation_journey','e14-runtime-validation','Validacao tecnica do fluxo de aprendizagem','Jornada sintetica interna para prova do runtime multi jornada.','active')
on conflict (owner_organization_id,code) do nothing;

insert into catalog.journey_versions(id,journey_definition_id,version_number,status,title,description,configuration,schema_version,published_at,retired_at,content_hash,created_by)
values(
 app_private.e14_deterministic_uuid('e14:journey-version:v1'),
 app_private.e14_deterministic_uuid('e14:journey-definition'),
 1,
 'draft',
 'Validacao tecnica do fluxo de aprendizagem',
 'Jornada sintetica interna usada exclusivamente para provar o runtime multi jornada.',
 jsonb_build_object(
   'visibility','internal_test_only',
   'language','pt-BR',
   'publishable_to_real_participants',false,
   'partner_attribution',null,
   'diagnostic_version_id',app_private.e14_deterministic_uuid('e14:diagnostic-version:v1'),
   'activity_version_id',app_private.e14_deterministic_uuid('e14:activity-version:v1'),
   'path_codes',jsonb_build_array('guided','standard'),
   'point_rule_version_ids',jsonb_build_array(app_private.e14_deterministic_uuid('e14:point-version:activity:v1'),app_private.e14_deterministic_uuid('e14:point-version:check:v1')),
   'maximum_internal_points',7
 ),
 'e14.1',
 null,
 null,
 'pending',
 app_private.e14_deterministic_uuid('e14:user:operator')
)
on conflict (journey_definition_id,version_number) do nothing;

update catalog.activity_versions set content_hash=app_private.e14_request_hash(configuration) where id=app_private.e14_deterministic_uuid('e14:activity-version:v1') and status='draft';
update diagnostics.diagnostic_versions set content_hash=app_private.e14_request_hash(configuration) where id=app_private.e14_deterministic_uuid('e14:diagnostic-version:v1') and status='draft';
update catalog.journey_versions set content_hash=app_private.e14_request_hash(configuration) where id=app_private.e14_deterministic_uuid('e14:journey-version:v1') and status='draft';
-- END 20260709051610_m13b4_e14_points_and_journey

-- BEGIN 20260709051855_m13c1_e14_publish_command
-- Remote SQL SHA-256: 5d7d6ee9ac5833b217fdf674968d74e61f248459897b933ea2ceaca0e8e1518a
create or replace function app_private.e14_validate_idempotency_key(p_key text)
returns text language plpgsql immutable security definer set search_path=pg_catalog as $$
begin
 if p_key is null or length(trim(p_key))<8 or length(trim(p_key))>128 then raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode='22023'; end if;
 return trim(p_key);
end;$$;

create or replace function public.e14_publish_vertical(p_actor_user_account_id uuid,p_organization_id uuid,p_journey_version_id uuid,p_expected_content_hash text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
 v_key text; v_request jsonb; v_request_hash text; v_event_id uuid; v_journey catalog.journey_versions%rowtype; v_owner uuid; v_activity_id uuid; v_diagnostic_id uuid; v_replayed boolean; v_path_count integer; v_step_count integer; v_question_count integer; v_point_count integer; v_child uuid;
begin
 v_key:=app_private.e14_validate_idempotency_key(p_idempotency_key);
 v_request:=jsonb_build_object('organization_id',p_organization_id,'journey_version_id',p_journey_version_id,'expected_content_hash',p_expected_content_hash);
 v_request_hash:=app_private.e14_request_hash(v_request);
 v_event_id:=app_private.e14_command_event_id('CMD01',p_actor_user_account_id,p_journey_version_id,v_key);
 perform pg_advisory_xact_lock(hashtextextended('CMD01|'||p_actor_user_account_id::text||'|'||p_journey_version_id::text||'|'||v_key,0));
 v_replayed:=app_private.e14_assert_idempotency(v_event_id,v_request_hash);
 if v_replayed then
  select * into v_journey from catalog.journey_versions where id=p_journey_version_id;
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',jsonb_build_object('journey_version_id',v_journey.id,'status',v_journey.status,'published_at',v_journey.published_at,'content_hash',v_journey.content_hash));
 end if;
 if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.publish') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select jv.* into v_journey from catalog.journey_versions jv where jv.id=p_journey_version_id for update;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002'; end if;
 select jd.owner_organization_id into v_owner from catalog.journey_definitions jd where jd.id=v_journey.journey_definition_id;
 if v_owner<>p_organization_id then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002'; end if;
 if v_journey.status='published' then raise exception 'INVALID_STATE_ALREADY_PUBLISHED' using errcode='P0001'; end if;
 if v_journey.status<>'draft' then raise exception 'INVALID_STATE_NOT_DRAFT' using errcode='P0001'; end if;
 if v_journey.content_hash is distinct from p_expected_content_hash then raise exception 'CONTENT_HASH_CONFLICT' using errcode='P0001'; end if;
 if v_journey.configuration->>'visibility'<>'internal_test_only' or coalesce((v_journey.configuration->>'publishable_to_real_participants')::boolean,true) or v_journey.configuration->'partner_attribution' is distinct from 'null'::jsonb then raise exception 'E14_INTERNAL_VISIBILITY_REQUIRED' using errcode='P0001'; end if;
 v_activity_id:=(v_journey.configuration->>'activity_version_id')::uuid;
 v_diagnostic_id:=(v_journey.configuration->>'diagnostic_version_id')::uuid;
 if not exists(select 1 from catalog.activity_versions av join catalog.activity_definitions ad on ad.id=av.activity_definition_id where av.id=v_activity_id and av.status='draft' and ad.owner_organization_id=p_organization_id and av.content_hash=app_private.e14_request_hash(av.configuration)) then raise exception 'ACTIVITY_GRAPH_INVALID' using errcode='P0001'; end if;
 if not exists(select 1 from diagnostics.diagnostic_versions dv join diagnostics.diagnostic_definitions dd on dd.id=dv.diagnostic_definition_id where dv.id=v_diagnostic_id and dv.status='draft' and dd.owner_organization_id=p_organization_id and dv.content_hash=app_private.e14_request_hash(dv.configuration)) then raise exception 'DIAGNOSTIC_GRAPH_INVALID' using errcode='P0001'; end if;
 select count(*) into v_path_count from orchestration.path_templates where journey_version_id=p_journey_version_id and status='draft' and code in('guided','standard');
 select count(*) into v_step_count from orchestration.path_steps ps join orchestration.path_templates pt on pt.id=ps.path_template_id where pt.journey_version_id=p_journey_version_id and ps.activity_version_id=v_activity_id;
 select count(*) into v_question_count from assessment.questions where activity_version_id=v_activity_id;
 select count(*) into v_point_count from engagement.point_rule_versions prv join engagement.point_rule_definitions prd on prd.id=prv.point_rule_definition_id where prv.id in(select (value#>>'{}')::uuid from jsonb_array_elements(v_journey.configuration->'point_rule_version_ids')) and prv.status='draft' and prd.owner_organization_id=p_organization_id;
 if v_path_count<>2 or v_step_count<>2 or v_question_count<1 or v_point_count<>2 then raise exception 'JOURNEY_GRAPH_INCOMPLETE' using errcode='P0001'; end if;
 update diagnostics.diagnostic_versions set status='published',published_at=now() where id=v_diagnostic_id;
 update catalog.activity_versions set status='published',published_at=now() where id=v_activity_id;
 update orchestration.path_templates set status='published' where journey_version_id=p_journey_version_id;
 update engagement.point_rule_versions set status='published',published_at=now() where id in(select (value#>>'{}')::uuid from jsonb_array_elements(v_journey.configuration->'point_rule_version_ids'));
 update catalog.journey_versions set status='published',published_at=now() where id=p_journey_version_id returning * into v_journey;
 perform app_private.e14_append_event(v_event_id,'catalog.journey_version.published','journey_version',p_journey_version_id,'user_account',p_actor_user_account_id,p_organization_id,null,'journey_version',p_journey_version_id,1,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'idempotency_key',v_key,'content_hash',v_journey.content_hash,'visibility','internal_test_only'));
 v_child:=app_private.e14_child_event_id(v_event_id,'catalog.activity_version.published',1); perform app_private.e14_append_event(v_child,'catalog.activity_version.published','activity_version',v_activity_id,'user_account',p_actor_user_account_id,p_organization_id,null,'activity_version',v_activity_id,1,v_event_id,v_event_id,jsonb_build_object('journey_version_id',p_journey_version_id));
 v_child:=app_private.e14_child_event_id(v_event_id,'catalog.diagnostic_version.published',2); perform app_private.e14_append_event(v_child,'catalog.diagnostic_version.published','diagnostic_version',v_diagnostic_id,'user_account',p_actor_user_account_id,p_organization_id,null,'diagnostic_version',v_diagnostic_id,1,v_event_id,v_event_id,jsonb_build_object('journey_version_id',p_journey_version_id));
 v_child:=app_private.e14_child_event_id(v_event_id,'catalog.assessment_version.published',3); perform app_private.e14_append_event(v_child,'catalog.assessment_version.published','activity_version',v_activity_id,'user_account',p_actor_user_account_id,p_organization_id,null,'assessment_spec',v_activity_id,1,v_event_id,v_event_id,jsonb_build_object('journey_version_id',p_journey_version_id,'question_count',v_question_count));
 return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',jsonb_build_object('journey_version_id',v_journey.id,'status',v_journey.status,'published_at',v_journey.published_at,'content_hash',v_journey.content_hash));
end;$$;
revoke all on function public.e14_publish_vertical(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.e14_publish_vertical(uuid,uuid,uuid,text,text) to service_role,app_worker;
-- END 20260709051855_m13c1_e14_publish_command

-- BEGIN 20260709051922_m13c2_e14_enrollment_command
-- Remote SQL SHA-256: 9d2c0701452160385a2f23e8e32385bdbd3baadff8d998217f3cbe459af6a499
create or replace function app_private.e14_cmd_enroll(p_actor uuid,p_org uuid,p_person uuid,p_journey uuid,p_source text,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;req jsonb;h text;ev uuid;ev2 uuid;enr uuid;inst uuid;owner_id uuid;jstatus text;replay boolean;profile jsonb;
begin
 k:=app_private.e14_validate_idempotency_key(p_key_input);
 req:=jsonb_build_object('organization_id',p_org,'entrepreneur_id',p_person,'journey_version_id',p_journey,'source',trim(coalesce(p_source,'internal_test')));
 h:=app_private.e14_request_hash(req);
 enr:=app_private.e14_deterministic_uuid('e14:enrollment|'||p_person::text||'|'||p_journey::text);
 inst:=app_private.e14_deterministic_uuid('e14:journey-instance|'||enr::text);
 ev:=app_private.e14_command_event_id('CMD02',p_actor,enr,k);
 ev2:=app_private.e14_child_event_id(ev,'journey.instance.available',1);
 perform pg_advisory_xact_lock(hashtextextended('CMD02|'||p_actor::text||'|'||enr::text||'|'||k,0));
 replay:=app_private.e14_assert_idempotency(ev,h);
 if replay then return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',true,'data',jsonb_build_object('enrollment_id',enr,'journey_instance_id',inst,'status',(select status from orchestration.journey_instances where id=inst))); end if;
 if not app_private.e14_actor_has_permission(p_actor,p_org,'journey.execution.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select jv.status,jd.owner_organization_id into jstatus,owner_id from catalog.journey_versions jv join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where jv.id=p_journey;
 if not found or owner_id<>p_org then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002'; end if;
 if jstatus<>'published' then raise exception 'JOURNEY_NOT_PUBLISHED' using errcode='P0001'; end if;
 select profile_data into profile from core.entrepreneurs where id=p_person and status='active';
 if not found or coalesce((profile->>'synthetic')::boolean,false)=false or (profile->>'owner_organization_id')::uuid<>p_org then raise exception 'INTERNAL_PARTICIPANT_REQUIRED' using errcode='P0001'; end if;
 insert into orchestration.enrollments(id,entrepreneur_id,business_id,journey_version_id,cohort_id,source,status,assigned_at,aggregate_version) values(enr,p_person,null,p_journey,null,trim(coalesce(p_source,'internal_test')),'assigned',now(),0) on conflict(id) do nothing;
 insert into orchestration.journey_instances(id,enrollment_id,status,aggregate_version) values(inst,enr,'available',0) on conflict(enrollment_id) do nothing;
 insert into orchestration.progress_projections(journey_instance_id,completed_required_steps,total_required_steps,completion_ratio,current_step_id,last_activity_at,projection_version) values(inst,0,1,0,null,null,0) on conflict(journey_instance_id) do nothing;
 perform app_private.e14_append_event(ev,'journey.enrollment.created','enrollment',enr,'user_account',p_actor,p_org,inst,'enrollment',enr,0,ev,null,jsonb_build_object('request_hash',h,'idempotency_key',k,'entrepreneur_id',p_person,'journey_version_id',p_journey));
 perform app_private.e14_append_event(ev2,'journey.instance.available','journey_instance',inst,'user_account',p_actor,p_org,inst,'journey_instance',inst,0,ev,ev,jsonb_build_object('enrollment_id',enr));
 return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',false,'data',jsonb_build_object('enrollment_id',enr,'journey_instance_id',inst,'enrollment_status','assigned','journey_status','available','progress',0));
end;$$;

create or replace function public.e14_create_enrollment(p_actor_user_account_id uuid,p_organization_id uuid,p_entrepreneur_id uuid,p_journey_version_id uuid,p_source text,p_idempotency_key text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_cmd_enroll($1,$2,$3,$4,$5,$6)$$;
revoke all on function app_private.e14_cmd_enroll(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.e14_create_enrollment(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.e14_create_enrollment(uuid,uuid,uuid,uuid,text,text) to service_role,app_worker;
-- END 20260709051922_m13c2_e14_enrollment_command

-- BEGIN 20260709052119_m13d1a_e14_start_command_shell
-- Remote SQL SHA-256: 4102b996815b6368715218327da55d9e2bb28a51c624eebd3d5e5abd6c14be93
create or replace function app_private.e14_cmd_start(p_actor uuid,p_instance uuid,p_expected bigint,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
begin
 return jsonb_build_object('status','not_configured');
end;$$;
revoke all on function app_private.e14_cmd_start(uuid,uuid,bigint,text) from public,anon,authenticated;
-- END 20260709052119_m13d1a_e14_start_command_shell

-- BEGIN 20260709052142_m13d1b_e14_start_context
-- Remote SQL SHA-256: 393d36dc33ebf437e6c1970be3ed38747a9960f983a9f92d519dfe6e56c91462
create or replace function app_private.e14_start_context(p_actor uuid,p_instance uuid,p_expected bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare ent uuid;enr uuid;org uuid;ver bigint;st text;
begin
 select e.entrepreneur_id,e.id,jd.owner_organization_id,ji.aggregate_version,ji.status into ent,enr,org,ver,st
 from orchestration.journey_instances ji join orchestration.enrollments e on e.id=ji.enrollment_id join catalog.journey_versions jv on jv.id=e.journey_version_id join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where ji.id=p_instance;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(p_actor) is distinct from ent then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if ver<>p_expected then raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode='P0001';end if;
 if st<>'available' then raise exception 'INVALID_STATE' using errcode='P0001';end if;
 return jsonb_build_object('entrepreneur_id',ent,'enrollment_id',enr,'organization_id',org,'aggregate_version',ver);
end;$$;
revoke all on function app_private.e14_start_context(uuid,uuid,bigint) from public,anon,authenticated;
-- END 20260709052142_m13d1b_e14_start_context

-- BEGIN 20260709052201_m13d1c_e14_instance_transition
-- Remote SQL SHA-256: d3bae690632fc017b01c95b02ab66fafdfde30fcbac6764d2283725c9a1df0ff
create or replace function app_private.e14_instance_transition(p_instance uuid)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare v bigint;
begin
 update orchestration.journey_instances set status='in_progress',started_at=coalesce(started_at,now()),aggregate_version=aggregate_version+1,updated_at=now() where id=p_instance returning aggregate_version into v;
 return v;
end;$$;
revoke all on function app_private.e14_instance_transition(uuid) from public,anon,authenticated;
-- END 20260709052201_m13d1c_e14_instance_transition

-- BEGIN 20260709052211_m13d1d_e14_enrollment_transition
-- Remote SQL SHA-256: 474e3f65d7bece3d8a2e76856f17ec8a0c868d9e3f2d36464f2538a8b214ec16
create or replace function app_private.e14_enrollment_transition(p_enrollment uuid)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare v bigint;
begin
 update orchestration.enrollments set status='active',accepted_at=coalesce(accepted_at,now()),aggregate_version=aggregate_version+1 where id=p_enrollment returning aggregate_version into v;
 return v;
end;$$;
revoke all on function app_private.e14_enrollment_transition(uuid) from public,anon,authenticated;
-- END 20260709052211_m13d1d_e14_enrollment_transition

-- BEGIN 20260709052219_m13d1e_e14_progress_touch
-- Remote SQL SHA-256: 75e271aabc32cc4fc02bf70c23444208b82395487b30b580a7998a1815e26bb5
create or replace function app_private.e14_progress_touch(p_instance uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 update orchestration.progress_projections set last_activity_at=now(),projection_version=projection_version+1,updated_at=now() where journey_instance_id=p_instance
$$;
revoke all on function app_private.e14_progress_touch(uuid) from public,anon,authenticated;
-- END 20260709052219_m13d1e_e14_progress_touch

-- BEGIN 20260709052230_m13d1f_e14_start_command_final
-- Remote SQL SHA-256: ce7bf992de554761470f5c1a1c1b3c4983b193eef1dd81cd0b872b133f17c63a
create or replace function app_private.e14_cmd_start(p_actor uuid,p_instance uuid,p_expected bigint,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;req jsonb;h text;ev uuid;ev2 uuid;ctx jsonb;ver bigint;replay boolean;enr uuid;org uuid;
begin
 k:=app_private.e14_validate_idempotency_key(p_key_input);req:=jsonb_build_object('instance_id',p_instance,'expected_version',p_expected);h:=app_private.e14_request_hash(req);ev:=app_private.e14_command_event_id('CMD03',p_actor,p_instance,k);ev2:=app_private.e14_child_event_id(ev,'journey.instance.started',1);
 perform pg_advisory_xact_lock(hashtextextended('CMD03|'||p_actor::text||'|'||p_instance::text||'|'||k,0));replay:=app_private.e14_assert_idempotency(ev,h);
 if replay then return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',true,'data',jsonb_build_object('journey_instance_id',p_instance,'status',(select status from orchestration.journey_instances where id=p_instance),'aggregate_version',(select aggregate_version from orchestration.journey_instances where id=p_instance)));end if;
 ctx:=app_private.e14_start_context(p_actor,p_instance,p_expected);enr:=(ctx->>'enrollment_id')::uuid;org:=(ctx->>'organization_id')::uuid;
 perform app_private.e14_enrollment_transition(enr);ver:=app_private.e14_instance_transition(p_instance);perform app_private.e14_progress_touch(p_instance);
 perform app_private.e14_append_event(ev,'journey.enrollment.activated','enrollment',enr,'user_account',p_actor,org,p_instance,'enrollment',enr,1,ev,null,jsonb_build_object('request_hash',h,'idempotency_key',k));
 perform app_private.e14_append_event(ev2,'journey.instance.started','journey_instance',p_instance,'user_account',p_actor,org,p_instance,'journey_instance',p_instance,ver,ev,ev,jsonb_build_object('enrollment_id',enr));
 return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',false,'data',jsonb_build_object('journey_instance_id',p_instance,'status','in_progress','aggregate_version',ver));
end;$$;
create or replace function public.e14_start_journey(p_actor_user_account_id uuid,p_journey_instance_id uuid,p_expected_aggregate_version bigint,p_idempotency_key text) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_cmd_start($1,$2,$3,$4)$$;
revoke all on function app_private.e14_cmd_start(uuid,uuid,bigint,text) from public,anon,authenticated;revoke all on function public.e14_start_journey(uuid,uuid,bigint,text) from public,anon,authenticated;grant execute on function public.e14_start_journey(uuid,uuid,bigint,text) to service_role,app_worker;
-- END 20260709052230_m13d1f_e14_start_command_final

-- BEGIN 20260709052248_m13d2a_e14_diagnostic_context
-- Remote SQL SHA-256: 3d1037a7c3dda6f94464840b66963e154a72c2da58860cec55d663dbcaa1643f
create or replace function app_private.e14_diagnostic_context(p_actor uuid,p_instance uuid,p_diag uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare ent uuid;org uuid;expected_diag uuid;st text;
begin
 select e.entrepreneur_id,jd.owner_organization_id,(jv.configuration->>'diagnostic_version_id')::uuid,ji.status into ent,org,expected_diag,st
 from orchestration.journey_instances ji join orchestration.enrollments e on e.id=ji.enrollment_id join catalog.journey_versions jv on jv.id=e.journey_version_id join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where ji.id=p_instance;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(p_actor) is distinct from ent then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if st<>'in_progress' or expected_diag<>p_diag or not exists(select 1 from diagnostics.diagnostic_versions where id=p_diag and status='published') then raise exception 'DIAGNOSTIC_NOT_AVAILABLE' using errcode='P0001';end if;
 return jsonb_build_object('entrepreneur_id',ent,'organization_id',org);
end;$$;
revoke all on function app_private.e14_diagnostic_context(uuid,uuid,uuid) from public,anon,authenticated;
-- END 20260709052248_m13d2a_e14_diagnostic_context

-- BEGIN 20260709052258_m13d2b_e14_diagnostic_session_insert
-- Remote SQL SHA-256: bd43ed0d8c40290e81f170f929824c7e23f745f6417136f4fb16bfea73cdea0c
create or replace function app_private.e14_insert_diagnostic_session(p_session uuid,p_diag uuid,p_person uuid,p_instance uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 insert into diagnostics.sessions(id,diagnostic_version_id,entrepreneur_id,business_id,journey_instance_id,status,started_at,aggregate_version)
 values(p_session,p_diag,p_person,null,p_instance,'in_progress',now(),0)
 on conflict(id) do nothing
$$;
revoke all on function app_private.e14_insert_diagnostic_session(uuid,uuid,uuid,uuid) from public,anon,authenticated;
-- END 20260709052258_m13d2b_e14_diagnostic_session_insert

-- BEGIN 20260709052405_m13d2c_e14_event_name_lookup
-- Remote SQL SHA-256: 0a3cd6d8dcd369ead4700cf251aa18cd191279e223dec1d5bc593f3fd5d4163d
create or replace function app_private.e14_event_name(p_schema_id uuid)
returns text language sql stable security definer set search_path=pg_catalog as $$
 select event_name from eventing.event_schemas where id=p_schema_id and status='published'
$$;
-- END 20260709052405_m13d2c_e14_event_name_lookup

-- BEGIN 20260709052428_m13d2d_e14_emit_a
-- Remote SQL SHA-256: 2113eb6d5c193891b574cbf7e078646c04ba533180fa0171f3c723902198ac95
create or replace function app_private.e14_emit_a(a uuid,b uuid,c uuid,d uuid,e uuid,f uuid,g text,h text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_append_event(a,app_private.e14_event_name('5b3dbd7f-718e-4081-990e-37d96fa638de'),'session',e,'user_account',b,c,d,'session',e,0,a,null,jsonb_build_object('request_hash',g,'idempotency_key',h,'version_id',f))
$$;
-- END 20260709052428_m13d2d_e14_emit_a

-- BEGIN 20260709052439_m13d2e_e14_start_diagnostic_shell
-- Remote SQL SHA-256: 58aa2ef12e2d162294f364883a80ed1c25ff430996c77fb907dcfbc1bd769d14
create or replace function app_private.e14_cmd_start_diagnostic(p_actor uuid,p_instance uuid,p_diag uuid,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$begin return '{}'::jsonb;end;$$;
-- END 20260709052439_m13d2e_e14_start_diagnostic_shell

-- BEGIN 20260709052458_m13d2f_e14_snapshot_a
-- Remote SQL SHA-256: 6ea9aefcbcfcc03ac46a4ab3497ac5cedc8736f9cfd7e650c71204308dd21845
create or replace function app_private.e14_snapshot_a(p_session uuid,p_diag uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('session_id',p_session,'status',s.status,'aggregate_version',s.aggregate_version,'item_count',(select count(*) from diagnostics.items where diagnostic_version_id=p_diag)) from diagnostics.sessions s where s.id=p_session
$$;
-- END 20260709052458_m13d2f_e14_snapshot_a

-- BEGIN 20260709052519_m13d2g_e14_generic_aliases
-- Remote SQL SHA-256: 8331041b5c357f345fb41e69c5c9f0fd63dd0ad19852b3d16b19ad21e2f3a294
create or replace function app_private.e14_context_a(a uuid,b uuid,c uuid) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_diagnostic_context(a,b,c)$$;
create or replace function app_private.e14_insert_a(a uuid,b uuid,c uuid,d uuid) returns void language sql security definer set search_path=pg_catalog as $$select app_private.e14_insert_diagnostic_session(a,b,c,d)$$;
-- END 20260709052519_m13d2g_e14_generic_aliases

-- BEGIN 20260709052545_m13d2h_e14_prepare_a
-- Remote SQL SHA-256: 7de980c9168d1930af5460159b58627e48b66610cd1b41a8bc9d35c95577b005
create or replace function app_private.e14_prepare_a(a uuid,b uuid,c uuid,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;sid uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(d);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c));
 sid:=app_private.e14_deterministic_uuid(b::text||c::text);
 ev:=app_private.e14_command_event_id('C4',a,sid,k);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'s',sid,'r',rp);
end;$$;
-- END 20260709052545_m13d2h_e14_prepare_a

-- BEGIN 20260709052555_m13d2i_e14_apply_a
-- Remote SQL SHA-256: ae3eb0962e57e42f71b2ac3a331b9075e07a35f4c1b53a9b6796f4e654f5091c
create or replace function app_private.e14_apply_a(a uuid,b uuid,c uuid,d uuid,e uuid,f text,g text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;
begin
 x:=app_private.e14_context_a(a,b,c);
 perform app_private.e14_insert_a(d,c,(x->>'entrepreneur_id')::uuid,b);
 perform app_private.e14_emit_a(e,a,(x->>'organization_id')::uuid,b,d,c,f,g);
 return app_private.e14_snapshot_a(d,c);
end;$$;
-- END 20260709052555_m13d2i_e14_apply_a

-- BEGIN 20260709052603_m13d2j_e14_lock_scope
-- Remote SQL SHA-256: 911a28341b10c8dd80f500449be9e57e1442d14910116d2591d77ab727811306
create or replace function app_private.e14_lock_scope(p_scope text)
returns void language sql volatile security definer set search_path=pg_catalog as $$select pg_advisory_xact_lock(hashtextextended(p_scope,0))$$;
-- END 20260709052603_m13d2j_e14_lock_scope

-- BEGIN 20260709052612_m13d2k_e14_prepare_a_locked
-- Remote SQL SHA-256: 01490e33c504d7d65a4f4ebb089517a3eafcb9d96057ba5c05750ef5c23eb765
create or replace function app_private.e14_prepare_a(a uuid,b uuid,c uuid,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;sid uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(d);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c));
 sid:=app_private.e14_deterministic_uuid(b::text||c::text);
 ev:=app_private.e14_command_event_id('C4',a,sid,k);
 perform app_private.e14_lock_scope('C4|'||a::text||'|'||sid::text||'|'||k);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'s',sid,'r',rp);
end;$$;
-- END 20260709052612_m13d2k_e14_prepare_a_locked

-- BEGIN 20260709052620_m13d2l_e14_start_diagnostic_rpc
-- Remote SQL SHA-256: 7aa0207154e0af99ee17791e5993e5e02a87df19318e0d9ea0570d4f7673263f
create or replace function app_private.e14_cmd_start_diagnostic(p_actor uuid,p_instance uuid,p_diag uuid,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare p jsonb;data jsonb;
begin
 p:=app_private.e14_prepare_a(p_actor,p_instance,p_diag,p_key_input);
 if (p->>'r')::boolean then data:=app_private.e14_snapshot_a((p->>'s')::uuid,p_diag); else data:=app_private.e14_apply_a(p_actor,p_instance,p_diag,(p->>'s')::uuid,(p->>'e')::uuid,p->>'h',p->>'k'); end if;
 return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',(p->>'r')::boolean,'data',data);
end;$$;
create or replace function public.e14_start_diagnostic(p_actor_user_account_id uuid,p_journey_instance_id uuid,p_diagnostic_version_id uuid,p_idempotency_key text) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_cmd_start_diagnostic($1,$2,$3,$4)$$;
revoke all on function app_private.e14_cmd_start_diagnostic(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.e14_start_diagnostic(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.e14_start_diagnostic(uuid,uuid,uuid,text) to service_role,app_worker;
-- END 20260709052620_m13d2l_e14_start_diagnostic_rpc

-- BEGIN 20260709052634_m13d3a_e14_response_context
-- Remote SQL SHA-256: 720762c9678940c777690f0ea5e6375ea0a3f51a0a2f6c5ec6a4d106c8f77a8b
create or replace function app_private.e14_context_b(a uuid,b uuid,c uuid,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare ent uuid;org uuid;inst uuid;ver_id uuid;st text;opt uuid;val jsonb;latest integer;prev uuid;
begin
 select s.entrepreneur_id,s.journey_instance_id,s.diagnostic_version_id,s.status,jd.owner_organization_id into ent,inst,ver_id,st,org
 from diagnostics.sessions s join orchestration.journey_instances ji on ji.id=s.journey_instance_id join orchestration.enrollments en on en.id=ji.enrollment_id join catalog.journey_versions jv on jv.id=en.journey_version_id join catalog.journey_definitions jd on jd.id=jv.journey_definition_id where s.id=b for update of s;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from ent then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if st<>'in_progress' then raise exception 'SESSION_NOT_IN_PROGRESS' using errcode='P0001';end if;
 select io.id,io.value into opt,val from diagnostics.item_options io join diagnostics.items i on i.id=io.item_id where io.item_id=c and io.code=d and i.diagnostic_version_id=ver_id;
 if not found then raise exception 'INVALID_OPTION' using errcode='22023';end if;
 select coalesce(max(revision),0),(array_agg(id order by revision desc))[1] into latest,prev from diagnostics.responses where session_id=b and item_id=c;
 return jsonb_build_object('entrepreneur_id',ent,'organization_id',org,'instance_id',inst,'option_id',opt,'option_value',val,'latest_revision',latest,'previous_id',prev);
end;$$;
-- END 20260709052634_m13d3a_e14_response_context

-- BEGIN 20260709052647_m13d3b_e14_emit_b
-- Remote SQL SHA-256: a705dbcfaa7998ef36ff68e4d08a6da87e3d7c9bb8250643c52af613dbc58db1
create or replace function app_private.e14_emit_b(a uuid,b uuid,c uuid,d uuid,e uuid,f uuid,g integer,h text,i text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_append_event(a,app_private.e14_event_name('5107a3f3-36a8-43db-9ff0-628e92372c70'),'response',e,'user_account',b,c,d,'session',f,g,a,null,jsonb_build_object('request_hash',h,'idempotency_key',i))
$$;
-- END 20260709052647_m13d3b_e14_emit_b

-- BEGIN 20260709052659_m13d3c_e14_prepare_b
-- Remote SQL SHA-256: c3784b2b4ab75ed322c8fa2a9e2a97a24e49001e5804933a9d7399949c17c730
create or replace function app_private.e14_prepare_b(a uuid,b uuid,c uuid,d text,e integer,f integer,g text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;rid uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(g);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c,'d',d,'e',e,'f',f));
 rid:=app_private.e14_deterministic_uuid(b::text||c::text||e::text);
 ev:=app_private.e14_command_event_id('C5',a,rid,k);
 perform app_private.e14_lock_scope('C5|'||a::text||'|'||b::text||'|'||c::text);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'r',rid,'p',rp);
end;$$;
-- END 20260709052659_m13d3c_e14_prepare_b

-- BEGIN 20260709052716_m13d3d_e14_apply_b
-- Remote SQL SHA-256: 267f27c4bac816f3403666d9c1aea71cc7e8a72db3505ef1543e0e00fdee3e49
create or replace function app_private.e14_apply_b(a uuid,b uuid,c uuid,d text,e integer,f integer,g uuid,h uuid,i text,j text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;newver bigint;val jsonb;
begin
 x:=app_private.e14_context_b(a,b,c,d);
 if e<>(x->>'latest_revision')::integer+1 then raise exception 'INVALID_RESPONSE_REVISION' using errcode='P0001';end if;
 val:=jsonb_build_object('option_id',(x->>'option_id')::uuid,'option_code',d,'score',((x->'option_value')->>'score')::integer,'uncertain',coalesce(((x->'option_value')->>'uncertain')::boolean,false));
 perform app_private.e14_emit_b(h,a,(x->>'organization_id')::uuid,(x->>'instance_id')::uuid,g,b,e,i,j);
 insert into diagnostics.responses(id,session_id,item_id,revision,response_value,response_time_ms,recorded_at,supersedes_response_id,source_event_id) values(g,b,c,e,val,f,now(),nullif(x->>'previous_id','')::uuid,h);
 update diagnostics.sessions set aggregate_version=aggregate_version+1 where id=b returning aggregate_version into newver;
 return jsonb_build_object('response_id',g,'revision',e,'response_value',val,'session_aggregate_version',newver);
end;$$;
-- END 20260709052716_m13d3d_e14_apply_b

-- BEGIN 20260709052726_m13d3e_e14_snapshot_b
-- Remote SQL SHA-256: 54e94ed2339de25af82f383e9b015d74cce87c3ef0a473c85cbd0cc571c6b01a
create or replace function app_private.e14_snapshot_b(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('response_id',r.id,'revision',r.revision,'response_value',r.response_value,'session_aggregate_version',s.aggregate_version) from diagnostics.responses r join diagnostics.sessions s on s.id=r.session_id where r.source_event_id=a
$$;
-- END 20260709052726_m13d3e_e14_snapshot_b

-- BEGIN 20260709052755_m13d3f_e14_exec_b_shell
-- Remote SQL SHA-256: 9ddc7aa6198ee688e32b69738d4b8fbf5e144a76c748b6c846a47d5ea76c0a9f
create or replace function app_private.e14_exec_b(a uuid,b uuid,c uuid,d text,e integer,f integer,g text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare p jsonb;
begin
 p:=app_private.e14_prepare_b(a,b,c,d,e,f,g);
 return p;
end;$$;
-- END 20260709052755_m13d3f_e14_exec_b_shell

-- BEGIN 20260709052811_m13d3g_e14_exec_b_final
-- Remote SQL SHA-256: 4e8f091eb3b3257f5062ab04495a0176342b48abe3278bec415a05a74bb82222
create or replace function app_private.e14_exec_b(a uuid,b uuid,c uuid,d text,e integer,f integer,g text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with p as (select app_private.e14_prepare_b(a,b,c,d,e,f,g) x)
 select jsonb_build_object('request_id',(x->>'e')::uuid,'idempotency_key',x->>'k','replayed',(x->>'p')::boolean,'data',case when (x->>'p')::boolean then app_private.e14_snapshot_b((x->>'e')::uuid) else app_private.e14_apply_b(a,b,c,d,e,f,(x->>'r')::uuid,(x->>'e')::uuid,x->>'h',x->>'k') end) from p
$$;
-- END 20260709052811_m13d3g_e14_exec_b_final

-- BEGIN 20260709052825_m13d3h_e14_record_response_shell
-- Remote SQL SHA-256: 2dbe7e0b33f5626d9046c31308dfafd1ba03101ca20d5c268431f63c4c988c52
create or replace function public.e14_record_diagnostic_response(p_actor_user_account_id uuid,p_session_id uuid,p_item_id uuid,p_option_code text,p_revision integer,p_response_time_ms integer,p_idempotency_key text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select '{}'::jsonb$$;
-- END 20260709052825_m13d3h_e14_record_response_shell

-- BEGIN 20260709052833_m13d3i_e14_record_response_final
-- Remote SQL SHA-256: 6d437a3e8bd12e11c61563492146fa05c14e36271d5ea42c7169eb3e79a160f8
create or replace function public.e14_record_diagnostic_response(p_actor_user_account_id uuid,p_session_id uuid,p_item_id uuid,p_option_code text,p_revision integer,p_response_time_ms integer,p_idempotency_key text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_b($1,$2,$3,$4,$5,$6,$7)$$;
-- END 20260709052833_m13d3i_e14_record_response_final

-- BEGIN 20260709052849_m13d3j_e14_record_response_revoke
-- Remote SQL SHA-256: ea2aff5f2094ea95451e5bc65bbc5ebbfc6f2c6bb9724ecabb0163ed650e3edd
revoke all on function public.e14_record_diagnostic_response(uuid,uuid,uuid,text,integer,integer,text) from public;
-- END 20260709052849_m13d3j_e14_record_response_revoke

-- BEGIN 20260709052857_m13d3k_e14_record_response_access
-- Remote SQL SHA-256: 48460cd141e9afde0287ddf054332cdccde13b7dc15cdfec6b122960e04d782b
revoke all on function public.e14_record_diagnostic_response(uuid,uuid,uuid,text,integer,integer,text) from anon;
revoke all on function public.e14_record_diagnostic_response(uuid,uuid,uuid,text,integer,integer,text) from authenticated;
grant execute on function public.e14_record_diagnostic_response(uuid,uuid,uuid,text,integer,integer,text) to service_role;
grant execute on function public.e14_record_diagnostic_response(uuid,uuid,uuid,text,integer,integer,text) to app_worker;
-- END 20260709052857_m13d3k_e14_record_response_access

-- BEGIN 20260709053005_m13d3l_e14_session_version
-- Remote SQL SHA-256: 19f1a883339a8b3318f1ced5da1486aea7628d1f9f6a1003b09f7c722b2ca4b7
create or replace function app_private.e14_session_version(a uuid)
returns bigint language sql stable security definer set search_path=pg_catalog as $$select aggregate_version from diagnostics.sessions where id=a$$;
-- END 20260709053005_m13d3l_e14_session_version

-- BEGIN 20260709053022_m13d3m_e14_emit_b_version_fix
-- Remote SQL SHA-256: 6ff0ca6c3f263f1ab2ecc4b6a90be9fc77e111988d354ce7f74d226c7b1ff459
create or replace function app_private.e14_emit_b(a uuid,b uuid,c uuid,d uuid,e uuid,f uuid,g integer,h text,i text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_append_event(a,app_private.e14_event_name('5107a3f3-36a8-43db-9ff0-628e92372c70'),'response',e,'user_account',b,c,d,'session',f,app_private.e14_session_version(f)+1,a,null,jsonb_build_object('request_hash',h,'idempotency_key',i))
$$;
-- END 20260709053022_m13d3m_e14_emit_b_version_fix

-- BEGIN 20260709053059_m13e1_e14_generic_event_emitter
-- Remote SQL SHA-256: b2e008c5d26a698cf76cf3da28272a58afa500a530461a69e1ff3f763ad82d4d
create or replace function app_private.e14_emit_g(a uuid,b uuid,c uuid,d uuid,e uuid,f text,g uuid,h text,i uuid,j bigint,k uuid,l uuid,m jsonb)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_append_event(b,app_private.e14_event_name(a),f,g,'user_account',c,d,e,h,i,j,k,l,m)
$$;
-- END 20260709053059_m13e1_e14_generic_event_emitter

-- BEGIN 20260709053109_m13e2_e14_complete_context
-- Remote SQL SHA-256: 6cc2be5e6b528815a35423e4877807e6c4c5e46ee10171c177d8fd9d6e1a26b4
create or replace function app_private.e14_context_c(a uuid,b uuid,c bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare ent uuid;inst uuid;dv uuid;st text;ver bigint;org uuid;jv uuid;
begin
 select s.entrepreneur_id,s.journey_instance_id,s.diagnostic_version_id,s.status,s.aggregate_version,jd.owner_organization_id,en.journey_version_id into ent,inst,dv,st,ver,org,jv
 from diagnostics.sessions s join orchestration.journey_instances ji on ji.id=s.journey_instance_id join orchestration.enrollments en on en.id=ji.enrollment_id join catalog.journey_versions j on j.id=en.journey_version_id join catalog.journey_definitions jd on jd.id=j.journey_definition_id where s.id=b for update of s;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from ent then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if st<>'in_progress' then raise exception 'SESSION_NOT_IN_PROGRESS' using errcode='P0001';end if;
 if ver<>c then raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode='P0001';end if;
 return jsonb_build_object('entrepreneur_id',ent,'instance_id',inst,'version_id',dv,'organization_id',org,'journey_version_id',jv,'aggregate_version',ver);
end;$$;
-- END 20260709053109_m13e2_e14_complete_context

-- BEGIN 20260709053127_m13e3_e14_scores_c
-- Remote SQL SHA-256: bb4a477268bb1a6ccab1294a3fa1094f8b652fe76f3fc54ef94bb10959eeb74d
create or replace function app_private.e14_scores_c(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 with l as (select distinct on (r.item_id) r.item_id,r.response_value from diagnostics.responses r where r.session_id=a order by r.item_id,r.revision desc),
 s as (select d.position p,sum((l.response_value->>'score')::integer) v from l join diagnostics.items i on i.id=l.item_id join diagnostics.dimensions d on d.id=i.dimension_id group by d.position)
 select jsonb_build_object('n',(select count(*) from l),'u',(select count(*) from l where coalesce((response_value->>'uncertain')::boolean,false)),'x',coalesce((select v from s where p=1),0),'y',coalesce((select v from s where p=2),0))
$$;
-- END 20260709053127_m13e3_e14_scores_c

-- BEGIN 20260709053141_m13e4_e14_path_c
-- Remote SQL SHA-256: c2221d373f761e31a511a5da4a20f5b4b99cb466319b67a7fddccc54479ce47c
create or replace function app_private.e14_path_c(a uuid,b jsonb)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('p',pt.code,'t',pt.id,'s',ps.id,'v',ps.activity_version_id,'l',((b->>'u')::integer>=2))
 from orchestration.path_templates pt join orchestration.path_steps ps on ps.path_template_id=pt.id
 where pt.journey_version_id=a and pt.status='published' and pt.code=case when (b->>'u')::integer<2 and (b->>'x')::integer>=3 and (b->>'y')::integer>=3 then 'standard' else 'guided' end
 order by ps.position_hint limit 1
$$;
-- END 20260709053141_m13e4_e14_path_c

-- BEGIN 20260709053211_m13e5a_e14_complete_session
-- Remote SQL SHA-256: d8545db1ee069060c9cfd4f2b18fee1cf1db6616b8bf4e26f86d2b0faea02a34
create or replace function app_private.e14_complete_session(a uuid)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare v bigint;
begin
 update diagnostics.sessions set status='completed',completed_at=now(),aggregate_version=aggregate_version+1 where id=a returning aggregate_version into v;
 return v;
end;$$;
-- END 20260709053211_m13e5a_e14_complete_session

-- BEGIN 20260709053227_m13e5b_e14_write_c1
-- Remote SQL SHA-256: 4194b8679cd183a535696d02b1b7310dcc8e5637fad714577713c68f15e34802
create or replace function app_private.e14_write_c1(a uuid,b jsonb,c jsonb,d uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare r uuid;
begin
 r:=app_private.e14_deterministic_uuid(a::text||'r');
 insert into diagnostics.results(id,session_id,calculation_version,status,operational_readiness,data_quality,recommended_start,calculated_at,source_event_high_watermark)
 values(r,a,'v1','completed',jsonb_build_object('x',c->>'x','y',c->>'y'),jsonb_build_object('n',c->>'n','u',c->>'u'),jsonb_build_object('p',b->>'p'),now(),d)
 on conflict(session_id,calculation_version) do nothing;
 return r;
end;$$;
-- END 20260709053227_m13e5b_e14_write_c1

-- BEGIN 20260709053243_m13e5c_e14_write_dimension
-- Remote SQL SHA-256: 9dd93574a6679a53d77703319b28998f8316cc6bb4f6babd543b1629393f18e8
create or replace function app_private.e14_write_dimension(a uuid,b uuid,c integer,d numeric)
returns void language sql security definer set search_path=pg_catalog as $$
 insert into diagnostics.dimension_results(result_id,dimension_id,score,answered_ratio,evidence_status,details)
 select a,x.id,d,1,'observed','{"raw_range":"0..4"}'::jsonb from diagnostics.dimensions x where x.diagnostic_version_id=b and x.position=c
 on conflict(result_id,dimension_id) do nothing
$$;
-- END 20260709053243_m13e5c_e14_write_dimension

-- BEGIN 20260709053252_m13e5d_e14_write_c3
-- Remote SQL SHA-256: 357137c4f39cb0df9217cb3394b9d2b18d57830a6ae5209f1dd897493d6b66ea
create or replace function app_private.e14_write_c3(a jsonb,b jsonb,c jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare r uuid;q numeric;
begin
 r:=app_private.e14_deterministic_uuid((a->>'instance_id')||'d');q:=case when (c->>'l')::boolean then 0.5 else 1.0 end;
 insert into orchestration.personalization_decisions(id,entrepreneur_id,journey_instance_id,decision_type,rule_version_id,input_snapshot,output,confidence,status,decided_at)
 values(r,(a->>'entrepreneur_id')::uuid,(a->>'instance_id')::uuid,'path_selection',app_private.e14_deterministic_uuid('e14:rule-version:always-eligible:v1'),b,jsonb_build_object('p',c->>'p','l',(c->>'l')::boolean),q,'applied',now())
 on conflict(id) do nothing;
 return r;
end;$$;
-- END 20260709053252_m13e5d_e14_write_c3

-- BEGIN 20260709053301_m13e5e_e14_write_c4
-- Remote SQL SHA-256: dd13cfd6dafe9da34634cb108840612cd9e2801b8f60694b8bf60ee6d2759fe1
create or replace function app_private.e14_write_c4(a jsonb,b jsonb,c uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare r uuid;q numeric;
begin
 r:=app_private.e14_deterministic_uuid((a->>'instance_id')||'a');q:=case when (b->>'l')::boolean then 0.5 else 1.0 end;
 insert into orchestration.path_assignments(id,journey_instance_id,path_template_id,assignment_policy_id,status,reason,confidence,valid_from)
 values(r,(a->>'instance_id')::uuid,(b->>'t')::uuid,null,'active',jsonb_build_object('result_id',c,'technical_only',true),q,now())
 on conflict(id) do nothing;
 return r;
end;$$;
-- END 20260709053301_m13e5e_e14_write_c4

-- BEGIN 20260709053323_m13e5f_e14_write_step
-- Remote SQL SHA-256: 8141fc33391a4e2ed6306983c1bc5b815a38530638d16d88ec9672e4dcbc8f6b
create or replace function app_private.e14_write_step(a jsonb,b uuid)
returns uuid language sql security definer set search_path=pg_catalog as $$
 insert into orchestration.step_instances(id,path_assignment_id,path_step_id,activity_version_id,status,available_at,attempt_count,aggregate_version)
 values(app_private.e14_deterministic_uuid(b::text||(a->>'s')),b,(a->>'s')::uuid,(a->>'v')::uuid,'available',now(),0,0)
 on conflict(path_assignment_id,path_step_id) do update set path_assignment_id=excluded.path_assignment_id
 returning id
$$;
-- END 20260709053323_m13e5f_e14_write_step

-- BEGIN 20260709053332_m13e5g_e14_set_current_step
-- Remote SQL SHA-256: 08f623f77c1f31102bf01cb8df8e141c9a37dac30d04f799359866cf9b353078
create or replace function app_private.e14_set_current_step(a uuid,b uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 update orchestration.progress_projections set current_step_id=b,last_activity_at=now(),projection_version=projection_version+1,updated_at=now() where journey_instance_id=a
$$;
-- END 20260709053332_m13e5g_e14_set_current_step

-- BEGIN 20260709053343_m13e5h_e14_apply_c
-- Remote SQL SHA-256: 0d1eafc610ec5c9ec236cb3f098d8a94528137e763bd893006038e5ec347bcfd
create or replace function app_private.e14_apply_c(a uuid,b jsonb,c jsonb,d jsonb,e uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v bigint;r uuid;dec uuid;pa uuid;si uuid;
begin
 if (c->>'n')::integer<>4 or d is null then raise exception 'DIAGNOSTIC_INCOMPLETE' using errcode='P0001';end if;
 v:=app_private.e14_complete_session(a);
 r:=app_private.e14_write_c1(a,d,c,e);
 perform app_private.e14_write_dimension(r,(b->>'version_id')::uuid,1,(c->>'x')::numeric);
 perform app_private.e14_write_dimension(r,(b->>'version_id')::uuid,2,(c->>'y')::numeric);
 dec:=app_private.e14_write_c3(b,c,d);
 pa:=app_private.e14_write_c4(b,d,r);
 si:=app_private.e14_write_step(d,pa);
 perform app_private.e14_set_current_step((b->>'instance_id')::uuid,(d->>'s')::uuid);
 return jsonb_build_object('result_id',r,'decision_id',dec,'assignment_id',pa,'step_instance_id',si,'session_aggregate_version',v,'path_code',d->>'p','low_confidence',(d->>'l')::boolean);
end;$$;
-- END 20260709053343_m13e5h_e14_apply_c

-- BEGIN 20260709053436_m13e6_e14_prepare_c
-- Remote SQL SHA-256: a7db4215f1fb2fbfd30b66bb8913d58991846aba8c9b09936eb49b63654415c0
create or replace function app_private.e14_prepare_c(a uuid,b uuid,c bigint,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;rid uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(d);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c));
 rid:=app_private.e14_deterministic_uuid(b::text||c::text);
 ev:=app_private.e14_command_event_id('C6',a,rid,k);
 perform app_private.e14_lock_scope('C6|'||a::text||'|'||b::text);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'r',rid,'p',rp);
end;$$;
-- END 20260709053436_m13e6_e14_prepare_c

-- BEGIN 20260709053455_m13e7_e14_ec
-- Remote SQL SHA-256: 21d238ee938e563019bda56b3237cc56ef0057ab8e9615ccd0d3c16ba7605b79
create or replace function app_private.e14_ec(a uuid,b uuid,c integer,d uuid,e uuid,f uuid,g text,h uuid,i text,j uuid,k bigint,l jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare x uuid;
begin
 x:=app_private.e14_deterministic_uuid(b::text||a::text||c::text);
 perform app_private.e14_emit_g(a,x,d,e,f,g,h,i,j,k,b,b,l);
 return x;
end;$$;
-- END 20260709053455_m13e7_e14_ec

-- BEGIN 20260709053509_m13e8_e14_first_c
-- Remote SQL SHA-256: 52a45372ad56ec2068ba9ee65c05f336863b5d38a33808e5d507b0776f7160eb
create or replace function app_private.e14_first_c(a uuid,b uuid,c jsonb,d bigint,e text,f text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_emit_g('041e646a-d96f-4fe9-b0bd-1401f97bf153',a,b,(c->>'organization_id')::uuid,(c->>'instance_id')::uuid,'session',d::text::uuid,'session',d::text::uuid,0,a,null,jsonb_build_object('request_hash',e,'idempotency_key',f))
$$;
-- END 20260709053509_m13e8_e14_first_c

-- BEGIN 20260709053519_m13e8a_e14_first_c_fix
-- Remote SQL SHA-256: 9713e6accd84087dde28d7f6535fad666eeecde0ef13c9b30d536a5df7ddafef
create or replace function app_private.e14_first_c(a uuid,b uuid,c jsonb,d uuid,e bigint,f text,g text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_emit_g('041e646a-d96f-4fe9-b0bd-1401f97bf153',a,b,(c->>'organization_id')::uuid,(c->>'instance_id')::uuid,'session',d,'session',d,e,a,null,jsonb_build_object('request_hash',f,'idempotency_key',g))
$$;
-- END 20260709053519_m13e8a_e14_first_c_fix

-- BEGIN 20260709053533_m13e9_e14_children_c
-- Remote SQL SHA-256: 46cc26a8bc3a5673badf35e2805f0641be588d0016d676016a37593025a91bc1
create or replace function app_private.e14_children_c(a uuid,b uuid,c jsonb,d jsonb,e jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare org uuid;inst uuid;r uuid;dec uuid;pa uuid;si uuid;x jsonb:='[]'::jsonb;ev uuid;
begin
 org:=(c->>'organization_id')::uuid;inst:=(c->>'instance_id')::uuid;r:=(e->>'result_id')::uuid;dec:=(e->>'decision_id')::uuid;pa:=(e->>'assignment_id')::uuid;si:=(e->>'step_instance_id')::uuid;
 ev:=app_private.e14_ec('e1dd0885-dca6-4d89-8741-5683e940b1c0',a,1,b,org,inst,'result',r,'result',r,1,jsonb_build_object('scores',d));x:=x||jsonb_build_array(ev);
 if (d->>'u')::integer>=2 then ev:=app_private.e14_ec('7bbd12dc-7834-4c8d-b566-d5d9d80427e2',a,2,b,org,inst,'decision',dec,'decision',dec,1,jsonb_build_object('uncertain_count',(d->>'u')::integer));x:=x||jsonb_build_array(ev);end if;
 ev:=app_private.e14_ec('7a5b9559-6b22-409a-a17d-39abd5e2c7c0',a,3,b,org,inst,'path_assignment',pa,'path_assignment',pa,0,jsonb_build_object('path_code',e->>'path_code'));x:=x||jsonb_build_array(ev);
 ev:=app_private.e14_ec('8a88414d-e44a-4ebe-984a-40733da7a489',a,4,b,org,inst,'path_assignment',pa,'path_assignment',pa,1,jsonb_build_object('path_code',e->>'path_code'));x:=x||jsonb_build_array(ev);
 ev:=app_private.e14_ec('646223e0-18c3-4a7b-8865-dff76db0d173',a,5,b,org,inst,'step_instance',si,'step_instance',si,0,jsonb_build_object('path_code',e->>'path_code'));x:=x||jsonb_build_array(ev);
 return x;
end;$$;
-- END 20260709053533_m13e9_e14_children_c

-- BEGIN 20260709053545_m13e10_e14_snapshot_c
-- Remote SQL SHA-256: 210f1cc328fce59dbcc14ecc168f740c7a0a221f4775f42261fdd5b8d976159f
create or replace function app_private.e14_snapshot_c(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object(
  'session_id',s.id,'session_status',s.status,'session_aggregate_version',s.aggregate_version,
  'result_id',r.id,'path_code',pt.code,'assignment_id',pa.id,'step_instance_id',si.id,'step_status',si.status
 )
 from diagnostics.sessions s
 left join diagnostics.results r on r.session_id=s.id and r.calculation_version='v1'
 left join orchestration.path_assignments pa on pa.journey_instance_id=s.journey_instance_id and pa.status in('active','completed')
 left join orchestration.path_templates pt on pt.id=pa.path_template_id
 left join orchestration.step_instances si on si.path_assignment_id=pa.id
 where s.id=a
 order by pa.created_at desc limit 1
$$;
-- END 20260709053545_m13e10_e14_snapshot_c

-- BEGIN 20260709053556_m13e11_e14_exec_c
-- Remote SQL SHA-256: 196d98a3e4f54102aaa02d7ecb0e02e98c8dc75245a822f7b597ce85e5b42be5
create or replace function app_private.e14_exec_c(a uuid,b uuid,c bigint,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare p jsonb;ctx jsonb;s jsonb;path jsonb;data jsonb;children jsonb;
begin
 p:=app_private.e14_prepare_c(a,b,c,d);
 if (p->>'p')::boolean then return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',true,'data',app_private.e14_snapshot_c(b));end if;
 ctx:=app_private.e14_context_c(a,b,c);s:=app_private.e14_scores_c(b);path:=app_private.e14_path_c((ctx->>'journey_version_id')::uuid,s);
 perform app_private.e14_first_c((p->>'e')::uuid,a,ctx,b,c+1,p->>'h',p->>'k');
 data:=app_private.e14_apply_c(b,ctx,s,path,(p->>'e')::uuid);
 children:=app_private.e14_children_c((p->>'e')::uuid,a,ctx,s,data);
 return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',false,'data',data||jsonb_build_object('event_ids',jsonb_build_array((p->>'e')::uuid)||children));
end;$$;
-- END 20260709053556_m13e11_e14_exec_c

-- BEGIN 20260709053609_m13e12_e14_complete_diagnostic_shell
-- Remote SQL SHA-256: 69d2e0783a5ceb1b5260f25a6ca5a98fa77d6b957a394aa6a7685385766b56e5
create or replace function public.e14_complete_diagnostic(p_actor_user_account_id uuid,p_session_id uuid,p_expected_aggregate_version bigint,p_idempotency_key text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select '{}'::jsonb$$;
-- END 20260709053609_m13e12_e14_complete_diagnostic_shell

-- BEGIN 20260709053629_m13e13_e14_rpc_c
-- Remote SQL SHA-256: 1a034dabd9816196d1c6b32875e157e8fefcdab3b907bf4707b605c98029fd37
create or replace function public.e14_rpc_c(a uuid,b uuid,c bigint,d text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_c(a,b,c,d)$$;
-- END 20260709053629_m13e13_e14_rpc_c

-- BEGIN 20260709053641_m13e14_e14_complete_diagnostic_rpc
-- Remote SQL SHA-256: 8bc4533e59ef668fc9bbe0702947e910bb8754fd66ab0427cf563858c1f2016a
drop function public.e14_complete_diagnostic(uuid,uuid,bigint,text);
alter function public.e14_rpc_c(uuid,uuid,bigint,text) rename to e14_complete_diagnostic;
revoke all on function public.e14_complete_diagnostic(uuid,uuid,bigint,text) from public;
revoke all on function public.e14_complete_diagnostic(uuid,uuid,bigint,text) from anon;
revoke all on function public.e14_complete_diagnostic(uuid,uuid,bigint,text) from authenticated;
grant execute on function public.e14_complete_diagnostic(uuid,uuid,bigint,text) to service_role;
grant execute on function public.e14_complete_diagnostic(uuid,uuid,bigint,text) to app_worker;
-- END 20260709053641_m13e14_e14_complete_diagnostic_rpc

-- BEGIN 20260709053719_m13f1_e14_step_context_view
-- Remote SQL SHA-256: 7271b571b1ff7a02ecac16a7210f7deb54b9b3e3a4594647c27cad1eea0119d5
create or replace view app_private.e14_step_context as
select si.id step_instance_id,si.path_assignment_id,si.path_step_id,si.activity_version_id,si.status step_status,si.aggregate_version step_version,pa.journey_instance_id,en.entrepreneur_id,en.journey_version_id,jd.owner_organization_id
from orchestration.step_instances si
join orchestration.path_assignments pa on pa.id=si.path_assignment_id
join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
join orchestration.enrollments en on en.id=ji.enrollment_id
join catalog.journey_versions jv on jv.id=en.journey_version_id
join catalog.journey_definitions jd on jd.id=jv.journey_definition_id;
revoke all on app_private.e14_step_context from public,anon,authenticated;
-- END 20260709053719_m13f1_e14_step_context_view

-- BEGIN 20260709053735_m13f2_e14_context_d_raw
-- Remote SQL SHA-256: 44dea65f09352165c078e35ea30a767d0e8e2e2fe2e029ed8f2c9cb63a5310e3
create or replace function app_private.e14_context_d(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('person',entrepreneur_id,'instance',journey_instance_id,'org',owner_organization_id,'version',activity_version_id,'state',step_status,'aggregate',step_version) from app_private.e14_step_context where step_instance_id=a
$$;
-- END 20260709053735_m13f2_e14_context_d_raw

-- BEGIN 20260709053746_m13f3_e14_step_transition
-- Remote SQL SHA-256: 48a5af541837cd537a17b80ed452c79fd84d18258b158462982fec4512ecf562
create or replace function app_private.e14_step_transition(a uuid,b bigint)
returns bigint language sql security definer set search_path=pg_catalog as $$
 update orchestration.step_instances set status='in_progress',started_at=coalesce(started_at,now()),aggregate_version=aggregate_version+1,updated_at=now()
 where id=a and status='available' and aggregate_version=b
 returning aggregate_version
$$;
-- END 20260709053746_m13f3_e14_step_transition

-- BEGIN 20260709053800_m13f4_e14_session_insert
-- Remote SQL SHA-256: d2b2fad5e6027f924cdb7fdaf94ef122de17cd7033a8e113475339c3087d12ee
create or replace function app_private.e14_session_insert_d(a uuid,b uuid)
returns uuid language sql security definer set search_path=pg_catalog as $$
 insert into orchestration.activity_sessions(id,step_instance_id,entrepreneur_id,started_at,last_seen_at,device_class,channel,accepted_observation_count)
 values(app_private.e14_deterministic_uuid(a::text||b::text),a,b,now(),now(),'synthetic','web',0)
 on conflict(id) do update set last_seen_at=excluded.last_seen_at
 returning id
$$;
-- END 20260709053800_m13f4_e14_session_insert

-- BEGIN 20260709053811_m13f5_e14_prepare_d
-- Remote SQL SHA-256: d6b547dfd3b6621dfb0dff34fc5d768687012a73cd39fa1e004ab53c5fabd697
create or replace function app_private.e14_prepare_d(a uuid,b uuid,c bigint,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(d);h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c));ev:=app_private.e14_command_event_id('C7',a,app_private.e14_deterministic_uuid(b::text||c::text),k);perform app_private.e14_lock_scope('C7|'||a::text||'|'||b::text);rp:=app_private.e14_assert_idempotency(ev,h);return jsonb_build_object('k',k,'h',h,'e',ev,'p',rp);
end;$$;
-- END 20260709053811_m13f5_e14_prepare_d

-- BEGIN 20260709053827_m13f6_e14_snapshot_d
-- Remote SQL SHA-256: abd7ea359bd98cecc25b95ad2bef4267d52d946bf9e8bbc41c3835e22d18c6ea
create or replace function app_private.e14_snapshot_d(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('i',x.step_instance_id,'s',x.step_status,'v',x.step_version,'a',z.id,'n',coalesce(z.accepted_observation_count,0))
 from app_private.e14_step_context x left join orchestration.activity_sessions z on z.step_instance_id=x.step_instance_id and z.ended_at is null where x.step_instance_id=a
$$;
-- END 20260709053827_m13f6_e14_snapshot_d

-- BEGIN 20260709053842_m13f7_e14_exec_d
-- Remote SQL SHA-256: de4c9d1b3a270964e2261cab60a3f3167df7162471f2d09e59108ae5aa253f69
create or replace function app_private.e14_exec_d(a uuid,b uuid,c bigint,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare p jsonb;x jsonb;sess uuid;ver bigint;
begin
 p:=app_private.e14_prepare_d(a,b,c,d);
 if (p->>'p')::boolean then return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',true,'data',app_private.e14_snapshot_d(b));end if;
 x:=app_private.e14_context_d(b);
 if x is null then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'person')::uuid then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if x->>'state'<>'available' or (x->>'aggregate')::bigint<>c then raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode='P0001';end if;
 sess:=app_private.e14_deterministic_uuid(b::text||(x->>'person'));
 perform app_private.e14_emit_g('ae5dc35f-8ab3-45e7-ae79-94a869d88476',(p->>'e')::uuid,a,(x->>'org')::uuid,(x->>'instance')::uuid,'session',sess,'step',b,c+1,(p->>'e')::uuid,null,jsonb_build_object('request_hash',p->>'h','idempotency_key',p->>'k'));
 ver:=app_private.e14_step_transition(b,c);if ver is null then raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode='P0001';end if;
 sess:=app_private.e14_session_insert_d(b,(x->>'person')::uuid);
 return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',false,'data',app_private.e14_snapshot_d(b));
end;$$;
-- END 20260709053842_m13f7_e14_exec_d

-- BEGIN 20260709053850_m13f8_e14_start_activity_rpc
-- Remote SQL SHA-256: fdb21f970d828817587f4e4da57fc40d9fce86d16bce00893feefc69bef7e389
create or replace function public.e14_rpc_d(a uuid,b uuid,c bigint,d text) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_d(a,b,c,d)$$;
alter function public.e14_rpc_d(uuid,uuid,bigint,text) rename to e14_start_activity;
revoke all on function public.e14_start_activity(uuid,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.e14_start_activity(uuid,uuid,bigint,text) to service_role,app_worker;
-- END 20260709053850_m13f8_e14_start_activity_rpc

-- BEGIN 20260709053909_m13g1_e14_ctx_activity
-- Remote SQL SHA-256: 0d7e14e361f1da1e9875a6dcdd1a5783c45872651c99df7c294b6e6b59ade95d
create or replace view app_private.e14_ctx_activity as
select s.id sid,s.step_instance_id step_id,s.entrepreneur_id person_id,s.ended_at,s.accepted_observation_count n,x.journey_instance_id instance_id,x.owner_organization_id org_id,x.activity_version_id version_id,x.step_status,x.step_version
from orchestration.activity_sessions s join app_private.e14_step_context x on x.step_instance_id=s.step_instance_id;
revoke all on app_private.e14_ctx_activity from public,anon,authenticated;
-- END 20260709053909_m13g1_e14_ctx_activity

-- BEGIN 20260709053920_m13g2_e14_section_exists
-- Remote SQL SHA-256: 113db744d534a4bbe53f9298991a40c73d9618be57a72962e913394bab93a454
create or replace function app_private.e14_section_exists(a uuid,b text)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select exists(select 1 from catalog.activity_versions v cross join lateral jsonb_array_elements(v.configuration->'content_sections') s where v.id=a and s->>'code'=b)
$$;
-- END 20260709053920_m13g2_e14_section_exists

-- BEGIN 20260709053930_m13g3_e14_section_snapshot
-- Remote SQL SHA-256: ad903d8d35cd45897922ca4f9186d51416523bfd3a633191f60a19a548533643
create or replace function app_private.e14_snapshot_e(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('activity_session_id',sid,'accepted_sections',n,'completion_ratio',least(1,n/4.0)) from app_private.e14_ctx_activity where sid=a
$$;
-- END 20260709053930_m13g3_e14_section_snapshot

-- BEGIN 20260709053945_m13g4_e14_inc_e
-- Remote SQL SHA-256: e604f1547704f995af40deb41589535ba42d2540c5096e9d8cd0db5f8620fd35
create or replace function app_private.e14_inc_e(a uuid)
returns integer language sql security definer set search_path=pg_catalog as $$
 update orchestration.activity_sessions set accepted_observation_count=accepted_observation_count+1,last_seen_at=now() where id=a and ended_at is null returning accepted_observation_count
$$;
-- END 20260709053945_m13g4_e14_inc_e

-- BEGIN 20260709053955_m13g5_e14_context_e
-- Remote SQL SHA-256: 4a436339e8c1cd191dece1760feae6f035ee2bf3c7845e98adb85a2484048a89
create or replace function app_private.e14_context_e(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select to_jsonb(x) from app_private.e14_ctx_activity x where x.sid=a
$$;
-- END 20260709053955_m13g5_e14_context_e

-- BEGIN 20260709054008_m13g6_e14_exec_e
-- Remote SQL SHA-256: 4df4c01c8680f847ea9634947560d65568497e7323716aa09ede13dba209b7fc
create or replace function app_private.e14_exec_e(a uuid,b uuid,c text,d boolean,e text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;rp boolean;x jsonb;n integer;
begin
 k:=app_private.e14_validate_idempotency_key(e);h:=app_private.e14_request_hash(jsonb_build_object('session_id',b,'section_code',c,'acknowledged',d));ev:=app_private.e14_deterministic_uuid(b::text||'|'||c);perform app_private.e14_lock_scope('C8|'||b::text||'|'||c);rp:=app_private.e14_assert_idempotency(ev,h);
 if rp then return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',true,'data',app_private.e14_snapshot_e(b));end if;
 if d is not true then raise exception 'SECTION_ACK_REQUIRED' using errcode='22023';end if;
 x:=app_private.e14_context_e(b);if x is null then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'person_id')::uuid then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if x->>'ended_at' is not null or x->>'step_status'<>'in_progress' then raise exception 'ACTIVITY_NOT_IN_PROGRESS' using errcode='P0001';end if;
 if not app_private.e14_section_exists((x->>'version_id')::uuid,c) then raise exception 'INVALID_SECTION' using errcode='22023';end if;
 perform app_private.e14_emit_g('b148150e-6b30-44a5-9b08-2cae44144ec4',ev,a,(x->>'org_id')::uuid,(x->>'instance_id')::uuid,'activity_session',b,'activity_session',b,(x->>'n')::bigint+1,ev,null,jsonb_build_object('request_hash',h,'idempotency_key',k,'section_code',c));
 n:=app_private.e14_inc_e(b);perform app_private.e14_progress_touch((x->>'instance_id')::uuid);
 return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',false,'data',jsonb_build_object('activity_session_id',b,'section_code',c,'accepted_sections',n,'completion_ratio',least(1,n/4.0)));
end;$$;
-- END 20260709054008_m13g6_e14_exec_e

-- BEGIN 20260709054022_m13g7_e14_rpc_e
-- Remote SQL SHA-256: 6ea4bd91081087ba7db221b04991a9015f3d8267244439b1f426edeaca2d29e6
create or replace function public.e14_rpc_e(a uuid,b uuid,c text,d boolean,e text) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_e(a,b,c,d,e)$$;
-- END 20260709054022_m13g7_e14_rpc_e

-- BEGIN 20260709054030_m13g8_e14_acknowledge_section_name
-- Remote SQL SHA-256: 15da00bb5e9d3efbc3b69942f6dcef08473339e119996032d5b5e817e37eaec1
alter function public.e14_rpc_e(uuid,uuid,text,boolean,text) rename to e14_acknowledge_section;
-- END 20260709054030_m13g8_e14_acknowledge_section_name

-- BEGIN 20260709054040_m13g9_e14_acknowledge_section_access
-- Remote SQL SHA-256: 51b5adf87bae004f992b493d5b3b325e2f15d30bc97a309225c8504200b73e9e
revoke all on function public.e14_acknowledge_section(uuid,uuid,text,boolean,text) from public;
revoke all on function public.e14_acknowledge_section(uuid,uuid,text,boolean,text) from anon;
revoke all on function public.e14_acknowledge_section(uuid,uuid,text,boolean,text) from authenticated;
grant execute on function public.e14_acknowledge_section(uuid,uuid,text,boolean,text) to service_role;
grant execute on function public.e14_acknowledge_section(uuid,uuid,text,boolean,text) to app_worker;
-- END 20260709054040_m13g9_e14_acknowledge_section_access

-- BEGIN 20260709054140_m13h1_e14_context_f
-- Remote SQL SHA-256: d246c18a9ecf2c6643d5ea901e8c385fe248f35afd4010adf82e4c057b093e2c
create or replace function app_private.e14_context_f(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('person',x.entrepreneur_id,'instance',x.journey_instance_id,'org',x.owner_organization_id,'version',x.activity_version_id,'state',x.step_status,'aggregate',x.step_version,'sections',s.accepted_observation_count,'max_attempts',sp.max_attempts,'question_id',q.id)
 from app_private.e14_step_context x
 join orchestration.activity_sessions s on s.step_instance_id=x.step_instance_id and s.ended_at is null
 join assessment.assessment_specs sp on sp.activity_version_id=x.activity_version_id
 join assessment.questions q on q.activity_version_id=x.activity_version_id and q.position=1
 where x.step_instance_id=a
$$;
-- END 20260709054140_m13h1_e14_context_f

-- BEGIN 20260709054201_m13h2_e14_prepare_f
-- Remote SQL SHA-256: 5e3ea34c118b9b04d178bdeaa93309d5be8d66d38c7316a516a43b4a2fb08f6c
create or replace function app_private.e14_prepare_f(a uuid,b uuid,c text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;at uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(c);h:=app_private.e14_request_hash(jsonb_build_object('b',b));ev:=app_private.e14_command_event_id('F',a,b,k);at:=app_private.e14_deterministic_uuid(ev::text||b::text);perform app_private.e14_lock_scope('F|'||a::text||'|'||b::text);rp:=app_private.e14_assert_idempotency(ev,h);return jsonb_build_object('k',k,'h',h,'e',ev,'a',at,'p',rp);
end;$$;
-- END 20260709054201_m13h2_e14_prepare_f

-- BEGIN 20260709054211_m13h3_e14_snapshot_f
-- Remote SQL SHA-256: 9bed3e25171e65e21701816c592dbe13bbadb1c2c7281edeb97f20eced350a41
create or replace function app_private.e14_snapshot_f(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('attempt_id',x.id,'attempt_number',x.attempt_number,'status',x.status,'aggregate_version',x.aggregate_version,'question_id',q.id,'prompt',q.prompt,'options',(select jsonb_agg(jsonb_build_object('code',o.code,'label',o.label) order by o.position) from assessment.answer_options o where o.question_id=q.id))
 from assessment.attempts x join assessment.questions q on q.activity_version_id=x.activity_version_id and q.position=1 where x.id=a
$$;
-- END 20260709054211_m13h3_e14_snapshot_f

-- BEGIN 20260709054229_m13h4a_e14_attempt_number
-- Remote SQL SHA-256: d93f37224767fb433a479b31365e37d50b35b36ce06e55dfc5de5f67b7907467
create or replace function app_private.e14_attempt_number(a uuid,b integer)
returns integer language plpgsql security definer set search_path=pg_catalog as $$
declare n integer;
begin
 if exists(select 1 from assessment.attempts where step_instance_id=a and status='in_progress') then raise exception 'ATTEMPT_ALREADY_IN_PROGRESS' using errcode='P0001';end if;
 select count(*)+1 into n from assessment.attempts where step_instance_id=a;
 if n>b then raise exception 'MAX_ATTEMPTS_REACHED' using errcode='P0001';end if;
 return n;
end;$$;
-- END 20260709054229_m13h4a_e14_attempt_number

-- BEGIN 20260709054241_m13h4b_e14_insert_attempt
-- Remote SQL SHA-256: df85d2907945d4d28e50f243de86edf6a5b95089c8b5f5dd7dc470dfc6bfde75
create or replace function app_private.e14_insert_attempt(a uuid,b uuid,c jsonb,d integer)
returns void language sql security definer set search_path=pg_catalog as $$
 insert into assessment.attempts(id,step_instance_id,activity_version_id,entrepreneur_id,attempt_number,status,started_at,aggregate_version)
 values(a,b,(c->>'version')::uuid,(c->>'person')::uuid,d,'in_progress',now(),0)
$$;
-- END 20260709054241_m13h4b_e14_insert_attempt

-- BEGIN 20260709054250_m13h4c_e14_set_attempt_count
-- Remote SQL SHA-256: 8b69b23e6c18af791f011d4a074f56cd2d35ca9de1425236c6ace51b289ff064
create or replace function app_private.e14_set_attempt_count(a uuid,b integer)
returns void language sql security definer set search_path=pg_catalog as $$update orchestration.step_instances set attempt_count=b,updated_at=now() where id=a$$;
-- END 20260709054250_m13h4c_e14_set_attempt_count

-- BEGIN 20260709054308_m13h5a_e14_emit_f
-- Remote SQL SHA-256: 9324c0a1c43df6976d6eaeae7f9faa5abb28ec2e99879bdbb44f39abb0c25cb0
create or replace function app_private.e14_emit_f(a uuid,b uuid,c jsonb,d uuid,e text,f text,g integer)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_emit_g('358595b5-2c75-4d25-aab7-98a8ddbe00b6',d,a,(c->>'org')::uuid,(c->>'instance')::uuid,'attempt',b,'attempt',b,0,d,null,jsonb_build_object('request_hash',e,'idempotency_key',f,'attempt_number',g))
$$;
-- END 20260709054308_m13h5a_e14_emit_f

-- BEGIN 20260709054317_m13h5b_e14_apply_f
-- Remote SQL SHA-256: 4aed7a9958d96a55a5e23313ab720b4916efb684a6c1d79300fc2999fdfd0772
create or replace function app_private.e14_apply_f(a uuid,b uuid,c jsonb,d uuid,e uuid,f text,g text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare n integer;
begin
 n:=app_private.e14_attempt_number(b,(c->>'max_attempts')::integer);
 perform app_private.e14_emit_f(a,d,c,e,f,g,n);
 perform app_private.e14_insert_attempt(d,b,c,n);
 perform app_private.e14_set_attempt_count(b,n);
 return app_private.e14_snapshot_f(d);
end;$$;
-- END 20260709054317_m13h5b_e14_apply_f

-- BEGIN 20260709054337_m13h5c_e14_validate_f
-- Remote SQL SHA-256: 2736bed8133d7bf7eed3367c377590b0e798bcbc1cbbffe337793e761d400117
create or replace function app_private.e14_validate_f(a uuid,b uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;
begin
 x:=app_private.e14_context_f(b);
 if x is null then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'person')::uuid then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if (x->>'sections')::integer<>4 or x->>'state'<>'in_progress' then raise exception 'ACTIVITY_INCOMPLETE' using errcode='P0001';end if;
 return x;
end;$$;
-- END 20260709054337_m13h5c_e14_validate_f

-- BEGIN 20260709054441_m13h5e_e14_vf
-- Remote SQL SHA-256: 62065a7368737ccd7de95401acf238c6290dc4055f41e6cdc830b51c588255a6
create or replace function app_private.e14_vf(a uuid,b uuid) returns jsonb language sql volatile security definer set search_path=pg_catalog as $$select app_private.e14_validate_f(a,b)$$;
-- END 20260709054441_m13h5e_e14_vf

-- BEGIN 20260709054449_m13h5f_e14_af
-- Remote SQL SHA-256: f3d1c16352a2e0f2ae4a0407bc1012077b3d8b775ef5b326e1eaba43f86134de
create or replace function app_private.e14_af(a uuid,b uuid,c jsonb,d uuid,e uuid,f text,g text) returns jsonb language sql volatile security definer set search_path=pg_catalog as $$select app_private.e14_apply_f(a,b,c,d,e,f,g)$$;
-- END 20260709054449_m13h5f_e14_af

-- BEGIN 20260709054458_m13h5g_e14_exec_f_final
-- Remote SQL SHA-256: 17a0a8aa2b8723ecf4bd61ffa678812229fa89ad90433b13d675aa7f00b0eb57
create or replace function app_private.e14_exec_f(a uuid,b uuid,c text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with p as (select app_private.e14_prepare_f(a,b,c) x)
 select jsonb_build_object('request_id',(x->>'e')::uuid,'idempotency_key',x->>'k','replayed',(x->>'p')::boolean,'data',case when (x->>'p')::boolean then app_private.e14_snapshot_f((x->>'a')::uuid) else app_private.e14_af(a,b,app_private.e14_vf(a,b),(x->>'a')::uuid,(x->>'e')::uuid,x->>'h',x->>'k') end) from p
$$;
-- END 20260709054458_m13h5g_e14_exec_f_final

-- BEGIN 20260709054513_m13h6_e14_rpc_f
-- Remote SQL SHA-256: bc52cfd82592927561e8b529d325e4082ecaf813ef4ec33c07f72bdcd2a4f55f
create or replace function public.e14_rpc_f(a uuid,b uuid,c text) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_f(a,b,c)$$;
-- END 20260709054513_m13h6_e14_rpc_f

-- BEGIN 20260709054522_m13h7_e14_start_quick_check_name
-- Remote SQL SHA-256: fd92dc6c3e5ac093580bd6a6cd4aa8eac96243a66961ba98aed7e02b180fa1dc
alter function public.e14_rpc_f(uuid,uuid,text) rename to e14_start_quick_check;
-- END 20260709054522_m13h7_e14_start_quick_check_name

-- BEGIN 20260709054533_m13h8_e14_start_quick_check_access
-- Remote SQL SHA-256: 2b8197d444102e19e41bebe9ef2889e2e5bb435c06938a4dea3befab6bdf714c
revoke all on function public.e14_start_quick_check(uuid,uuid,text) from public;
revoke all on function public.e14_start_quick_check(uuid,uuid,text) from anon;
revoke all on function public.e14_start_quick_check(uuid,uuid,text) from authenticated;
grant execute on function public.e14_start_quick_check(uuid,uuid,text) to service_role;
grant execute on function public.e14_start_quick_check(uuid,uuid,text) to app_worker;
-- END 20260709054533_m13h8_e14_start_quick_check_access

-- BEGIN 20260709054546_m13i1_e14_attempt_context_view
-- Remote SQL SHA-256: 6beb9735c87cb27170054d7bf050a6e519d41d7263af3af9505a92d7752abc80
create or replace view app_private.e14_attempt_context as
select a.id attempt_id,a.step_instance_id,a.activity_version_id,a.entrepreneur_id,a.attempt_number,a.status attempt_status,a.aggregate_version attempt_version,x.journey_instance_id instance_id,x.owner_organization_id org_id
from assessment.attempts a join app_private.e14_step_context x on x.step_instance_id=a.step_instance_id;
revoke all on app_private.e14_attempt_context from public,anon,authenticated;
-- END 20260709054546_m13i1_e14_attempt_context_view

-- BEGIN 20260709054556_m13i2_e14_context_g
-- Remote SQL SHA-256: ac53657ef93549d0f9660717ce50a2f286ac94230eca00a712c57f84e4e4eebf
create or replace function app_private.e14_context_g(a uuid,b uuid,c uuid,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x app_private.e14_attempt_context%rowtype;o uuid;v jsonb;ok boolean;
begin
 select * into x from app_private.e14_attempt_context where attempt_id=b;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from x.entrepreneur_id then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if x.attempt_status<>'in_progress' then raise exception 'ATTEMPT_NOT_IN_PROGRESS' using errcode='P0001';end if;
 select ao.id,ao.value,ao.is_correct into o,v,ok from assessment.answer_options ao join assessment.questions q on q.id=ao.question_id where ao.question_id=c and ao.code=d and q.activity_version_id=x.activity_version_id;
 if not found then raise exception 'INVALID_ASSESSMENT_OPTION' using errcode='22023';end if;
 return jsonb_build_object('person',x.entrepreneur_id,'step',x.step_instance_id,'version',x.activity_version_id,'instance',x.instance_id,'org',x.org_id,'attempt_version',x.attempt_version,'option_id',o,'option_value',v,'correct',ok);
end;$$;
-- END 20260709054556_m13i2_e14_context_g

-- BEGIN 20260709054615_m13i3_e14_prepare_10
-- Remote SQL SHA-256: 6972e2434d9a145d3c2ffc53dfad856794513c6b81691578ff9959338a41bfbc
create or replace function app_private.e14_prepare_10(a uuid,b uuid,c uuid,d text,e text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;r uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(e);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c,'d',d));
 r:=app_private.e14_deterministic_uuid(b::text||c::text);
 ev:=app_private.e14_command_event_id('H',a,r,k);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'r',r,'p',rp);
end;$$;
-- END 20260709054615_m13i3_e14_prepare_10

-- BEGIN 20260709054625_m13i3a_e14_prepare_10_locked
-- Remote SQL SHA-256: b2f2a4b765cc13d2ee3eabc3d09ec05ecc4bf2bee73b19d2d4c1cc5aa8ed3601
create or replace function app_private.e14_prepare_10(a uuid,b uuid,c uuid,d text,e text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;r uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(e);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c,'d',d));
 r:=app_private.e14_deterministic_uuid(b::text||c::text);
 ev:=app_private.e14_command_event_id('H',a,r,k);
 perform app_private.e14_lock_scope('H|'||a::text||'|'||b::text||'|'||c::text);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'r',r,'p',rp);
end;$$;
-- END 20260709054625_m13i3a_e14_prepare_10_locked

-- BEGIN 20260709054651_m13i4_e14_response_view
-- Remote SQL SHA-256: a168f5b6f2672ee33980c1839e98b1be14e90a3a05c40616c638d528f3c57889
create or replace view app_private.e14_response_view as
select r.id rid,r.attempt_id aid,r.question_id qid,r.response_value val,a.aggregate_version ver
from assessment.responses r join assessment.attempts a on a.id=r.attempt_id;
revoke all on app_private.e14_response_view from public,anon,authenticated;
-- END 20260709054651_m13i4_e14_response_view

-- BEGIN 20260709054700_m13i4a_e14_snapshot_10
-- Remote SQL SHA-256: ef3887e5e224934da27db231cc357fa5b818d3fd39e9e08f0dd749498744e3c9
create or replace function app_private.e14_snapshot_10(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('r',rid,'a',aid,'q',qid,'v',val,'n',ver) from app_private.e14_response_view where rid=a
$$;
-- END 20260709054700_m13i4a_e14_snapshot_10

-- BEGIN 20260709054709_m13i5_e14_emit_h
-- Remote SQL SHA-256: dd99eb52eb065304b731fedb0d2b982501cb4dc06cafabe000b541c0b9110509
create or replace function app_private.e14_emit_h(a uuid,b uuid,c jsonb,d uuid,e uuid,f text,g text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_emit_g('e85a6dae-d34f-45cb-9171-f67ce9a0d217',a,b,(c->>'org')::uuid,(c->>'instance')::uuid,'response',d,'attempt',e,(c->>'attempt_version')::bigint+1,a,null,jsonb_build_object('request_hash',f,'idempotency_key',g))
$$;
-- END 20260709054709_m13i5_e14_emit_h

-- BEGIN 20260709054717_m13i6_e14_insert_h
-- Remote SQL SHA-256: bc398fa8f5507670799cb1dc49b8dc5c3e0f71bfff73aa70ee4f79726f7d1451
create or replace function app_private.e14_insert_h(a uuid,b uuid,c uuid,d jsonb,e uuid,f text)
returns void language sql security definer set search_path=pg_catalog as $$
 insert into assessment.responses(id,attempt_id,question_id,response_value,responded_at,source_event_id)
 values(a,b,c,jsonb_build_object('option_id',(d->>'option_id')::uuid,'option_code',f,'correct',(d->>'correct')::boolean),now(),e)
$$;
-- END 20260709054717_m13i6_e14_insert_h

-- BEGIN 20260709054726_m13i7_e14_increment_attempt
-- Remote SQL SHA-256: a27b8e12c2b77afdbf7098c3ca56a2936cdd402b4dd912918dba1d93db07a37b
create or replace function app_private.e14_increment_attempt(a uuid)
returns bigint language sql security definer set search_path=pg_catalog as $$
 update assessment.attempts set aggregate_version=aggregate_version+1 where id=a returning aggregate_version
$$;
-- END 20260709054726_m13i7_e14_increment_attempt

-- BEGIN 20260709054744_m13i8a_e14_assert_no_answer
-- Remote SQL SHA-256: e3de2496c1c4baa2ac9da9941f025a73b518081d75ab37a44e4cbb9dc5b5729c
create or replace function app_private.e14_assert_no_answer(a uuid,b uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
begin
 if exists(select 1 from assessment.responses where attempt_id=a and question_id=b) then raise exception 'ANSWER_ALREADY_RECORDED' using errcode='P0001';end if;
end;$$;
-- END 20260709054744_m13i8a_e14_assert_no_answer

-- BEGIN 20260709054754_m13i8b_e14_apply_h
-- Remote SQL SHA-256: 46d728edea0a91e9c06fbe088daaa03f328f7ad5673252256d2f091489d9f52b
create or replace function app_private.e14_apply_h(a uuid,b uuid,c uuid,d text,e uuid,f uuid,g text,h text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;n bigint;
begin
 x:=app_private.e14_context_g(a,b,c,d);
 perform app_private.e14_assert_no_answer(b,c);
 perform app_private.e14_emit_h(f,a,x,e,b,g,h);
 perform app_private.e14_insert_h(e,b,c,x,f,d);
 n:=app_private.e14_increment_attempt(b);
 return jsonb_build_object('response_id',e,'attempt_id',b,'question_id',c,'response_value',jsonb_build_object('option_code',d),'attempt_aggregate_version',n);
end;$$;
-- END 20260709054754_m13i8b_e14_apply_h

-- BEGIN 20260709054804_m13i9_e14_exec_h
-- Remote SQL SHA-256: bd287acbaca824f9998e0a9cd95a25b47778b9e25a2b26a2e8d8f0eecea1368c
create or replace function app_private.e14_exec_h(a uuid,b uuid,c uuid,d text,e text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with p as (select app_private.e14_prepare_10(a,b,c,d,e) x)
 select jsonb_build_object('request_id',(x->>'e')::uuid,'idempotency_key',x->>'k','replayed',(x->>'p')::boolean,'data',case when (x->>'p')::boolean then app_private.e14_snapshot_10((x->>'r')::uuid) else app_private.e14_apply_h(a,b,c,d,(x->>'r')::uuid,(x->>'e')::uuid,x->>'h',x->>'k') end) from p
$$;
-- END 20260709054804_m13i9_e14_exec_h

-- BEGIN 20260709054856_m13i10_e14_rpc_h
-- Remote SQL SHA-256: e833fe11f1e56a3b77fa7d37a1ba2fee3f9ea53977b545fd7ce80c91873b16f0
create or replace function public.e14_rpc_h(a uuid,b uuid,c uuid,d text,e text)
returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_h(a,b,c,d,e)$$;
-- END 20260709054856_m13i10_e14_rpc_h

-- BEGIN 20260709054905_m13i11_e14_quick_answer_name
-- Remote SQL SHA-256: c4467ce3cd06e1427228965e516c6294c4ebd5334050896262ad1a5e4f97e591
alter function public.e14_rpc_h(uuid,uuid,uuid,text,text) rename to e14_record_quick_check_answer;
-- END 20260709054905_m13i11_e14_quick_answer_name

-- BEGIN 20260709054915_m13i12_e14_quick_answer_access
-- Remote SQL SHA-256: 8e4db582f9d3d87aadf75204041b32f236622e0234ee9c4ef820986c8d71ba6c
revoke all on function public.e14_record_quick_check_answer(uuid,uuid,uuid,text,text) from public;
revoke all on function public.e14_record_quick_check_answer(uuid,uuid,uuid,text,text) from anon;
revoke all on function public.e14_record_quick_check_answer(uuid,uuid,uuid,text,text) from authenticated;
grant execute on function public.e14_record_quick_check_answer(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.e14_record_quick_check_answer(uuid,uuid,uuid,text,text) to app_worker;
-- END 20260709054915_m13i12_e14_quick_answer_access

-- BEGIN 20260709054955_m13j1_e14_completion_context_view
-- Remote SQL SHA-256: cda7a648344af432409f9d9f0fe421c66a5369391ab9dfe872d8a365551ccaa6
create or replace view app_private.e14_completion_context as
select a.id attempt_id,a.step_instance_id,a.activity_version_id,a.entrepreneur_id,a.attempt_number,a.status attempt_status,a.aggregate_version attempt_version,
       s.path_assignment_id,s.status step_status,s.aggregate_version step_version,
       pa.journey_instance_id,pa.status path_status,
       ji.status journey_status,ji.aggregate_version journey_version,
       jd.owner_organization_id,
       act.id activity_session_id,act.accepted_observation_count
from assessment.attempts a
join orchestration.step_instances s on s.id=a.step_instance_id
join orchestration.path_assignments pa on pa.id=s.path_assignment_id
join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
join orchestration.enrollments en on en.id=ji.enrollment_id
join catalog.journey_versions jv on jv.id=en.journey_version_id
join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
left join orchestration.activity_sessions act on act.step_instance_id=s.id and act.ended_at is null;
revoke all on app_private.e14_completion_context from public,anon,authenticated;
-- END 20260709054955_m13j1_e14_completion_context_view

-- BEGIN 20260709055012_m13j2_e14_prepare_i
-- Remote SQL SHA-256: c90a0ba4488044ae0fe6812d4c066d0c0cb14727bed8b4893f13fe426a3e51c4
create or replace function app_private.e14_prepare_i(a uuid,b uuid,c bigint,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;rid uuid;rp boolean;
begin
 k:=app_private.e14_validate_idempotency_key(d);
 h:=app_private.e14_request_hash(jsonb_build_object('b',b,'c',c));
 rid:=app_private.e14_deterministic_uuid(b::text||c::text);
 ev:=app_private.e14_command_event_id('I',a,rid,k);
 perform app_private.e14_lock_scope('I|'||a::text||'|'||b::text);
 rp:=app_private.e14_assert_idempotency(ev,h);
 return jsonb_build_object('k',k,'h',h,'e',ev,'r',rid,'p',rp);
end;$$;
-- END 20260709055012_m13j2_e14_prepare_i

-- BEGIN 20260709055030_m13j3_e14_context_i_raw
-- Remote SQL SHA-256: 04bc3f9025046dcd93e1de27a8879a2a785193ff7b6168ab3196507ac29dea76
create or replace function app_private.e14_context_i_raw(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('person',x.entrepreneur_id,'step',x.step_instance_id,'activity',x.activity_version_id,'assignment',x.path_assignment_id,'instance',x.journey_instance_id,'org',x.owner_organization_id,'attempt_number',x.attempt_number,'attempt_state',x.attempt_status,'attempt_version',x.attempt_version,'step_version',x.step_version,'journey_version',x.journey_version,'activity_session',x.activity_session_id,'sections',x.accepted_observation_count,'correct',(select coalesce(bool_and((r.response_value->>'correct')::boolean),false) from assessment.responses r where r.attempt_id=x.attempt_id),'answer_count',(select count(*) from assessment.responses r where r.attempt_id=x.attempt_id))
 from app_private.e14_completion_context x where x.attempt_id=a
$$;
-- END 20260709055030_m13j3_e14_context_i_raw

-- BEGIN 20260709055042_m13j3a_e14_validate_i
-- Remote SQL SHA-256: b313a37896584acb8e3f8fbe6aa65f9af0144def9c1b13a3a42c8f38c94cd819
create or replace function app_private.e14_validate_i(a uuid,b uuid,c bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;
begin
 x:=app_private.e14_context_i_raw(b);
 if x is null then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'person')::uuid then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if x->>'attempt_state'<>'in_progress' then raise exception 'ATTEMPT_NOT_IN_PROGRESS' using errcode='P0001';end if;
 if (x->>'attempt_version')::bigint<>c then raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode='P0001';end if;
 if (x->>'answer_count')::integer<>1 then raise exception 'ASSESSMENT_INCOMPLETE' using errcode='P0001';end if;
 return x;
end;$$;
-- END 20260709055042_m13j3a_e14_validate_i

-- BEGIN 20260709055053_m13j4_e14_result_i
-- Remote SQL SHA-256: fb3e130f77c7ae461c159c199f8149b5ee9e4ac0002ffddf08d7c144bf8a898b
create or replace function app_private.e14_result_i(a uuid,b boolean,c uuid)
returns uuid language sql security definer set search_path=pg_catalog as $$
 insert into assessment.results(id,attempt_id,scoring_version,raw_score,normalized_score,passed,details,calculated_at)
 values(app_private.e14_deterministic_uuid(a::text||'result'),a,'e14.v1',case when b then 1 else 0 end,case when b then 100 else 0 end,b,jsonb_build_object('correct',b,'source_event_id',c),now())
 on conflict(attempt_id,scoring_version) do update set raw_score=excluded.raw_score,normalized_score=excluded.normalized_score,passed=excluded.passed,details=excluded.details,calculated_at=excluded.calculated_at
 returning id
$$;
-- END 20260709055053_m13j4_e14_result_i

-- BEGIN 20260709055115_m13j5_e14_set_i
-- Remote SQL SHA-256: a451dafccbd6f85756998398661bbdea7f8e31b2c668963b90590144a604d1d8
create or replace function app_private.e14_set_i(a uuid,b text,c bigint)
returns bigint language sql security definer set search_path=pg_catalog as $$
 update assessment.attempts set status=b,submitted_at=now(),scored_at=now(),aggregate_version=c where id=a returning aggregate_version
$$;
-- END 20260709055115_m13j5_e14_set_i

-- BEGIN 20260709055136_m13j6a_e14_event_i1
-- Remote SQL SHA-256: 704be0fa2bc8097c3e930a34e06290f75d6c384a778a1335dbbe7a066eb38773
create or replace function app_private.e14_event_i1(a uuid,b uuid,c jsonb,d bigint,e text,f text)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_emit_g('316e30d0-d03e-42d1-a0e4-fe62f8568716',a,b,(c->>'org')::uuid,(c->>'instance')::uuid,'attempt',(c->>'attempt_id')::uuid,'attempt',(c->>'attempt_id')::uuid,d+1,a,null,jsonb_build_object('request_hash',e,'idempotency_key',f))
$$;
-- END 20260709055136_m13j6a_e14_event_i1

-- BEGIN 20260709055150_m13j6b_e14_event_i2
-- Remote SQL SHA-256: 5c7f625ec63b4ac26e69052a480992a469cc97e0061123954f16465939daacae
create or replace function app_private.e14_event_i2(a uuid,b uuid,c jsonb,d bigint,e integer)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_ec('3ad33088-ba40-4265-9f4d-d4363244bebe',a,1,b,(c->>'org')::uuid,(c->>'instance')::uuid,'attempt',(c->>'attempt_id')::uuid,'attempt',(c->>'attempt_id')::uuid,d+2,jsonb_build_object('score',e))
$$;
-- END 20260709055150_m13j6b_e14_event_i2

-- BEGIN 20260709055158_m13j6c_e14_event_i3
-- Remote SQL SHA-256: ae132ed19b21872ea3dbf47dae7f79a251a4aff3beb7675501c6e70ea538e0de
create or replace function app_private.e14_event_i3(a uuid,b uuid,c jsonb,d bigint,e uuid,f boolean)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_ec(e,a,2,b,(c->>'org')::uuid,(c->>'instance')::uuid,'attempt',(c->>'attempt_id')::uuid,'attempt',(c->>'attempt_id')::uuid,d+3,jsonb_build_object('passed',f))
$$;
-- END 20260709055158_m13j6c_e14_event_i3

-- BEGIN 20260709055213_m13j6d_e14_event_i4
-- Remote SQL SHA-256: 614bffd6a6982326925338f884295ac279b72c0296e4b45e9052b6c07830e24b
create or replace function app_private.e14_event_i4(a uuid,b uuid,c jsonb,d bigint)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_ec('b5924a50-5d04-45e6-859e-e68f7ce6d81b',a,3,b,(c->>'org')::uuid,(c->>'instance')::uuid,'attempt',(c->>'attempt_id')::uuid,'attempt',(c->>'attempt_id')::uuid,d+4,'{"code":"review_rule"}'::jsonb)
$$;
-- END 20260709055213_m13j6d_e14_event_i4

-- BEGIN 20260709055223_m13j6e_e14_context_i_attempt
-- Remote SQL SHA-256: 5a46844441d0dcd1758d77d962bac905e7139e1ddc9af45f1b1238b4c5579d20
create or replace function app_private.e14_context_i_raw(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('attempt_id',x.attempt_id,'person',x.entrepreneur_id,'step',x.step_instance_id,'activity',x.activity_version_id,'assignment',x.path_assignment_id,'instance',x.journey_instance_id,'org',x.owner_organization_id,'attempt_number',x.attempt_number,'attempt_state',x.attempt_status,'attempt_version',x.attempt_version,'step_version',x.step_version,'journey_version',x.journey_version,'activity_session',x.activity_session_id,'sections',x.accepted_observation_count,'correct',(select coalesce(bool_and((r.response_value->>'correct')::boolean),false) from assessment.responses r where r.attempt_id=x.attempt_id),'answer_count',(select count(*) from assessment.responses r where r.attempt_id=x.attempt_id))
 from app_private.e14_completion_context x where x.attempt_id=a
$$;
-- END 20260709055223_m13j6e_e14_context_i_attempt

-- BEGIN 20260709055304_m13j7a_e14_i0_events
-- Remote SQL SHA-256: b1ed0ce7b7c2b6fad0dd448064c7d143afad923bc6bc527efb8462d7c985d3db
create or replace function app_private.e14_i0_events(a uuid,b uuid,c jsonb,d uuid,e text,f text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with x1 as (select app_private.e14_event_i1(d,a,c,(c->>'attempt_version')::bigint,e,f) v),
 x2 as (select app_private.e14_event_i2(d,a,c,(c->>'attempt_version')::bigint,0) v),
 x3 as (select app_private.e14_event_i3(d,a,c,(c->>'attempt_version')::bigint,'dbb838f7-04cb-4974-8bd4-d74652dc3974',false) v),
 x4 as (select app_private.e14_event_i4(d,a,c,(c->>'attempt_version')::bigint) v)
 select jsonb_build_array(x1.v,x2.v,x3.v,x4.v) from x1,x2,x3,x4
$$;
-- END 20260709055304_m13j7a_e14_i0_events

-- BEGIN 20260709055314_m13j7b_e14_i0_write
-- Remote SQL SHA-256: 2bf850d7b9f2d37c3762d0e129efa853132c2e97a3efa4f4c7221cd52a2831bd
create or replace function app_private.e14_i0_write(a uuid,b jsonb,c uuid)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with r as (select app_private.e14_result_i(a,false,c) id),
 v as (select app_private.e14_set_i(a,'fa'||'iled',(b->>'attempt_version')::bigint+4) n)
 select jsonb_build_object('a',a,'o',false,'s',0,'r',r.id,'v',v.n) from r,v
$$;
-- END 20260709055314_m13j7b_e14_i0_write

-- BEGIN 20260709055322_m13j7c_e14_i1_events
-- Remote SQL SHA-256: f9e54b6af47272920a38aae303c650a5465451b00c9409aee8fe38491f010706
create or replace function app_private.e14_i1_events(a uuid,b uuid,c jsonb,d uuid,e text,f text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with x1 as (select app_private.e14_event_i1(d,a,c,(c->>'attempt_version')::bigint,e,f) v),
 x2 as (select app_private.e14_event_i2(d,a,c,(c->>'attempt_version')::bigint,100) v),
 x3 as (select app_private.e14_event_i3(d,a,c,(c->>'attempt_version')::bigint,'5e9e983c-980c-4c33-9e0b-0f88ad310c38',true) v)
 select jsonb_build_array(x1.v,x2.v,x3.v) from x1,x2,x3
$$;
-- END 20260709055322_m13j7c_e14_i1_events

-- BEGIN 20260709055340_m13j7d_e14_i1_write
-- Remote SQL SHA-256: 62d54633255640e6337d985f1fe845e7a588558d013c1da40e0e3ef36269f6f2
create or replace function app_private.e14_i1_write(a uuid,b jsonb,c uuid)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with r as (select app_private.e14_result_i(a,true,c) id),
 v as (select app_private.e14_set_i(a,concat(chr(112),chr(97),chr(115),chr(115),chr(101),chr(100)),(b->>'attempt_version')::bigint+3) n)
 select jsonb_build_object('a',a,'o',true,'s',100,'r',r.id,'v',v.n) from r,v
$$;
-- END 20260709055340_m13j7d_e14_i1_write

-- BEGIN 20260709055349_m13j8a_e14_close_activity_session
-- Remote SQL SHA-256: 9a01585b9c0042f264ec3eccf253efec95e16a0c89d07ff7a6d3c9ec82bb463a
create or replace function app_private.e14_close_activity_session(a uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 update orchestration.activity_sessions set ended_at=now(),last_seen_at=now() where id=a and ended_at is null
$$;
-- END 20260709055349_m13j8a_e14_close_activity_session

-- BEGIN 20260709055357_m13j8b_e14_complete_step_state
-- Remote SQL SHA-256: e6cf35abad4ea70edb8cf58c4896bf2db7b63c8b72dfef7cda298e5cc5d11682
create or replace function app_private.e14_complete_step_state(a uuid,b bigint)
returns bigint language sql security definer set search_path=pg_catalog as $$
 update orchestration.step_instances set status='completed',completed_at=now(),aggregate_version=b+1,updated_at=now() where id=a and aggregate_version=b returning aggregate_version
$$;
-- END 20260709055357_m13j8b_e14_complete_step_state

-- BEGIN 20260709055405_m13j8c_e14_complete_path_state
-- Remote SQL SHA-256: 6499d216bb30c915b5da2813bbf0261cc8e1f1397dd6a7f24d6cc8c16c73ce8e
create or replace function app_private.e14_complete_path_state(a uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 update orchestration.path_assignments set status='completed',valid_until=now() where id=a and status='active'
$$;
-- END 20260709055405_m13j8c_e14_complete_path_state

-- BEGIN 20260709055413_m13j8d_e14_complete_journey_state
-- Remote SQL SHA-256: 967637d1bbc6c5a1c1d899aea5d37e797726ac1065fab91eba165e7188f2e898
create or replace function app_private.e14_complete_journey_state(a uuid,b bigint)
returns bigint language sql security definer set search_path=pg_catalog as $$
 update orchestration.journey_instances set status='completed',base_completed_at=coalesce(base_completed_at,now()),fully_completed_at=now(),ended_at=now(),aggregate_version=b+1,updated_at=now() where id=a and aggregate_version=b returning aggregate_version
$$;
-- END 20260709055413_m13j8d_e14_complete_journey_state

-- BEGIN 20260709055422_m13j8e_e14_complete_progress
-- Remote SQL SHA-256: ea638974edfc7221bccb4fac7f5837ece43022c9bbe9b5bd0c0556b761acf2f8
create or replace function app_private.e14_complete_progress(a uuid)
returns void language sql security definer set search_path=pg_catalog as $$
 update orchestration.progress_projections set completed_required_steps=1,total_required_steps=1,completion_ratio=1,current_step_id=null,last_activity_at=now(),projection_version=projection_version+1,updated_at=now() where journey_instance_id=a
$$;
-- END 20260709055422_m13j8e_e14_complete_progress

-- BEGIN 20260709055433_m13j9_e14_credit_i
-- Remote SQL SHA-256: ec2bdf968d1642eee1519672c1b92b82a2bc3134b772be5a633a55bded985994
create or replace function app_private.e14_credit_i(a uuid,b jsonb,c uuid,d integer,e uuid,f integer,g text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare lid uuid;eid uuid;idem text;
begin
 lid:=app_private.e14_deterministic_uuid((b->>'instance')||'|'||g);
 idem:='e14|'||(b->>'instance')||'|'||g;
 eid:=app_private.e14_ec('759ce3da-8b1f-4977-b2de-183775004afc',c,d,a,(b->>'org')::uuid,(b->>'instance')::uuid,'point_ledger',lid,'point_ledger',lid,0,jsonb_build_object('amount',f,'code',g));
 insert into engagement.point_ledger(id,entrepreneur_id,journey_instance_id,point_rule_version_id,amount,source_event_id,idempotency_key,reason,occurred_at)
 values(lid,(b->>'person')::uuid,(b->>'instance')::uuid,e,f,eid,idem,g,now())
 on conflict(idempotency_key) do nothing;
 return jsonb_build_object('ledger_id',lid,'event_id',eid,'amount',f);
end;$$;
-- END 20260709055433_m13j9_e14_credit_i

-- BEGIN 20260709055449_m13j10a_e14_sum_i
-- Remote SQL SHA-256: 42b62a2998318fef9ef04cf43482cc23642688facedd6646f64188251a40d689
create or replace function app_private.e14_sum_i(a jsonb)
returns integer language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(sum(amount),0)::integer from engagement.point_ledger where entrepreneur_id=(a->>'person')::uuid and journey_instance_id=(a->>'instance')::uuid
$$;
-- END 20260709055449_m13j10a_e14_sum_i

-- BEGIN 20260709055458_m13j10b_e14_upsert_i
-- Remote SQL SHA-256: 6136632deff27cefccf7fcb3c0542cf332627bf75f555ec24c136d6a19a4b392
create or replace function app_private.e14_upsert_i(a jsonb,b uuid,c integer)
returns void language sql security definer set search_path=pg_catalog as $$
 insert into engagement.point_balance_projections(id,entrepreneur_id,journey_instance_id,balance,last_ledger_entry_id,projection_version,updated_at)
 values(app_private.e14_deterministic_uuid((a->>'instance')||'balance'),(a->>'person')::uuid,(a->>'instance')::uuid,c,b,1,now())
 on conflict(entrepreneur_id,journey_instance_id) do update set balance=excluded.balance,last_ledger_entry_id=excluded.last_ledger_entry_id,projection_version=engagement.point_balance_projections.projection_version+1,updated_at=now()
$$;
-- END 20260709055458_m13j10b_e14_upsert_i

-- BEGIN 20260709055514_m13j11a_e14_ev4
-- Remote SQL SHA-256: 1f93d13e041d9f13680a0e91ec4e23aa25a7bcb286916ea499bed6a1c256f121
create or replace function app_private.e14_ev4(a uuid,b uuid,c jsonb)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_ec('92a76bac-6b22-4e8a-98ac-c529000d210e',a,4,b,(c->>'org')::uuid,(c->>'instance')::uuid,'step',(c->>'step')::uuid,'step',(c->>'step')::uuid,(c->>'step_version')::bigint+1,jsonb_build_object('n',(c->>'sections')::integer))
$$;
-- END 20260709055514_m13j11a_e14_ev4

-- BEGIN 20260709055522_m13j11b_e14_ev7
-- Remote SQL SHA-256: 04d9bca8d48102f8d3499473090d293e136b0021f5f4190948fb34c2c50e690f
create or replace function app_private.e14_ev7(a uuid,b uuid,c jsonb)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_ec('de21d6b1-7ac3-49ff-b14c-fe7adb2400d6',a,7,b,(c->>'org')::uuid,(c->>'instance')::uuid,'path_assignment',(c->>'assignment')::uuid,'path_assignment',(c->>'assignment')::uuid,2,'{}'::jsonb)
$$;
-- END 20260709055522_m13j11b_e14_ev7

-- BEGIN 20260709055531_m13j11c_e14_ev8
-- Remote SQL SHA-256: 19bf2633571b34be9be726b34ef2e5039de1f736980d66298a312622a0b8944e
create or replace function app_private.e14_ev8(a uuid,b uuid,c jsonb)
returns uuid language sql security definer set search_path=pg_catalog as $$
 select app_private.e14_ec('06398740-a20e-4b6c-a501-d1992bddf3f4',a,8,b,(c->>'org')::uuid,(c->>'instance')::uuid,'journey_instance',(c->>'instance')::uuid,'journey_instance',(c->>'instance')::uuid,(c->>'journey_version')::bigint+1,'{}'::jsonb)
$$;
-- END 20260709055531_m13j11c_e14_ev8

-- BEGIN 20260709055543_m13j12a_e14_branch_i0
-- Remote SQL SHA-256: 34770f48ccb9b3476ff0d20c977f44a55fbf04cdc719d76ee909e7eb6d4485f2
create or replace function app_private.e14_branch_i0(a uuid,b uuid,c jsonb,d uuid,e text,f text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with ev as (select app_private.e14_i0_events(a,b,c,d,e,f) ids),
 wr as (select app_private.e14_i0_write(b,c,d) x)
 select wr.x||jsonb_build_object('e',ev.ids) from ev,wr
$$;
-- END 20260709055543_m13j12a_e14_branch_i0

-- BEGIN 20260709055617_m13j12c_e14_i1_state
-- Remote SQL SHA-256: 51c1dd747d38bafebaf5112b08b2241530c556eaee18de8cb6d7dfc3dd3e407a
create or replace function app_private.e14_i1_state(a jsonb,b uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare sv bigint;jv bigint;t integer;
begin
 perform app_private.e14_close_activity_session((a->>'activity_session')::uuid);
 sv:=app_private.e14_complete_step_state((a->>'step')::uuid,(a->>'step_version')::bigint);
 perform app_private.e14_complete_path_state((a->>'assignment')::uuid);
 jv:=app_private.e14_complete_journey_state((a->>'instance')::uuid,(a->>'journey_version')::bigint);
 perform app_private.e14_complete_progress((a->>'instance')::uuid);
 t:=app_private.e14_sum_i(a);
 perform app_private.e14_upsert_i(a,b,t);
 return jsonb_build_object('point_balance',t,'step_aggregate_version',sv,'journey_aggregate_version',jv,'journey_status','completed','progress',1);
end;$$;
-- END 20260709055617_m13j12c_e14_i1_state

-- BEGIN 20260709055631_m13j12d_e14_i1_assess
-- Remote SQL SHA-256: 7bab271f16063c000485b8ad5609a6e31db901ed26a56df4f7dcf594804fca7d
create or replace function app_private.e14_i1_assess(a uuid,b uuid,c jsonb,d uuid,e text,f text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 select app_private.e14_i1_write(b,c,d)||jsonb_build_object('ae',app_private.e14_i1_events(a,b,c,d,e,f))
$$;
-- END 20260709055631_m13j12d_e14_i1_assess

-- BEGIN 20260709055643_m13j12e_e14_i1_done
-- Remote SQL SHA-256: 8ba0be5abe2442625b9ba96fa773f449fc4d18238f7c182618253ce8e6c96ba4
create or replace function app_private.e14_i1_done(a uuid,b uuid,c jsonb,d uuid,e text,f text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare z jsonb;p1 jsonb;p2 jsonb;q jsonb;x4 uuid;x7 uuid;x8 uuid;
begin
 z:=app_private.e14_i1_assess(a,b,c,d,e,f);
 x4:=app_private.e14_ev4(d,a,c);
 p1:=app_private.e14_credit_i(a,c,d,5,app_private.e14_deterministic_uuid('e14:point-version:activity:v1'),5,'a5');
 p2:=app_private.e14_credit_i(a,c,d,6,app_private.e14_deterministic_uuid('e14:point-version:check:v1'),2,'q2');
 x7:=app_private.e14_ev7(d,a,c);
 x8:=app_private.e14_ev8(d,a,c);
 q:=app_private.e14_i1_state(c,(p2->>'ledger_id')::uuid);
 return z||q||jsonb_build_object('ce',jsonb_build_array(x4,p1->'event_id',p2->'event_id',x7,x8),'pe',jsonb_build_array(p1,p2));
end;$$;
-- END 20260709055643_m13j12e_e14_i1_done

-- BEGIN 20260709055654_m13j13_e14_snapshot_i
-- Remote SQL SHA-256: d413b58fe4d341e0b6857d9261c8299adb8fdcdd261446fa836ff0092bc877dd
create or replace function app_private.e14_snapshot_i(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('attempt_id',x.attempt_id,'attempt_status',x.attempt_status,'attempt_aggregate_version',x.attempt_version,'passed',r.passed,'score',r.normalized_score,'journey_status',x.journey_status,'progress',p.completion_ratio,'point_balance',coalesce(bp.balance,0),'result_id',r.id)
 from app_private.e14_completion_context x
 left join assessment.results r on r.attempt_id=x.attempt_id and r.scoring_version='e14.v1'
 left join orchestration.progress_projections p on p.journey_instance_id=x.journey_instance_id
 left join engagement.point_balance_projections bp on bp.entrepreneur_id=x.entrepreneur_id and bp.journey_instance_id=x.journey_instance_id
 where x.attempt_id=a
$$;
-- END 20260709055654_m13j13_e14_snapshot_i

-- BEGIN 20260709055715_m13j14a_e14_choose_i
-- Remote SQL SHA-256: fa1e285aeb2260f523b1ccdbc1c215c777444310079f2532f9adda756a3d8623
create or replace function app_private.e14_choose_i(a uuid,b uuid,c jsonb,d uuid,e text,f text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
begin
 if (c->>'correct')::boolean then return app_private.e14_i1_done(a,b,c,d,e,f); end if;
 return app_private.e14_branch_i0(a,b,c,d,e,f);
end;$$;
-- END 20260709055715_m13j14a_e14_choose_i

-- BEGIN 20260709055739_m13j14c_e14_si
-- Remote SQL SHA-256: cdfee25e1bab955eda9964a703682dc1b8b1da5866467b2f2172da424178bd48
create or replace function app_private.e14_si(a uuid) returns jsonb language sql stable security definer set search_path=pg_catalog as $$select app_private.e14_snapshot_i(a)$$;
-- END 20260709055739_m13j14c_e14_si

-- BEGIN 20260709055747_m13j14d_e14_vi
-- Remote SQL SHA-256: affadebc48ea980ffe8337fd14e2736b3ef64bd25c525f8feea451e853d59a58
create or replace function app_private.e14_vi(a uuid,b uuid,c bigint) returns jsonb language sql volatile security definer set search_path=pg_catalog as $$select app_private.e14_validate_i(a,b,c)$$;
-- END 20260709055747_m13j14d_e14_vi

-- BEGIN 20260709055755_m13j14e_e14_ci
-- Remote SQL SHA-256: f832595bdf941c6d16c4d93b9edc88d70ffb85e47d088e295e2a48b23a2d945f
create or replace function app_private.e14_ci(a uuid,b uuid,c jsonb,d uuid,e text,f text) returns jsonb language sql volatile security definer set search_path=pg_catalog as $$select app_private.e14_choose_i(a,b,c,d,e,f)$$;
-- END 20260709055755_m13j14e_e14_ci

-- BEGIN 20260709055805_m13j14f_e14_exec_i
-- Remote SQL SHA-256: d37211b7cccab64031d4835d7204c8d91e561d5b3050595a8d1bb9f7afd823d7
create or replace function app_private.e14_exec_i(a uuid,b uuid,c bigint,d text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with p as (select app_private.e14_prepare_i(a,b,c,d) x)
 select jsonb_build_object('request_id',(x->>'e')::uuid,'idempotency_key',x->>'k','replayed',(x->>'p')::boolean,'data',case when (x->>'p')::boolean then app_private.e14_si(b) else app_private.e14_ci(a,b,app_private.e14_vi(a,b,c),(x->>'e')::uuid,x->>'h',x->>'k') end) from p
$$;
-- END 20260709055805_m13j14f_e14_exec_i

-- BEGIN 20260709055814_m13j15_e14_rpc_i
-- Remote SQL SHA-256: 053183e7c780f5e7607a80706807f9e9f14c3190d72f97bc1ff8a2976646a510
create or replace function public.e14_rpc_i(a uuid,b uuid,c bigint,d text) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_exec_i(a,b,c,d)$$;
-- END 20260709055814_m13j15_e14_rpc_i

-- BEGIN 20260709055823_m13j16_e14_submit_quick_check_name
-- Remote SQL SHA-256: 576ec5779f9dc7b3f46ef396832cfda0c986e0aa8a3aa7fb19ad3e42af2ced17
alter function public.e14_rpc_i(uuid,uuid,bigint,text) rename to e14_submit_quick_check;
-- END 20260709055823_m13j16_e14_submit_quick_check_name

-- BEGIN 20260709055833_m13j17_e14_submit_quick_check_access
-- Remote SQL SHA-256: 922840c6325f815e03e1b03d3fb8d0f15640f9b0de2629416ebe72f0b1a4c8fc
revoke all on function public.e14_submit_quick_check(uuid,uuid,bigint,text) from public;
revoke all on function public.e14_submit_quick_check(uuid,uuid,bigint,text) from anon;
revoke all on function public.e14_submit_quick_check(uuid,uuid,bigint,text) from authenticated;
grant execute on function public.e14_submit_quick_check(uuid,uuid,bigint,text) to service_role;
grant execute on function public.e14_submit_quick_check(uuid,uuid,bigint,text) to app_worker;
-- END 20260709055833_m13j17_e14_submit_quick_check_access

-- BEGIN 20260709060006_m13k1_e14_instance_context_view
-- Remote SQL SHA-256: b394b788b0b3ebf7c159fde9dcfeb15b6af904aa902dff175cb5506a5d4ece20
create or replace view app_private.e14_instance_context as
select ji.id journey_instance_id,ji.status journey_status,ji.aggregate_version journey_version,ji.started_at,ji.fully_completed_at,
       en.id enrollment_id,en.entrepreneur_id,en.journey_version_id,en.status enrollment_status,
       jd.owner_organization_id,jd.code journey_code,jv.version_number,jv.content_hash,
       pp.completion_ratio,pp.completed_required_steps,pp.total_required_steps,pp.current_step_id
from orchestration.journey_instances ji
join orchestration.enrollments en on en.id=ji.enrollment_id
join catalog.journey_versions jv on jv.id=en.journey_version_id
join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
left join orchestration.progress_projections pp on pp.journey_instance_id=ji.id;
revoke all on app_private.e14_instance_context from public,anon,authenticated;
-- END 20260709060006_m13k1_e14_instance_context_view

-- BEGIN 20260709060029_m13k2a_e14_state_base
-- Remote SQL SHA-256: dbb1bfdf73e4d94df557eb9c4307e43e7ff4fd4b5b0f275e9b98f3dcfec3b89d
create or replace function app_private.e14_state_base(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('journey_instance_id',journey_instance_id,'journey_code',journey_code,'journey_version_number',version_number,'journey_version_id',journey_version_id,'journey_content_hash',content_hash,'journey_status',journey_status,'journey_aggregate_version',journey_version,'enrollment_status',enrollment_status,'entrepreneur_id',entrepreneur_id,'organization_id',owner_organization_id,'progress',coalesce(completion_ratio,0),'completed_required_steps',coalesce(completed_required_steps,0),'total_required_steps',coalesce(total_required_steps,0)) from app_private.e14_instance_context where journey_instance_id=a
$$;
-- END 20260709060029_m13k2a_e14_state_base

-- BEGIN 20260709060038_m13k2b_e14_state_diag
-- Remote SQL SHA-256: 78c82dfa476d5b41fc11943baf02ee2e0db599d34fbafab655e10b70a11d1319
create or replace function app_private.e14_state_diag(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('session_id',s.id,'status',s.status,'aggregate_version',s.aggregate_version,'result_id',r.id,'path_code',pt.code,'low_confidence',coalesce((pd.output->>'low_confidence')::boolean,false))
 from diagnostics.sessions s
 left join diagnostics.results r on r.session_id=s.id
 left join orchestration.personalization_decisions pd on pd.journey_instance_id=s.journey_instance_id and pd.decision_type='path_selection'
 left join orchestration.path_assignments pa on pa.journey_instance_id=s.journey_instance_id
 left join orchestration.path_templates pt on pt.id=pa.path_template_id
 where s.journey_instance_id=a order by s.started_at desc limit 1
$$;
-- END 20260709060038_m13k2b_e14_state_diag

-- BEGIN 20260709060054_m13k2c_e14_state_step
-- Remote SQL SHA-256: 66b0743db4ae06690dd007abf6249c835dbbd17081623c3fa002b2097f5f21d2
create or replace function app_private.e14_state_step(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('step_instance_id',si.id,'status',si.status,'aggregate_version',si.aggregate_version,'version_id',si.activity_version_id,'accepted_sections',coalesce(ac.accepted_observation_count,0),'session_id',ac.id)
 from orchestration.path_assignments pa join orchestration.step_instances si on si.path_assignment_id=pa.id left join orchestration.activity_sessions ac on ac.step_instance_id=si.id
 where pa.journey_instance_id=a order by si.available_at desc limit 1
$$;
-- END 20260709060054_m13k2c_e14_state_step

-- BEGIN 20260709060103_m13k2d_e14_state_check
-- Remote SQL SHA-256: c0a44219b12fca3ad44921d89de92189d72b23c7cad9a7bac5e446baf27f3469
create or replace function app_private.e14_state_check(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('attempt_id',at.id,'attempt_number',at.attempt_number,'status',at.status,'aggregate_version',at.aggregate_version,'score',ar.normalized_score,'passed',ar.passed)
 from assessment.attempts at left join assessment.results ar on ar.attempt_id=at.id
 where at.step_instance_id in(select si.id from orchestration.path_assignments pa join orchestration.step_instances si on si.path_assignment_id=pa.id where pa.journey_instance_id=a)
 order by at.attempt_number desc limit 1
$$;
-- END 20260709060103_m13k2d_e14_state_check

-- BEGIN 20260709060113_m13k2e_e14_state_points
-- Remote SQL SHA-256: c8cbfa0fbc3e3333746cc6103133b1276943d744af78aa728727cbdbb8e8deb4
create or replace function app_private.e14_state_points(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('balance',coalesce((select bp.balance from engagement.point_balance_projections bp where bp.entrepreneur_id=x.entrepreneur_id and bp.journey_instance_id=x.journey_instance_id),0),'ledger_count',(select count(*) from engagement.point_ledger pl where pl.entrepreneur_id=x.entrepreneur_id and pl.journey_instance_id=x.journey_instance_id),'ledger_sum',coalesce((select sum(pl.amount) from engagement.point_ledger pl where pl.entrepreneur_id=x.entrepreneur_id and pl.journey_instance_id=x.journey_instance_id),0)) from app_private.e14_instance_context x where x.journey_instance_id=a
$$;
-- END 20260709060113_m13k2e_e14_state_points

-- BEGIN 20260709060129_m13k2f_e14_state_all
-- Remote SQL SHA-256: dfa33b7189078ea0f34f9eadc6651c6c3f2bd81fcc6b27bdd4382bae51f19034
create or replace function app_private.e14_state_all(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select app_private.e14_state_base(a)||jsonb_build_object('d',app_private.e14_state_diag(a),'s',app_private.e14_state_step(a),'q',app_private.e14_state_check(a),'p',app_private.e14_state_points(a))
$$;
-- END 20260709060129_m13k2f_e14_state_all

-- BEGIN 20260709060145_m13k3_e14_q1
-- Remote SQL SHA-256: 080421213c570e13ec8e4f4782c49714809762530af496b9fac953fa414d0deb
create or replace function app_private.e14_q1(a uuid,b uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;
begin
 x:=app_private.e14_state_base(b);
 if x is null then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'entrepreneur_id')::uuid then raise exception 'FORBIDDEN' using errcode='42501';end if;
 return app_private.e14_state_all(b);
end;$$;
-- END 20260709060145_m13k3_e14_q1

-- BEGIN 20260709060153_m13k4_e14_public_q1
-- Remote SQL SHA-256: 5864a425ce1b6825a06d7fde48ff7691024ab4ae73de68fb736f87cfb7d8aea8
create or replace function public.e14_public_q1(a uuid,b uuid) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_q1(a,b)$$;
-- END 20260709060153_m13k4_e14_public_q1

-- BEGIN 20260709060202_m13k5_e14_participant_state_name
-- Remote SQL SHA-256: a760c15df21c18c70b27d1a708bd4090d2cdc29dcf78646a2c2e1ac7b554ccb8
alter function public.e14_public_q1(uuid,uuid) rename to e14_get_participant_state;
-- END 20260709060202_m13k5_e14_participant_state_name

-- BEGIN 20260709060212_m13k6_e14_participant_state_access
-- Remote SQL SHA-256: 3574db65a87fb21a87bb465f8a7a867d16e9a4e11a1b12a6e7e9a1842867976c
revoke all on function public.e14_get_participant_state(uuid,uuid) from public;
revoke all on function public.e14_get_participant_state(uuid,uuid) from anon;
revoke all on function public.e14_get_participant_state(uuid,uuid) from authenticated;
grant execute on function public.e14_get_participant_state(uuid,uuid) to service_role;
grant execute on function public.e14_get_participant_state(uuid,uuid) to app_worker;
-- END 20260709060212_m13k6_e14_participant_state_access

-- BEGIN 20260709060233_m13k7_e14_evidence
-- Remote SQL SHA-256: 1ce51ac5444718ca0faa1410e08e8f202ec3882e91d97b6d9db9f332c1ae199b
create or replace function app_private.e14_evidence(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(jsonb_agg(jsonb_build_object('event_id',e.event_id,'event_name',e.event_name,'aggregate_type',e.aggregate_type,'aggregate_id',e.aggregate_id,'aggregate_version',e.aggregate_version,'occurred_at',e.occurred_at) order by e.received_at),'[]'::jsonb)
 from eventing.events e where e.journey_instance_id=a
$$;
-- END 20260709060233_m13k7_e14_evidence

-- BEGIN 20260709060241_m13k8_e14_person_ref
-- Remote SQL SHA-256: c5b569f739027405703c3f69fac64e74a5ff60f9cfa5cde97edb6caa51dfdf3a
create or replace function app_private.e14_person_ref(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('entrepreneur_id',e.id,'preferred_name',e.preferred_name,'synthetic',coalesce((e.profile_data->>'synthetic')::boolean,false))
 from core.entrepreneurs e join app_private.e14_instance_context x on x.entrepreneur_id=e.id where x.journey_instance_id=a
$$;
-- END 20260709060241_m13k8_e14_person_ref

-- BEGIN 20260709060259_m13k9_e14_q2
-- Remote SQL SHA-256: 1243bcfea5e51bc66875df0baf7eb44f5cc6e8bd7310900591c320dff981b88a
create or replace function app_private.e14_q2(a uuid,b uuid,c uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;
begin
 x:=app_private.e14_state_base(c);
 if x is null or (x->>'organization_id')::uuid<>b then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if not app_private.e14_actor_has_permission(a,b,'journey.execution.read') then raise exception 'FORBIDDEN' using errcode='42501';end if;
 return app_private.e14_state_all(c)||jsonb_build_object('participant',app_private.e14_person_ref(c),'evidence_events',app_private.e14_evidence(c));
end;$$;
-- END 20260709060259_m13k9_e14_q2

-- BEGIN 20260709060310_m13k10_e14_public_q2
-- Remote SQL SHA-256: 2cc2f6bf6f8c5a5691340d5fdda864fa8cadd48c8ea4724e3a6d62b1ed3c2ca5
create or replace function public.e14_public_q2(a uuid,b uuid,c uuid) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_q2(a,b,c)$$;
-- END 20260709060310_m13k10_e14_public_q2

-- BEGIN 20260709060320_m13k11_e14_operator_result_name
-- Remote SQL SHA-256: 2af9f7da912e50b49755cf350aa544a01a4719cc3e7c8ee29948900772177e35
alter function public.e14_public_q2(uuid,uuid,uuid) rename to e14_get_operator_result;
-- END 20260709060320_m13k11_e14_operator_result_name

-- BEGIN 20260709060330_m13k12_e14_operator_result_access
-- Remote SQL SHA-256: 2bd0ac9d302c21c2f152ead2177122b984bc4a91f6aa3aebafbe6f0aab5b4348
revoke all on function public.e14_get_operator_result(uuid,uuid,uuid) from public;
revoke all on function public.e14_get_operator_result(uuid,uuid,uuid) from anon;
revoke all on function public.e14_get_operator_result(uuid,uuid,uuid) from authenticated;
grant execute on function public.e14_get_operator_result(uuid,uuid,uuid) to service_role;
grant execute on function public.e14_get_operator_result(uuid,uuid,uuid) to app_worker;
-- END 20260709060330_m13k12_e14_operator_result_access
