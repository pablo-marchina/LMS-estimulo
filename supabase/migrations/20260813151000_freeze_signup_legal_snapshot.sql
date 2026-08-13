begin;

-- Public signup must bind the acceptance to the immutable legal document rows
-- that were actually presented. The privileged web runtime can resolve either
-- the two versions currently published or an explicit historical snapshot that
-- was published and later retired while the user was confirming their email.
create or replace function public.get_signup_legal_documents(p_version_ids uuid[] default null)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog'
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'document_type', d.document_type,
        'version_number', d.version_number,
        'title', d.title,
        'body', d.body,
        'content_hash', d.content_hash,
        'published_at', d.published_at,
        'status', d.status
      ) order by d.document_type
    ),
    '[]'::jsonb
  )
  from governance.legal_document_versions d
  where d.organization_id = app_private.extension_default_organization()
    and d.document_type in ('terms_of_use', 'privacy_policy')
    and (
      (
        coalesce(cardinality(p_version_ids), 0) = 0
        and d.status = 'published'
      )
      or
      (
        coalesce(cardinality(p_version_ids), 0) > 0
        and d.id = any(p_version_ids)
        and d.published_at is not null
        and d.status in ('published', 'retired')
      )
    );
$$;

revoke all on function public.get_signup_legal_documents(uuid[]) from public, anon, authenticated;
grant execute on function public.get_signup_legal_documents(uuid[]) to service_role;

-- legal_accept used to require the target row to still be the currently
-- published version. That reintroduced a race after signup: publishing vN+1
-- retires vN while a user may still be confirming the email for vN. Keep the
-- existing command and idempotency contract, but accept immutable versions
-- that have evidence of having been published at some point.
do $migration$
declare
  v_definition text;
  v_needle text := 'where d.id=(p_payload->>''legal_document_version_id'')::uuid and d.organization_id=v_organization_id and d.status=''published''';
  v_replacement text := 'where d.id=(p_payload->>''legal_document_version_id'')::uuid and d.organization_id=v_organization_id and d.status in (''published'',''retired'') and d.published_at is not null';
  v_occurrences integer;
begin
  v_definition := pg_get_functiondef('public.perform_participant_extension(uuid,text,jsonb,text)'::regprocedure);
  v_occurrences := (length(v_definition) - length(replace(v_definition, v_needle, ''))) / length(v_needle);

  if v_occurrences <> 1 then
    raise exception 'PERFORM_PARTICIPANT_EXTENSION_LEGAL_ACCEPT_SHAPE_CHANGED';
  end if;

  execute replace(v_definition, v_needle, v_replacement);
end
$migration$;

