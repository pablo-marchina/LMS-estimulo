create or replace function public.provision_test_signup_participant(
  p_user_account_id uuid,
  p_email_normalized text,
  p_preferred_name text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, iam, core
as $$
declare
  v_account_email text;
  v_entrepreneur_id uuid;
  v_preferred_name text := nullif(trim(p_preferred_name), '');
begin
  if p_user_account_id is null then
    raise exception 'user_account_id_required' using errcode = '22023';
  end if;

  select lower(trim(ua.email_normalized))
    into v_account_email
  from iam.user_accounts ua
  where ua.id = p_user_account_id
    and ua.status = 'active'
  for update;

  if v_account_email is null then
    raise exception 'active_user_account_not_found' using errcode = 'P0002';
  end if;

  if lower(trim(coalesce(p_email_normalized, ''))) <> v_account_email then
    raise exception 'user_account_email_mismatch' using errcode = '22023';
  end if;

  insert into core.entrepreneurs(
    user_account_id,
    preferred_name,
    legal_name,
    email_normalized,
    status,
    profile_data
  ) values (
    p_user_account_id,
    v_preferred_name,
    null,
    v_account_email,
    'active',
    jsonb_build_object(
      'source', 'test_public_signup',
      'test_only', true
    )
  )
  on conflict (user_account_id) do update
    set preferred_name = coalesce(v_preferred_name, core.entrepreneurs.preferred_name),
        email_normalized = excluded.email_normalized,
        updated_at = now()
  returning id into v_entrepreneur_id;

  return jsonb_build_object(
    'user_account_id', p_user_account_id,
    'entrepreneur_id', v_entrepreneur_id,
    'email_normalized', v_account_email,
    'test_only', true
  );
end;
$$;

revoke all on function public.provision_test_signup_participant(uuid, text, text) from public, anon, authenticated;
grant execute on function public.provision_test_signup_participant(uuid, text, text) to service_role;

comment on function public.provision_test_signup_participant(uuid, text, text) is
  'Service-role-only provisioning for explicitly enabled development/test public signup.';
