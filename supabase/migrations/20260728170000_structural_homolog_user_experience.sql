begin;

create table if not exists catalog.external_credential_issuers (
  id uuid primary key,
  code text not null unique,
  name text not null,
  display_order integer not null default 100,
  status text not null default 'active' check (status in ('active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table catalog.external_credential_issuers from public, anon, authenticated;

insert into catalog.external_credential_issuers(id,code,name,display_order,status)
values
  (app_private.e14_deterministic_uuid('external-credential-issuer:sebrae'),'sebrae','Sebrae',10,'active'),
  (app_private.e14_deterministic_uuid('external-credential-issuer:alianca-empreendedora'),'alianca_empreendedora','Aliança Empreendedora',20,'active'),
  (app_private.e14_deterministic_uuid('external-credential-issuer:belabs'),'belabs','Be.labs',30,'active'),
  (app_private.e14_deterministic_uuid('external-credential-issuer:emperifa'),'emperifa','Emperifa',40,'active'),
  (app_private.e14_deterministic_uuid('external-credential-issuer:other'),'other','Outros',999,'active')
on conflict(code) do update set
  name=excluded.name,
  display_order=excluded.display_order,
  status=excluded.status,
  updated_at=now();

create or replace function public.list_external_credential_issuers(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  v_items jsonb;
begin
  if v_entrepreneur_id is null then
    return jsonb_build_object('status','profile_required','items','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'code',issuer.code,
    'name',issuer.name,
    'display_order',issuer.display_order
  ) order by issuer.display_order,issuer.name),'[]'::jsonb)
  into v_items
  from catalog.external_credential_issuers issuer
  where issuer.status='active';

  return jsonb_build_object('status','ready','items',v_items);
end;
$function$;

create or replace function public.get_participant_profile_summary(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid;
  v_objective text;
  v_updated_at timestamptz;
begin
  select entrepreneur.id,
    nullif(btrim(entrepreneur.profile_data->>'application_objective'),''),
    entrepreneur.updated_at
  into v_entrepreneur_id,v_objective,v_updated_at
  from core.entrepreneurs entrepreneur
  where entrepreneur.user_account_id=p_actor_user_account_id and entrepreneur.status='active';

  if v_entrepreneur_id is null then
    return jsonb_build_object('status','profile_required','entrepreneur_id',null,'application_objective',null,'updated_at',null);
  end if;

  return jsonb_build_object(
    'status','ready',
    'entrepreneur_id',v_entrepreneur_id,
    'application_objective',v_objective,
    'updated_at',v_updated_at
  );
end;
$function$;

create or replace function public.list_participant_external_credentials(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  v_items jsonb;
  v_count integer:=0;
begin
  if v_entrepreneur_id is null then
    return jsonb_build_object('status','profile_required','entrepreneur_id',null,'count',0,'items','[]'::jsonb);
  end if;

  select count(*)::integer,
    coalesce(jsonb_agg(jsonb_build_object(
      'id',credential.id,
      'title',credential.title,
      'issuer',credential.issuer,
      'issued_on',credential.issued_on,
      'expires_on',credential.expires_on,
      'verification_url',credential.verification_url,
      'status',credential.status,
      'original_filename',file.original_filename,
      'content_type',file.content_type,
      'size_bytes',file.size_bytes,
      'created_at',credential.created_at,
      'storage_status',case when file.id is null then 'missing' when file.security_status<>'clean' then file.security_status else 'ready' end,
      'download_available',file.id is not null and file.security_status='clean'
    ) order by credential.created_at desc),'[]'::jsonb)
  into v_count,v_items
  from engagement.external_credentials credential
  left join core.file_objects file on file.id=credential.file_object_id
  where credential.entrepreneur_id=v_entrepreneur_id and credential.status='active';

  return jsonb_build_object(
    'status','ready',
    'entrepreneur_id',v_entrepreneur_id,
    'count',coalesce(v_count,0),
    'items',coalesce(v_items,'[]'::jsonb)
  );
end;
$function$;

create or replace function app_private.e14_active_profile_diagnostic_version()
returns uuid
language sql
stable security definer
set search_path to 'pg_catalog'
as $function$
  select version.id
  from diagnostics.diagnostic_versions version
  join diagnostics.diagnostic_definitions definition on definition.id=version.diagnostic_definition_id
  where definition.code='entrepreneur_archetype_diagnostic'
    and definition.status='active'
    and version.status='published'
    and version.published_at is not null
  order by version.version_number desc,version.published_at desc
  limit 1
$function$;

create or replace function app_private.e14_diagnostic_context(p_actor uuid,p_instance uuid,p_diag uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid;
  v_organization_id uuid;
  v_expected_diagnostic_id uuid;
  v_instance_status text;
begin
  select enrollment.entrepreneur_id,
    definition.owner_organization_id,
    coalesce(nullif(version.configuration->>'diagnostic_version_id','')::uuid,app_private.e14_active_profile_diagnostic_version()),
    instance.status
  into v_entrepreneur_id,v_organization_id,v_expected_diagnostic_id,v_instance_status
  from orchestration.journey_instances instance
  join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions version on version.id=enrollment.journey_version_id
  join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  where instance.id=p_instance;

  if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002'; end if;
  if app_private.e14_entrepreneur_for_account(p_actor) is distinct from v_entrepreneur_id then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_instance_status<>'in_progress' or v_expected_diagnostic_id is distinct from p_diag or not exists(
    select 1 from diagnostics.diagnostic_versions where id=p_diag and status='published'
  ) then raise exception 'DIAGNOSTIC_NOT_AVAILABLE' using errcode='P0001'; end if;

  return jsonb_build_object('entrepreneur_id',v_entrepreneur_id,'organization_id',v_organization_id);
end;
$function$;

create or replace function public.get_participant_experience_with_default_diagnostic(p_actor_user_account_id uuid,p_journey_instance_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_base jsonb;
  v_diagnostic_version_id uuid;
  v_session_id uuid;
  v_diagnostic jsonb;
begin
  v_base:=public.e14_get_participant_experience(p_actor_user_account_id,p_journey_instance_id);
  if coalesce(jsonb_typeof(v_base->'diagnostic'),'null')<>'null' then return v_base; end if;

  v_diagnostic_version_id:=app_private.e14_active_profile_diagnostic_version();
  if v_diagnostic_version_id is null then return v_base; end if;

  v_session_id:=nullif(v_base->'state'->'d'->>'session_id','')::uuid;
  select jsonb_build_object(
    'version_id',version.id,
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'id',item.id,
      'code',item.code,
      'prompt',item.prompt,
      'item_type',item.item_type,
      'position',item.position,
      'is_required',item.is_required,
      'options',coalesce((select jsonb_agg(jsonb_build_object(
        'id',option.id,'code',option.code,'label',option.label,'position',option.position
      ) order by option.position) from diagnostics.item_options option where option.item_id=item.id),'[]'::jsonb),
      'response',(select jsonb_build_object('revision',response.revision,'option_code',response.response_value->>'option_code')
        from diagnostics.responses response
        where response.session_id=v_session_id and response.item_id=item.id
        order by response.revision desc limit 1)
    ) order by item.position) from diagnostics.items item where item.diagnostic_version_id=version.id),'[]'::jsonb)
  ) into v_diagnostic
  from diagnostics.diagnostic_versions version
  where version.id=v_diagnostic_version_id and version.status='published';

  if v_diagnostic is null then return v_base; end if;
  return jsonb_set(v_base,'{diagnostic}',v_diagnostic,true);
end;
$function$;

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
      'next_path','/empreendedor/perfil'
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
      'next_path',case when v_session.status='completed' then '/empreendedor/perfil' else '/empreendedor/diagnostico?journey='||v_session.journey_instance_id::text end
    );
  end if;

  select instance.id into v_journey_instance_id
  from orchestration.journey_instances instance
  join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions version on version.id=enrollment.journey_version_id
  where enrollment.entrepreneur_id=v_entrepreneur_id
    and enrollment.status in ('assigned','accepted','active','paused')
    and instance.status='in_progress'
    and version.status in ('published','retired')
    and coalesce(version.configuration->>'visibility','')<>'internal_test_only'
    and coalesce((version.configuration->>'publishable_to_real_participants')::boolean,true)
  order by instance.updated_at desc,instance.id
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
