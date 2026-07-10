-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709001438
-- Remote name: m12j_fix_purpose_updated_at
-- Remote SQL SHA-256: c043fc40e6b1ba42fc24b5c055f99c9b7b1b68951267c36fca4f7d579f9a828c
-- Do not edit after reconciliation; corrections require a new migration.

alter table governance.purposes add column if not exists updated_at timestamptz not null default now();
