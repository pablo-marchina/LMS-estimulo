\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on
\pset pager off

-- Required psql variables:
--   from_version: first inclusive 14-digit migration version
--   to_version:   last inclusive 14-digit migration version
--
-- The query emits one compact JSON object per line. It is intentionally
-- read-only and preserves the statements array exactly as stored by Supabase.

\set QUIET 1
begin transaction read only;
\set QUIET 0

select jsonb_build_object(
  'version', version,
  'name', name,
  'statement_count', cardinality(statements),
  'sql_bytes', octet_length(array_to_string(statements, E'\n')),
  'sql_sha256', encode(
    extensions.digest(
      convert_to(array_to_string(statements, E'\n'), 'UTF8'),
      'sha256'
    ),
    'hex'
  ),
  'statements', to_jsonb(statements)
)::text
from supabase_migrations.schema_migrations
where version >= :'from_version'
  and version <= :'to_version'
order by version;

\set QUIET 1
commit;
