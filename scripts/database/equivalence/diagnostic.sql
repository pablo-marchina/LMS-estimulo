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
        encode(
          digest(
            jsonb_agg(item order by item->>'relation', item->>'name')::text,
            'sha256'
          ),
          'hex'
        ) as fingerprint
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
  )
) as diagnostic;
