create or replace function public.get_optional_diagnostic_responses(
  p_actor_user_account_id uuid,
  p_session_id uuid
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid;
  v_session diagnostics.optional_sessions%rowtype;
begin
  v_entrepreneur_id := app_private.extension_entrepreneur(p_actor_user_account_id);
  if v_entrepreneur_id is null then
    raise exception 'PARTICIPANT_PROFILE_REQUIRED' using errcode='42501';
  end if;

  select * into v_session
  from diagnostics.optional_sessions
  where id = p_session_id
    and entrepreneur_id = v_entrepreneur_id;

  if not found then
    raise exception 'OPTIONAL_SESSION_NOT_FOUND' using errcode='P0002';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'item_id', r.item_id,
      'item_option_id', r.item_option_id,
      'text_value', r.text_value,
      'answered_at', r.answered_at
    ) order by r.answered_at, r.item_id)
    from diagnostics.optional_responses r
    where r.optional_session_id = v_session.id
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.get_optional_diagnostic_responses(uuid,uuid) from public, anon, authenticated;
grant execute on function public.get_optional_diagnostic_responses(uuid,uuid) to service_role;
