create or replace function app_private.sync_library_item_assets_to_published_version(p_library_item_version_id uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_version record;
begin
  select
    version.id,
    version.library_item_id,
    version.title,
    version.summary,
    version.content_kind,
    version.content_format,
    version.external_url,
    version.file_object_id,
    version.language_code,
    version.accessibility_metadata,
    version.source_name,
    item.slug
  into v_version
  from catalog.library_item_versions version
  join catalog.library_items item on item.id = version.library_item_id
  where version.id = p_library_item_version_id
    and version.status = 'published'
    and item.status = 'active';

  if not found then
    return;
  end if;

  update catalog.content_assets asset
  set library_item_version_id = v_version.id,
      file_object_id = v_version.file_object_id,
      asset_type = case
        when v_version.content_format = 'podcast' then 'audio'
        when v_version.content_format in ('video','audio','image','pdf') then v_version.content_format
        when v_version.content_kind = 'article' then 'library_article'
        else 'external_link'
      end,
      title = v_version.title,
      external_url = coalesce(v_version.external_url, case when v_version.content_kind = 'article' then 'https://library.local/' || v_version.slug else null end),
      language_code = coalesce(v_version.language_code, 'pt-BR'),
      accessibility_metadata = coalesce(asset.accessibility_metadata, '{}'::jsonb)
        || coalesce(v_version.accessibility_metadata, '{}'::jsonb)
        || jsonb_build_object('description', coalesce(v_version.summary, ''), 'library_slug', v_version.slug, 'source', 'library', 'source_name', coalesce(v_version.source_name, 'Estímulo'))
  from catalog.library_item_versions linked_version
  where asset.library_item_version_id = linked_version.id
    and linked_version.library_item_id = v_version.library_item_id
    and linked_version.id <> v_version.id;
end;
$function$;

create or replace function app_private.sync_library_item_assets_after_publish()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    perform app_private.sync_library_item_assets_to_published_version(new.id);
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_sync_library_item_assets_after_publish on catalog.library_item_versions;
create trigger trg_sync_library_item_assets_after_publish
after update of status on catalog.library_item_versions
for each row
execute function app_private.sync_library_item_assets_after_publish();