-- Seal profile provisioning and legal persistence into one database transaction.
-- The snapshot comes from raw_app_meta_data, which public clients cannot mutate,
-- and is resolved through the already-linked Supabase external identity.
create or replace function public.provision_public_signup_participant_v3(
  p_user_account_id uuid,
  p_preferred_name text,
  p_business_name text,
  p_attribution jsonb,
  p_cpf_lookup_hmac text,
  p_cpf_ciphertext_base64 text,
  p_cpf_initialization_vector_base64 text,
  p_cpf_authentication_tag_base64 text,
  p_cpf_key_version integer,
  p_phone_e164 text,
  p_cnpj text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_result jsonb;
  v_entrepreneur_id uuid;
  v_business_id uuid;
  v_cnpj_status text;
  v_auth_app_metadata jsonb;
  v_legal_snapshot jsonb;
  v_terms_document_id uuid;
  v_privacy_document_id uuid;
  v_terms_accepted_at timestamptz;
  v_privacy_accepted_at timestamptz;
begin
  if coalesce(p_phone_e164,'') !~ '^\+55\d{10,11}$' then
    raise exception 'PHONE_INVALID' using errcode='22023';
  end if;
  if p_cnpj is not null and p_cnpj !~ '^\d{14}$' then
    raise exception 'CNPJ_INVALID' using errcode='22023';
  end if;

  select auth_user.raw_app_meta_data
    into v_auth_app_metadata
  from iam.external_identities identity
  join auth.users auth_user on auth_user.id::text = identity.subject
  where identity.user_account_id = p_user_account_id
    and identity.email_verified
    and (to_jsonb(auth_user)->>'deleted_at') is null
  order by identity.last_authenticated_at desc, identity.created_at desc
  limit 1;

  v_legal_snapshot := v_auth_app_metadata->'signup_legal_snapshot';
  if jsonb_typeof(v_legal_snapshot) <> 'object' then
    raise exception 'SIGNUP_LEGAL_SNAPSHOT_REQUIRED' using errcode='22023';
  end if;

  begin
    v_terms_document_id := nullif(v_legal_snapshot->>'terms_document_version_id','')::uuid;
    v_privacy_document_id := nullif(v_legal_snapshot->>'privacy_document_version_id','')::uuid;
    v_terms_accepted_at := nullif(v_legal_snapshot->>'terms_accepted_at','')::timestamptz;
    v_privacy_accepted_at := nullif(v_legal_snapshot->>'privacy_accepted_at','')::timestamptz;
  exception when invalid_text_representation or datetime_field_overflow then
    raise exception 'SIGNUP_LEGAL_SNAPSHOT_INVALID' using errcode='22023';
  end;

  if v_terms_document_id is null or v_privacy_document_id is null
    or v_terms_accepted_at is null or v_privacy_accepted_at is null
    or v_terms_document_id = v_privacy_document_id then
    raise exception 'SIGNUP_LEGAL_SNAPSHOT_INVALID' using errcode='22023';
  end if;

  if not exists(
    select 1 from governance.legal_document_versions d
    where d.id = v_terms_document_id
      and d.organization_id = app_private.extension_default_organization()
      and d.document_type = 'terms_of_use'
      and d.published_at is not null
      and d.status in ('published','retired')
  ) or not exists(
    select 1 from governance.legal_document_versions d
    where d.id = v_privacy_document_id
      and d.organization_id = app_private.extension_default_organization()
      and d.document_type = 'privacy_policy'
      and d.published_at is not null
      and d.status in ('published','retired')
  ) then
    raise exception 'SIGNUP_LEGAL_SNAPSHOT_INVALID' using errcode='22023';
  end if;

  v_result:=public.provision_public_signup_participant_v2(
    p_user_account_id,p_preferred_name,p_business_name,p_attribution,
    p_cpf_lookup_hmac,p_cpf_ciphertext_base64,p_cpf_initialization_vector_base64,
    p_cpf_authentication_tag_base64,p_cpf_key_version,p_idempotency_key
  );

  v_entrepreneur_id:=(v_result->>'entrepreneur_id')::uuid;
  v_business_id:=nullif(v_result->>'business_id','')::uuid;

  update core.entrepreneurs set phone_e164=p_phone_e164 where id=v_entrepreneur_id;

  v_cnpj_status:='not_provided';
  if p_cnpj is not null then
    if v_business_id is null then
      raise exception 'CNPJ_REQUIRES_BUSINESS_NAME' using errcode='22023';
    end if;
    begin
      update core.businesses set cnpj=p_cnpj where id=v_business_id;
    exception when unique_violation then
      raise exception 'CNPJ_ALREADY_LINKED_TO_ANOTHER_BUSINESS' using errcode='23505';
    end;
    v_cnpj_status:='stored';
  end if;

  perform public.perform_participant_extension(
    p_user_account_id,
    'legal_accept',
    jsonb_build_object(
      'legal_document_version_id', v_terms_document_id,
      'metadata', jsonb_build_object('source','signup_snapshot','signup_accepted_at',v_terms_accepted_at)
    ),
    'signup-legal:' || v_terms_document_id::text
  );
  perform public.perform_participant_extension(
    p_user_account_id,
    'legal_accept',
    jsonb_build_object(
      'legal_document_version_id', v_privacy_document_id,
      'metadata', jsonb_build_object('source','signup_snapshot','signup_accepted_at',v_privacy_accepted_at)
    ),
    'signup-legal:' || v_privacy_document_id::text
  );

  return v_result || jsonb_build_object('phone_status','stored','cnpj_status',v_cnpj_status);
end;
$$;

revoke all on function public.provision_public_signup_participant_v3(
  uuid,text,text,jsonb,text,text,text,text,integer,text,text,text
) from public,anon,authenticated;
grant execute on function public.provision_public_signup_participant_v3(
  uuid,text,text,jsonb,text,text,text,text,integer,text,text,text
) to postgres,service_role,app_worker;

commit;
