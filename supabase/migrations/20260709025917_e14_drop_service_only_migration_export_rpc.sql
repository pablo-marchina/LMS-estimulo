-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709025917
-- Remote name: e14_drop_service_only_migration_export_rpc
-- Remote SQL SHA-256: d705fb553c1c289c5e5233bed073fb525da03db14649dc5e36afeda658ed1c22
-- Do not edit after reconciliation; corrections require a new migration.

revoke all on function public.e14_export_migration_history_v2() from public, anon, authenticated, service_role;
drop function if exists public.e14_export_migration_history_v2();
