begin;

create temporary table public_signup_context(
  user_account_id uuid not null,
  entrepreneur_id uuid,
  business_id uuid,
  attribution_id uuid
) on commit drop;

with account as (
  insert into iam.user_accounts(email_normalized,status)
  values('public-participant@estimulo.test','active')
  returning id
)
insert into public_signup_context(user_account_id) select id from account;

update public_signup_context
set (entrepreneur_id,business_id,attribution_id) = (
  select
    (result->>'entrepreneur_id')::uuid,
    (result->>'business_id')::uuid,
    (result->>'attribution_id')::uuid
  from (
    select public.provision_public_signup_participant(
      user_account_id,
      'Participante público',
      'Negócio inicial',
      '{"utm_source":"parceiro","utm_medium":"referral","utm_campaign":"jornada-openai","landing_path":"/cadastro"}'::jsonb,
      'public-signup-provision-0001'
    ) result
    from public_signup_context
  ) provisioned
);

do $$
declare
  v public_signup_context%rowtype;
  v_replay jsonb;
  v_second jsonb;
begin
  select * into strict v from public_signup_context;

  if not exists (
    select 1 from core.entrepreneurs e
    where e.id=v.entrepreneur_id
      and e.user_account_id=v.user_account_id
      and e.preferred_name='Participante público'
      and e.email_normalized='public-participant@estimulo.test'
      and e.profile_data @> '{"source":"public_signup","profile_version":1}'::jsonb
  ) then raise exception 'public signup entrepreneur was not provisioned'; end if;

  if not exists (
    select 1 from core.businesses b
    join core.business_memberships bm on bm.business_id=b.id
    where b.id=v.business_id
      and b.trade_name='Negócio inicial'
      and b.profile_data @> '{"source":"public_signup","verification_status":"self_reported"}'::jsonb
      and bm.entrepreneur_id=v.entrepreneur_id
      and bm.is_primary=true
      and bm.relationship_type='owner'
  ) then raise exception 'public signup business was not provisioned'; end if;

  if not exists (
    select 1 from core.acquisition_attributions a
    where a.id=v.attribution_id
      and a.user_account_id=v.user_account_id
      and a.utm_source='parceiro'
      and a.utm_campaign='jornada-openai'
      and a.metadata->>'hubspot_classification'='not_synced'
  ) then raise exception 'first-touch attribution was not recorded'; end if;

  v_replay:=public.provision_public_signup_participant(
    v.user_account_id,'Participante público','Negócio inicial',
    '{"utm_source":"parceiro","utm_medium":"referral","utm_campaign":"jornada-openai","landing_path":"/cadastro"}'::jsonb,
    'public-signup-provision-0001'
  );
  if (v_replay->>'entrepreneur_id')::uuid<>v.entrepreneur_id then raise exception 'signup replay changed entrepreneur'; end if;

  begin
    perform public.provision_public_signup_participant(
      v.user_account_id,'Nome conflitante','Negócio inicial',
      '{"landing_path":"/cadastro"}'::jsonb,
      'public-signup-provision-0001'
    );
    raise exception 'conflicting signup replay unexpectedly succeeded';
  exception when others then if sqlerrm<>'IDEMPOTENCY_KEY_REUSED' then raise; end if; end;

  v_second:=public.provision_public_signup_participant(
    v.user_account_id,'Participante atualizado','Outro nome ignorado',
    '{"utm_source":"outra-origem","landing_path":"/cadastro"}'::jsonb,
    'public-signup-provision-0002'
  );

  if not exists (select 1 from core.entrepreneurs where id=v.entrepreneur_id and preferred_name='Participante atualizado') then
    raise exception 'later profile update did not apply';
  end if;
  if (select count(*) from core.acquisition_attributions where user_account_id=v.user_account_id)<>1 then
    raise exception 'first touch was duplicated';
  end if;
  if not exists (select 1 from core.acquisition_attributions where id=v.attribution_id and utm_source='parceiro') then
    raise exception 'first touch was overwritten';
  end if;
  if exists (
    select 1 from iam.organization_memberships om
    join iam.membership_roles mr on mr.membership_id=om.id
    where om.user_account_id=v.user_account_id
  ) then raise exception 'public signup created an administrative role'; end if;

  if not exists (select 1 from eventing.events where event_name='identity.public_signup.provisioned' and subject_id=v.entrepreneur_id) then
    raise exception 'signup event missing';
  end if;
  if not exists (select 1 from eventing.events where event_name='acquisition.first_touch.recorded' and subject_id=v.attribution_id) then
    raise exception 'first-touch event missing';
  end if;
  if not exists (select 1 from eventing.outbox where event_id in (select event_id from eventing.events where subject_id in (v.entrepreneur_id,v.attribution_id))) then
    raise exception 'signup events were not added to outbox';
  end if;

  if has_function_privilege('anon','public.provision_public_signup_participant(uuid,text,text,jsonb,text)','execute')
    or has_function_privilege('authenticated','public.provision_public_signup_participant(uuid,text,text,jsonb,text)','execute') then
    raise exception 'browser roles must not provision public signup';
  end if;
  if not has_function_privilege('service_role','public.provision_public_signup_participant(uuid,text,text,jsonb,text)','execute') then
    raise exception 'service_role must provision public signup';
  end if;
end;
$$;

rollback;
