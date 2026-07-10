-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709025423
-- Remote name: e14_drop_migration_history_export_rpc
-- Remote SQL SHA-256: f2ffefeb7cb4335e701ad2f8c150edd0f2ae4e3d4f6dd4bf4988b5476e7ccf5f
-- Do not edit after reconciliation; corrections require a new migration.

revoke all on function public.e14_export_migration_history(text) from public, anon, authenticated;
drop function if exists public.e14_export_migration_history(text);
