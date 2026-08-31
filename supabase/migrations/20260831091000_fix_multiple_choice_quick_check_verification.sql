-- Fix quick-check verification for multiple-choice questions.
--
-- The participant form serializes a multiple-choice answer as a comma-separated
-- list of option codes. The legacy assessment command validates p_option_code as
-- one answer_options.code, so a valid answer such as "a,c" is rejected as if it
-- were a nonexistent single option. Preserve the mature legacy path for every
-- other question type and add set-based validation only for multiple_choice.

create or replace function public.e14_record_quick_check_answer(
  p_actor_user_account_id uuid,
  p_attempt_id uuid,
  p_question_id uuid,
  p_option_code text,
  p_response_id uuid,
  p_expected_aggregate_version bigint,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_question_type text;
  v_context app_private.e14_attempt_context%rowtype;
  v_selected_codes text[];
  v_canonical_answer text;
  v_prepare jsonb;
  v_event_id uuid;
  v_response_id uuid;
  v_request_hash text;
  v_key text;
  v_replayed boolean;
  v_correct boolean;
  v_attempt_version bigint;
  v_context_json jsonb;
  v_invalid_count integer;
  v_selected_count integer;
  v_correct_count integer;
  v_matching_correct_count integer;
begin
  select question.question_type
  into v_question_type
  from assessment.questions question
  join assessment.attempts attempt
    on attempt.id = p_attempt_id
   and attempt.activity_version_id = question.activity_version_id
  where question.id = p_question_id;

  if v_question_type is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_question_type <> 'multiple_choice' then
    return public.record_quick_check_answer(
      p_actor_user_account_id,
      p_attempt_id,
      p_question_id,
      p_option_code,
      p_response_id,
      p_expected_aggregate_version,
      p_idempotency_key
    );
  end if;

  select *
  into v_context
  from app_private.e14_attempt_context
  where attempt_id = p_attempt_id;

  if not found then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if app_private.e14_entrepreneur_for_account(p_actor_user_account_id)
      is distinct from v_context.entrepreneur_id then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_context.attempt_status <> 'in_progress' then
    raise exception 'ATTEMPT_NOT_IN_PROGRESS' using errcode = 'P0001';
  end if;
  if v_context.attempt_version <> p_expected_aggregate_version then
    raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(code order by code), array[]::text[])
  into v_selected_codes
  from (
    select distinct btrim(code) as code
    from unnest(string_to_array(coalesce(p_option_code, ''), ',')) as selected(code)
    where btrim(code) <> ''
  ) normalized;

  v_selected_count := coalesce(array_length(v_selected_codes, 1), 0);
  if v_selected_count = 0 then
    raise exception 'ASSESSMENT_ANSWER_REQUIRED' using errcode = '22023';
  end if;

  select count(*)::integer
  into v_invalid_count
  from unnest(v_selected_codes) selected(code)
  left join assessment.answer_options option
    on option.question_id = p_question_id
   and option.code = selected.code
  where option.id is null;

  if v_invalid_count > 0 then
    raise exception 'INVALID_ASSESSMENT_OPTION' using errcode = '22023';
  end if;

  select
    count(*) filter (where coalesce(option.is_correct, false))::integer,
    count(*) filter (
      where coalesce(option.is_correct, false)
        and option.code = any(v_selected_codes)
    )::integer
  into v_correct_count, v_matching_correct_count
  from assessment.answer_options option
  where option.question_id = p_question_id;

  v_correct := v_correct_count > 0
    and v_selected_count = v_correct_count
    and v_matching_correct_count = v_correct_count;

  v_canonical_answer := array_to_string(v_selected_codes, ',');
  v_prepare := app_private.e14_prepare_10(
    p_actor_user_account_id,
    p_attempt_id,
    p_question_id,
    v_canonical_answer,
    p_idempotency_key
  );
  v_key := v_prepare ->> 'k';
  v_request_hash := v_prepare ->> 'h';
  v_event_id := (v_prepare ->> 'e')::uuid;
  v_response_id := coalesce(p_response_id, (v_prepare ->> 'r')::uuid);
  v_replayed := (v_prepare ->> 'p')::boolean;

  if v_replayed then
    return jsonb_build_object(
      'request_id', v_event_id,
      'idempotency_key', v_key,
      'replayed', true,
      'data', app_private.e14_snapshot_10(v_response_id)
    );
  end if;

  perform app_private.e14_assert_no_answer(p_attempt_id, p_question_id);

  v_context_json := jsonb_build_object(
    'person', v_context.entrepreneur_id,
    'step', v_context.step_instance_id,
    'version', v_context.activity_version_id,
    'instance', v_context.instance_id,
    'org', v_context.org_id,
    'attempt_version', v_context.attempt_version
  );

  perform app_private.e14_emit_h(
    v_event_id,
    p_actor_user_account_id,
    v_context_json,
    v_response_id,
    p_attempt_id,
    v_request_hash,
    v_key
  );

  insert into assessment.responses(
    id,
    attempt_id,
    question_id,
    response_value,
    responded_at,
    source_event_id
  ) values (
    v_response_id,
    p_attempt_id,
    p_question_id,
    jsonb_build_object(
      'selected_codes', to_jsonb(v_selected_codes),
      'option_code', v_canonical_answer,
      'question_type', 'multiple_choice',
      'correct', v_correct
    ),
    now(),
    v_event_id
  );

  v_attempt_version := app_private.e14_increment_attempt(p_attempt_id);

  return jsonb_build_object(
    'request_id', v_event_id,
    'idempotency_key', v_key,
    'replayed', false,
    'data', jsonb_build_object(
      'response_id', v_response_id,
      'attempt_id', p_attempt_id,
      'question_id', p_question_id,
      'response_value', jsonb_build_object(
        'selected_codes', to_jsonb(v_selected_codes),
        'option_code', v_canonical_answer,
        'question_type', 'multiple_choice',
        'correct', v_correct
      ),
      'attempt_aggregate_version', v_attempt_version
    )
  );
end;
$$;

revoke all on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, uuid, bigint, text)
  from public, anon;
grant execute on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, uuid, bigint, text)
  to authenticated, service_role;

comment on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, uuid, bigint, text) is
  'Records quick-check answers; validates multiple_choice selections as an exact option set while preserving the legacy path for other question types.';
