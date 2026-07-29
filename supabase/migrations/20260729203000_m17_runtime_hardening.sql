-- M17 runtime hardening: cover foreign keys used by joins, deletes and reconciliation.
-- The indexes are intentionally non-unique and idempotent. They do not alter business semantics.

create index if not exists ix_library_item_versions_file_object_id
  on catalog.library_item_versions (file_object_id);

create index if not exists ix_external_credentials_file_object_id
  on engagement.external_credentials (file_object_id);

create index if not exists ix_identity_resolution_cases_entrepreneur
  on integration.identity_resolution_cases (entrepreneur_id);

create index if not exists ix_identity_resolution_cases_queued_sync_job
  on integration.identity_resolution_cases (queued_sync_job_id);

create index if not exists ix_identity_resolution_cases_resolved_by
  on integration.identity_resolution_cases (resolved_by_user_account_id);

create index if not exists ix_identity_resolution_cases_source_event
  on integration.identity_resolution_cases (source_event_id);

create index if not exists ix_identity_resolution_cases_user_account
  on integration.identity_resolution_cases (user_account_id);

create index if not exists ix_activity_asset_progress_content_asset
  on orchestration.activity_asset_progress (content_asset_id);
