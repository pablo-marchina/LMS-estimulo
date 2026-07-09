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

-- remote migration 20260709051242: m13b1_e14_fixture_identity
insert into iam.permission_definitions(id,code,resource_type,action,description)
values(app_private.e14_deterministic_uuid('e14:permission:journey.definition.publish'),'journey.definition.publish','journey_definition','publish','Publish an immutable journey version graph')
on conflict (code) do nothing;

