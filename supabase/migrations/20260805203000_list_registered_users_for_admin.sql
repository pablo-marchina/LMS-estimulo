begin;

create or replace function public.list_admin_registered_users(
  p_actor_user_account_id uuid,
  p_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'participant.read'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_account_id', account.id,
        'entrepreneur_id', entrepreneur.id,
        'email', account.email_normalized,
        'name', coalesce(
          entrepreneur.preferred_name,
          entrepreneur.legal_name,
          account.email_normalized
        ),
        'registration_status', case
          when entrepreneur.id is null then 'onboarding_required'
          when entrepreneur.status <> 'active' then entrepreneur.status
          else 'active'
        end,
        'registered_at', account.created_at,
        'onboarding_completed_at', case
          when entrepreneur.id is null then null
          else entrepreneur.created_at
        end
      )
      order by account.created_at desc, account.email_normalized
    ),
    '[]'::jsonb
  )
  into v_result
  from iam.user_accounts account
  left join core.entrepreneurs entrepreneur
    on entrepreneur.user_account_id = account.id
  where account.status = 'active';

  return v_result;
end;
$function$;

revoke all on function public.list_admin_registered_users(uuid, uuid) from public, anon, authenticated;
grant execute on function public.list_admin_registered_users(uuid, uuid) to service_role;

commit;
