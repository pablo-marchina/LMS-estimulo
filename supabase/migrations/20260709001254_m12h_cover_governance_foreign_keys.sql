-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709001254
-- Remote name: m12h_cover_governance_foreign_keys
-- Remote SQL SHA-256: 37a67fa2d401dd4912bbdb2ad967ab559e82cb3a739a260cfaace73c56ec7070
-- Do not edit after reconciliation; corrections require a new migration.

do $$
declare
  r record;
  v_columns text;
  v_index_name text;
begin
  for r in
    select c.oid as constraint_oid,c.conname,c.conrelid,n.nspname,cl.relname,c.conkey
    from pg_constraint c
    join pg_class cl on cl.oid=c.conrelid
    join pg_namespace n on n.oid=cl.relnamespace
    where c.contype='f'
      and n.nspname in ('iam','core','catalog','orchestration','diagnostics','assessment','engagement','intervention','eventing','integration','intelligence','governance','reporting')
      and not exists(
        select 1 from pg_index i
        where i.indrelid=c.conrelid and i.indisvalid and i.indisready
          and (select array_agg(k.attnum::smallint order by k.ord)
               from unnest(i.indkey) with ordinality k(attnum,ord)
               where k.ord<=cardinality(c.conkey))=c.conkey
      )
  loop
    select string_agg(format('%I',a.attname),',' order by x.ord)
      into v_columns
    from unnest(r.conkey) with ordinality x(attnum,ord)
    join pg_attribute a on a.attrelid=r.conrelid and a.attnum=x.attnum;
    v_index_name:=left('ix_m12_fk_'||r.relname||'_'||substr(md5(r.conname),1,10),63);
    execute format('create index if not exists %I on %I.%I (%s)',v_index_name,r.nspname,r.relname,v_columns);
  end loop;
end $$;
