\set ON_ERROR_STOP on
\pset pager off

select count(*) = 125 as has_expected_table_count
from information_schema.tables
where table_schema in (
  'iam','core','catalog','orchestration','diagnostics','assessment',
  'engagement','intervention','eventing','integration','intelligence',
  'governance','reporting'
) and table_type = 'BASE TABLE';

select exists(
  select 1 from information_schema.tables
  where table_schema = 'iam' and table_name = 'external_identities'
) as has_provider_neutral_identity_table;

select count(*) >= 52 as rls_enabled_on_protected_tables
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname in (
  'iam','core','orchestration','diagnostics','assessment','engagement',
  'intervention','integration','intelligence','governance'
) and c.relrowsecurity;

select count(*) >= 196 as has_concrete_rls_policies
from pg_catalog.pg_policies
where schemaname in (
  'iam','core','orchestration','diagnostics','assessment','engagement',
  'intervention','integration','intelligence','governance'
);

select exists(
  select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'eventing' and p.proname = 'claim_outbox_batch'
) as has_outbox_claim_function;

select not exists (
  select 1
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_namespace n on n.oid=c.connamespace
  where c.contype='f'
    and n.nspname in ('iam','core','catalog','orchestration','diagnostics','assessment','engagement','intervention','eventing','integration','intelligence','governance')
    and not exists (
      select 1 from pg_catalog.pg_index i
      where i.indrelid=c.conrelid and i.indisvalid and i.indisready
        and (select array_agg(k.attnum::smallint order by k.ord) from unnest(i.indkey) with ordinality k(attnum,ord) where k.ord <= cardinality(c.conkey))=c.conkey
    )
) as all_foreign_keys_have_covering_index;

select exists(select 1 from information_schema.tables where table_schema='core' and table_name='file_upload_intents')
   and exists(select 1 from information_schema.tables where table_schema='core' and table_name='file_security_scans')
   and exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='file_confirm_upload')
   as has_storage_lifecycle;
