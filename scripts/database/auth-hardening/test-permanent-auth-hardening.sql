begin;

-- A recreated, verified Google Workspace account in the Estímulo tenant may
-- recover the only stale identity that points to a deleted Auth user.
do $$
declare
  v_account_id uuid := gen_random_uuid();
  v_old_subject uuid := gen_random_uuid();
  v_new_subject uuid := gen_random_uuid();
  v_issuer text := 'https://test-project.supabase.co/auth/v1';
  v_email text := 'identity-recovery-allowed@estimulo.org';
  v_resolved uuid;
begin
  insert into iam.user_accounts(id,email_normalized,status)
  values(v_account_id,v_email,'active');

  insert into iam.external_identities(
    user_account_id,provider,issuer,subject,email_normalized,email_verified,claims_fingerprint
  ) values(
    v_account_id,'email',v_issuer,v_old_subject::text,v_email,true,repeat('a',64)
  );

  insert into auth.users(
    id,aud,role,email,email_confirmed_at,confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values(
    v_new_subject,'authenticated','authenticated',v_email,now(),now(),
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{"custom_claims":{"hd":"estimulo.org"}}'::jsonb,now(),now()
  );

  v_resolved := iam.resolve_external_identity(
    'google',v_issuer,v_new_subject::text,v_email,true,repeat('b',64)
  );

  assert v_resolved = v_account_id, 'recreated tenant identity must recover the existing account';
  assert exists(
    select 1 from iam.external_identities identity
    where identity.user_account_id=v_account_id
      and identity.provider='google'
      and identity.subject=v_new_subject::text
  ), 'stale identity must move to the new Google subject';
end $$;

-- Consumer Google identities must never inherit an internal account solely by
-- matching an email address.
do $$
declare
  v_account_id uuid := gen_random_uuid();
  v_old_subject uuid := gen_random_uuid();
  v_new_subject uuid := gen_random_uuid();
  v_issuer text := 'https://test-project.supabase.co/auth/v1';
  v_email text := 'identity-recovery-blocked@gmail.com';
  v_rejected boolean := false;
begin
  insert into iam.user_accounts(id,email_normalized,status)
  values(v_account_id,v_email,'active');

  insert into iam.external_identities(
    user_account_id,provider,issuer,subject,email_normalized,email_verified,claims_fingerprint
  ) values(
    v_account_id,'email',v_issuer,v_old_subject::text,v_email,true,repeat('c',64)
  );

  insert into auth.users(
    id,aud,role,email,email_confirmed_at,confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values(
    v_new_subject,'authenticated','authenticated',v_email,now(),now(),
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{"custom_claims":{"hd":"gmail.com"}}'::jsonb,now(),now()
  );

  begin
    perform iam.resolve_external_identity(
      'google',v_issuer,v_new_subject::text,v_email,true,repeat('d',64)
    );
  exception when unique_violation then
    v_rejected := true;
  end;
  assert v_rejected, 'consumer Google identity must require manual linking';
end $$;

-- Even for the Estímulo tenant, an active prior Auth identity makes automatic
-- transfer unsafe and must preserve the manual review gate.
do $$
declare
  v_account_id uuid := gen_random_uuid();
  v_old_subject uuid := gen_random_uuid();
  v_new_subject uuid := gen_random_uuid();
  v_issuer text := 'https://test-project.supabase.co/auth/v1';
  v_email text := 'identity-recovery-active-old@estimulo.org';
  v_rejected boolean := false;
begin
  insert into iam.user_accounts(id,email_normalized,status)
  values(v_account_id,v_email,'active');

  insert into iam.external_identities(
    user_account_id,provider,issuer,subject,email_normalized,email_verified,claims_fingerprint
  ) values(
    v_account_id,'email',v_issuer,v_old_subject::text,v_email,true,repeat('e',64)
  );

  insert into auth.users(
    id,aud,role,email,email_confirmed_at,confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values
  (
    v_old_subject,'authenticated','authenticated',v_email,now(),now(),
    '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now()
  ),
  (
    v_new_subject,'authenticated','authenticated',v_email,now(),now(),
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{"custom_claims":{"hd":"estimulo.org"}}'::jsonb,now(),now()
  );

  begin
    perform iam.resolve_external_identity(
      'google',v_issuer,v_new_subject::text,v_email,true,repeat('f',64)
    );
  exception when unique_violation then
    v_rejected := true;
  end;
  assert v_rejected, 'active prior Auth identity must prevent automatic transfer';
end $$;

-- Readiness must fail closed if any permanent public-signup dependency is
-- removed from a future schema or migration.
do $$
declare
  v_readiness jsonb := public.get_application_readiness();
begin
  assert v_readiness->>'status'='ready', 'application readiness must be ready';
  assert v_readiness#>>'{checks,cpf_protection_schema}'='true', 'CPF schema readiness missing';
  assert v_readiness#>>'{checks,public_signup_v3}'='true', 'signup v3 readiness missing';
  assert v_readiness#>>'{checks,identity_recovery}'='true', 'identity recovery readiness missing';
end $$;

rollback;
