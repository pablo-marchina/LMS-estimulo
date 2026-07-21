set lock_timeout = '5s';
set statement_timeout = '5min';

create table if not exists iam.user_cpf_identifiers (
  user_account_id uuid primary key references iam.user_accounts(id) on delete restrict,
  lookup_hmac text not null unique,
  ciphertext_base64 text not null,
  initialization_vector_base64 text not null,
  authentication_tag_base64 text not null,
  key_version integer not null,
  status text not null default 'active',
  source text not null default 'public_signup',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_iam_user_cpf_lookup_hmac check (lookup_hmac ~ '^[a-f0-9]{64}$'),
  constraint ck_iam_user_cpf_ciphertext check (length(ciphertext_base64) between 16 and 128),
  constraint ck_iam_user_cpf_iv check (length(initialization_vector_base64) between 16 and 32),
  constraint ck_iam_user_cpf_tag check (length(authentication_tag_base64) between 20 and 32),
  constraint ck_iam_user_cpf_key_version check (key_version > 0),
  constraint ck_iam_user_cpf_status check (status in ('active','superseded','revoked'))
);

alter table iam.user_cpf_identifiers enable row level security;

with schema_document as (
  select jsonb_build_object(
    '$schema','https://json-schema.org/draft/2020-12/schema',
    'title','identity.cpf.protected',
    'type','object',
    'additionalProperties',false,
    'required',jsonb_build_array('request_hash','result'),
    'properties',jsonb_build_object(
      'request_hash',jsonb_build_object('type','string'),
      'result',jsonb_build_object(
        'type','object',
        'additionalProperties',false,
        'required',jsonb_build_array('user_account_id','identifier_status','key_version'),
        'properties',jsonb_build_object(
          'user_account_id',jsonb_build_object('type','string','format','uuid'),
          'identifier_status',jsonb_build_object('type','string','const','protected'),
          'key_version',jsonb_build_object('type','integer','minimum',1)
        )
      )
    )
  ) as value
)
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select
  app_private.e14_deterministic_uuid('event-schema:identity.cpf.protected:1'),
  'identity.cpf.protected',1,'urn:estimulo:event:identity.cpf.protected:1',value,
  app_private.e14_request_hash(value),'published',now()
from schema_document
on conflict (event_name,event_version) do nothing;

create or replace function public.provision_public_signup_participant_v2(
  p_user_account_id uuid,
  p_preferred_name text,
  p_business_name text,
  p_attribution jsonb,
  p_cpf_lookup_hmac text,
  p_cpf_ciphertext_base64 text,
  p_cpf_initialization_vector_base64 text,
  p_cpf_authentication_tag_base64 text,
  p_cpf_key_version integer,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_result jsonb;
  v_existing_hmac text;
  v_event_id uuid;
  v_request_hash text;
  v_aggregate_version bigint;
begin
  if p_user_account_id is null then raise exception 'USER_ACCOUNT_ID_REQUIRED' using errcode='22023'; end if;
  if coalesce(p_cpf_lookup_hmac,'') !~ '^[a-f0-9]{64}$' then
    raise exception 'CPF_LOOKUP_HMAC_INVALID' using errcode='22023';
  end if;
  if length(coalesce(p_cpf_ciphertext_base64,'')) not between 16 and 128
     or length(coalesce(p_cpf_initialization_vector_base64,'')) not between 16 and 32
     or length(coalesce(p_cpf_authentication_tag_base64,'')) not between 20 and 32
     or coalesce(p_cpf_key_version,0) < 1 then
    raise exception 'CPF_PROTECTED_PAYLOAD_INVALID' using errcode='22023';
  end if;

  v_result:=public.provision_public_signup_participant(
    p_user_account_id,p_preferred_name,p_business_name,p_attribution,p_idempotency_key
  );

  select identifier.lookup_hmac into v_existing_hmac
  from iam.user_cpf_identifiers identifier
  where identifier.user_account_id=p_user_account_id
  for update;

  if v_existing_hmac is null then
    begin
      insert into iam.user_cpf_identifiers(
        user_account_id,lookup_hmac,ciphertext_base64,initialization_vector_base64,
        authentication_tag_base64,key_version,status,source
      ) values(
        p_user_account_id,p_cpf_lookup_hmac,p_cpf_ciphertext_base64,
        p_cpf_initialization_vector_base64,p_cpf_authentication_tag_base64,
        p_cpf_key_version,'active','public_signup'
      );
    exception when unique_violation then
      raise exception 'CPF_ALREADY_LINKED_TO_ANOTHER_ACCOUNT' using errcode='23505';
    end;
  elsif v_existing_hmac<>p_cpf_lookup_hmac then
    raise exception 'CPF_CHANGE_REQUIRES_IDENTITY_REVIEW' using errcode='23514';
  else
    update iam.user_cpf_identifiers
    set ciphertext_base64=p_cpf_ciphertext_base64,
        initialization_vector_base64=p_cpf_initialization_vector_base64,
        authentication_tag_base64=p_cpf_authentication_tag_base64,
        key_version=p_cpf_key_version,
        status='active',
        updated_at=now()
    where user_account_id=p_user_account_id;
  end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'user_account_id',p_user_account_id,
    'cpf_lookup_hmac',p_cpf_lookup_hmac,
    'cpf_key_version',p_cpf_key_version
  ));
  v_event_id:=app_private.e14_command_event_id(
    'protect_public_signup_cpf',p_user_account_id,p_user_account_id,p_idempotency_key
  );
  if not app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select coalesce(max(event.aggregate_version),0)+1 into v_aggregate_version
    from eventing.events event
    where event.aggregate_type='user_account' and event.aggregate_id=p_user_account_id;

    perform app_private.e14_append_event(
      v_event_id,'identity.cpf.protected','user_account',p_user_account_id,
      'user',p_user_account_id,null,null,
      'user_account',p_user_account_id,v_aggregate_version,v_event_id,null,
      jsonb_build_object(
        'request_hash',v_request_hash,
        'result',jsonb_build_object(
          'user_account_id',p_user_account_id,
          'identifier_status','protected',
          'key_version',p_cpf_key_version
        )
      )
    );
  end if;

  return v_result || jsonb_build_object('cpf_status','protected');
end;
$$;

revoke all on table iam.user_cpf_identifiers from public,anon,authenticated;
revoke all on function public.provision_public_signup_participant_v2(
  uuid,text,text,jsonb,text,text,text,text,integer,text
) from public,anon,authenticated;
grant execute on function public.provision_public_signup_participant_v2(
  uuid,text,text,jsonb,text,text,text,text,integer,text
) to postgres,service_role,app_worker;
