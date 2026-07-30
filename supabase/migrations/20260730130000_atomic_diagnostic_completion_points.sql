create or replace function public.complete_participant_diagnostic_with_points(
  p_actor_user_account_id uuid,
  p_session_id uuid,
  p_expected_aggregate_version bigint,
  p_journey_instance_id uuid,
  p_completion_idempotency_key text,
  p_points_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_entrepreneur_id uuid;
  v_actor_entrepreneur_id uuid;
  v_session_journey_instance_id uuid;
  v_session_status text;
  v_session_aggregate_version bigint;
  v_completion jsonb;
  v_points jsonb;
begin
  perform app_private.e14_validate_idempotency_key(p_completion_idempotency_key);
  perform app_private.e14_validate_idempotency_key(p_points_idempotency_key);

  select
    session.entrepreneur_id,
    session.journey_instance_id,
    session.status,
    session.aggregate_version
  into
    v_entrepreneur_id,
    v_session_journey_instance_id,
    v_session_status,
    v_session_aggregate_version
  from diagnostics.sessions session
  where session.id = p_session_id
  for update;

  if not found then
    raise exception 'DIAGNOSTIC_SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_actor_entrepreneur_id := app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_actor_entrepreneur_id is null or v_actor_entrepreneur_id is distinct from v_entrepreneur_id then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_session_journey_instance_id is null
    or v_session_journey_instance_id is distinct from p_journey_instance_id
  then
    raise exception 'DIAGNOSTIC_JOURNEY_MISMATCH' using errcode = '23514';
  end if;

  if v_session_status = 'in_progress' then
    if v_session_aggregate_version is distinct from p_expected_aggregate_version then
      raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode = 'P0001';
    end if;

    v_completion := public.e14_complete_diagnostic(
      p_actor_user_account_id,
      p_session_id,
      p_expected_aggregate_version,
      p_completion_idempotency_key
    );
  elsif v_session_status = 'completed' then
    v_completion := jsonb_build_object(
      'replayed', true,
      'data', jsonb_build_object(
        'session_id', p_session_id,
        'status', 'completed',
        'aggregate_version', v_session_aggregate_version
      )
    );
  else
    raise exception 'DIAGNOSTIC_SESSION_NOT_COMPLETABLE' using errcode = 'P0001';
  end if;

  v_points := public.award_participant_action_points(
    p_actor_user_account_id,
    p_journey_instance_id,
    'complete_diagnostic',
    p_session_id::text,
    p_points_idempotency_key
  );

  return jsonb_build_object(
    'replayed', coalesce((v_completion->>'replayed')::boolean, false)
      and coalesce((v_points->>'replayed')::boolean, false),
    'data', jsonb_build_object(
      'session_id', p_session_id,
      'journey_instance_id', p_journey_instance_id,
      'completion', v_completion,
      'points', v_points
    )
  );
end;
$$;

revoke all on function public.complete_participant_diagnostic_with_points(uuid, uuid, bigint, uuid, text, text) from public, anon, authenticated;
grant execute on function public.complete_participant_diagnostic_with_points(uuid, uuid, bigint, uuid, text, text) to service_role, app_worker;

comment on function public.complete_participant_diagnostic_with_points(uuid, uuid, bigint, uuid, text, text) is
  'Completes a participant diagnostic and awards its points in one transaction; retries also reconcile a previously completed session without duplicating points.';
