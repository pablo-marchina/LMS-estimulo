create or replace function public.update_admin_activity_asset_metadata_by_asset(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_asset_id uuid,
  p_title text,
  p_description text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_title text:=nullif(btrim(coalesce(p_title,'')),'');
  v_description text:=nullif(btrim(coalesce(p_description,'')),'');
  v_activity_version_id uuid;
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_title is null then raise exception 'ASSET_TITLE_REQUIRED' using errcode='22023'; end if;

  select asset.activity_version_id into v_activity_version_id
  from catalog.content_assets asset
  join catalog.activity_versions version on version.id=asset.activity_version_id
  join catalog.activity_definitions definition on definition.id=version.activity_definition_id
  where asset.id=p_asset_id
    and definition.owner_organization_id=p_organization_id
  for update of asset;
  if v_activity_version_id is null then raise exception 'ACTIVITY_ASSET_NOT_FOUND' using errcode='P0002'; end if;

  update catalog.content_assets
     set title=v_title,
         accessibility_metadata=(coalesce(accessibility_metadata,'{}'::jsonb)-'description') ||
           case when v_description is null then '{}'::jsonb else jsonb_build_object('description',v_description) end
   where id=p_asset_id;

  v_result:=jsonb_build_object('asset_id',p_asset_id,'activity_version_id',v_activity_version_id,'title',v_title,'description',v_description);
  perform governance.write_audit_entry(
    'admin_activity_asset_metadata_saved','content_asset',p_asset_id,v_result,'internal',p_organization_id,p_actor_user_account_id
  );
  return v_result||jsonb_build_object('idempotency_key',v_key);
end;
$function$;

revoke all on function public.update_admin_activity_asset_metadata_by_asset(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.update_admin_activity_asset_metadata_by_asset(uuid,uuid,uuid,text,text,text) to service_role;
