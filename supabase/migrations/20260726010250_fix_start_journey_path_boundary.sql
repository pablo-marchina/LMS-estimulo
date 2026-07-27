-- Starting a journey must not force a path. The caller explicitly chooses diagnosis or the default open path.

create or replace function public.e14_start_journey(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid,
  p_expected_aggregate_version bigint,
  p_idempotency_key text
) returns jsonb
language sql security definer set search_path to 'pg_catalog'
as $function$
  select app_private.e14_cmd_start($1,$2,$3,$4)
$function$;

-- Keep the legacy helper safe for old internal callers, but delegate to the canonical path function.
create or replace function app_private.ensure_default_open_path(p_actor uuid,p_journey_instance uuid)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog'
as $function$
begin
  return public.ensure_participant_default_path(
    p_actor,
    p_journey_instance,
    'legacy-default-path-'||p_journey_instance::text
  )->'data';
end;
$function$;
