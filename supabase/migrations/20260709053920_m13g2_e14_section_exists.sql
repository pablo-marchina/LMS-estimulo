-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053920
-- Remote name: m13g2_e14_section_exists
-- Remote SQL SHA-256: 113db744d534a4bbe53f9298991a40c73d9618be57a72962e913394bab93a454
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_section_exists(a uuid,b text)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select exists(select 1 from catalog.activity_versions v cross join lateral jsonb_array_elements(v.configuration->'content_sections') s where v.id=a and s->>'code'=b)
$$;
