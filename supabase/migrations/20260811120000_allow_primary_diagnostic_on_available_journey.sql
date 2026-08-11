begin;

create or replace function public.resolve_participant_diagnostic_entry(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  v_diagnostic_version_id uuid:=app_private.e14_active_profile_diagnostic_version();
  v_diagnostic_name text;
  v_session record;
  v_journey_instance_id uuid;
  v_state jsonb;
begin
  if v_entrepreneur_id is null then
    return jsonb_build_object('status','profile_required','next_path','/cadastro/concluir?retorno=perfil_incompleto');
  end if;

  if v_diagnostic_version_id is null then
    return jsonb_build_object('status','not_configured','next_path','/empreendedor/perfil?erro=diagnostico_nao_configurado');
  end if;

  select definition.name into v_diagnostic_name
  from diagnostics.diagnostic_versions version
  join diagnostics.diagnostic_definitions definition on definition.id=version.diagnostic_definition_id
  where version.id=v_diagnostic_version_id;

  if exists(select 1 from diagnostics.archetype_assignments assignment where assignment.entrepreneur_id=v_entrepreneur_id) then
    return jsonb_build_object(
      'status','completed',
      'diagnostic_version_id',v_diagnostic_version_id,
      'diagnostic_name',v_diagnostic_name,
      'next_path','/empreendedor/perfil/diagnostico'
    );
  end if;

  select session.id,session.status,session.journey_instance_id,session.aggregate_version
  into v_session
  from diagnostics.sessions session
  where session.entrepreneur_id=v_entrepreneur_id
    and session.diagnostic_version_id=v_diagnostic_version_id
    and session.status in ('in_progress','completed')
  order by session.created_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'status',case when v_session.status='completed' then 'completed' else 'in_progress' end,
      'diagnostic_version_id',v_diagnostic_version_id,
      'diagnostic_name',v_diagnostic_name,
      'journey_instance_id',v_session.journey_instance_id,
      'session_id',v_session.id,
      'session_aggregate_version',v_session.aggregate_version,
      'next_path',case when v_session.status='completed' then '/empreendedor/perfil/diagnostico' else '/empreendedor/diagnostico?journey='||v_session.journey_instance_id::text end
    );
  end if;

  select instance.id into v_journey_instance_id
  from orchestration.journey_instances instance
  join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions version on version.id=enrollment.journey_version_id
  where enrollment.entrepreneur_id=v_entrepreneur_id
    and enrollment.status in ('assigned','accepted','active','paused')
    and instance.status in ('available','in_progress')
    and version.status in ('published','retired')
    and coalesce(version.configuration->>'visibility','')<>'internal_test_only'
    and coalesce((version.configuration->>'publishable_to_real_participants')::boolean,true)
  order by case when instance.status='in_progress' then 0 else 1 end, instance.updated_at desc,instance.id
  limit 1;

  if v_journey_instance_id is null then
    return jsonb_build_object('status','journey_required','diagnostic_version_id',v_diagnostic_version_id,'diagnostic_name',v_diagnostic_name,'next_path','/empreendedor/jornadas');
  end if;

  v_state:=app_private.e14_q1(p_actor_user_account_id,v_journey_instance_id);
  return jsonb_build_object(
    'status','available',
    'diagnostic_version_id',v_diagnostic_version_id,
    'diagnostic_name',v_diagnostic_name,
    'journey_instance_id',v_journey_instance_id,
    'journey_status',v_state->>'journey_status',
    'journey_aggregate_version',coalesce((v_state->>'journey_aggregate_version')::bigint,0),
    'next_path','/empreendedor/diagnostico?journey='||v_journey_instance_id::text
  );
end;
$function$;

commit;
