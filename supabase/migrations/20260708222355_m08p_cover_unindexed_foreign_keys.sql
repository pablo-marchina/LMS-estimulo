-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708222355
-- Remote name: m08p_cover_unindexed_foreign_keys
-- Remote SQL SHA-256: 5c9d3b4adca307754e9d923f0e6fe43d486f5ec7dfad4df36a511a3ef3394f3e
-- Do not edit after reconciliation; corrections require a new migration.

do $$
declare
  r record;
  v_index_name text;
begin
  for r in
    select
      n.nspname as schema_name,
      cl.relname as table_name,
      c.conname as constraint_name,
      c.conrelid,
      c.conkey,
      string_agg(quote_ident(a.attname), ', ' order by k.ord) as column_list
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    join lateral unnest(c.conkey) with ordinality as k(attnum, ord) on true
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
    where c.contype = 'f'
      and n.nspname in ('iam','core','catalog','orchestration','diagnostics','assessment','engagement','intervention','eventing','integration','intelligence','governance')
      and not exists (
        select 1
        from pg_index i
        where i.indrelid = c.conrelid
          and i.indisvalid
          and i.indisready
          and (
            select array_agg(ik.attnum::smallint order by ik.ord)
            from unnest(i.indkey) with ordinality as ik(attnum, ord)
            where ik.ord <= cardinality(c.conkey)
          ) = c.conkey
      )
    group by n.nspname, cl.relname, c.conname, c.conrelid, c.conkey
    order by n.nspname, cl.relname, c.conname
  loop
    v_index_name := left(
      'ix_fk_' || r.table_name || '_' || substr(md5(r.schema_name || '.' || r.table_name || '.' || r.constraint_name), 1, 10),
      63
    );
    execute format(
      'create index if not exists %I on %I.%I (%s)',
      v_index_name, r.schema_name, r.table_name, r.column_list
    );
  end loop;
end $$;
