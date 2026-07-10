-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052603
-- Remote name: m13d2j_e14_lock_scope
-- Remote SQL SHA-256: 911a28341b10c8dd80f500449be9e57e1442d14910116d2591d77ab727811306
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_lock_scope(p_scope text)
returns void language sql volatile security definer set search_path=pg_catalog as $$select pg_advisory_xact_lock(hashtextextended(p_scope,0))$$;
