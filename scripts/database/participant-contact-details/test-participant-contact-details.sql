begin;

do $$
declare
  v_user_account_id uuid := gen_random_uuid();
  v_auth_user_id uuid := gen_random_uuid();
  v_snapshot_token uuid := gen_random_uuid();
  v_terms_document_version_id uuid;
  v_privacy_document_version_id uuid;
  v_result jsonb;
  v_entrepreneur_id uuid;
  v_business_id uuid;
  v_stored_phone text;
  v_stored_cnpj text;
begin
  insert into iam.user_accounts(id, email_normalized, status)
  values (v_user_account_id, 'contato-teste@estimulo.org', 'active');

  select id into strict v_terms_document_version_id
  from governance.legal_document_versions
  where organization_id=app_private.extension_default_organization()
    and document_type='terms_of_use'
    and status='published'
    and published_at is not null
  order by version_number desc, published_at desc
  limit 1;

  select id into strict v_privacy_document_version_id
  from governance.legal_document_versions
  where organization_id=app_private.extension_default_organization()
    and document_type='privacy_policy'
    and status='published'
    and published_at is not null
  order by version_number desc, published_at desc
  limit 1;

  perform public.stage_public_signup_legal_snapshot(
    v_snapshot_token,
    'contato-teste@estimulo.org',
    v_terms_document_version_id,
    v_privacy_document_version_id,
    now()
  );

  insert into auth.users(
    id,email,email_confirmed_at,raw_user_meta_data,created_at,updated_at
  ) values (
    v_auth_user_id,
    'contato-teste@estimulo.org',
    now(),
    jsonb_build_object('signup_legal_snapshot_token',v_snapshot_token),
    now(),
    now()
  );

  insert into iam.external_identities(
    user_account_id,provider,issuer,subject,email_normalized,email_verified,claims_fingerprint
  ) values (
    v_user_account_id,
    'email',
    'https://test.supabase.co/auth/v1',
    v_auth_user_id::text,
    'contato-teste@estimulo.org',
    true,
    encode(sha256('contact-details-identity'::bytea),'hex')
  );

  v_result := public.provision_public_signup_participant_v3(
    v_user_account_id, 'Maria Teste', 'Negócio Teste', '{}'::jsonb,
    encode(sha256('lookup-1'::bytea), 'hex'), repeat('a', 20), repeat('b', 20), repeat('c', 24),
    1, '+5511912345678', '11222333000181', 'test-contact-details-1'
  );

  v_entrepreneur_id := (v_result->>'entrepreneur_id')::uuid;
  v_business_id := (v_result->>'business_id')::uuid;

  select phone_e164 into v_stored_phone from core.entrepreneurs where id = v_entrepreneur_id;
  assert v_stored_phone = '+5511912345678', 'phone must be stored on the entrepreneur record';

  select cnpj into v_stored_cnpj from core.businesses where id = v_business_id;
  assert v_stored_cnpj = '11222333000181', 'cnpj must be stored on the business record';

  assert v_result->>'phone_status' = 'stored', 'result must report phone_status=stored';
  assert v_result->>'cnpj_status' = 'stored', 'result must report cnpj_status=stored';

  -- idempotent replay with the same key must not error and must return the same result
  perform public.provision_public_signup_participant_v3(
    v_user_account_id, 'Maria Teste', 'Negócio Teste', '{}'::jsonb,
    encode(sha256('lookup-1'::bytea), 'hex'), repeat('a', 20), repeat('b', 20), repeat('c', 24),
    1, '+5511912345678', '11222333000181', 'test-contact-details-1'
  );

  raise notice 'participant contact details test passed';
end $$;

do $$
declare
  v_user_account_id uuid := gen_random_uuid();
  v_raised boolean := false;
begin
  insert into iam.user_accounts(id, email_normalized, status)
  values (v_user_account_id, 'contato-invalido@estimulo.org', 'active');

  begin
    perform public.provision_public_signup_participant_v3(
      v_user_account_id, 'Joao Teste', null, '{}'::jsonb,
      encode(sha256('lookup-2'::bytea), 'hex'), repeat('a', 20), repeat('b', 20), repeat('c', 24),
      1, '123', null, 'test-contact-details-2'
    );
  exception when others then
    v_raised := true;
    assert sqlerrm = 'PHONE_INVALID', format('expected PHONE_INVALID, got %s', sqlerrm);
  end;
  assert v_raised, 'invalid phone must raise PHONE_INVALID';
  raise notice 'invalid phone rejection test passed';
end $$;

rollback;