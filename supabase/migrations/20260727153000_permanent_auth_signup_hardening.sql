set lock_timeout = '5s';
set statement_timeout = '5min';

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
as $$
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

  select identity.user_account_id into v_account_id
  from iam.external_identities identity
  where identity.issuer = trim(p_issuer)
    and identity.subject = trim(p_subject)
  for update;

  if v_account_id is not null then
    update iam.external_identities
       set provider = trim(p_provider),
           email_normalized = v_email,
           email_verified = true,
           claims_fingerprint = trim(p_claims_fingerprint),
           last_authenticated_at = now(),
           updated_at = now()
     where issuer = trim(p_issuer)
       and subject = trim(p_subject);
    update iam.user_accounts
       set last_authenticated_at = now(), updated_at = now()
     where id = v_account_id;
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
      -- A provider transition is automatically recoverable only for a verified
      -- Google Workspace identity in the Estímulo tenant, and only when every
      -- prior Auth identity for the internal account is gone. Ordinary email
      -- changes and consumer Google accounts continue to require manual review.
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
$$;

revoke all on function iam.resolve_external_identity(text,text,text,text,boolean,text)
  from public, anon, authenticated, service_role;
grant execute on function iam.resolve_external_identity(text,text,text,text,boolean,text)
  to postgres, app_worker;

create or replace function public.get_application_readiness()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  with checks as (
    select
      to_regclass('iam.user_accounts') is not null as identity_schema,
      to_regclass('core.entrepreneurs') is not null as participant_schema,
      to_regclass('orchestration.journey_instances') is not null as journey_schema,
      to_regclass('eventing.outbox') is not null as outbox_schema,
      to_regclass('integration.external_object_mappings') is not null as integration_schema,
      to_regclass('iam.user_cpf_identifiers') is not null as cpf_protection_schema,
      exists (
        select 1 from information_schema.columns column_definition
        where column_definition.table_schema = 'core'
          and column_definition.table_name = 'entrepreneurs'
          and column_definition.column_name = 'phone_e164'
      ) as participant_phone,
      exists (
        select 1 from information_schema.columns column_definition
        where column_definition.table_schema = 'core'
          and column_definition.table_name = 'businesses'
          and column_definition.column_name = 'cnpj'
      ) as business_cnpj,
      to_regprocedure('public.provision_public_signup_participant_v3(uuid,text,text,jsonb,text,text,text,text,integer,text,text,text)') is not null as public_signup_v3,
      to_regprocedure('iam.resolve_external_identity(text,text,text,text,boolean,text)') is not null as identity_recovery
  )
  select jsonb_build_object(
    'status', case when
      identity_schema and participant_schema and journey_schema and outbox_schema
      and integration_schema and cpf_protection_schema and participant_phone
      and business_cnpj and public_signup_v3 and identity_recovery
      then 'ready' else 'not_ready' end,
    'database_time', now(),
    'checks', jsonb_build_object(
      'identity_schema', identity_schema,
      'participant_schema', participant_schema,
      'journey_schema', journey_schema,
      'outbox_schema', outbox_schema,
      'integration_schema', integration_schema,
      'cpf_protection_schema', cpf_protection_schema,
      'participant_phone', participant_phone,
      'business_cnpj', business_cnpj,
      'public_signup_v3', public_signup_v3,
      'identity_recovery', identity_recovery
    )
  )
  from checks;
$$;

revoke all on function public.get_application_readiness()
  from public, anon, authenticated;
grant execute on function public.get_application_readiness()
  to postgres, service_role, app_worker;
