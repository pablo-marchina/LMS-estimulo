set lock_timeout = '5s';
set statement_timeout = '15min';

-- Create only the indexes still missing for application-owned foreign keys.
-- An existing index is accepted when its leading columns match the FK columns
-- in constraint order, so wider useful indexes are not duplicated.
do $$
declare
  v_fk record;
  v_index_name text;
begin
  for v_fk in
    with foreign_keys as (
      select
        c.oid as constraint_oid,
        c.conrelid,
        n.nspname as schema_name,
        t.relname as table_name,
        c.conname as constraint_name,
        c.conkey as column_numbers,
        string_agg(format('%I',a.attname),', ' order by u.ordinality) as quoted_columns
      from pg_constraint c
      join pg_class t on t.oid=c.conrelid
      join pg_namespace n on n.oid=t.relnamespace
      join unnest(c.conkey) with ordinality u(attnum,ordinality) on true
      join pg_attribute a on a.attrelid=t.oid and a.attnum=u.attnum
      where c.contype='f'
        and n.nspname in (
          'iam','core','catalog','diagnostics','orchestration','assessment',
          'engagement','eventing','integration','reporting','intervention','intelligence'
        )
        and t.relkind in ('r','p')
      group by c.oid,c.conrelid,n.nspname,t.relname,c.conname,c.conkey
    )
    select fk.*
    from foreign_keys fk
    where not exists (
      select 1
      from pg_index i
      where i.indrelid=fk.conrelid
        and i.indisvalid
        and i.indisready
        and i.indpred is null
        and (i.indkey::smallint[])[1:cardinality(fk.column_numbers)] = fk.column_numbers
    )
    order by fk.schema_name,fk.table_name,fk.constraint_name
  loop
    v_index_name:=left(
      format('idx_fk_%s_%s',v_fk.table_name,substr(md5(v_fk.constraint_name),1,12)),
      63
    );
    execute format(
      'create index if not exists %I on %I.%I (%s)',
      v_index_name,
      v_fk.schema_name,
      v_fk.table_name,
      v_fk.quoted_columns
    );
  end loop;
end;
$$;

-- Fail the migration rather than silently leaving an uncovered FK.
do $$
declare
  v_remaining jsonb;
begin
  with foreign_keys as (
    select
      c.conrelid,
      n.nspname as schema_name,
      t.relname as table_name,
      c.conname as constraint_name,
      c.conkey as column_numbers,
      array_agg(a.attname order by u.ordinality) as columns
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    join unnest(c.conkey) with ordinality u(attnum,ordinality) on true
    join pg_attribute a on a.attrelid=t.oid and a.attnum=u.attnum
    where c.contype='f'
      and n.nspname in (
        'iam','core','catalog','diagnostics','orchestration','assessment',
        'engagement','eventing','integration','reporting','intervention','intelligence'
      )
      and t.relkind in ('r','p')
    group by c.conrelid,n.nspname,t.relname,c.conname,c.conkey
  ), uncovered as (
    select fk.*
    from foreign_keys fk
    where not exists (
      select 1
      from pg_index i
      where i.indrelid=fk.conrelid
        and i.indisvalid
        and i.indisready
        and i.indpred is null
        and (i.indkey::smallint[])[1:cardinality(fk.column_numbers)] = fk.column_numbers
    )
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'table',format('%I.%I',schema_name,table_name),
    'constraint',constraint_name,
    'columns',columns
  ) order by schema_name,table_name,constraint_name),'[]'::jsonb)
  into v_remaining
  from uncovered;

  if jsonb_array_length(v_remaining)>0 then
    raise exception 'UNCOVERED_FOREIGN_KEYS:%',v_remaining;
  end if;
end;
$$;
