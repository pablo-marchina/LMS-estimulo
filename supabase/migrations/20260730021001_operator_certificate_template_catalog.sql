create or replace function public.list_operator_certificate_templates(
  p_actor_user_account_id uuid,
  p_organization_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_items jsonb;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'engagement.manage'
  ) and not app_private.estimulo_staff_can_view(
    p_actor_user_account_id,
    p_organization_id
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'file_object_id', file.id,
        'original_filename', file.original_filename,
        'content_type', file.content_type,
        'size_bytes', file.size_bytes,
        'security_status', file.security_status,
        'created_at', file.created_at,
        'used_by', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'certificate_version_id', version.id,
              'certificate_definition_id', definition.id,
              'certificate_name', definition.name,
              'version_number', version.version_number,
              'status', version.status
            )
            order by definition.name, version.version_number desc
          )
          from engagement.certificate_versions version
          join engagement.certificate_definitions definition
            on definition.id = version.certificate_definition_id
          where version.template_file_object_id = file.id
            and definition.owner_organization_id = p_organization_id
        ), '[]'::jsonb)
      )
      order by file.created_at desc, file.id
    ),
    '[]'::jsonb
  )
  into v_items
  from core.file_objects file
  where file.owner_organization_id = p_organization_id
    and file.metadata->>'category' = 'certificate_template'
    and file.deleted_at is null;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'items', v_items
  );
end;
$$;

revoke all on function public.list_operator_certificate_templates(uuid, uuid) from public, anon, authenticated;
grant execute on function public.list_operator_certificate_templates(uuid, uuid) to service_role, app_worker;

comment on function public.list_operator_certificate_templates(uuid, uuid) is
  'Lists persisted certificate background files and the certificate versions that reference them for authorized Estimulo operators.';
