set lock_timeout = '5s';
set statement_timeout = '5min';

insert into iam.permission_definitions(id,code,resource_type,action,description)
values(
  app_private.e14_deterministic_uuid('permission:diagnostic.configuration.manage'),
  'diagnostic.configuration.manage','diagnostic_definition','manage',
  'Review and manage versioned diagnostic configurations without granting publication by itself'
)
on conflict (code) do nothing;

do $$
declare
  v_organization_id uuid;
  v_role_id uuid;
  v_permission_id uuid;
begin
  select id into strict v_organization_id
  from iam.organizations
  where slug='estimulo-e14-internal' and status='active';
  select id into strict v_permission_id
  from iam.permission_definitions
  where code='diagnostic.configuration.manage';
  v_role_id:=app_private.e14_deterministic_uuid('role:diagnostic-configuration-manager:'||v_organization_id::text);

  insert into iam.role_definitions(id,organization_id,code,name,description,status)
  values(
    v_role_id,v_organization_id,'diagnostic_configuration_manager',
    'Gestão de configurações de diagnóstico',
    'Permite revisar configurações versionadas; publicação e uso com participantes continuam sujeitos aos gates próprios.',
    'active'
  )
  on conflict (organization_id,code) do update
    set name=excluded.name,description=excluded.description,status='active';

  insert into iam.role_permissions(role_id,permission_id)
  values(v_role_id,v_permission_id)
  on conflict do nothing;
end;
$$;

create or replace function public.get_business_maturity_draft(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_definition_id uuid;
  v_version_id uuid;
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,p_organization_id,'diagnostic.configuration.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select dd.id,dv.id into strict v_definition_id,v_version_id
  from diagnostics.diagnostic_definitions dd
  join diagnostics.diagnostic_versions dv on dv.diagnostic_definition_id=dd.id
  where dd.owner_organization_id=p_organization_id
    and dd.code='business_maturity_self_assessment'
    and dv.version_number=1;

  select jsonb_build_object(
    'definition',jsonb_build_object(
      'id',dd.id,'code',dd.code,'name',dd.name,'purpose',dd.purpose,'status',dd.status
    ),
    'version',jsonb_build_object(
      'id',dv.id,'version_number',dv.version_number,'status',dv.status,
      'configuration',dv.configuration,'content_hash',dv.content_hash
    ),
    'dimensions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',d.id,'code',d.code,'name',d.name,'description',d.description,'position',d.position,
        'item',jsonb_build_object(
          'id',i.id,'code',i.code,'prompt',i.prompt,'required',i.is_required,
          'options',coalesce((
            select jsonb_agg(jsonb_build_object(
              'id',io.id,'code',io.code,'label',io.label,'value',io.value,'position',io.position
            ) order by io.position)
            from diagnostics.item_options io where io.item_id=i.id
          ),'[]'::jsonb)
        )
      ) order by d.position)
      from diagnostics.dimensions d
      join diagnostics.items i on i.dimension_id=d.id and i.diagnostic_version_id=d.diagnostic_version_id
      where d.diagnostic_version_id=dv.id
    ),'[]'::jsonb),
    'rule',(
      select jsonb_build_object(
        'definition_id',rd.id,'version_id',rv.id,'status',rv.status,'language',rv.language,
        'expression',rv.expression,'input_schema',rv.input_schema,'output_schema',rv.output_schema
      )
      from orchestration.rule_definitions rd
      join orchestration.rule_versions rv on rv.rule_definition_id=rd.id
      where rd.owner_organization_id=p_organization_id
        and rd.code='business_maturity_scoring'
        and rv.version_number=1
    ),
    'segments',coalesce((
      select jsonb_agg(jsonb_build_object(
        'definition_id',sd.id,'version_id',sv.id,'code',sd.code,'name',sd.name,
        'description',sd.description,'status',sv.status,'published_at',sv.published_at
      ) order by sd.code)
      from diagnostics.segment_definitions sd
      join diagnostics.segment_versions sv on sv.segment_definition_id=sd.id
      where sd.owner_organization_id=p_organization_id
        and sd.code like 'business_maturity_%'
        and sv.version_number=1
    ),'[]'::jsonb),
    'assignment_count',(
      select count(*)
      from diagnostics.segment_assignments sa
      join diagnostics.segment_versions sv on sv.id=sa.segment_version_id
      join diagnostics.segment_definitions sd on sd.id=sv.segment_definition_id
      where sd.owner_organization_id=p_organization_id
        and sd.code like 'business_maturity_%'
    )
  ) into v_result
  from diagnostics.diagnostic_definitions dd
  join diagnostics.diagnostic_versions dv on dv.diagnostic_definition_id=dd.id
  where dd.id=v_definition_id and dv.id=v_version_id;

  return v_result;
end;
$$;

revoke all on function public.get_business_maturity_draft(uuid,uuid)
from public,anon,authenticated;
grant execute on function public.get_business_maturity_draft(uuid,uuid)
to postgres,service_role,app_worker;
