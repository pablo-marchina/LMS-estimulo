begin;

create temporary table rbac_test_context (
  organization_id uuid not null,
  manager_one_user_id uuid not null,
  manager_two_user_id uuid not null,
  participant_user_id uuid not null,
  unauthorized_user_id uuid not null,
  manager_one_membership_id uuid not null,
  manager_two_membership_id uuid not null,
  participant_membership_id uuid not null,
  unauthorized_membership_id uuid not null,
  manager_role_id uuid not null,
  participant_role_id uuid not null,
  escalation_role_id uuid not null
) on commit drop;

do $$
declare
  v_org uuid:=gen_random_uuid();
  v_manager_one uuid:=gen_random_uuid();
  v_manager_two uuid:=gen_random_uuid();
  v_participant uuid:=gen_random_uuid();
  v_unauthorized uuid:=gen_random_uuid();
  v_manager_one_membership uuid:=gen_random_uuid();
  v_manager_two_membership uuid:=gen_random_uuid();
  v_participant_membership uuid:=gen_random_uuid();
  v_unauthorized_membership uuid:=gen_random_uuid();
  v_manager_role uuid:=gen_random_uuid();
  v_participant_role uuid:=gen_random_uuid();
  v_escalation_role uuid:=gen_random_uuid();
  v_manage_permission uuid;
  v_governance_permission uuid;
begin
  insert into iam.organizations(id,organization_type,slug,legal_name,display_name,status,metadata)
  values(v_org,'operator','rbac-loop-test','RBAC Loop Test','RBAC Loop Test','active','{}');

  insert into iam.user_accounts(id,email_normalized,status) values
    (v_manager_one,'manager.one@estimulo.test','active'),
    (v_manager_two,'manager.two@estimulo.test','active'),
    (v_participant,'participant@estimulo.test','active'),
    (v_unauthorized,'unauthorized@estimulo.test','active');

  insert into iam.organization_memberships(id,organization_id,user_account_id,status,valid_from) values
    (v_manager_one_membership,v_org,v_manager_one,'active',now()-interval '1 day'),
    (v_manager_two_membership,v_org,v_manager_two,'active',now()-interval '1 day'),
    (v_participant_membership,v_org,v_participant,'active',now()-interval '1 day'),
    (v_unauthorized_membership,v_org,v_unauthorized,'active',now()-interval '1 day');

  insert into iam.role_definitions(id,organization_id,code,name,description,status) values
    (v_manager_role,v_org,'role_manager','Role manager','May manage membership roles','active'),
    (v_participant_role,v_org,'participant','Participant','Participant role','active'),
    (v_escalation_role,v_org,'governance_operator','Governance operator','May operate governance workflows','active');

  select id into strict v_manage_permission from iam.permission_definitions where code='iam.memberships.manage';
  select id into strict v_governance_permission from iam.permission_definitions where code='governance.manage';
  insert into iam.role_permissions(role_id,permission_id) values
    (v_manager_role,v_manage_permission),
    (v_escalation_role,v_governance_permission);
  insert into iam.membership_roles(membership_id,role_id,scope,valid_from) values
    (v_manager_one_membership,v_manager_role,'{"all":true}',now()-interval '1 hour'),
    (v_manager_two_membership,v_manager_role,'{"all":true}',now()-interval '1 hour');

  insert into rbac_test_context values(
    v_org,v_manager_one,v_manager_two,v_participant,v_unauthorized,
    v_manager_one_membership,v_manager_two_membership,v_participant_membership,v_unauthorized_membership,
    v_manager_role,v_participant_role,v_escalation_role
  );
end;
$$;

do $$
declare
  v rbac_test_context%rowtype;
  v_first jsonb;
  v_replay jsonb;
  v_list jsonb;
