-- get_activity_asset_download was allowlisted in both RPC gateways
-- (authenticated-rpc, platform-extensions-rpc) and called from
-- /api/activity-assets/[assetId]/download since commit 0b5e9c90, but the
-- function itself was never created. The route has always failed closed
-- (function does not exist), so this is a new implementation, not a
-- restored one. Modeled on get_practice_download_descriptor's ownership
-- and file-descriptor pattern.
create or replace function public.get_activity_asset_download(
  p_actor_user_account_id uuid,
  p_step_instance_id uuid,
  p_content_asset_id uuid
) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog
as $$
declare
  v_entrepreneur_id uuid := app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  v_asset_title text;
  v_file core.file_objects%rowtype;
begin
  select asset.title into v_asset_title
  from orchestration.step_instances step
  join orchestration.path_assignments assignment on assignment.id = step.path_assignment_id
  join orchestration.journey_instances instance on instance.id = assignment.journey_instance_id
  join orchestration.enrollments enrollment on enrollment.id = instance.enrollment_id
  join catalog.content_assets asset on asset.activity_version_id = step.activity_version_id and asset.id = p_content_asset_id
  where step.id = p_step_instance_id
    and enrollment.entrepreneur_id = v_entrepreneur_id
    and step.status in ('available', 'in_progress', 'completed');
  if not found then raise exception 'ACTIVITY_ASSET_NOT_FOUND' using errcode = 'P0002'; end if;

  select f.* into v_file
  from catalog.content_assets asset
  join core.file_objects f on f.id = asset.file_object_id
  where asset.id = p_content_asset_id;
  if not found or v_file.deleted_at is not null then
    raise exception 'ACTIVITY_ASSET_NOT_DOWNLOADABLE' using errcode = '55000';
  end if;

  return jsonb_build_object(
    'bucket', v_file.bucket,
    'object_key', v_file.object_key,
    'filename', coalesce(v_file.original_filename, v_asset_title),
    'content_type', v_file.content_type
  );
end;
$$;

revoke all on function public.get_activity_asset_download(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_activity_asset_download(uuid, uuid, uuid) to service_role;
