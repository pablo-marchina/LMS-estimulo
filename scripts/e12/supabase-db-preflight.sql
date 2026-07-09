\set ON_ERROR_STOP on
\pset pager off

select 'postgres_version' as check_name, current_setting('server_version') as value;
select 'current_database' as check_name, current_database() as value;
select 'current_user' as check_name, current_user as value;
select 'pgcrypto_available' as check_name,
       exists(select 1 from pg_available_extensions where name = 'pgcrypto')::text as value;
select 'can_create_schema' as check_name,
       has_database_privilege(current_user, current_database(), 'CREATE')::text as value;
select 'existing_target_schemas' as check_name,
       coalesce(string_agg(schema_name, ',' order by schema_name), '') as value
from information_schema.schemata
where schema_name in (
  'iam','core','catalog','orchestration','diagnostics','assessment',
  'engagement','intervention','eventing','integration','intelligence',
  'governance','reporting'
);
