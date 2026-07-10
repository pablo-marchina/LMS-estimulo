-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053955
-- Remote name: m13g5_e14_context_e
-- Remote SQL SHA-256: 4a436339e8c1cd191dece1760feae6f035ee2bf3c7845e98adb85a2484048a89
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_context_e(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select to_jsonb(x) from app_private.e14_ctx_activity x where x.sid=a
$$;
