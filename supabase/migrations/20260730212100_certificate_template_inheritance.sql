begin;

create or replace function public.get_certificate_render_payload(
  p_actor_user_account_id uuid,
  p_issuance_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  v_result jsonb;
begin
  select jsonb_build_object(
    'issuance_id',ci.id,
    'display_name',ci.display_name_snapshot,
    'journey_title',jv.title,
    'certificate_name',cd.name,
    'verification_code',ci.verification_code,
    'issued_at',ci.issued_at,
    'expires_at',ci.expires_at,
    'template_layout',cv.template_layout,
    'template',case when fo.id is null then null else jsonb_build_object(
      'bucket',fo.bucket,
      'object_key',fo.object_key,
      'content_type',fo.content_type,
      'filename',fo.original_filename
    ) end,
    'template_scope',resolved.scope_type
  )
  into v_result
  from engagement.certificate_issuances ci
  join engagement.certificate_versions cv on cv.id=ci.certificate_version_id
  join engagement.certificate_definitions cd on cd.id=cv.certificate_definition_id
  join catalog.journey_versions jv on jv.id=cv.journey_version_id
  join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
  left join lateral (
    select choice.file_object_id,choice.scope_type
    from (
      select asset.file_object_id,assignment.scope_type,
        case assignment.scope_type when 'journey' then 1 when 'program' then 2 when 'global' then 3 else 9 end as precedence
      from engagement.certificate_template_assignments assignment
      join engagement.certificate_template_assets asset on asset.id=assignment.template_asset_id and asset.status='active'
      where assignment.owner_organization_id=jd.owner_organization_id
        and assignment.active
        and (assignment.starts_at is null or assignment.starts_at<=now())
        and (assignment.ends_at is null or assignment.ends_at>now())
        and (
          (assignment.scope_type='journey' and assignment.scope_id=jd.id)
          or (assignment.scope_type='program' and assignment.scope_id=jd.program_id)
          or (assignment.scope_type='global' and assignment.scope_id is null)
        )
      union all
      select cv.template_file_object_id,'certificate_version'::text,4
      where cv.template_file_object_id is not null
    ) choice
    order by choice.precedence
    limit 1
  ) resolved on true
  left join core.file_objects fo on fo.id=resolved.file_object_id and fo.security_status='clean' and fo.deleted_at is null
  where ci.id=p_issuance_id
    and ci.entrepreneur_id=v_entrepreneur_id
    and ci.status='active'
    and ci.revoked_at is null;

  if v_result is null then
    raise exception 'CERTIFICATE_ISSUANCE_NOT_FOUND' using errcode='P0002';
  end if;
  return v_result;
end;
$$;

revoke all on function public.get_certificate_render_payload(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_certificate_render_payload(uuid,uuid) to service_role;

commit;
