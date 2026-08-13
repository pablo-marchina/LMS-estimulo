begin;

-- Public signup binds acceptance to immutable legal-document rows. Current
-- documents are exposed to the server-side signup page, while an already staged
-- version remains resolvable if it is retired during email confirmation.
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

-- The staging row is created before Auth signup. The browser never receives a
-- capability to create or mutate one; only the service-role server boundary can
-- stage it. The opaque token is then carried by Auth user_metadata solely as a
-- lookup capability. The canonical versions and timestamp live here.
create table if not exists app_private.public_signup_legal_snapshots (
  snapshot_token uuid primary key,
  email_normalized text not null,
  terms_document_version_id uuid not null references governance.legal_document_versions(id),
  privacy_document_version_id uuid not null references governance.legal_document_versions(id),
  accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint public_signup_legal_snapshot_documents_differ
    check (terms_document_version_id <> privacy_document_version_id)
);

revoke all on table app_private.public_signup_legal_snapshots from public, anon, authenticated;

create index if not exists idx_public_signup_legal_snapshots_expiry
  on app_private.public_signup_legal_snapshots(expires_at);

create or replace function public.stage_public_signup_legal_snapshot(
  p_snapshot_token uuid,
  p_email text,
  p_terms_document_version_id uuid,
  p_privacy_document_version_id uuid,
  p_accepted_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_organization_id uuid := app_private.extension_default_organization();
  v_email_normalized text := lower(trim(coalesce(p_email,'')));
begin
  if p_snapshot_token is null or v_email_normalized = '' or position('@' in v_email_normalized) <= 1
    or p_terms_document_version_id is null or p_privacy_document_version_id is null
    or p_terms_document_version_id = p_privacy_document_version_id or p_accepted_at is null then
    raise exception 'SIGNUP_LEGAL_SNAPSHOT_INVALID' using errcode='22023';
  end if;

  if not exists(
    select 1 from governance.legal_document_versions d
    where d.id = p_terms_document_version_id
      and d.organization_id = v_organization_id
      and d.document_type = 'terms_of_use'
      and d.status = 'published'
      and d.published_at is not null
  ) or not exists(
    select 1 from governance.legal_document_versions d
    where d.id = p_privacy_document_version_id
      and d.organization_id = v_organization_id
      and d.document_type = 'privacy_policy'
      and d.status = 'published'
      and d.published_at is not null
  ) then
    raise exception 'SIGNUP_LEGAL_SNAPSHOT_NOT_CURRENT' using errcode='22023';
  end if;

  delete from app_private.public_signup_legal_snapshots where expires_at <= now();

  insert into app_private.public_signup_legal_snapshots(
    snapshot_token,email_normalized,terms_document_version_id,
    privacy_document_version_id,accepted_at
  ) values (
    p_snapshot_token,v_email_normalized,p_terms_document_version_id,
    p_privacy_document_version_id,p_accepted_at
  );

  return jsonb_build_object('status','staged','snapshot_token',p_snapshot_token);
end;
$$;

revoke all on function public.stage_public_signup_legal_snapshot(uuid,text,uuid,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.stage_public_signup_legal_snapshot(uuid,text,uuid,uuid,timestamptz) to service_role;

-- legal_accept previously required the target row to still be the current
-- published version. Publishing vN+1 retires vN, so a user who accepted vN and
-- was confirming email could no longer persist that exact acceptance. Permit an
-- immutable version that demonstrably was published, while keeping the existing
-- command and idempotency contract.
do $migration$
declare
  v_function_oid oid;
  v_function_count integer;
  v_definition text;
  v_needle text := 'where d.id=(p_payload->>''legal_document_version_id'')::uuid and d.organization_id=v_organization_id and d.status=''published''';
  v_replacement text := 'where d.id=(p_payload->>''legal_document_version_id'')::uuid and d.organization_id=v_organization_id and d.status in (''published'',''retired'') and d.published_at is not null';
  v_occurrences integer;
begin
  -- Resolve the live four-argument command handler from PostgreSQL's catalog
  -- instead of pinning this migration to a historical argument-type signature.
  -- Failing on zero or multiple matches keeps the migration conservative if the
  -- command boundary itself ever becomes ambiguous.
  select count(*)
    into v_function_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'perform_participant_extension'
    and p.prokind = 'f'
    and p.pronargs = 4;

  if v_function_count <> 1 then
    raise exception 'PERFORM_PARTICIPANT_EXTENSION_SIGNATURE_AMBIGUOUS: expected exactly one four-argument function, found %', v_function_count;
  end if;

  select p.oid
    into v_function_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'perform_participant_extension'
    and p.prokind = 'f'
    and p.pronargs = 4;

  v_definition := pg_get_functiondef(v_function_oid);
  v_occurrences := (length(v_definition) - length(replace(v_definition, v_needle, ''))) / length(v_needle);

  if v_occurrences <> 1 then
    raise exception 'PERFORM_PARTICIPANT_EXTENSION_LEGAL_ACCEPT_SHAPE_CHANGED';
  end if;

  execute replace(v_definition, v_needle, v_replacement);
end
$migration$;

-- Profile provisioning consumes the server-staged snapshot in the same database
-- transaction as the two legal_accept commands. user_metadata only carries the
-- random token; changing it cannot forge an acceptance because the canonical row
-- is service-role-only and additionally bound to the authenticated email.
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
  v_auth_user_metadata jsonb;
  v_auth_email text;
  v_snapshot_token uuid;
  v_signup_snapshot app_private.public_signup_legal_snapshots%rowtype;
begin
  if coalesce(p_phone_e164,'') !~ '^\+55\d{10,11}$' then
    raise exception 'PHONE_INVALID' using errcode='22023';
  end if;
  if p_cnpj is not null and p_cnpj !~ '^\d{14}$' then
    raise exception 'CNPJ_INVALID' using errcode='22023';
  end if;

  select auth_user.raw_user_meta_data, lower(trim(auth_user.email))
    into v_auth_user_metadata, v_auth_email
  from iam.external_identities identity
  join auth.users auth_user on auth_user.id::text = identity.subject
  where identity.user_account_id = p_user_account_id
    and identity.email_verified
    and (to_jsonb(auth_user)->>'deleted_at') is null
  order by identity.last_authenticated_at desc, identity.created_at desc
  limit 1;

  begin
    v_snapshot_token := nullif(v_auth_user_metadata->>'signup_legal_snapshot_token','')::uuid;
  exception when invalid_text_representation then
    raise exception 'SIGNUP_LEGAL_SNAPSHOT_INVALID' using errcode='22023';
  end;

  if v_snapshot_token is null or coalesce(v_auth_email,'') = '' then
    raise exception 'SIGNUP_LEGAL_SNAPSHOT_REQUIRED' using errcode='22023';
  end if;

  select snapshot.* into v_signup_snapshot
  from app_private.public_signup_legal_snapshots snapshot
  where snapshot.snapshot_token = v_snapshot_token
    and snapshot.email_normalized = v_auth_email
    and snapshot.expires_at > now();

  if not found then
    raise exception 'SIGNUP_LEGAL_SNAPSHOT_NOT_FOUND' using errcode='22023';
  end if;

  if not exists(
    select 1 from governance.legal_document_versions d
    where d.id = v_signup_snapshot.terms_document_version_id
      and d.organization_id = app_private.extension_default_organization()
      and d.document_type = 'terms_of_use'
      and d.published_at is not null
      and d.status in ('published','retired')
  ) or not exists(
    select 1 from governance.legal_document_versions d
    where d.id = v_signup_snapshot.privacy_document_version_id
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
      'legal_document_version_id', v_signup_snapshot.terms_document_version_id,
      'metadata', jsonb_build_object('source','signup_snapshot','signup_accepted_at',v_signup_snapshot.accepted_at)
    ),
    'signup-legal:' || v_signup_snapshot.terms_document_version_id::text
  );
  perform public.perform_participant_extension(
    p_user_account_id,
    'legal_accept',
    jsonb_build_object(
      'legal_document_version_id', v_signup_snapshot.privacy_document_version_id,
      'metadata', jsonb_build_object('source','signup_snapshot','signup_accepted_at',v_signup_snapshot.accepted_at)
    ),
    'signup-legal:' || v_signup_snapshot.privacy_document_version_id::text
  );

  delete from app_private.public_signup_legal_snapshots where snapshot_token = v_snapshot_token;

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
