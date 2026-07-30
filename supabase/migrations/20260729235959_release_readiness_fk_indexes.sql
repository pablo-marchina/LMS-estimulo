-- Cover foreign keys reported by the Supabase performance advisor on the
-- development/test project. These indexes support referential checks, deletes,
-- joins and reconciliation without changing application semantics.

create index if not exists ix_library_item_versions_file_object_id
  on catalog.library_item_versions (file_object_id);

create index if not exists ix_external_credentials_file_object_id
  on engagement.external_credentials (file_object_id);

create index if not exists ix_admin_content_revisions_actor_user_account_id
  on experience.admin_content_revisions (actor_user_account_id);

create index if not exists ix_interface_content_published_by
  on experience.interface_content (published_by);

create index if not exists ix_interface_content_updated_by
  on experience.interface_content (updated_by);

create index if not exists ix_identity_resolution_cases_entrepreneur_id
  on integration.identity_resolution_cases (entrepreneur_id);

create index if not exists ix_identity_resolution_cases_queued_sync_job_id
  on integration.identity_resolution_cases (queued_sync_job_id);

create index if not exists ix_identity_resolution_cases_resolved_by_user_account_id
  on integration.identity_resolution_cases (resolved_by_user_account_id);

create index if not exists ix_identity_resolution_cases_source_event_id
  on integration.identity_resolution_cases (source_event_id);

create index if not exists ix_identity_resolution_cases_user_account_id
  on integration.identity_resolution_cases (user_account_id);

create index if not exists ix_activity_asset_progress_content_asset_id
  on orchestration.activity_asset_progress (content_asset_id);
