begin;

create temporary table test_signup_context (
  user_account_id uuid not null,
  entrepreneur_id uuid
) on commit drop;

insert into test_signup_context(user_account_id)
select id
from (
  insert into iam.user_accounts(email_normalized, status)
  values ('public-signup-e2e@estimulo.test', 'active')
  returning id
) created;

update test_signup_context
set entrepreneur_id = (
  public.provision_test_signup_participant(
    user_account_id,
    'public-signup-e2e@estimulo.test',
    'Participante de teste'
  )->>'entrepreneur_id'
)::uuid;

do $$
declare
  v_context test_signup_context%rowtype;
  v_replayed_id uuid;
begin
  select * into strict v_context from test_signup_context;

  if not exists (
    select 1
    from core.entrepreneurs e
    where e.id = v_context.entrepreneur_id
      and e.user_account_id = v_context.user_account_id
      and e.preferred_name = 'Participante de teste'
      and e.email_normalized = 'public-signup-e2e@estimulo.test'
      and e.profile_data @> '{"source":"test_public_signup","test_only":true}'::jsonb
  ) then
    raise exception 'test signup entrepreneur was not provisioned correctly';
  end if;

  v_replayed_id := (
    public.provision_test_signup_participant(
      v_context.user_account_id,
      'public-signup-e2e@estimulo.test',
      'Participante de teste atualizado'
    )->>'entrepreneur_id'
  )::uuid;

  if v_replayed_id <> v_context.entrepreneur_id then
    raise exception 'test signup provisioning is not idempotent';
  end if;

  if not exists (
    select 1 from core.entrepreneurs e
    where e.id = v_context.entrepreneur_id
      and e.preferred_name = 'Participante de teste atualizado'
  ) then
    raise exception 'test signup replay did not update the preferred name';
  end if;

  if has_function_privilege('anon', 'public.provision_test_signup_participant(uuid,text,text)', 'execute') then
    raise exception 'anon must not execute test signup provisioning';
  end if;

  if has_function_privilege('authenticated', 'public.provision_test_signup_participant(uuid,text,text)', 'execute') then
    raise exception 'authenticated must not execute test signup provisioning';
  end if;

  if not has_function_privilege('service_role', 'public.provision_test_signup_participant(uuid,text,text)', 'execute') then
    raise exception 'service_role must execute test signup provisioning';
  end if;
end;
$$;

rollback;
