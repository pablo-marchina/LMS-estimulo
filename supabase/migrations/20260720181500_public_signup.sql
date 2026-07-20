set lock_timeout = '5s';
set statement_timeout = '5min';

create table if not exists core.acquisition_attributions (
  id uuid primary key default gen_random_uuid(),
  user_account_id uuid not null references iam.user_accounts(id),
  entrepreneur_id uuid not null references core.entrepreneurs(id),
  attribution_kind text not null default 'first_touch',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_path text not null,
  captured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ck_core_acquisition_attributions_kind check (attribution_kind in ('first_touch')),
  constraint ck_core_acquisition_attributions_landing_path check (length(landing_path) between 1 and 500),
  constraint uq_core_acquisition_attributions_first_touch unique (user_account_id, attribution_kind)
);

create index if not exists ix_core_acquisition_attributions_entrepreneur
  on core.acquisition_attributions(entrepreneur_id,captured_at desc);

alter table core.acquisition_attributions enable row level security;

with event_names(event_name) as (
  values ('identity.public_signup.provisioned'),('acquisition.first_touch.recorded')
), schemas as (
  select event_name,
    jsonb_build_object(
      '$schema','https://json-schema.org/draft/2020-12/schema',
      'title',event_name,
      'type','object',
      'additionalProperties',true,
      'required',jsonb_build_array('request_hash','result'),
      'properties',jsonb_build_object(
        'request_hash',jsonb_build_object('type','string'),
        'result',jsonb_build_object('type','object')
      )
    ) as schema_document
  from event_names
)
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select
  app_private.e14_deterministic_uuid('event-schema:'||event_name||':1'),event_name,1,
  'urn:estimulo:event:'||event_name||':1',schema_document,
  app_private.e14_request_hash(schema_document),'published',now()
from schemas
on conflict (event_name,event_version) do nothing;

