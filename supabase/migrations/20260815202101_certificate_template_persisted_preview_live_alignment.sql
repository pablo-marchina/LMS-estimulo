begin;

-- Admin-only descriptor for a certificate background that was already uploaded
-- and persisted. The browser never receives raw storage coordinates from the
-- workspace payload; the Next route resolves a short-lived signed URL instead.
create or replace function public.get_admin_certificate_template_preview_download(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_file_object_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_file core.file_objects%rowtype;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'engagement.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select *
  into v_file
  from core.file_objects
  where id = p_file_object_id
    and owner_organization_id = p_organization_id
    and metadata->>'category' = 'certificate_template'
    and content_type like 'image/%'
    and security_status = 'clean'
    and deleted_at is null;

  if not found then
    raise exception 'CERTIFICATE_TEMPLATE_PREVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'file_object_id', v_file.id,
    'bucket', v_file.bucket,
    'object_key', v_file.object_key,
    'content_type', v_file.content_type,
    'original_filename', v_file.original_filename
  );
end;
$function$;

revoke all on function public.get_admin_certificate_template_preview_download(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.get_admin_certificate_template_preview_download(uuid, uuid, uuid)
to postgres, service_role, app_worker;

commit;
