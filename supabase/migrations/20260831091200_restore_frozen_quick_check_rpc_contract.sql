-- Restore the frozen quick-check public contract after the multiple-choice fix.
--
-- The web application calls public.e14_record_quick_check_answer with five
-- opaque arguments (a..e). A temporary seven-argument overload introduced by
-- the verification fix leaked implementation details into the public RPC
-- surface and changed the frozen RPC inventory. Keep the corrected set-based
-- multiple-choice semantics directly behind the five-argument facade and
-- remove only the accidental public overload.

create or replace function public.e14_record_quick_check_answer(
  a uuid,
  b uuid,
  c uuid,
  d text,
  e text
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
  v_expected_aggregate_version bigint;
begin
  select attempt.aggregate_version
  into v_expected_aggregate_version
  from assessment.attempts attempt
  where attempt.id = b;

  if v_expected_aggregate_version is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_response_id := app_private.e14_deterministic_uuid(b::text || c::text);

  select question.question_type
  into v_question_type
  from assessment.questions question
  join assessment.attempts attempt
    on attempt.id = b
   and attempt.activity_version_id = question.activity_version_id
  where question.id = c;

  if v_question_type is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_question_type <> 'multiple_choice' then
    return public.record_quick_check_answer(
      a,
      b,
      c,
      d,
      v_response_id,
      v_expected_aggregate_version,
      e
    );
  end if;

  select *
  into v_context
  from app_private.e14_attempt_context
  where attempt_id = b;

  if not found then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if app_private.e14_entrepreneur_for_account(a)
      is distinct from v_context.entrepreneur_id then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_context.attempt_status <> 'in_progress' then
    raise exception 'ATTEMPT_NOT_IN_PROGRESS' using errcode = 'P0001';
  end if;
  if v_context.attempt_version <> v_expected_aggregate_version then
    raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(code order by code), array[]::text[])
  into v_selected_codes
  from (
    select distinct btrim(code) as code
    from unnest(string_to_array(coalesce(d, ''), ',')) as selected(code)
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
    on option.question_id = c
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
  where option.question_id = c;

  v_correct := v_correct_count > 0
    and v_selected_count = v_correct_count
    and v_matching_correct_count = v_correct_count;

  v_canonical_answer := array_to_string(v_selected_codes, ',');
  v_prepare := app_private.e14_prepare_10(
    a,
    b,
    c,
    v_canonical_answer,
    e
  );
  v_key := v_prepare ->> 'k';
  v_request_hash := v_prepare ->> 'h';
  v_event_id := (v_prepare ->> 'e')::uuid;
  v_response_id := coalesce(v_response_id, (v_prepare ->> 'r')::uuid);
  v_replayed := (v_prepare ->> 'p')::boolean;

  if v_replayed then
    return jsonb_build_object(
      'request_id', v_event_id,
      'idempotency_key', v_key,
      'replayed', true,
      'data', app_private.e14_snapshot_10(v_response_id)
    );
  end if;

  perform app_private.e14_assert_no_answer(b, c);

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
    a,
    v_context_json,
    v_response_id,
    b,
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
    b,
    c,
    jsonb_build_object(
      'selected_codes', to_jsonb(v_selected_codes),
      'option_code', v_canonical_answer,
      'question_type', 'multiple_choice',
      'correct', v_correct
    ),
    now(),
    v_event_id
  );

  v_attempt_version := app_private.e14_increment_attempt(b);

  return jsonb_build_object(
    'request_id', v_event_id,
    'idempotency_key', v_key,
    'replayed', false,
    'data', jsonb_build_object(
      'response_id', v_response_id,
      'attempt_id', b,
      'question_id', c,
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

revoke all on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, text)
  from public, anon;
grant execute on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, text)
  to authenticated, service_role;

comment on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, text) is
  'Records quick-check answers through the frozen five-argument web contract; validates multiple_choice selections as an exact canonical option set.';

drop function if exists public.e14_record_quick_check_answer(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  bigint,
  text
);
