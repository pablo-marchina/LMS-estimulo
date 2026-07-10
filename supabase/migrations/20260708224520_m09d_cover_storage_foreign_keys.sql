-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708224520
-- Remote name: m09d_cover_storage_foreign_keys
-- Remote SQL SHA-256: 78e8e84263973af7ea7e83c40906493a9dc34fdefbc797ebf0dd8c56da8e7293
-- Do not edit after reconciliation; corrections require a new migration.

create index if not exists ix_core_file_security_scans_source_event_id on core.file_security_scans(source_event_id);
create index if not exists ix_core_file_upload_intents_entrepreneur_id on core.file_upload_intents(requested_by_entrepreneur_id);
create index if not exists ix_core_file_upload_intents_profile_code on core.file_upload_intents(upload_profile_code);
