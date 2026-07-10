-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708233930
-- Remote name: m11g_worker_dispatcher
-- Remote SQL SHA-256: 78be4b254d0095a4f07e63180ccd08659564e504f85ebb5e0e7f85e6596d4318
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function eventing.dispatch_worker_schedule(p_schedule_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_schedule eventing.worker_schedules%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_metrics pgmq.metrics_result;
  v_run_id uuid;
  v_project_url text;
  v_publishable_key text;
  v_active_receipts integer;
  v_pending_dispatches integer;
  v_available_messages bigint;
  v_available_slots integer;
  v_invocations integer;
  v_worker_id text;
  v_token_id uuid;
  v_raw_token text;
  v_request_id bigint;
  v_dispatched integer := 0;
  i integer;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('worker-dispatch:'||p_schedule_code,0)) then
    return jsonb_build_object('status','skipped','reason','dispatcher_locked');
  end if;

  insert into eventing.scheduler_runs(scheduler_name,queue_code,run_kind,status)
  select 'worker-dispatch:'||s.code,s.queue_code,'dispatch','running'
  from eventing.worker_schedules s where s.code=p_schedule_code
  returning id into v_run_id;

  select * into v_schedule from eventing.worker_schedules
  where code=p_schedule_code and status='active'
  for share;
  if not found then
    if v_run_id is not null then
      update eventing.scheduler_runs set status='skipped',completed_at=now(),details='{"reason":"schedule_not_active"}'::jsonb where id=v_run_id;
    end if;
    return jsonb_build_object('status','skipped','reason','schedule_not_active');
  end if;

  select * into v_definition from eventing.queue_definitions
  where code=v_schedule.queue_code and status='active';
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;
  if v_definition.provider<>'pgmq' then raise exception 'dispatcher_provider_not_supported' using errcode='0A000'; end if;

  select * into v_metrics from pgmq.metrics(v_definition.provider_queue_name);
  select count(*) into v_active_receipts
  from eventing.queue_receipts r
  where r.queue_code=v_schedule.queue_code and r.status='in_flight' and r.visibility_deadline>now();
  select count(*) into v_pending_dispatches
  from eventing.worker_dispatch_tokens t
  where t.schedule_code=v_schedule.code and t.status='pending' and t.expires_at>now();

  v_available_messages := greatest(coalesce(v_metrics.queue_length,0)-v_active_receipts,0);
  v_available_slots := greatest(v_schedule.max_parallel_invocations-v_active_receipts-v_pending_dispatches,0);
  v_invocations := least(
    v_available_slots,
    case when v_available_messages=0 then 0
         else ((v_available_messages+v_schedule.batch_size-1)/v_schedule.batch_size)::integer end
  );

  if v_invocations=0 then
    update eventing.scheduler_runs
    set status='skipped',completed_at=now(),details=jsonb_build_object(
      'reason','no_dispatch_capacity_or_messages','queueLength',coalesce(v_metrics.queue_length,0),
      'activeReceipts',v_active_receipts,'pendingDispatches',v_pending_dispatches
    ) where id=v_run_id;
    return jsonb_build_object('status','skipped','invocations',0,'queueLength',coalesce(v_metrics.queue_length,0));
  end if;

  select decrypted_secret into v_project_url
  from vault.decrypted_secrets where name='estimulo_project_url' limit 1;
  select decrypted_secret into v_publishable_key
  from vault.decrypted_secrets where name='estimulo_publishable_key' limit 1;
  if v_project_url is null or v_publishable_key is null then
    raise exception 'scheduler_vault_configuration_missing' using errcode='55000';
  end if;

  for i in 1..v_invocations loop
    v_worker_id := left(v_schedule.code||'-'||replace(gen_random_uuid()::text,'-',''),160);
    select token_id,raw_token into v_token_id,v_raw_token
    from eventing.issue_worker_dispatch_token(v_schedule.code,v_worker_id);

    v_request_id := net.http_post(
      url := rtrim(v_project_url,'/')||'/functions/v1/'||v_schedule.worker_function_name,
      body := jsonb_build_object('dispatchToken',v_raw_token,'workerId',v_worker_id),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer '||v_publishable_key,
        'apikey',v_publishable_key,
        'x-request-id',v_token_id::text
      ),
      timeout_milliseconds := v_schedule.http_timeout_milliseconds
    );

    update eventing.worker_dispatch_tokens set http_request_id=v_request_id where id=v_token_id;
    v_dispatched := v_dispatched+1;
  end loop;

  update eventing.scheduler_runs
  set status='succeeded',completed_at=now(),details=jsonb_build_object(
    'queueLength',coalesce(v_metrics.queue_length,0),'activeReceipts',v_active_receipts,
    'pendingDispatches',v_pending_dispatches,'requestedInvocations',v_invocations,
    'dispatchedInvocations',v_dispatched
  ) where id=v_run_id;

  return jsonb_build_object('status','succeeded','invocations',v_dispatched,'queueLength',coalesce(v_metrics.queue_length,0));
exception when others then
  if v_run_id is not null then
    update eventing.scheduler_runs
    set status='failed',completed_at=now(),details=jsonb_build_object('sqlstate',sqlstate,'message',sqlerrm)
    where id=v_run_id;
  end if;
  raise;
end;
$$;

create or replace function eventing.dispatch_active_workers()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  r record;
  v_results jsonb := '[]'::jsonb;
begin
  for r in select code from eventing.worker_schedules where status='active' order by code loop
    v_results := v_results || jsonb_build_array(eventing.dispatch_worker_schedule(r.code));
  end loop;
  return v_results;
end;
$$;

grant execute on function eventing.dispatch_worker_schedule(text) to app_worker;
grant execute on function eventing.dispatch_active_workers() to app_worker;
