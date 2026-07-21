create or replace function iam.resolve_external_identity(
  p_provider text,
  p_issuer text,
  p_subject text,
  p_email_normalized text,
  p_email_verified boolean,
  p_claims_fingerprint text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_account_id uuid;
  v_email text := lower(trim(p_email_normalized));
  v_identity_id uuid;
  v_previous_subject text;
begin
  if p_provider is null or length(trim(p_provider)) = 0
     or p_issuer is null or length(trim(p_issuer)) = 0
     or p_subject is null or length(trim(p_subject)) = 0 then
    raise exception 'invalid_external_identity' using errcode = '22023';
  end if;
  if not p_email_verified or v_email is null or length(v_email) = 0 then
    raise exception 'verified_email_required' using errcode = '28000';
  end if;
  if p_claims_fingerprint is null or length(trim(p_claims_fingerprint)) < 16 then
    raise exception 'claims_fingerprint_required' using errcode = '22023';
  end if;

  select ei.user_account_id into v_account_id
  from iam.external_identities ei
  where ei.issuer = trim(p_issuer) and ei.subject = trim(p_subject)
  for update;

  if v_account_id is not null then
    update iam.external_identities
       set provider = trim(p_provider),
           email_normalized = v_email,
           email_verified = true,
           claims_fingerprint = trim(p_claims_fingerprint),
           last_authenticated_at = now(),
           updated_at = now()
     where issuer = trim(p_issuer) and subject = trim(p_subject);
    update iam.user_accounts
       set last_authenticated_at = now(), updated_at = now()
     where id = v_account_id;
    return v_account_id;
  end if;

  select ua.id into v_account_id
  from iam.user_accounts ua
  where ua.email_normalized = v_email
  for update;

  if v_account_id is not null then
    if not exists (
      select 1
      from auth.users au
      where au.id::text = trim(p_subject)
        and lower(trim(au.email)) = v_email
        and au.email_confirmed_at is not null
        and au.deleted_at is null
        and (
          au.raw_app_meta_data ->> 'provider' = trim(p_provider)
          or coalesce(au.raw_app_meta_data -> 'providers', '[]'::jsonb) @> jsonb_build_array(trim(p_provider))
        )
    ) then
      raise exception 'identity_link_required' using errcode = '23505';
    end if;

    select ei.id, ei.subject
      into v_identity_id, v_previous_subject
    from iam.external_identities ei
    where ei.user_account_id = v_account_id
      and ei.issuer = trim(p_issuer)
      and ei.provider = trim(p_provider)
    order by ei.last_authenticated_at desc, ei.created_at desc
    limit 1
    for update;

    if v_identity_id is null then
      raise exception 'identity_link_required' using errcode = '23505';
    end if;

    if exists (
      select 1
      from auth.users au
      where au.id::text = v_previous_subject
        and au.deleted_at is null
    ) then
      raise exception 'identity_link_required' using errcode = '23505';
    end if;

    update iam.external_identities
       set subject = trim(p_subject),
           email_normalized = v_email,
           email_verified = true,
           claims_fingerprint = trim(p_claims_fingerprint),
           last_authenticated_at = now(),
           updated_at = now()
     where id = v_identity_id;

    update iam.user_accounts
       set status = 'active', last_authenticated_at = now(), updated_at = now()
     where id = v_account_id;

    return v_account_id;
  end if;

  insert into iam.user_accounts(email_normalized, status, last_authenticated_at)
  values (v_email, 'active', now())
  returning id into v_account_id;

  insert into iam.external_identities(
    user_account_id, provider, issuer, subject, email_normalized,
    email_verified, claims_fingerprint
  ) values (
    v_account_id, trim(p_provider), trim(p_issuer), trim(p_subject), v_email,
    true, trim(p_claims_fingerprint)
  );

  return v_account_id;
end;
$function$;
