-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054700
-- Remote name: m13i4a_e14_snapshot_10
-- Remote SQL SHA-256: ef3887e5e224934da27db231cc357fa5b818d3fd39e9e08f0dd749498744e3c9
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_snapshot_10(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('r',rid,'a',aid,'q',qid,'v',val,'n',ver) from app_private.e14_response_view where rid=a
$$;