begin
  select * into strict v from rbac_test_context;

  v_list:=public.list_organization_role_management(v.manager_one_user_id,v.organization_id);
  if jsonb_array_length(v_list->'memberships')<>4 or jsonb_array_length(v_list->'roles')<>3 then
    raise exception 'role-management listing is incomplete';
  end if;

  begin
    perform public.list_organization_role_management(v.unauthorized_user_id,v.organization_id);
    raise exception 'unauthorized listing unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.grant_organization_role(
      v.manager_one_user_id,v.organization_id,v.manager_one_membership_id,v.escalation_role_id,
      '{"all":true}',null,'self-grant-test-0001'
    );
    raise exception 'self escalation unexpectedly succeeded';
  exception when insufficient_privilege then
    if sqlerrm<>'SELF_ESCALATION_FORBIDDEN' then raise; end if;
  end;

  if coalesce((public.grant_organization_role(
    v.manager_one_user_id,v.organization_id,v.manager_one_membership_id,v.participant_role_id,
    '{}',null,'self-nonescalating-grant-0001'
  )->>'replayed')::boolean,true) then
    raise exception 'non-escalating self grant was not applied';
  end if;
  perform public.revoke_organization_role(
    v.manager_one_user_id,v.organization_id,v.manager_one_membership_id,v.participant_role_id,
    'Remoção do papel sem novas permissões','self-nonescalating-revoke-0001'
  );

  begin
    perform public.grant_organization_role(
      v.unauthorized_user_id,v.organization_id,v.participant_membership_id,v.participant_role_id,
      '{"all":true}',null,'unauthorized-grant-0001'
    );
    raise exception 'unauthorized grant unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  v_first:=public.grant_organization_role(
    v.manager_one_user_id,v.organization_id,v.participant_membership_id,v.participant_role_id,
    '{"all":true}','2030-01-01T00:00:00Z','participant-grant-0001'
  );
  if coalesce((v_first->>'replayed')::boolean,true) then raise exception 'first grant was marked replayed'; end if;

  v_replay:=public.grant_organization_role(
    v.manager_one_user_id,v.organization_id,v.participant_membership_id,v.participant_role_id,
    '{"all":true}','2030-01-01T00:00:00Z','participant-grant-0001'
  );
  if not coalesce((v_replay->>'replayed')::boolean,false) then raise exception 'identical grant replay was not recognized'; end if;

  begin
    perform public.grant_organization_role(
      v.manager_one_user_id,v.organization_id,v.participant_membership_id,v.participant_role_id,
      '{"all":true}','2031-01-01T00:00:00Z','participant-grant-0001'
    );
    raise exception 'conflicting grant replay unexpectedly succeeded';
  exception when others then
    if sqlerrm<>'IDEMPOTENCY_KEY_REUSED' then raise; end if;
  end;
end;
$$;

do $$
declare
  v rbac_test_context%rowtype;
  v_revoke jsonb;
begin
  select * into strict v from rbac_test_context;

  if not exists (
    select 1 from iam.membership_roles
    where membership_id=v.participant_membership_id and role_id=v.participant_role_id
      and valid_from<=now() and (valid_until is null or valid_until>now())
  ) then raise exception 'role grant was not persisted'; end if;

  if not exists (
    select 1 from eventing.events where event_name='iam.role.granted'
      and subject_id=v.participant_membership_id
  ) then raise exception 'role grant event was not persisted'; end if;

  v_revoke:=public.revoke_organization_role(
    v.manager_one_user_id,v.organization_id,v.participant_membership_id,v.participant_role_id,
    'Solicitação administrativa de teste','participant-revoke-0001'
  );
  if coalesce((v_revoke->>'replayed')::boolean,true) then raise exception 'first revoke was marked replayed'; end if;
  if not coalesce((public.revoke_organization_role(
    v.manager_one_user_id,v.organization_id,v.participant_membership_id,v.participant_role_id,
    'Solicitação administrativa de teste','participant-revoke-0001'
  )->>'replayed')::boolean,false) then raise exception 'identical revoke replay was not recognized'; end if;

  begin
    perform public.revoke_organization_role(
      v.manager_one_user_id,v.organization_id,v.participant_membership_id,v.participant_role_id,
      'Motivo diferente','participant-revoke-0001'
    );
    raise exception 'conflicting revoke replay unexpectedly succeeded';
  exception when others then
    if sqlerrm<>'IDEMPOTENCY_KEY_REUSED' then raise; end if;
  end;

  if exists (
    select 1 from iam.membership_roles
    where membership_id=v.participant_membership_id and role_id=v.participant_role_id
      and valid_from<=now() and (valid_until is null or valid_until>now())
  ) then raise exception 'role revoke did not close the active assignment'; end if;

  if not exists (
    select 1 from eventing.events where event_name='iam.role.revoked'
      and subject_id=v.participant_membership_id
  ) then raise exception 'role revoke event was not persisted'; end if;

  perform public.revoke_organization_role(
    v.manager_one_user_id,v.organization_id,v.manager_one_membership_id,v.manager_role_id,
    'Autorrevogação com outro gestor ativo','manager-one-self-revoke-0001'
  );

  begin
    perform public.revoke_organization_role(
      v.manager_two_user_id,v.organization_id,v.manager_two_membership_id,v.manager_role_id,
      'Tentativa de remover o último gestor','last-manager-revoke-0001'
    );
    raise exception 'last manager revocation unexpectedly succeeded';
  exception when object_not_in_prerequisite_state then
    if sqlerrm<>'LAST_ROLE_MANAGER_REQUIRED' then raise; end if;
  end;

  if has_function_privilege('anon','public.grant_organization_role(uuid,uuid,uuid,uuid,jsonb,timestamp with time zone,text)','execute')
     or has_function_privilege('authenticated','public.grant_organization_role(uuid,uuid,uuid,uuid,jsonb,timestamp with time zone,text)','execute') then
    raise exception 'browser-facing roles must not execute role grant';
  end if;
  if not has_function_privilege('service_role','public.grant_organization_role(uuid,uuid,uuid,uuid,jsonb,timestamp with time zone,text)','execute') then
    raise exception 'service_role must execute role grant';
  end if;
end;
$$;

rollback;
