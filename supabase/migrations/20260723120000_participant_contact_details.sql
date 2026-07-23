set lock_timeout = '5s';
set statement_timeout = '5min';

alter table core.entrepreneurs add column if not exists phone_e164 text;
alter table core.entrepreneurs add constraint ck_core_entrepreneurs_phone_e164
  check (phone_e164 is null or phone_e164 ~ '^\+55\d{10,11}$');

alter table core.businesses add column if not exists cnpj text;
alter table core.businesses add constraint ck_core_businesses_cnpj
  check (cnpj is null or cnpj ~ '^\d{14}$');
alter table core.businesses add constraint uq_core_businesses_cnpj unique (cnpj);

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
begin
  if coalesce(p_phone_e164,'') !~ '^\+55\d{10,11}$' then
    raise exception 'PHONE_INVALID' using errcode='22023';
  end if;
  if p_cnpj is not null and p_cnpj !~ '^\d{14}$' then
    raise exception 'CNPJ_INVALID' using errcode='22023';
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

  return v_result || jsonb_build_object('phone_status','stored','cnpj_status',v_cnpj_status);
end;
$$;

revoke all on function public.provision_public_signup_participant_v3(
  uuid,text,text,jsonb,text,text,text,text,integer,text,text,text
) from public,anon,authenticated;
grant execute on function public.provision_public_signup_participant_v3(
  uuid,text,text,jsonb,text,text,text,text,integer,text,text,text
) to postgres,service_role,app_worker;
