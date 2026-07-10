-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709025331
-- Remote name: e14_create_migration_history_export_rpc
-- Remote SQL SHA-256: 6b5adffa542620aefacd84f7246a1c6382c73f6d7eacc2f625980ec7321d6d46
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_export_migration_history(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, supabase_migrations
as $$
declare
  result jsonb;
begin
  if p_token is distinct from 'Qw08Dq8M0Ax1FC8D0H6wbkZu1JdnLCoFPRCtYF0mZwA' then
    raise exception 'invalid export token' using errcode = '42501';
  end if;

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
  into result
  from supabase_migrations.schema_migrations;

  return result;
end
$$;

revoke all on function public.e14_export_migration_history(text) from public;
grant execute on function public.e14_export_migration_history(text) to anon;
