\set ON_ERROR_STOP on

begin;

do $diagnostic_regression$
declare
  v_definition text;
  v_normalized text;
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

  v_normalized := lower(v_definition);
  if position('avg(' in v_normalized) = 0
     or position('response_value ->> ''score''' in v_normalized) = 0 then
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

  v_normalized := lower(v_definition);
  if position('max(threshold_entry.value::numeric)' in v_normalized) = 0
     or position('asc nulls last' in v_normalized) = 0 then
    raise exception 'DIAGNOSTIC_SCORE_BANDS_ARE_NOT_ORDERED_LOW_TO_HIGH';
  end if;

  if position('::numeric > v_max' in v_normalized) = 0 then
    raise exception 'DIAGNOSTIC_THRESHOLDS_ARE_NOT_INCLUSIVE_UPPER_BOUNDS';
  end if;
end;
$diagnostic_regression$;

do $quick_check_regression$
declare
  v_definition text;
  v_normalized text;
  v_public_overload_count integer;
begin
  select count(*)::integer
  into v_public_overload_count
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'e14_record_quick_check_answer';

  if v_public_overload_count <> 1 then
    raise exception 'QUICK_CHECK_PUBLIC_RPC_OVERLOAD_COUNT_UNEXPECTED: %', v_public_overload_count;
  end if;

  select pg_get_functiondef(routine.oid)
  into v_definition
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'e14_record_quick_check_answer'
    and pg_get_function_identity_arguments(routine.oid) = 'a uuid, b uuid, c uuid, d text, e text';

  if v_definition is null then
    raise exception 'FROZEN_FIVE_ARGUMENT_QUICK_CHECK_RPC_NOT_FOUND';
  end if;

  v_normalized := lower(v_definition);
  if position('string_to_array' in v_normalized) = 0
     or position('unnest' in v_normalized) = 0 then
    raise exception 'MULTIPLE_CHOICE_SELECTION_IS_NOT_PARSED_AS_A_SET';
  end if;

  if position('v_invalid_count > 0' in v_normalized) = 0
     or position('v_selected_count = v_correct_count' in v_normalized) = 0
     or position('v_matching_correct_count = v_correct_count' in v_normalized) = 0 then
    raise exception 'MULTIPLE_CHOICE_EXACT_SET_VERIFICATION_MISSING';
  end if;

  if position('array_agg' in v_normalized) = 0
     or position('order by' in v_normalized) = 0
     or position('array_to_string' in v_normalized) = 0 then
    raise exception 'MULTIPLE_CHOICE_CANONICALIZATION_MISSING';
  end if;

  if position('v_expected_aggregate_version' in v_normalized) = 0
     or position('v_response_id' in v_normalized) = 0 then
    raise exception 'FROZEN_QUICK_CHECK_RPC_DOES_NOT_DERIVE_INTERNAL_COMMAND_STATE';
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
