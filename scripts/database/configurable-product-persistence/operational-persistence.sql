set lock_timeout = '5s';
set statement_timeout = '5min';

-- Event contracts used by the transactional configurable-product persistence flow.
do $$
declare
  v_event_name text;
  v_schema jsonb;
begin
  foreach v_event_name in array array[
    'diagnostic.classification.persisted',
    'diagnostic.archetype.assigned',
    'personalization.activation.planned',
    'integration.hubspot.projection.requested'
  ]::text[] loop
    v_schema := jsonb_build_object(
      '$schema', 'https://json-schema.org/draft/2020-12/schema',
      'title', v_event_name,
      'type', 'object',
      'additionalProperties', true
    );

    insert into eventing.event_schemas(
      event_name,
      event_version,
      schema_uri,
      schema_document,
      schema_hash,
      status,
      published_at
    ) values (
      v_event_name,
      1,
      'urn:estimulo:event:' || v_event_name || ':1',
      v_schema,
      app_private.e14_request_hash(v_schema),
      'published',
      now()
    ) on conflict (event_name, event_version) do nothing;
  end loop;
end;
$$;

create or replace function public.persist_configurable_product_result(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_journey_instance_id uuid,
  p_submission jsonb,
  p_assignment jsonb,
  p_activation_batch jsonb,
  p_evidence jsonb,
  p_crm_projections jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_submission_id uuid;
  v_entrepreneur_id uuid;
  v_form_version_id uuid;
  v_assignment_id uuid;
  v_archetype_version_id uuid;
  v_supersedes_assignment_id uuid;
  v_owner_organization_id uuid;
  v_form_status text;
  v_reason text;
  v_actor_type text;
  v_is_new_submission boolean;
  v_submitted_at timestamptz;
  v_assigned_at timestamptz;
  v_request_hash text;
  v_command_event_id uuid;
  v_assignment_event_id uuid;
  v_activation_event_id uuid;
  v_result_id uuid;
  v_existing_hash text;
  v_existing_result jsonb;
  v_result jsonb;
  v_answer jsonb;
  v_activation jsonb;
  v_projection jsonb;
  v_answer_event_id uuid;
  v_projection_event_id uuid;
  v_question_id uuid;
  v_decision_id uuid;
  v_ordinal integer := 0;
  v_activation_count integer := 0;
  v_projection_count integer := 0;
  v_response_count integer := 0;
  v_schema_id uuid;
  v_calculation_version text;
begin
  if p_actor_user_account_id is null or p_organization_id is null then
    raise exception 'ACTOR_AND_ORGANIZATION_REQUIRED' using errcode = '22023';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = '22023';
  end if;
  if jsonb_typeof(p_submission) <> 'object'
     or jsonb_typeof(p_assignment) <> 'object'
     or jsonb_typeof(coalesce(p_evidence, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_crm_projections, '[]'::jsonb)) <> 'array'
     or (p_activation_batch is not null and p_activation_batch <> 'null'::jsonb and jsonb_typeof(p_activation_batch) <> 'object') then
    raise exception 'INVALID_CONFIGURABLE_PRODUCT_PAYLOAD' using errcode = '22023';
  end if;
  if jsonb_typeof(p_submission -> 'answers') <> 'array' then
    raise exception 'SUBMISSION_ANSWERS_REQUIRED' using errcode = '22023';
  end if;

  begin
    v_submission_id := (p_submission ->> 'submissionId')::uuid;
    v_entrepreneur_id := (p_submission ->> 'participantObjectId')::uuid;
    v_form_version_id := (p_submission ->> 'formVersionId')::uuid;
    v_assignment_id := (p_assignment ->> 'assignmentId')::uuid;
    v_archetype_version_id := nullif(p_assignment ->> 'archetypeVersionId', '')::uuid;
    v_supersedes_assignment_id := nullif(p_assignment ->> 'supersedesAssignmentId', '')::uuid;
    v_submitted_at := (p_submission ->> 'submittedAt')::timestamptz;
    v_assigned_at := (p_assignment ->> 'createdAt')::timestamptz;
  exception when others then
    raise exception 'INVALID_CONFIGURABLE_PRODUCT_IDENTIFIERS' using errcode = '22023';
  end;

  if p_assignment ->> 'submissionObjectId' is distinct from v_submission_id::text
     or p_assignment ->> 'formVersionId' is distinct from v_form_version_id::text then
    raise exception 'ASSIGNMENT_SUBMISSION_MISMATCH' using errcode = '22023';
  end if;

  v_reason := p_assignment ->> 'reason';
  if v_reason not in ('classified', 'recalculated', 'override') then
    raise exception 'INVALID_ASSIGNMENT_REASON' using errcode = '22023';
  end if;
  if v_reason = 'classified' and v_supersedes_assignment_id is not null then
    raise exception 'INITIAL_ASSIGNMENT_CANNOT_SUPERSEDE' using errcode = '22023';
  end if;
  if v_reason <> 'classified' and v_supersedes_assignment_id is null then
    raise exception 'SUPERSEDED_ASSIGNMENT_REQUIRED' using errcode = '22023';
  end if;
  if v_reason = 'override' and (
    jsonb_typeof(p_assignment -> 'override') <> 'object'
    or length(trim(coalesce(p_assignment #>> '{override,actorObjectId}', ''))) = 0
    or length(trim(coalesce(p_assignment #>> '{override,justification}', ''))) = 0
  ) then
    raise exception 'OVERRIDE_AUDIT_REQUIRED' using errcode = '22023';
  end if;

  v_request_hash := app_private.e14_request_hash(jsonb_build_object(
    'organizationId', p_organization_id,
    'journeyInstanceId', p_journey_instance_id,
    'submission', p_submission,
    'assignment', p_assignment,
    'activationBatch', p_activation_batch,
    'evidence', coalesce(p_evidence, '{}'::jsonb),
    'crmProjections', coalesce(p_crm_projections, '[]'::jsonb)
  ));
  v_command_event_id := app_private.e14_command_event_id(
    'persist_configurable_product_result',
    p_actor_user_account_id,
    v_submission_id,
    trim(p_idempotency_key)
  );

  select e.payload ->> 'request_hash', e.payload -> 'result'
    into v_existing_hash, v_existing_result
    from eventing.events e
   where e.event_id = v_command_event_id;

  if found then
    if v_existing_hash is distinct from v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = 'P0001';
    end if;
    return coalesce(v_existing_result, '{}'::jsonb) || jsonb_build_object('replayed', true);
  end if;

  select dd.owner_organization_id, dv.status
    into v_owner_organization_id, v_form_status
    from diagnostics.diagnostic_versions dv
    join diagnostics.diagnostic_definitions dd on dd.id = dv.diagnostic_definition_id
   where dv.id = v_form_version_id;

  if not found then
    raise exception 'FORM_VERSION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_owner_organization_id <> p_organization_id then
    raise exception 'FORM_ORGANIZATION_MISMATCH' using errcode = '28000';
  end if;
  if v_form_status <> 'published' then
    raise exception 'FORM_VERSION_NOT_PUBLISHED' using errcode = '55000';
  end if;

  perform app_private.set_request_context(
    p_actor_user_account_id,
    p_organization_id,
    trim(p_idempotency_key),
    'user'
  );

  if app_private.current_entrepreneur_id() = v_entrepreneur_id then
    v_actor_type := 'user';
  elsif app_private.has_permission(
    'participant.manage',
    p_organization_id,
    'entrepreneur',
    v_entrepreneur_id
  ) then
    v_actor_type := 'operator';
  else
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not exists (select 1 from core.entrepreneurs e where e.id = v_entrepreneur_id and e.status = 'active') then
    raise exception 'ENTREPRENEUR_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_journey_instance_id is not null and not exists (
    select 1
      from orchestration.journey_instances ji
      join orchestration.enrollments en on en.id = ji.enrollment_id
      join catalog.journey_versions jv on jv.id = en.journey_version_id
      join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
     where ji.id = p_journey_instance_id
       and en.entrepreneur_id = v_entrepreneur_id
       and jd.owner_organization_id = p_organization_id
  ) then
    raise exception 'JOURNEY_INSTANCE_MISMATCH' using errcode = '28000';
  end if;

  if (select count(*) from jsonb_array_elements(p_submission -> 'answers')) <>
     (select count(distinct answer ->> 'questionVersionId') from jsonb_array_elements(p_submission -> 'answers') answer) then
    raise exception 'DUPLICATE_SUBMISSION_ANSWER' using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_submission -> 'answers') answer
     where not exists (
       select 1
         from diagnostics.items i
        where i.id = (answer ->> 'questionVersionId')::uuid
          and i.diagnostic_version_id = v_form_version_id
     )
  ) then
    raise exception 'UNKNOWN_FORM_QUESTION' using errcode = '22023';
  end if;

  if exists (
    select 1
      from diagnostics.items i
     where i.diagnostic_version_id = v_form_version_id
       and i.is_required
       and not exists (
         select 1
           from jsonb_array_elements(p_submission -> 'answers') answer
          where answer ->> 'questionVersionId' = i.id::text
       )
  ) then
    raise exception 'REQUIRED_ANSWER_MISSING' using errcode = '22023';
  end if;

  if v_archetype_version_id is not null and not exists (
    select 1
      from diagnostics.archetype_versions av
      join diagnostics.archetype_definitions ad on ad.id = av.archetype_definition_id
     where av.id = v_archetype_version_id
       and av.status = 'published'
       and ad.status = 'active'
       and ad.owner_organization_id = p_organization_id
  ) then
    raise exception 'ARCHETYPE_VERSION_NOT_PUBLISHED' using errcode = '55000';
  end if;

  if v_reason <> 'classified' then
    if not exists (
      select 1
        from diagnostics.archetype_assignments aa
       where aa.id = v_supersedes_assignment_id
         and aa.entrepreneur_id = v_entrepreneur_id
         and aa.journey_instance_id is not distinct from p_journey_instance_id
    ) then
      raise exception 'SUPERSEDED_ASSIGNMENT_NOT_FOUND' using errcode = 'P0002';
    end if;
    if exists (
      select 1
        from diagnostics.results r
       where r.operational_readiness #>> '{assignment,supersedesAssignmentId}' = v_supersedes_assignment_id::text
    ) then
      raise exception 'ASSIGNMENT_ALREADY_SUPERSEDED' using errcode = '55000';
    end if;
  end if;

  select exists(select 1 from diagnostics.sessions s where s.id = v_submission_id)
    into v_is_new_submission;
  v_is_new_submission := not v_is_new_submission;

  if v_is_new_submission and v_reason <> 'classified' then
    raise exception 'SUBMISSION_NOT_FOUND_FOR_RECLASSIFICATION' using errcode = 'P0002';
  end if;
  if not v_is_new_submission and v_reason = 'classified' then
    raise exception 'SUBMISSION_ALREADY_PERSISTED' using errcode = '55000';
  end if;
  if not v_is_new_submission and not exists (
    select 1 from diagnostics.sessions s
     where s.id = v_submission_id
       and s.diagnostic_version_id = v_form_version_id
       and s.entrepreneur_id = v_entrepreneur_id
       and s.journey_instance_id is not distinct from p_journey_instance_id
       and s.status = 'completed'
  ) then
    raise exception 'PERSISTED_SUBMISSION_MISMATCH' using errcode = '55000';
  end if;

  if exists(select 1 from diagnostics.archetype_assignments aa where aa.id = v_assignment_id) then
    raise exception 'ASSIGNMENT_ALREADY_PERSISTED' using errcode = '55000';
  end if;

  v_assignment_event_id := app_private.e14_child_event_id(
    v_command_event_id,
    'diagnostic.archetype.assigned',
    1
  );
  v_activation_count := case
    when p_activation_batch is null or p_activation_batch = 'null'::jsonb then 0
    else jsonb_array_length(coalesce(p_activation_batch -> 'executions', '[]'::jsonb))
  end;
  v_projection_count := jsonb_array_length(coalesce(p_crm_projections, '[]'::jsonb));
  v_result_id := app_private.e14_deterministic_uuid('configurable-product-result|' || v_assignment_id::text);
  v_calculation_version := coalesce(p_assignment ->> 'classificationPolicyVersionId', 'unknown') || ':' || v_assignment_id::text;

  v_result := jsonb_build_object(
    'request_id', v_command_event_id,
    'replayed', false,
    'data', jsonb_build_object(
      'submission_id', v_submission_id,
      'result_id', v_result_id,
      'assignment_id', v_assignment_id,
      'new_submission', v_is_new_submission,
      'response_count', case when v_is_new_submission then jsonb_array_length(p_submission -> 'answers') else 0 end,
      'activation_count', v_activation_count,
      'projection_count', v_projection_count
    )
  );

  select es.id into v_schema_id
    from eventing.event_schemas es
   where es.event_name = 'diagnostic.classification.persisted'
     and es.event_version = 1
     and es.status = 'published';

  perform eventing.append_event(
    v_command_event_id,
    'diagnostic.classification.persisted',
    1,
    v_assigned_at,
    'estimulo.configurable-product',
    'entrepreneur',
    v_entrepreneur_id,
    v_actor_type,
    p_actor_user_account_id,
    p_organization_id,
    p_journey_instance_id,
    'configurable_product_command',
    v_command_event_id,
    1,
    p_organization_id::text,
    v_command_event_id,
    null,
    null,
    'observed',
    'restricted',
    jsonb_build_object(
      'request_hash', v_request_hash,
      'result', v_result,
      'reason', v_reason,
      'new_submission', v_is_new_submission,
      'evidence', coalesce(p_evidence, '{}'::jsonb)
    ),
    v_schema_id,
    array['product.analytics']::text[]
  );

  if v_is_new_submission then
    insert into diagnostics.sessions(
      id,
      diagnostic_version_id,
      entrepreneur_id,
      journey_instance_id,
      status,
      started_at,
      completed_at,
      aggregate_version
    ) values (
      v_submission_id,
      v_form_version_id,
      v_entrepreneur_id,
      p_journey_instance_id,
      'completed',
      v_submitted_at,
      v_submitted_at,
      1
    );

    v_ordinal := 0;
    for v_answer in select value from jsonb_array_elements(p_submission -> 'answers') loop
      v_ordinal := v_ordinal + 1;
      v_question_id := (v_answer ->> 'questionVersionId')::uuid;
      v_answer_event_id := app_private.e14_child_event_id(
        v_command_event_id,
        'diagnostic.response.recorded',
        v_ordinal
      );

      perform app_private.e14_append_event(
        v_answer_event_id,
        'diagnostic.response.recorded',
        'entrepreneur',
        v_entrepreneur_id,
        v_actor_type,
        p_actor_user_account_id,
        p_organization_id,
        p_journey_instance_id,
        'diagnostic_session',
        v_submission_id,
        v_ordinal,
        v_command_event_id,
        v_command_event_id,
        jsonb_build_object(
          'session_id', v_submission_id,
          'item_id', v_question_id,
          'revision', 1,
          'response_time_ms', null
        )
      );

      insert into diagnostics.responses(
        session_id,
        item_id,
        revision,
        response_value,
        response_time_ms,
        recorded_at,
        source_event_id
      ) values (
        v_submission_id,
        v_question_id,
        1,
        jsonb_build_object('value', v_answer -> 'value'),
        null,
        v_submitted_at,
        v_answer_event_id
      );
      v_response_count := v_response_count + 1;
    end loop;
  end if;

  insert into diagnostics.archetype_assignments(
    id,
    entrepreneur_id,
    journey_instance_id,
    model_version_reference,
    primary_archetype_version_id,
    probability,
    classification_status,
    assigned_at
  ) values (
    v_assignment_id,
    v_entrepreneur_id,
    p_journey_instance_id,
    coalesce(p_assignment ->> 'classificationPolicyVersionId', 'unknown'),
    v_archetype_version_id,
    nullif(p_assignment ->> 'confidence', '')::numeric,
    case when v_archetype_version_id is null then 'inconclusive' else v_reason end,
    v_assigned_at
  );

  select es.id into v_schema_id
    from eventing.event_schemas es
   where es.event_name = 'diagnostic.archetype.assigned'
     and es.event_version = 1
     and es.status = 'published';

  perform eventing.append_event(
    v_assignment_event_id,
    'diagnostic.archetype.assigned',
    1,
    v_assigned_at,
    'estimulo.configurable-product',
    'entrepreneur',
    v_entrepreneur_id,
    v_actor_type,
    p_actor_user_account_id,
    p_organization_id,
    p_journey_instance_id,
    'archetype_assignment',
    v_assignment_id,
    1,
    p_organization_id::text,
    v_command_event_id,
    v_command_event_id,
    null,
    'derived',
    'restricted',
    jsonb_build_object(
      'assignment', p_assignment,
      'evidence', coalesce(p_evidence, '{}'::jsonb)
    ),
    v_schema_id,
    array['product.analytics']::text[]
  );

  insert into diagnostics.results(
    id,
    session_id,
    calculation_version,
    status,
    operational_readiness,
    data_quality,
    recommended_start,
    calculated_at,
    source_event_high_watermark
  ) values (
    v_result_id,
    v_submission_id,
    v_calculation_version,
    case when v_archetype_version_id is null then 'inconclusive' else 'completed' end,
    jsonb_build_object('assignment', p_assignment),
    jsonb_build_object('evidence', coalesce(p_evidence, '{}'::jsonb)),
    jsonb_build_object('activationBatch', p_activation_batch),
    v_assigned_at,
    v_assignment_event_id
  );

  if p_activation_batch is not null and p_activation_batch <> 'null'::jsonb then
    if p_activation_batch ->> 'assignmentId' is distinct from v_assignment_id::text
       or jsonb_typeof(coalesce(p_activation_batch -> 'executions', '[]'::jsonb)) <> 'array' then
      raise exception 'ACTIVATION_ASSIGNMENT_MISMATCH' using errcode = '22023';
    end if;

    for v_activation in select value from jsonb_array_elements(coalesce(p_activation_batch -> 'executions', '[]'::jsonb)) loop
      if length(trim(coalesce(v_activation ->> 'executionId', ''))) = 0
         or length(trim(coalesce(v_activation ->> 'activationRuleVersionId', ''))) = 0
         or jsonb_typeof(v_activation -> 'action') <> 'object' then
        raise exception 'INVALID_ACTIVATION_EXECUTION' using errcode = '22023';
      end if;

      v_decision_id := app_private.e14_deterministic_uuid(
        'configurable-product-activation|' || (v_activation ->> 'executionId')
      );
      insert into orchestration.personalization_decisions(
        id,
        entrepreneur_id,
        journey_instance_id,
        decision_type,
        rule_version_id,
        input_snapshot,
        output,
        confidence,
        status,
        decided_at
      ) values (
        v_decision_id,
        v_entrepreneur_id,
        p_journey_instance_id,
        'activation:' || coalesce(v_activation #>> '{action,type}', 'unknown'),
        null,
        jsonb_build_object(
          'logical_rule_version_id', v_activation ->> 'activationRuleVersionId',
          'input_snapshot_hashes', coalesce(v_activation -> 'inputSnapshotHashes', '[]'::jsonb),
          'assignment_id', v_assignment_id
        ),
        coalesce(v_activation -> 'action', '{}'::jsonb),
        nullif(p_assignment ->> 'confidence', '')::numeric,
        coalesce(v_activation ->> 'status', 'planned'),
        coalesce((v_activation ->> 'executedAt')::timestamptz, v_assigned_at)
      );
    end loop;

    v_activation_event_id := app_private.e14_child_event_id(
      v_command_event_id,
      'personalization.activation.planned',
      1
    );
    select es.id into v_schema_id
      from eventing.event_schemas es
     where es.event_name = 'personalization.activation.planned'
       and es.event_version = 1
       and es.status = 'published';

    perform eventing.append_event(
      v_activation_event_id,
      'personalization.activation.planned',
      1,
      v_assigned_at,
      'estimulo.configurable-product',
      'entrepreneur',
      v_entrepreneur_id,
      v_actor_type,
      p_actor_user_account_id,
      p_organization_id,
      p_journey_instance_id,
      'activation_batch',
      app_private.e14_deterministic_uuid('activation-batch|' || coalesce(p_activation_batch ->> 'batchId', v_assignment_id::text)),
      1,
      p_organization_id::text,
      v_command_event_id,
      v_assignment_event_id,
      null,
      'derived',
      'restricted',
      p_activation_batch,
      v_schema_id,
      array['product.analytics']::text[]
    );
  end if;

  v_ordinal := 0;
  for v_projection in select value from jsonb_array_elements(coalesce(p_crm_projections, '[]'::jsonb)) loop
    v_ordinal := v_ordinal + 1;
    if length(trim(coalesce(v_projection ->> 'projectionId', ''))) = 0
       or length(trim(coalesce(v_projection ->> 'idempotencyKey', ''))) = 0
       or v_projection ->> 'subjectObjectId' is distinct from v_entrepreneur_id::text
       or jsonb_typeof(v_projection -> 'payload') <> 'object' then
      raise exception 'INVALID_CRM_PROJECTION' using errcode = '22023';
    end if;

    v_projection_event_id := app_private.e14_child_event_id(
      v_command_event_id,
      'integration.hubspot.projection.requested',
      v_ordinal
    );
    select es.id into v_schema_id
      from eventing.event_schemas es
     where es.event_name = 'integration.hubspot.projection.requested'
       and es.event_version = 1
       and es.status = 'published';

    perform eventing.append_event(
      v_projection_event_id,
      'integration.hubspot.projection.requested',
      1,
      coalesce((v_projection ->> 'createdAt')::timestamptz, v_assigned_at),
      'estimulo.configurable-product',
      'entrepreneur',
      v_entrepreneur_id,
      v_actor_type,
      p_actor_user_account_id,
      p_organization_id,
      p_journey_instance_id,
      'crm_projection',
      app_private.e14_deterministic_uuid('crm-projection|' || (v_projection ->> 'projectionId')),
      1,
      p_organization_id::text,
      v_command_event_id,
      v_assignment_event_id,
      null,
      'derived',
      'restricted',
      v_projection,
      v_schema_id,
      array['integration.hubspot']::text[]
    );
  end loop;

  return v_result;
end;
$$;

revoke all on function public.persist_configurable_product_result(
  uuid, uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb, text
) from public, anon, authenticated;

grant execute on function public.persist_configurable_product_result(
  uuid, uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb, text
) to postgres, service_role, app_worker;
