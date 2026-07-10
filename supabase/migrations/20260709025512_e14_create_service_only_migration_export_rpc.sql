-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709025512
-- Remote name: e14_create_service_only_migration_export_rpc
-- Remote SQL SHA-256: 7c20fd2a3cfffb3231ba2157415c074006f8d5c957d66e94dbbefbab7bcab2a9
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_export_migration_history_v2()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, supabase_migrations
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'version', version,
        'name', name,
        'statements', statements,
        'created_by', created_by,
        'idempotency_key', idempotency_key,
        'rollback', rollback
      ) order by version
    ),
    '[]'::jsonb
  )
  from supabase_migrations.schema_migrations;
$$;

revoke all on function public.e14_export_migration_history_v2() from public, anon, authenticated;
grant execute on function public.e14_export_migration_history_v2() to service_role;
