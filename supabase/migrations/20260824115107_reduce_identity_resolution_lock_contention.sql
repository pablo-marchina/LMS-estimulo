create or replace function iam.resolve_external_identity(
  p_provider text,
  p_issuer text,
  p_subject text,
  p_email_normalized text,
  p_email_verified boolean,
  p_claims_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_account_id uuid;
  v_email text := lower(trim(p_email_normalized));
  v_identity_id uuid;
  v_previous_subject text;
  v_stale_identity_count integer;
  v_active_previous_count integer;
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

  -- Every authenticated RPC resolves the same participant identity first.
  -- Keep the existing-identity path lock-free and treat authentication time as
  -- a heartbeat instead of a per-request write so bursts do not serialize on
  -- iam.external_identities.
  select identity.user_account_id into v_account_id
  from iam.external_identities identity
  where identity.issuer = trim(p_issuer)
    and identity.subject = trim(p_subject)
  limit 1;

  if v_account_id is not null then
    update iam.external_identities
       set provider = trim(p_provider),
           email_normalized = v_email,
           email_verified = true,
           claims_fingerprint = trim(p_claims_fingerprint),
           last_authenticated_at = now(),
           updated_at = now()
     where issuer = trim(p_issuer)
       and subject = trim(p_subject)
       and (
         provider is distinct from trim(p_provider)
         or email_normalized is distinct from v_email
         or email_verified is distinct from true
         or claims_fingerprint is distinct from trim(p_claims_fingerprint)
         or last_authenticated_at is null
         or last_authenticated_at < now() - interval '5 minutes'
       );

    update iam.user_accounts
       set last_authenticated_at = now(), updated_at = now()
     where id = v_account_id
       and (
         last_authenticated_at is null
         or last_authenticated_at < now() - interval '5 minutes'
       );

    return v_account_id;
  end if;

  select account.id into v_account_id
  from iam.user_accounts account
  where account.email_normalized = v_email
  for update;

  if v_account_id is not null then
    if not exists (
      select 1
      from auth.users auth_user
      where auth_user.id::text = trim(p_subject)
        and lower(trim(auth_user.email)) = v_email
        and auth_user.email_confirmed_at is not null
        and auth_user.deleted_at is null
        and (
          auth_user.raw_app_meta_data ->> 'provider' = trim(p_provider)
          or coalesce(auth_user.raw_app_meta_data -> 'providers', '[]'::jsonb) @> jsonb_build_array(trim(p_provider))
        )
    ) then
      raise exception 'identity_link_required' using errcode = '23505';
    end if;

    select identity.id, identity.subject
      into v_identity_id, v_previous_subject
    from iam.external_identities identity
    where identity.user_account_id = v_account_id
      and identity.issuer = trim(p_issuer)
      and identity.provider = trim(p_provider)
    order by identity.last_authenticated_at desc, identity.created_at desc
    limit 1
    for update;

    if v_identity_id is null then
      if trim(p_provider) <> 'google'
         or v_email !~ '^[^@]+@estimulo\.org$'
         or not exists (
           select 1
           from auth.users current_auth_user
           where current_auth_user.id::text = trim(p_subject)
             and lower(trim(current_auth_user.email)) = v_email
             and current_auth_user.email_confirmed_at is not null
             and current_auth_user.deleted_at is null
             and (
               current_auth_user.raw_app_meta_data ->> 'provider' = 'google'
               or coalesce(current_auth_user.raw_app_meta_data -> 'providers', '[]'::jsonb) @> '["google"]'::jsonb
             )
             and lower(coalesce(
               current_auth_user.raw_user_meta_data -> 'custom_claims' ->> 'hd',
               current_auth_user.raw_user_meta_data ->> 'hd',
               ''
             )) = 'estimulo.org'
         ) then
        raise exception 'identity_link_required' using errcode = '23505';
      end if;

      select count(*) into v_active_previous_count
      from iam.external_identities identity
      join auth.users previous_auth_user
        on previous_auth_user.id::text = identity.subject
       and previous_auth_user.deleted_at is null
      where identity.user_account_id = v_account_id
        and identity.subject <> trim(p_subject);

      if v_active_previous_count > 0 then
        raise exception 'identity_link_required' using errcode = '23505';
      end if;

      select count(*) into v_stale_identity_count
      from iam.external_identities identity
      where identity.user_account_id = v_account_id
        and identity.issuer = trim(p_issuer)
        and identity.subject <> trim(p_subject)
        and not exists (
          select 1 from auth.users previous_auth_user
          where previous_auth_user.id::text = identity.subject
            and previous_auth_user.deleted_at is null
        );

      if v_stale_identity_count <> 1 then
        raise exception 'identity_link_required' using errcode = '23505';
      end if;

      select identity.id, identity.subject
        into v_identity_id, v_previous_subject
      from iam.external_identities identity
      where identity.user_account_id = v_account_id
        and identity.issuer = trim(p_issuer)
        and identity.subject <> trim(p_subject)
        and not exists (
          select 1 from auth.users previous_auth_user
          where previous_auth_user.id::text = identity.subject
            and previous_auth_user.deleted_at is null
        )
      order by identity.last_authenticated_at desc, identity.created_at desc
      limit 1
      for update;
    elsif exists (
      select 1 from auth.users previous_auth_user
      where previous_auth_user.id::text = v_previous_subject
        and previous_auth_user.deleted_at is null
    ) then
      raise exception 'identity_link_required' using errcode = '23505';
    end if;

    update iam.external_identities
       set provider = trim(p_provider),
           issuer = trim(p_issuer),
           subject = trim(p_subject),
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

comment on function iam.resolve_external_identity(text, text, text, text, boolean, text) is
  'Resolves a verified external identity. Existing identities use a lock-free read path and a throttled five-minute authentication heartbeat to prevent authenticated RPC bursts from serializing on the identity row.';
