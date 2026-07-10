-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052519
-- Remote name: m13d2g_e14_generic_aliases
-- Remote SQL SHA-256: 8331041b5c357f345fb41e69c5c9f0fd63dd0ad19852b3d16b19ad21e2f3a294
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_context_a(a uuid,b uuid,c uuid) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_diagnostic_context(a,b,c)$$;
create or replace function app_private.e14_insert_a(a uuid,b uuid,c uuid,d uuid) returns void language sql security definer set search_path=pg_catalog as $$select app_private.e14_insert_diagnostic_session(a,b,c,d)$$;
