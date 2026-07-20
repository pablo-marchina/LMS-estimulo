set lock_timeout = '5s';
set statement_timeout = '5min';

create or replace function public.get_application_readiness()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'status',case when
      to_regclass('iam.user_accounts') is not null
      and to_regclass('core.entrepreneurs') is not null
      and to_regclass('orchestration.journey_instances') is not null
      and to_regclass('eventing.outbox') is not null
      and to_regclass('integration.external_object_mappings') is not null
      then 'ready' else 'not_ready' end,
    'database_time',now(),
    'checks',jsonb_build_object(
      'identity_schema',to_regclass('iam.user_accounts') is not null,
      'participant_schema',to_regclass('core.entrepreneurs') is not null,
      'journey_schema',to_regclass('orchestration.journey_instances') is not null,
      'outbox_schema',to_regclass('eventing.outbox') is not null,
      'integration_schema',to_regclass('integration.external_object_mappings') is not null
    )
  );
$$;

revoke all on function public.get_application_readiness() from public,anon,authenticated;
grant execute on function public.get_application_readiness() to postgres,service_role,app_worker;
