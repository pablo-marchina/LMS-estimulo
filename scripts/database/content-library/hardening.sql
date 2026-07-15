\set ON_ERROR_STOP on

create index if not exists library_items_created_by_idx
  on catalog.library_items(created_by);

create index if not exists library_item_versions_created_by_idx
  on catalog.library_item_versions(created_by);
