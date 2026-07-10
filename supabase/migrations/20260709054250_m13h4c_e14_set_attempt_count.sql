-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054250
-- Remote name: m13h4c_e14_set_attempt_count
-- Remote SQL SHA-256: 8b69b23e6c18af791f011d4a074f56cd2d35ca9de1425236c6ace51b289ff064
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_set_attempt_count(a uuid,b integer)
returns void language sql security definer set search_path=pg_catalog as $$update orchestration.step_instances set attempt_count=b,updated_at=now() where id=a$$;
