\set ON_ERROR_STOP on

begin;

do $diagnostic_regression$
declare
  v_definition text;
begin
  select pg_get_functiondef(routine.oid)
  into v_definition
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'app_private'
    and routine.proname = 'e14_dimension_scores_c'
    and pg_get_function_identity_arguments(routine.oid) = 'p_session_id uuid';

  if v_definition is null then
    raise exception 'DIAGNOSTIC_DIMENSION_SCORE_FUNCTION_NOT_FOUND';
  end if;

  if position('avg((latest_response.response_value ->> ''score''::text)::numeric)' in v_definition) = 0
     and position('avg((latest_response.response_value ->> ''score'')::numeric)' in v_definition) = 0 then
    raise exception 'DIAGNOSTIC_SCORE_IS_NOT_AVERAGED';
  end if;

  select pg_get_functiondef(routine.oid)
  into v_definition
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'app_private'
    and routine.proname = 'e14_archetype_c'
    and pg_get_function_identity_arguments(routine.oid) = 'p_session_id uuid, p_diagnostic_version_id uuid, p_organization_id uuid, p_entrepreneur_id uuid, p_journey_instance_id uuid';

  if v_definition is null then
    raise exception 'DIAGNOSTIC_ARCHETYPE_FUNCTION_NOT_FOUND';
  end if;

  if position('max(threshold_entry.value::numeric)' in v_definition) = 0
     or position('ASC NULLS LAST' in upper(v_definition)) = 0 then
    raise exception 'DIAGNOSTIC_SCORE_BANDS_ARE_NOT_ORDERED_LOW_TO_HIGH';
  end if;

  if position('(v_scores ->> v_dimension)::numeric > v_max' in v_definition) = 0 then
    raise exception 'DIAGNOSTIC_THRESHOLDS_ARE_NOT_INCLUSIVE_UPPER_BOUNDS';
  end if;
end;
$diagnostic_regression$;

do $quick_check_regression$
declare
  v_verified_definition text;
  v_wrapper_definition text;
begin
  select pg_get_functiondef(routine.oid)
  into v_verified_definition
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'e14_record_quick_check_answer'
    and pg_get_function_identity_arguments(routine.oid) = 'p_actor_user_account_id uuid, p_attempt_id uuid, p_question_id uuid, p_option_code text, p_response_id uuid, p_expected_aggregate_version bigint, p_idempotency_key text';

  if v_verified_definition is null then
    raise exception 'VERIFIED_QUICK_CHECK_COMMAND_NOT_FOUND';
  end if;

  if position('string_to_array(COALESCE(p_option_code, ''''::text), '',''::text)' in v_verified_definition) = 0
     and position('string_to_array(coalesce(p_option_code, ''''), '','')' in lower(v_verified_definition)) = 0 then
    raise exception 'MULTIPLE_CHOICE_SELECTION_IS_NOT_PARSED_AS_A_SET';
  end if;

  if position('v_invalid_count > 0' in v_verified_definition) = 0
     or position('v_selected_count = v_correct_count' in v_verified_definition) = 0
     or position('v_matching_correct_count = v_correct_count' in v_verified_definition) = 0 then
    raise exception 'MULTIPLE_CHOICE_EXACT_SET_VERIFICATION_MISSING';
  end if;

  if position('array_agg(code ORDER BY code)' in v_verified_definition) = 0
     and position('array_agg(code order by code)' in lower(v_verified_definition)) = 0 then
    raise exception 'MULTIPLE_CHOICE_CANONICALIZATION_MISSING';
  end if;

  select pg_get_functiondef(routine.oid)
  into v_wrapper_definition
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'e14_record_quick_check_answer'
    and pg_get_function_identity_arguments(routine.oid) = 'a uuid, b uuid, c uuid, d text, e text';

  if v_wrapper_definition is null then
    raise exception 'LEGACY_QUICK_CHECK_WRAPPER_NOT_FOUND';
  end if;

  if position('v_expected_aggregate_version' in v_wrapper_definition) = 0
     or position('v_response_id' in v_wrapper_definition) = 0
     or position('public.e14_record_quick_check_answer' in v_wrapper_definition) = 0 then
    raise exception 'LEGACY_QUICK_CHECK_WRAPPER_DOES_NOT_ROUTE_TO_VERIFIED_COMMAND';
  end if;
end;
$quick_check_regression$;

do $ranking_mask_regression$
declare
  v_definition text;
  v_masked text;
begin
  v_masked := app_private.mask_ranking_email('  MARCELO@example.com  ');
  if v_masked is distinct from 'm•••••o@•••••••.com' then
    raise exception 'RANKING_EMAIL_MASK_FORMAT_UNEXPECTED: %', v_masked;
  end if;

  if app_private.mask_ranking_email('invalid') is distinct from '••••••@•••••' then
    raise exception 'RANKING_EMAIL_INVALID_FALLBACK_UNEXPECTED';
  end if;

  select pg_get_functiondef(routine.oid)
  into v_definition
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'get_participant_engagement_hub'
    and pg_get_function_identity_arguments(routine.oid) = 'p_actor_user_account_id uuid';

  if v_definition is null then
    raise exception 'PARTICIPANT_ENGAGEMENT_HUB_NOT_FOUND';
  end if;

  if position('mask_ranking_email' in v_definition) = 0 then
    raise exception 'RANKING_EMAIL_MASK_NOT_ACTIVE';
  end if;

  if position('Empreendedor ' in v_definition) > 0 then
    raise exception 'OPAQUE_RANKING_CODE_STILL_ACTIVE';
  end if;
end;
$ranking_mask_regression$;

rollback;
