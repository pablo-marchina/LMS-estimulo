-- Structural remediation for the 2026-08-19 team test report.
-- 1) Prefer the already-uploaded private Supabase lesson videos over Drive embeds.
-- 2) Keep the participant navigation data-driven so empty/underfilled library surfaces stay hidden.

update catalog.content_assets asset
set accessibility_metadata = coalesce(asset.accessibility_metadata, '{}'::jsonb) || jsonb_build_object(
  'managed_storage_provider', 'supabase',
  'managed_storage_bucket', stored.bucket_id,
  'managed_storage_object_key', stored.name,
  'managed_storage_content_type', coalesce(stored.metadata ->> 'mimetype', 'video/mp4')
)
from storage.objects stored
where asset.accessibility_metadata ->> 'source_collection_id' = '1JIU-6NZhNI84zUMxHgYal_i8nb7up4ET'
  and nullif(asset.accessibility_metadata ->> 'source_file_id', '') is not null
  and stored.bucket_id = 'lesson-videos'
  and stored.name = format(
    'course/%s/%s-720p.mp4',
    asset.accessibility_metadata ->> 'source_file_id',
    asset.accessibility_metadata ->> 'source_file_id'
  );

create or replace function public.get_activity_asset_download(
  p_actor_user_account_id uuid,
  p_step_instance_id uuid,
  p_content_asset_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_result jsonb;
  v_entrepreneur_id uuid := app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
begin
  select jsonb_build_object(
    'bucket', coalesce(file.bucket, stored.bucket_id),
    'object_key', coalesce(file.object_key, stored.name),
    'filename', coalesce(
      file.original_filename,
      asset.accessibility_metadata ->> 'original_filename',
      asset.title || case when asset.asset_type = 'video' then '.mp4' else '' end
    ),
    'content_type', coalesce(
      file.content_type,
      stored.metadata ->> 'mimetype',
      asset.accessibility_metadata ->> 'managed_storage_content_type',
      'application/octet-stream'
    )
  )
  into v_result
  from orchestration.step_instances step
  join orchestration.path_assignments assignment on assignment.id = step.path_assignment_id
  join orchestration.journey_instances instance on instance.id = assignment.journey_instance_id
  join orchestration.enrollments enrollment on enrollment.id = instance.enrollment_id
  join catalog.content_assets asset
    on asset.id = p_content_asset_id
   and asset.activity_version_id = step.activity_version_id
  left join core.file_objects file on file.id = asset.file_object_id
  left join storage.objects stored
    on file.id is null
   and stored.bucket_id = asset.accessibility_metadata ->> 'managed_storage_bucket'
   and stored.name = asset.accessibility_metadata ->> 'managed_storage_object_key'
  where step.id = p_step_instance_id
    and enrollment.entrepreneur_id = v_entrepreneur_id
    and (
      (file.id is not null and file.security_status = 'clean')
      or (
        file.id is null
        and stored.id is not null
        and stored.bucket_id = 'lesson-videos'
        and stored.name like 'course/%'
      )
    )
  limit 1;

  if v_result is null then
    raise exception 'ACTIVITY_ASSET_NOT_FOUND' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

create or replace function public.get_participant_shell_context(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_organization_id uuid;
  v_library_item_count integer := 0;
  v_result jsonb;
begin
  if not exists (
    select 1
    from iam.user_accounts u
    where u.id = p_actor_user_account_id
      and u.status = 'active'
  ) then
    raise exception 'ACTOR_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_organization_id := app_private.extension_default_organization();

  select count(*)::integer
  into v_library_item_count
  from catalog.library_item_versions version
  join catalog.library_items item on item.id = version.library_item_id
  where version.status = 'published'
    and item.status = 'active'
    and version.discoverable_in_library = true
    and version.estimated_minutes is not null;

  select jsonb_build_object(
    'organization_id', v_organization_id,
    'pending_legal_documents', coalesce((
      select jsonb_agg(to_jsonb(document) order by document.document_type)
      from governance.legal_document_versions document
      where document.organization_id = v_organization_id
        and document.status = 'published'
        and document.require_reacceptance
        and not exists (
          select 1
          from governance.legal_acceptances acceptance
          where acceptance.legal_document_version_id = document.id
            and acceptance.user_account_id = p_actor_user_account_id
        )
    ), '[]'::jsonb),
    'has_b2b_access', exists (
      select 1
      from experience.b2b_pages page
      join experience.b2b_page_versions version
        on version.b2b_page_id = page.id
       and version.status = 'published'
      where page.owner_organization_id = v_organization_id
        and page.status = 'active'
        and (version.starts_at is null or version.starts_at <= now())
        and (version.ends_at is null or version.ends_at > now())
        and (
          exists (
            select 1
            from experience.b2b_page_user_access access
            where access.b2b_page_id = page.id
              and access.user_account_id = p_actor_user_account_id
          )
          or exists (
            select 1
            from experience.b2b_page_group_access group_access
            join experience.b2b_group_members group_member on group_member.group_id = group_access.group_id
            where group_access.b2b_page_id = page.id
              and group_member.user_account_id = p_actor_user_account_id
          )
        )
    ),
    'library_item_count', v_library_item_count,
    -- Two complete desktop rows is enough volume to avoid presenting an empty-looking library.
    'has_library_content', v_library_item_count >= 6
  ) into v_result;

  return v_result;
end;
$$;

comment on function public.get_activity_asset_download(uuid, uuid, uuid) is
  'Returns an authorized private asset locator. Canonical file_objects are preferred; managed lesson-videos storage is the fallback for migrated lesson media.';

comment on function public.get_participant_shell_context(uuid) is
  'Participant shell context including legal/B2B gates and data-driven library availability.';
