begin;

do $$
declare
  v_org uuid:=gen_random_uuid();
  v_manager_one uuid:=gen_random_uuid();
  v_manager_two uuid:=gen_random_uuid();
  v_manager_one_membership uuid:=gen_random_uuid();
  v_manager_two_membership uuid:=gen_random_uuid();
  v_role_id uuid:=app_private.e14_deterministic_uuid('iam-role-manager:'||v_org::text);
  v_first jsonb;
  v_replay jsonb;
begin
  insert into iam.organizations(
    id,organization_type,slug,legal_name,display_name,status,metadata
  ) values(
    v_org,'operator','rbac-bootstrap-test','RBAC Bootstrap Test','RBAC Bootstrap Test','active','{}'
  );

  insert into iam.user_accounts(id,email_normalized,status) values
    (v_manager_one,'bootstrap.one@estimulo.test','active'),
    (v_manager_two,'bootstrap.two@estimulo.test','active');

  insert into iam.organization_memberships(
    id,organization_id,user_account_id,status,valid_from
  ) values
    (v_manager_one_membership,v_org,v_manager_one,'active',now()-interval '1 day'),
    (v_manager_two_membership,v_org,v_manager_two,'active',now()-interval '1 day');

  v_first:=public.bootstrap_organization_role_manager(
    v_org,v_manager_one_membership,
    'Primeiro gestor autorizado para o teste','bootstrap-role-manager-0001'
  );
  if coalesce((v_first->>'replayed')::boolean,true) then
    raise exception 'first bootstrap was marked replayed';
  end if;

  v_replay:=public.bootstrap_organization_role_manager(
    v_org,v_manager_one_membership,
    'Primeiro gestor autorizado para o teste','bootstrap-role-manager-0001'
  );
  if not coalesce((v_replay->>'replayed')::boolean,false) then
    raise exception 'bootstrap replay was not recognized';
  end if;

  begin
    perform public.bootstrap_organization_role_manager(
      v_org,v_manager_one_membership,
      'Motivo conflitante','bootstrap-role-manager-0001'
    );
    raise exception 'conflicting bootstrap replay unexpectedly succeeded';
  exception when others then
    if sqlerrm<>'IDEMPOTENCY_KEY_REUSED' then raise; end if;
  end;

  begin
    perform public.bootstrap_organization_role_manager(
      v_org,v_manager_two_membership,
      'Segundo bootstrap não permitido','bootstrap-role-manager-0002'
    );
    raise exception 'second bootstrap unexpectedly succeeded';
  exception when object_not_in_prerequisite_state then
    if sqlerrm<>'ROLE_MANAGER_ALREADY_BOOTSTRAPPED' then raise; end if;
  end;

  if not app_private.e14_actor_has_permission(
    v_manager_one,v_org,'iam.memberships.manage'
  ) then
    raise exception 'bootstrapped manager lacks role-management permission';
  end if;

  if not exists (
    select 1
    from iam.membership_roles mr
    where mr.membership_id=v_manager_one_membership
      and mr.role_id=v_role_id
      and mr.valid_from<=now()
      and (mr.valid_until is null or mr.valid_until>now())
  ) then
    raise exception 'bootstrap role assignment was not persisted';
  end if;

  if not exists (
    select 1
    from eventing.events e
    where e.event_name='iam.role.granted'
      and e.subject_id=v_manager_one_membership
      and e.actor_type='system'
      and e.actor_id is null
  ) then
    raise exception 'bootstrap event was not persisted as a system event';
  end if;

  perform public.grant_organization_role(
    v_manager_one,v_org,v_manager_two_membership,v_role_id,
    '{"all":true}',null,'bootstrap-second-manager-0001'
  );

  if not app_private.e14_actor_has_permission(
    v_manager_two,v_org,'iam.memberships.manage'
  ) then
    raise exception 'bootstrapped manager could not grant a second manager';
  end if;

  if has_function_privilege(
    'app_worker','public.bootstrap_organization_role_manager(uuid,uuid,text,text)','execute'
  ) or has_function_privilege(
    'authenticated','public.bootstrap_organization_role_manager(uuid,uuid,text,text)','execute'
  ) then
    raise exception 'bootstrap must remain restricted to trusted operational roles';
  end if;

  if not has_function_privilege(
    'service_role','public.bootstrap_organization_role_manager(uuid,uuid,text,text)','execute'
  ) then
    raise exception 'service_role must execute role bootstrap';
  end if;
end;
$$;

rollback;