create or replace function public.provision_public_signup_participant(
  p_user_account_id uuid,
  p_preferred_name text,
  p_business_name text,
  p_attribution jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_email text;
  v_preferred_name text:=nullif(trim(p_preferred_name),'');
  v_business_name text:=nullif(trim(p_business_name),'');
  v_attribution jsonb:=coalesce(p_attribution,'{}'::jsonb);
  v_allowed_keys text[]:=array['utm_source','utm_medium','utm_campaign','utm_content','utm_term','landing_path'];
  v_unknown_key text;
  v_entrepreneur_id uuid;
  v_business_id uuid;
  v_attribution_id uuid:=app_private.e14_deterministic_uuid('public-signup-first-touch:'||p_user_account_id::text);
  v_new_attribution_id uuid;
  v_event_id uuid;
  v_attribution_event_id uuid;
  v_request_hash text;
  v_result jsonb;
  v_aggregate_version bigint;
  v_landing_path text;
begin
  if p_user_account_id is null then raise exception 'USER_ACCOUNT_ID_REQUIRED' using errcode='22023'; end if;
  if v_preferred_name is null or length(v_preferred_name) not between 2 and 120 then
    raise exception 'PREFERRED_NAME_INVALID' using errcode='22023';
  end if;
  if v_business_name is not null and length(v_business_name)>160 then
    raise exception 'BUSINESS_NAME_INVALID' using errcode='22023';
  end if;
  if jsonb_typeof(v_attribution)<>'object' then
    raise exception 'ATTRIBUTION_INVALID' using errcode='22023';
  end if;
  select key into v_unknown_key
  from jsonb_object_keys(v_attribution) key
  where not (key=any(v_allowed_keys))
  limit 1;
  if v_unknown_key is not null then raise exception 'ATTRIBUTION_FIELD_INVALID' using errcode='22023'; end if;
  if exists (
    select 1 from jsonb_each_text(v_attribution)
    where key<>'landing_path' and length(value)>200
  ) then raise exception 'ATTRIBUTION_VALUE_TOO_LONG' using errcode='22023'; end if;

  v_landing_path:=coalesce(nullif(trim(v_attribution->>'landing_path'),''),'/cadastro');
  if length(v_landing_path)>500 or left(v_landing_path,1)<>'/' then
    raise exception 'LANDING_PATH_INVALID' using errcode='22023';
  end if;

  select lower(trim(ua.email_normalized)) into v_email
  from iam.user_accounts ua
  where ua.id=p_user_account_id and ua.status='active'
  for update;
  if v_email is null then raise exception 'ACTIVE_USER_ACCOUNT_NOT_FOUND' using errcode='P0002'; end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'user_account_id',p_user_account_id,
    'preferred_name',v_preferred_name,
    'business_name',v_business_name,
    'attribution',v_attribution
  ));
  v_event_id:=app_private.e14_command_event_id(
    'provision_public_signup_participant',p_user_account_id,p_user_account_id,v_key
  );
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id;
    return v_result;
  end if;

  insert into core.entrepreneurs(
    id,user_account_id,preferred_name,email_normalized,status,profile_data
  ) values(
    app_private.e14_deterministic_uuid('public-signup-entrepreneur:'||p_user_account_id::text),
    p_user_account_id,v_preferred_name,v_email,'active',
    jsonb_build_object('source','public_signup','profile_version',1)
  )
  on conflict (user_account_id) do update
    set preferred_name=excluded.preferred_name,
        email_normalized=excluded.email_normalized,
        profile_data=core.entrepreneurs.profile_data || jsonb_build_object('source','public_signup','profile_version',1),
        updated_at=now()
  returning id into v_entrepreneur_id;

  select bm.business_id into v_business_id
  from core.business_memberships bm
  where bm.entrepreneur_id=v_entrepreneur_id
    and bm.is_primary=true
    and bm.valid_from<=current_date
    and (bm.valid_until is null or bm.valid_until>current_date)
  order by bm.created_at
  limit 1;

  if v_business_id is null and v_business_name is not null then
    v_business_id:=app_private.e14_deterministic_uuid('public-signup-business:'||p_user_account_id::text);
    insert into core.businesses(
      id,trade_name,status,country_code,profile_data
    ) values(
      v_business_id,v_business_name,'active','BR',
      jsonb_build_object('source','public_signup','verification_status','self_reported')
    ) on conflict (id) do nothing;

    insert into core.business_memberships(
      id,entrepreneur_id,business_id,relationship_type,is_primary,verification_status,valid_from,evidence_reference
    ) values(
      app_private.e14_deterministic_uuid('public-signup-business-membership:'||p_user_account_id::text),
      v_entrepreneur_id,v_business_id,'owner',true,'self_reported',current_date,'public_signup'
    ) on conflict do nothing;
  end if;

  insert into core.acquisition_attributions(
    id,user_account_id,entrepreneur_id,attribution_kind,
    utm_source,utm_medium,utm_campaign,utm_content,utm_term,landing_path,metadata
  ) values(
    v_attribution_id,p_user_account_id,v_entrepreneur_id,'first_touch',
    nullif(trim(v_attribution->>'utm_source'),''),
    nullif(trim(v_attribution->>'utm_medium'),''),
    nullif(trim(v_attribution->>'utm_campaign'),''),
    nullif(trim(v_attribution->>'utm_content'),''),
    nullif(trim(v_attribution->>'utm_term'),''),
    v_landing_path,
    jsonb_build_object('hubspot_classification','not_synced','capture_version',1)
  )
  on conflict (user_account_id,attribution_kind) do nothing
  returning id into v_new_attribution_id;

  v_result:=jsonb_build_object(
    'user_account_id',p_user_account_id,
    'entrepreneur_id',v_entrepreneur_id,
    'business_id',v_business_id,
    'attribution_id',v_attribution_id,
    'email_normalized',v_email
  );

  select coalesce(max(e.aggregate_version),0)+1 into v_aggregate_version
  from eventing.events e
  where e.aggregate_type='entrepreneur' and e.aggregate_id=v_entrepreneur_id;
  perform app_private.e14_append_event(
    v_event_id,'identity.public_signup.provisioned','entrepreneur',v_entrepreneur_id,
    'user',p_user_account_id,null,null,
    'entrepreneur',v_entrepreneur_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );

  if v_new_attribution_id is not null then
    v_attribution_event_id:=app_private.e14_deterministic_uuid('acquisition-first-touch-event:'||v_attribution_id::text);
    perform app_private.e14_append_event(
      v_attribution_event_id,'acquisition.first_touch.recorded','acquisition_attribution',v_attribution_id,
      'user',p_user_account_id,null,null,
      'acquisition_attribution',v_attribution_id,1,v_event_id,null,
      jsonb_build_object(
        'request_hash',app_private.e14_request_hash(v_attribution),
        'result',jsonb_build_object(
          'attribution_id',v_attribution_id,
          'entrepreneur_id',v_entrepreneur_id,
          'hubspot_classification','not_synced'
        )
      )
    );
  end if;

  return v_result;
end;
$$;

revoke all on table core.acquisition_attributions from public,anon,authenticated;
revoke all on function public.provision_public_signup_participant(uuid,text,text,jsonb,text)
  from public,anon,authenticated;
grant execute on function public.provision_public_signup_participant(uuid,text,text,jsonb,text)
  to postgres,service_role,app_worker;
