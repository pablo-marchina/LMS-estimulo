-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709030140
-- Remote name: e14_harden_governance_trigger_search_path
-- Remote SQL SHA-256: 49aa81dd7ab3311d54915110e13292bfac7b5e6e41eae14cb330697d753b5df1
-- Do not edit after reconciliation; corrections require a new migration.

alter function governance.set_updated_at() set search_path = pg_catalog;
alter function governance.reject_mutation() set search_path = pg_catalog;
