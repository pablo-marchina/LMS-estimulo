-- Deterministic structural inventory for the Estímulo application schemas.
-- Provider-owned Supabase schemas and extension objects are intentionally excluded.
-- Public routines are limited to the E14 RPC surface.
with
scope as (
  select unnest(array[
    'app_private',
    'assessment',
    'catalog',
    'core',
    'diagnostics',
    'engagement',
    'eventing',
    'governance',
    'iam',
    'integration',
    'intelligence',
    'intervention',
    'orchestration',
    'reporting'
  ])::text as schema_name
),
schemas_data as (
  select coalesce(
    jsonb_agg(jsonb_build_object('schema', s.schema_name) order by s.schema_name),
    '[]'::jsonb
  ) as data
  from scope s
  join pg_namespace n on n.nspname = s.schema_name
),
relations_data as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'name', c.relname,
    'kind', c.relkind,
    'persistence', c.relpersistence,
    'rls', c.relrowsecurity,
    'force_rls', c.relforcerowsecurity
  ) order by n.nspname, c.relname, c.relkind), '[]'::jsonb) as data
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select schema_name from scope)
    and c.relkind in ('r', 'p', 'v', 'm', 'S')
),
columns_data as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'relation', c.relname,
    'position', a.attnum,
    'name', a.attname,
    'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
    'not_null', a.attnotnull,
    'identity', a.attidentity,
    'generated', a.attgenerated,
    'default', pg_get_expr(d.adbin, d.adrelid, true)
  ) order by n.nspname, c.relname, a.attnum), '[]'::jsonb) as data
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where n.nspname in (select schema_name from scope)
    and c.relkind in ('r', 'p', 'v', 'm')
    and a.attnum > 0
    and not a.attisdropped
),
constraints_data as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'relation', c.relname,
    'name', con.conname,
    'type', con.contype,
    'definition', pg_get_constraintdef(con.oid, true),
    'deferrable', con.condeferrable,
    'deferred', con.condeferred,
    'validated', con.convalidated
  ) order by n.nspname, c.relname, con.conname), '[]'::jsonb) as data
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select schema_name from scope)
),
indexes_data as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'relation', t.relname,
    'name', i.relname,
    'definition', pg_get_indexdef(i.oid),
    'valid', x.indisvalid,
    'ready', x.indisready,
    'unique', x.indisunique,
    'primary', x.indisprimary
  ) order by n.nspname, t.relname, i.relname), '[]'::jsonb) as data
  from pg_index x
  join pg_class i on i.oid = x.indexrelid
  join pg_class t on t.oid = x.indrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname in (select schema_name from scope)
),
triggers_data as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'relation', c.relname,
    'name', t.tgname,
    'definition', pg_get_triggerdef(t.oid, true),
    'enabled', t.tgenabled
  ) order by n.nspname, c.relname, t.tgname), '[]'::jsonb) as data
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select schema_name from scope)
    and not t.tgisinternal
),
policies_data as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'schema', p.schemaname,
    'relation', p.tablename,
    'name', p.policyname,
    'permissive', p.permissive,
    'roles', p.roles,
    'command', p.cmd,
    'using', p.qual,
    'check', p.with_check
  ) order by p.schemaname, p.tablename, p.policyname), '[]'::jsonb) as data
  from pg_policies p
  where p.schemaname in (select schema_name from scope)
),
routines_data as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'name', p.proname,
    'kind', p.prokind,
    'arguments', pg_get_function_identity_arguments(p.oid),
    'result', pg_get_function_result(p.oid),
    'language', l.lanname,
    'volatility', p.provolatile,
    'security_definer', p.prosecdef,
    'strict', p.proisstrict,
    'parallel', p.proparallel,
    'leakproof', p.proleakproof,
    'config', p.proconfig,
    'source', p.prosrc
  ) order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), '[]'::jsonb) as data
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where n.nspname in (select schema_name from scope)
     or (n.nspname = 'public' and p.proname like 'e14\_%' escape '\')
),
types_data as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname,
    'name', t.typname,
    'kind', t.typtype,
    'category', t.typcategory,
    'not_null', t.typnotnull,
    'base_type', case
      when t.typbasetype = 0 then null
      else pg_catalog.format_type(t.typbasetype, t.typtypmod)
    end,
    'default', t.typdefault,
    'enum_labels', case when t.typtype = 'e' then (
      select jsonb_agg(e.enumlabel order by e.enumsortorder)
      from pg_enum e
      where e.enumtypid = t.oid
    ) else null end
  ) order by n.nspname, t.typname), '[]'::jsonb) as data
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname in (select schema_name from scope)
    and t.typtype in ('e', 'd')
)
select jsonb_build_object(
  'schema_version', '1.0',
  'postgres_major', current_setting('server_version_num')::int / 10000,
  'categories', jsonb_build_object(
    'schemas', jsonb_build_object(
      'count', jsonb_array_length(schemas_data.data),
      'sha256', encode(digest(schemas_data.data::text, 'sha256'), 'hex')
    ),
    'relations', jsonb_build_object(
      'count', jsonb_array_length(relations_data.data),
      'sha256', encode(digest(relations_data.data::text, 'sha256'), 'hex')
    ),
    'columns', jsonb_build_object(
      'count', jsonb_array_length(columns_data.data),
      'sha256', encode(digest(columns_data.data::text, 'sha256'), 'hex')
    ),
    'constraints', jsonb_build_object(
      'count', jsonb_array_length(constraints_data.data),
      'sha256', encode(digest(constraints_data.data::text, 'sha256'), 'hex')
    ),
    'indexes', jsonb_build_object(
      'count', jsonb_array_length(indexes_data.data),
      'sha256', encode(digest(indexes_data.data::text, 'sha256'), 'hex')
    ),
    'triggers', jsonb_build_object(
      'count', jsonb_array_length(triggers_data.data),
      'sha256', encode(digest(triggers_data.data::text, 'sha256'), 'hex')
    ),
    'policies', jsonb_build_object(
      'count', jsonb_array_length(policies_data.data),
      'sha256', encode(digest(policies_data.data::text, 'sha256'), 'hex')
    ),
    'routines', jsonb_build_object(
      'count', jsonb_array_length(routines_data.data),
      'sha256', encode(digest(routines_data.data::text, 'sha256'), 'hex')
    ),
    'types', jsonb_build_object(
      'count', jsonb_array_length(types_data.data),
      'sha256', encode(digest(types_data.data::text, 'sha256'), 'hex')
    )
  )
) as inventory
from schemas_data,
     relations_data,
     columns_data,
     constraints_data,
     indexes_data,
     triggers_data,
     policies_data,
     routines_data,
     types_data;
