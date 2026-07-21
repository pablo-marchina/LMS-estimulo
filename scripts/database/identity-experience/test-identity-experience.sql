begin;

do $$
declare
  v_participant_actor uuid;
  v_participant_journey uuid;
  v_operator_actor uuid;
  v_organization_id uuid;
  v_saved jsonb;
  v_hub jsonb;
  v_outline jsonb;
  v_cpf jsonb;
begin
  select om.user_account_id,om.organization_id
  into v_operator_actor,v_organization_id
  from iam.organization_memberships om
  where om.status='active'
    and om.valid_from<=now()
    and (om.valid_until is null or om.valid_until>now())
    and app_private.e14_actor_has_permission(om.user_account_id,om.organization_id,'engagement.manage')
  limit 1;
  if v_operator_actor is null then raise exception 'engagement operator fixture missing'; end if;

  select distinct ua.id,instance.id
  into v_participant_actor,v_participant_journey
  from iam.user_accounts ua
  join core.entrepreneurs entrepreneur on entrepreneur.user_account_id=ua.id
  join orchestration.enrollments enrollment on enrollment.entrepreneur_id=entrepreneur.id
  join catalog.journey_versions version on version.id=enrollment.journey_version_id
  join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  join orchestration.journey_instances instance on instance.enrollment_id=enrollment.id
  where ua.status='active'
    and entrepreneur.status='active'
    and definition.owner_organization_id=v_organization_id
    and exists(select 1 from orchestration.path_assignments assignment where assignment.journey_instance_id=instance.id)
  limit 1;
  if v_participant_actor is null then raise exception 'participant fixture missing'; end if;

  if not (select relrowsecurity from pg_class where oid='iam.user_cpf_identifiers'::regclass) then
    raise exception 'CPF table must have RLS';
  end if;
  if has_table_privilege('anon','iam.user_cpf_identifiers','select')
     or has_table_privilege('authenticated','iam.user_cpf_identifiers','select') then
    raise exception 'browser roles must not read protected CPF';
  end if;
  if has_table_privilege('anon','engagement.announcements','select')
     or has_table_privilege('authenticated','engagement.announcements','select') then
    raise exception 'browser roles must not read announcements directly';
  end if;

  v_saved:=public.save_operator_announcement(
    v_operator_actor,v_organization_id,null,null,
    'Anúncio transacional','Mensagem criada somente dentro da prova transacional.',
    'Abrir painel','/empreendedor','published',100,
    now()-interval '1 minute',now()+interval '1 hour',
    '19111111-1111-4111-8111-111111111119'
  );
  if v_saved#>>'{data,status}'<>'published' then raise exception 'announcement save failed'; end if;

  v_hub:=public.get_participant_engagement_hub(v_participant_actor);
  if jsonb_array_length(v_hub->'announcements')<1 then raise exception 'participant announcement missing'; end if;
  if jsonb_typeof(v_hub->'ranking')<>'array' then raise exception 'ranking contract invalid'; end if;
  if jsonb_typeof(v_hub->'rewards')<>'array' then raise exception 'reward contract invalid'; end if;
  if jsonb_typeof(v_hub->'point_history')<>'array' then raise exception 'point history contract invalid'; end if;

  v_outline:=public.get_participant_journey_outline(v_participant_actor,v_participant_journey);
  if v_outline->>'journey_title' is null then raise exception 'journey title missing'; end if;
  if jsonb_array_length(v_outline->'modules')<1 then raise exception 'journey module missing'; end if;
  if jsonb_array_length(v_outline#>'{modules,0,activities}')<1 then raise exception 'journey activity missing'; end if;
  if v_outline#>>'{modules,0,activities,0,step_instance_id}' is null then raise exception 'outline step missing'; end if;

  begin
    perform public.get_participant_journey_outline(v_operator_actor,v_participant_journey);
    raise exception 'unrelated operator should not read participant outline';
  exception when others then
    if sqlerrm not like '%JOURNEY_NOT_FOUND%' and sqlerrm not like '%PARTICIPANT_NOT_FOUND%' then raise; end if;
  end;

  v_cpf:=public.provision_public_signup_participant_v2(
    v_participant_actor,'Participante transacional',null,
    '{"landing_path":"/cadastro","utm_source":null,"utm_medium":null,"utm_campaign":null,"utm_content":null,"utm_term":null}'::jsonb,
    repeat('a',64),repeat('Q',24),repeat('A',16),repeat('B',24),1,
    '19111111-1111-4111-8111-111111111120'
  );
  if v_cpf->>'cpf_status'<>'protected' then raise exception 'CPF protection contract failed'; end if;
  if not exists(select 1 from iam.user_cpf_identifiers where user_account_id=v_participant_actor) then
    raise exception 'protected CPF row missing';
  end if;
  if exists(select 1 from eventing.events where event_name='identity.cpf.protected' and payload::text like '%Participante transacional%') then
    raise exception 'CPF event leaked profile data';
  end if;

  begin
    perform public.provision_public_signup_participant_v2(
      v_participant_actor,'Participante transacional',null,'{}'::jsonb,
      repeat('c',64),repeat('Q',24),repeat('A',16),repeat('B',24),1,
      '19111111-1111-4111-8111-111111111121'
    );
    raise exception 'CPF change should require identity review';
  exception when check_violation then
    if sqlerrm not like '%CPF_CHANGE_REQUIRES_IDENTITY_REVIEW%' then raise; end if;
  end;
end;
$$;

rollback;
