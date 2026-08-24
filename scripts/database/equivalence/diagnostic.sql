with
scope(schema_name) as (
  values
    ('app_private'),
    ('assessment'),
    ('catalog'),
    ('core'),
    ('diagnostics'),
    ('engagement'),
    ('eventing'),
    ('governance'),
    ('iam'),
    ('integration'),
    ('intelligence'),
    ('intervention'),
    ('orchestration'),
    ('reporting')
),
column_rows as (
  select
    n.nspname as schemaname,
    c.relname as relation_name,
    a.attnum as position,
    jsonb_build_object(
      'relation', c.relname,
      'position', a.attnum,
      'name', a.attname,
      'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull,
      'identity', a.attidentity,
      'generated', a.attgenerated,
      'default', pg_get_expr(d.adbin, d.adrelid, true)
    ) as item
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where n.nspname in (select schema_name from scope)
    and c.relkind in ('r', 'p', 'v', 'm')
    and a.attnum > 0
    and not a.attisdropped
),
policy_rows as (
  select
    p.schemaname,
    jsonb_build_object(
      'relation', p.tablename,
      'name', p.policyname,
      'permissive', p.permissive,
      'roles', p.roles,
      'command', p.cmd,
      'using', p.qual,
      'check', p.with_check
    ) as item
  from pg_policies p
  where p.schemaname in (select schema_name from scope)
),
routine_rows as (
  select
    n.nspname as schemaname,
    p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as routine_key,
    jsonb_build_object(
      'name', p.proname,
      'kind', p.prokind,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'result', pg_get_function_result(p.oid),
      'language', l.lanname,
      'volatility', p.provolatile,
      'security_definer', p.prosecdef,
      'strict', p.proisstrict,
      'parallel', p.proparallel,
      'leakproof', p.proleakproof
    ) as metadata,
    coalesce(to_jsonb(p.proconfig), 'null'::jsonb) as config,
    p.prosrc as source
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where n.nspname in (select schema_name from scope)
     or (n.nspname = 'public' and p.proname like 'e14\_%' escape '\')
)
select jsonb_build_object(
  'columns_by_schema', (
    select jsonb_agg(
      jsonb_build_object(
        'schema', grouped.schemaname,
        'count', grouped.item_count,
        'sha256', grouped.fingerprint
      )
      order by grouped.schemaname
    )
    from (
      select
        schemaname,
        count(*) as item_count,
        encode(digest(jsonb_agg(item order by relation_name, position)::text, 'sha256'), 'hex') as fingerprint
      from column_rows
      group by schemaname
    ) grouped
  ),
  'columns_by_relation', (
    select jsonb_agg(
      jsonb_build_object(
        'schema', grouped.schemaname,
        'relation', grouped.relation_name,
        'count', grouped.item_count,
        'sha256', grouped.fingerprint
      )
      order by grouped.schemaname, grouped.relation_name
    )
    from (
      select
        schemaname,
        relation_name,
        count(*) as item_count,
        encode(digest(jsonb_agg(item order by position)::text, 'sha256'), 'hex') as fingerprint
      from column_rows
      group by schemaname, relation_name
    ) grouped
  ),
  'policies_by_schema', (
    select jsonb_agg(
      jsonb_build_object(
        'schema', grouped.schemaname,
        'count', grouped.item_count,
        'sha256', grouped.fingerprint
      )
      order by grouped.schemaname
    )
    from (
      select
        schemaname,
        count(*) as item_count,
        encode(digest(jsonb_agg(item order by item->>'relation', item->>'name')::text, 'sha256'), 'hex') as fingerprint
      from policy_rows
      group by schemaname
    ) grouped
  ),
  'routines_by_schema', (
    select jsonb_agg(
      jsonb_build_object(
        'schema', grouped.schemaname,
        'count', grouped.item_count,
        'metadata_sha256', grouped.metadata_fingerprint,
        'config_sha256', grouped.config_fingerprint,
        'source_sha256', grouped.source_fingerprint
      )
      order by grouped.schemaname
    )
    from (
      select
        schemaname,
        count(*) as item_count,
        encode(digest(jsonb_agg(metadata order by routine_key)::text, 'sha256'), 'hex') as metadata_fingerprint,
        encode(digest(jsonb_agg(config order by routine_key)::text, 'sha256'), 'hex') as config_fingerprint,
        encode(digest(jsonb_agg(source order by routine_key)::text, 'sha256'), 'hex') as source_fingerprint
      from routine_rows
      group by schemaname
    ) grouped
  ),
  'app_private_routine_inventory', (
    select jsonb_agg(
      jsonb_build_object(
        'routine', routine_key,
        'metadata_sha256', encode(digest(metadata::text, 'sha256'), 'hex'),
        'config_sha256', encode(digest(config::text, 'sha256'), 'hex'),
        'source_sha256', encode(digest(source, 'sha256'), 'hex')
      )
      order by routine_key
    )
    from routine_rows
    where schemaname = 'app_private'
  ),
  'audited_routine_sources', (
    select jsonb_agg(
      jsonb_build_object(
        'schema', schemaname,
        'routine', routine_key,
        'source_sha256', encode(digest(source, 'sha256'), 'hex')
      )
      order by schemaname, routine_key
    )
    from routine_rows
    where schemaname = 'iam'
       or (schemaname = 'public' and routine_key like 'e14\_%' escape '\')
  )
) as diagnostic;
