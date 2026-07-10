-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053930
-- Remote name: m13g3_e14_section_snapshot
-- Remote SQL SHA-256: ad903d8d35cd45897922ca4f9186d51416523bfd3a633191f60a19a548533643
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_snapshot_e(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('activity_session_id',sid,'accepted_sections',n,'completion_ratio',least(1,n/4.0)) from app_private.e14_ctx_activity where sid=a
$$;
