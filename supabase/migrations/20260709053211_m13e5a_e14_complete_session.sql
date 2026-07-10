-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053211
-- Remote name: m13e5a_e14_complete_session
-- Remote SQL SHA-256: d8545db1ee069060c9cfd4f2b18fee1cf1db6616b8bf4e26f86d2b0faea02a34
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_complete_session(a uuid)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare v bigint;
begin
 update diagnostics.sessions set status='completed',completed_at=now(),aggregate_version=aggregate_version+1 where id=a returning aggregate_version into v;
 return v;
end;$$;
