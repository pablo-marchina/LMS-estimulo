-- Route the five-argument legacy RPC used by the web application through the
-- semantically named quick-check command. This keeps the frozen application
-- boundary compatible while ensuring the multiple-choice verification fix is
-- actually exercised at runtime.

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
  v_expected_aggregate_version bigint;
  v_response_id uuid;
begin
  select attempt.aggregate_version
  into v_expected_aggregate_version
  from assessment.attempts attempt
  where attempt.id = b;

  if v_expected_aggregate_version is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_response_id := app_private.e14_deterministic_uuid(b::text || c::text);

  return public.e14_record_quick_check_answer(
    a,
    b,
    c,
    d,
    v_response_id,
    v_expected_aggregate_version,
    e
  );
end;
$$;

revoke all on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, text)
  from public, anon;
grant execute on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, text)
  to authenticated, service_role;

comment on function public.e14_record_quick_check_answer(uuid, uuid, uuid, text, text) is
  'Compatibility wrapper that routes the legacy web quick-check RPC to the current verified command.';
