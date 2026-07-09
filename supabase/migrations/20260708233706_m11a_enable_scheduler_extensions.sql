-- Plataforma Estímulo — M11 — scheduler, reconciliation, observability and alerts.
-- Supabase test runtime: pg_cron + pg_net + Vault + Edge Functions.
-- AWS staging/production maps this control plane to SQS/Lambda/EventBridge/CloudWatch.
-- Environment values MUST be provisioned separately in Vault:
--   estimulo_project_url
--   estimulo_publishable_key

set lock_timeout = '5s';
set statement_timeout = '5min';

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create table eventing.worker_schedules (
  code text primary key,
  queue_code text not null references eventing.queue_definitions(code),
  worker_function_name text not null,
  schedule_expression text not null,
  batch_size integer not null,
  visibility_timeout_seconds integer not null,
  max_parallel_invocations integer not null,
  token_ttl_seconds integer not null default 90,
  http_timeout_milliseconds integer not null default 5000,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_worker_schedules_code check (code ~ '^[a-z][a-z0-9_]{2,62}$'),
  constraint ck_worker_schedules_function check (worker_function_name ~ '^[a-z][a-z0-9-]{2,62}$'),
  constraint ck_worker_schedules_batch check (batch_size between 1 and 10),
  constraint ck_worker_schedules_visibility check (visibility_timeout_seconds between 30 and 43200),
  constraint ck_worker_schedules_parallel check (max_parallel_invocations between 1 and 32),
  constraint ck_worker_schedules_token_ttl check (token_ttl_seconds between 30 and 600),
  constraint ck_worker_schedules_http_timeout check (http_timeout_milliseconds between 1000 and 30000),
  constraint ck_worker_schedules_status check (status in ('active','paused','disabled'))
);

create table eventing.worker_dispatch_tokens (
  id uuid primary key default gen_random_uuid(),
  schedule_code text not null references eventing.worker_schedules(code),
  queue_code text not null references eventing.queue_definitions(code),
  token_hash text not null unique,
  intended_worker_id text not null,
  status text not null default 'pending',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claimed_by text,
  http_request_id bigint unique,
  http_status_code integer,
  http_error text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ck_worker_dispatch_hash check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint ck_worker_dispatch_worker check (length(trim(intended_worker_id)) between 1 and 160),
  constraint ck_worker_dispatch_status check (status in ('pending','claimed','expired','failed','revoked')),
  constraint ck_worker_dispatch_expiry check (expires_at > issued_at),
  constraint ck_worker_dispatch_http_status check (http_status_code is null or http_status_code between 100 and 599)
);

create table eventing.scheduler_runs (
  id uuid primary key default gen_random_uuid(),
  scheduler_name text not null,
  queue_code text references eventing.queue_definitions(code),
  run_kind text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ck_scheduler_runs_name check (length(trim(scheduler_name)) between 1 and 120),
  constraint ck_scheduler_runs_kind check (run_kind in ('dispatch','reconcile','metrics','alerts','cleanup','proof')),
  constraint ck_scheduler_runs_status check (status in ('running','succeeded','skipped','failed')),
  constraint ck_scheduler_runs_dates check (completed_at is null or completed_at >= started_at)
);

create table eventing.queue_metric_snapshots (
  id bigint generated always as identity primary key,
  queue_code text not null references eventing.queue_definitions(code),
  captured_at timestamptz not null default now(),
  queue_length bigint not null,
  total_messages bigint not null,
  oldest_message_age_seconds integer,
  open_dead_letters bigint not null,
  in_flight_receipts bigint not null,
  expired_receipts_5m bigint not null,
  dispatch_failures_5m bigint not null,
  cron_failures_5m bigint not null,
  scan_pending_count bigint not null,
  release_pending_count bigint not null,
  oldest_scan_pending_age_seconds integer,
  jobs_by_status jsonb not null default '{}'::jsonb,
  constraint ck_queue_metric_snapshots_nonnegative check (
    queue_length >= 0 and total_messages >= 0 and open_dead_letters >= 0 and
    in_flight_receipts >= 0 and expired_receipts_5m >= 0 and
    dispatch_failures_5m >= 0 and cron_failures_5m >= 0 and
    scan_pending_count >= 0 and release_pending_count >= 0
  )
);

create table eventing.queue_alert_policies (
  id uuid primary key default gen_random_uuid(),
  queue_code text not null references eventing.queue_definitions(code),
  alert_code text not null,
  metric_code text not null,
  warning_threshold numeric not null,
  critical_threshold numeric not null,
  evaluation_window_seconds integer not null default 300,
  status text not null default 'active',
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_queue_alert_policies_code unique (queue_code,alert_code),
  constraint ck_queue_alert_policies_code check (alert_code ~ '^[a-z][a-z0-9_]{2,80}$'),
  constraint ck_queue_alert_policies_metric check (metric_code in (
    'queue_length','oldest_message_age_seconds','open_dead_letters',
    'expired_receipts_5m','dispatch_failures_5m','cron_failures_5m',
    'oldest_scan_pending_age_seconds'
  )),
  constraint ck_queue_alert_policies_thresholds check (warning_threshold >= 0 and critical_threshold >= warning_threshold),
  constraint ck_queue_alert_policies_window check (evaluation_window_seconds between 30 and 86400),
  constraint ck_queue_alert_policies_status check (status in ('active','disabled'))
);

create table eventing.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  queue_code text not null,
  alert_code text not null,
  severity text not null,
  status text not null default 'open',
  current_value numeric not null,
  warning_threshold numeric not null,
  critical_threshold numeric not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrence_count integer not null default 1,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_operational_alerts_policy foreign key (queue_code,alert_code)
    references eventing.queue_alert_policies(queue_code,alert_code),
  constraint ck_operational_alerts_severity check (severity in ('warning','critical')),
  constraint ck_operational_alerts_status check (status in ('open','acknowledged','resolved')),
  constraint ck_operational_alerts_occurrences check (occurrence_count > 0)
);

create index ix_eventing_worker_schedules_queue_code on eventing.worker_schedules(queue_code);
create index ix_eventing_worker_dispatch_tokens_schedule_code on eventing.worker_dispatch_tokens(schedule_code);
create index ix_worker_dispatch_status_expiry on eventing.worker_dispatch_tokens(status,expires_at);
create index ix_worker_dispatch_queue_status on eventing.worker_dispatch_tokens(queue_code,status,issued_at desc);
create index ix_scheduler_runs_queue_started on eventing.scheduler_runs(queue_code,started_at desc);
create index ix_queue_metric_snapshots_queue_captured on eventing.queue_metric_snapshots(queue_code,captured_at desc);
create unique index uq_operational_alerts_active on eventing.operational_alerts(queue_code,alert_code)
  where status in ('open','acknowledged');
create index ix_operational_alerts_queue_status on eventing.operational_alerts(queue_code,status,last_seen_at desc);

create trigger trg_worker_schedules_updated_at before update on eventing.worker_schedules
  for each row execute function governance.set_updated_at();
create trigger trg_queue_alert_policies_updated_at before update on eventing.queue_alert_policies
  for each row execute function governance.set_updated_at();
create trigger trg_operational_alerts_updated_at before update on eventing.operational_alerts
  for each row execute function governance.set_updated_at();

alter table eventing.worker_schedules enable row level security;
alter table eventing.worker_dispatch_tokens enable row level security;
alter table eventing.scheduler_runs enable row level security;
alter table eventing.queue_metric_snapshots enable row level security;
alter table eventing.queue_alert_policies enable row level security;
alter table eventing.operational_alerts enable row level security;

create policy worker_schedules_worker_select on eventing.worker_schedules for select to app_worker using (app_private.is_trusted_worker());
create policy worker_schedules_worker_insert on eventing.worker_schedules for insert to app_worker with check (app_private.is_trusted_worker());
create policy worker_schedules_worker_update on eventing.worker_schedules for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy worker_schedules_worker_delete on eventing.worker_schedules for delete to app_worker using (app_private.is_trusted_worker());
create policy worker_dispatch_worker_select on eventing.worker_dispatch_tokens for select to app_worker using (app_private.is_trusted_worker());
create policy worker_dispatch_worker_insert on eventing.worker_dispatch_tokens for insert to app_worker with check (app_private.is_trusted_worker());
create policy worker_dispatch_worker_update on eventing.worker_dispatch_tokens for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy worker_dispatch_worker_delete on eventing.worker_dispatch_tokens for delete to app_worker using (app_private.is_trusted_worker());
create policy scheduler_runs_worker_select on eventing.scheduler_runs for select to app_worker using (app_private.is_trusted_worker());
create policy scheduler_runs_worker_insert on eventing.scheduler_runs for insert to app_worker with check (app_private.is_trusted_worker());
create policy scheduler_runs_worker_update on eventing.scheduler_runs for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy scheduler_runs_worker_delete on eventing.scheduler_runs for delete to app_worker using (app_private.is_trusted_worker());
create policy queue_metrics_worker_select on eventing.queue_metric_snapshots for select to app_worker using (app_private.is_trusted_worker());
create policy queue_metrics_worker_insert on eventing.queue_metric_snapshots for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_metrics_worker_delete on eventing.queue_metric_snapshots for delete to app_worker using (app_private.is_trusted_worker());
create policy queue_alert_policies_worker_select on eventing.queue_alert_policies for select to app_worker using (app_private.is_trusted_worker());
create policy queue_alert_policies_worker_insert on eventing.queue_alert_policies for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_alert_policies_worker_update on eventing.queue_alert_policies for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_alert_policies_worker_delete on eventing.queue_alert_policies for delete to app_worker using (app_private.is_trusted_worker());
create policy operational_alerts_worker_select on eventing.operational_alerts for select to app_worker using (app_private.is_trusted_worker());
create policy operational_alerts_worker_insert on eventing.operational_alerts for insert to app_worker with check (app_private.is_trusted_worker());
create policy operational_alerts_worker_update on eventing.operational_alerts for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy operational_alerts_worker_delete on eventing.operational_alerts for delete to app_worker using (app_private.is_trusted_worker());

grant select,insert,update,delete on eventing.worker_schedules,eventing.worker_dispatch_tokens,
  eventing.scheduler_runs,eventing.queue_metric_snapshots,eventing.queue_alert_policies,
  eventing.operational_alerts to app_worker;
grant usage,select on sequence eventing.queue_metric_snapshots_id_seq to app_worker;

insert into eventing.worker_schedules(
  code,queue_code,worker_function_name,schedule_expression,batch_size,
  visibility_timeout_seconds,max_parallel_invocations,token_ttl_seconds,
  http_timeout_milliseconds,status
) values ('file_scan_worker','file_scan','file-scan-worker','30 seconds',5,120,4,90,5000,'active')
on conflict (code) do update set
  queue_code=excluded.queue_code,worker_function_name=excluded.worker_function_name,
  schedule_expression=excluded.schedule_expression,batch_size=excluded.batch_size,
  visibility_timeout_seconds=excluded.visibility_timeout_seconds,
  max_parallel_invocations=excluded.max_parallel_invocations,
  token_ttl_seconds=excluded.token_ttl_seconds,
  http_timeout_milliseconds=excluded.http_timeout_milliseconds,status=excluded.status;

insert into eventing.queue_alert_policies(
  queue_code,alert_code,metric_code,warning_threshold,critical_threshold,
  evaluation_window_seconds,status,description
) values
 ('file_scan','queue_backlog','queue_length',20,100,300,'active','Mensagens ativas acumuladas na fila.'),
 ('file_scan','queue_age','oldest_message_age_seconds',120,300,300,'active','Idade da mensagem mais antiga acima do objetivo operacional.'),
 ('file_scan','dead_letters_open','open_dead_letters',1,5,300,'active','Dead letters abertas exigem investigação.'),
 ('file_scan','visibility_expirations','expired_receipts_5m',3,10,300,'active','Receipts expirados sugerem workers lentos ou interrompidos.'),
 ('file_scan','dispatch_failures','dispatch_failures_5m',1,3,300,'active','Falhas recentes ao invocar workers.'),
 ('file_scan','cron_failures','cron_failures_5m',1,3,300,'active','Falhas recentes dos jobs pg_cron.'),
 ('file_scan','scan_pending_age','oldest_scan_pending_age_seconds',300,900,300,'active','Arquivo aguardando scan por tempo excessivo.')
on conflict (queue_code,alert_code) do update set
  metric_code=excluded.metric_code,warning_threshold=excluded.warning_threshold,
  critical_threshold=excluded.critical_threshold,evaluation_window_seconds=excluded.evaluation_window_seconds,
  status=excluded.status,description=excluded.description;

create or replace function eventing.issue_worker_dispatch_token(p_schedule_code text,p_worker_id text)
returns table(token_id uuid,raw_token text)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_schedule eventing.worker_schedules%rowtype; v_token text; v_hash text;
begin
  select * into v_schedule from eventing.worker_schedules where code=p_schedule_code and status='active' for share;
  if not found then raise exception 'worker_schedule_not_active' using errcode='P0002'; end if;
  if p_worker_id is null or length(trim(p_worker_id)) not between 1 and 160 then raise exception 'invalid_worker_id' using errcode='22023'; end if;
  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  v_hash:=encode(extensions.digest(convert_to(v_token,'UTF8'),'sha256'),'hex');
  insert into eventing.worker_dispatch_tokens(schedule_code,queue_code,token_hash,intended_worker_id,status,issued_at,expires_at)
  values(v_schedule.code,v_schedule.queue_code,v_hash,trim(p_worker_id),'pending',now(),now()+make_interval(secs=>v_schedule.token_ttl_seconds))
  returning id into token_id;
  raw_token:=v_token; return next;
end $$;

create or replace function public.queue_claim_dispatch_token(p_raw_token text,p_worker_id text)
returns table(schedule_code text,queue_code text,batch_size integer,visibility_timeout_seconds integer)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_hash text; v_token eventing.worker_dispatch_tokens%rowtype; v_schedule eventing.worker_schedules%rowtype;
begin
  if p_raw_token is null or p_raw_token !~ '^[a-f0-9]{64}$' then raise exception 'invalid_dispatch_token' using errcode='28000'; end if;
  if p_worker_id is null or length(trim(p_worker_id)) not between 1 and 160 then raise exception 'invalid_worker_id' using errcode='22023'; end if;
  v_hash:=encode(extensions.digest(convert_to(p_raw_token,'UTF8'),'sha256'),'hex');
  select * into v_token from eventing.worker_dispatch_tokens where token_hash=v_hash for update;
  if not found or v_token.status<>'pending' or v_token.expires_at<=now() then raise exception 'dispatch_token_unavailable' using errcode='28000'; end if;
  if v_token.intended_worker_id<>trim(p_worker_id) then raise exception 'dispatch_token_worker_mismatch' using errcode='28000'; end if;
  select * into v_schedule from eventing.worker_schedules where code=v_token.schedule_code and status='active';
  if not found then raise exception 'worker_schedule_not_active' using errcode='55000'; end if;
  update eventing.worker_dispatch_tokens set status='claimed',claimed_at=now(),claimed_by=trim(p_worker_id) where id=v_token.id;
  return query select v_schedule.code,v_schedule.queue_code,v_schedule.batch_size,v_schedule.visibility_timeout_seconds;
end $$;

create or replace function public.file_get_scan_job_state(p_queue_job_id uuid,p_file_object_id uuid)
returns table(file_object_id uuid,queue_job_id uuid,security_status text,scan_applied boolean,scan_status text,source_bucket text,source_object_key text,target_object_key text)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_file core.file_objects%rowtype; v_scan core.file_security_scans%rowtype; v_scan_found boolean:=false;
begin
  select * into v_file from core.file_objects f where f.id=p_file_object_id;
  if not found then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  if v_file.scan_job_id is distinct from p_queue_job_id then raise exception 'file_scan_job_mismatch' using errcode='22023'; end if;
  select s.* into v_scan from core.file_security_scans s where s.queue_job_id=p_queue_job_id order by s.completed_at desc limit 1;
  v_scan_found:=found;
  return query select v_file.id,p_queue_job_id,v_file.security_status,v_scan_found,
    case when v_scan_found then v_scan.scan_status else null end,
    v_file.bucket,v_file.object_key,
    case when v_file.object_key like 'quarantine/%' then regexp_replace(v_file.object_key,'^quarantine/','protected/')
         when v_file.object_key like 'protected/%' then v_file.object_key else null end;
end $$;

create or replace function eventing.ack_job(p_receipt_handle uuid,p_worker_id text,p_result_details jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare v_receipt eventing.queue_receipts%rowtype; v_definition eventing.queue_definitions%rowtype; v_archived boolean; v_outcome text;
begin
  select * into v_receipt from eventing.queue_receipts where id=p_receipt_handle for update;
  if not found or v_receipt.worker_id<>trim(p_worker_id) then return false; end if;
  if v_receipt.status='acked' then return true; end if;
  if v_receipt.status<>'in_flight' then return false; end if;
  select * into v_definition from eventing.queue_definitions where code=v_receipt.queue_code;
  select pgmq.archive(v_definition.provider_queue_name,v_receipt.provider_message_id::bigint) into v_archived;
  if not coalesce(v_archived,false) then
    if exists(select 1 from eventing.queue_jobs where id=v_receipt.job_id and status='completed') then return true; end if;
    raise exception 'provider_ack_failed' using errcode='58000';
  end if;
  v_outcome:=case when lower(coalesce(p_result_details->>'duplicateSuppressed','false'))='true' then 'duplicate_suppressed' else 'succeeded' end;
  update eventing.queue_receipts set status='acked',completed_at=now() where id=v_receipt.id;
  update eventing.queue_attempts set outcome=v_outcome,finished_at=now(),details=details||coalesce(p_result_details,'{}'::jsonb)
    where receipt_id=v_receipt.id and outcome='processing';
  update eventing.queue_jobs set status='completed',completed_at=now(),last_error_code=null,last_error_details='{}'::jsonb where id=v_receipt.job_id;
  return true;
end $$;

revoke all on function public.queue_claim_dispatch_token(text,text) from public,anon,authenticated;
revoke all on function public.file_get_scan_job_state(uuid,uuid) from public,anon,authenticated;
grant execute on function public.queue_claim_dispatch_token(text,text) to service_role;
grant execute on function public.file_get_scan_job_state(uuid,uuid) to service_role;
grant execute on function eventing.issue_worker_dispatch_token(text,text) to app_worker;

create or replace function eventing.dispatch_worker_schedule(p_schedule_code text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_schedule eventing.worker_schedules%rowtype; v_definition eventing.queue_definitions%rowtype;
  v_metrics pgmq.metrics_result; v_run_id uuid; v_project_url text; v_publishable_key text;
  v_active_receipts integer; v_pending_dispatches integer; v_available_messages bigint;
  v_available_slots integer; v_invocations integer; v_worker_id text; v_token_id uuid;
  v_raw_token text; v_request_id bigint; v_dispatched integer:=0; i integer;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('worker-dispatch:'||p_schedule_code,0)) then
    return jsonb_build_object('status','skipped','reason','dispatcher_locked');
  end if;
  insert into eventing.scheduler_runs(scheduler_name,queue_code,run_kind,status)
  select 'worker-dispatch:'||s.code,s.queue_code,'dispatch','running' from eventing.worker_schedules s where s.code=p_schedule_code
  returning id into v_run_id;
  select * into v_schedule from eventing.worker_schedules where code=p_schedule_code and status='active' for share;
  if not found then
    update eventing.scheduler_runs set status='skipped',completed_at=now(),details='{"reason":"schedule_not_active"}'::jsonb where id=v_run_id;
    return jsonb_build_object('status','skipped','reason','schedule_not_active');
  end if;
  select * into v_definition from eventing.queue_definitions where code=v_schedule.queue_code and status='active';
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;
  if v_definition.provider<>'pgmq' then raise exception 'dispatcher_provider_not_supported' using errcode='0A000'; end if;
  select * into v_metrics from pgmq.metrics(v_definition.provider_queue_name);
  select count(*) into v_active_receipts from eventing.queue_receipts
    where queue_code=v_schedule.queue_code and status='in_flight' and visibility_deadline>now();
  select count(*) into v_pending_dispatches from eventing.worker_dispatch_tokens
    where schedule_code=v_schedule.code and status='pending' and expires_at>now();
  v_available_messages:=greatest(coalesce(v_metrics.queue_length,0)-v_active_receipts,0);
  v_available_slots:=greatest(v_schedule.max_parallel_invocations-v_active_receipts-v_pending_dispatches,0);
  v_invocations:=least(v_available_slots,case when v_available_messages=0 then 0 else ((v_available_messages+v_schedule.batch_size-1)/v_schedule.batch_size)::integer end);
  if v_invocations=0 then
    update eventing.scheduler_runs set status='skipped',completed_at=now(),details=jsonb_build_object(
      'reason','no_dispatch_capacity_or_messages','queueLength',coalesce(v_metrics.queue_length,0),
      'activeReceipts',v_active_receipts,'pendingDispatches',v_pending_dispatches) where id=v_run_id;
    return jsonb_build_object('status','skipped','invocations',0,'queueLength',coalesce(v_metrics.queue_length,0));
  end if;
  select decrypted_secret into v_project_url from vault.decrypted_secrets where name='estimulo_project_url' limit 1;
  select decrypted_secret into v_publishable_key from vault.decrypted_secrets where name='estimulo_publishable_key' limit 1;
  if v_project_url is null or v_publishable_key is null then raise exception 'scheduler_vault_configuration_missing' using errcode='55000'; end if;
  for i in 1..v_invocations loop
    v_worker_id:=left(v_schedule.code||'-'||replace(gen_random_uuid()::text,'-',''),160);
    select token_id,raw_token into v_token_id,v_raw_token from eventing.issue_worker_dispatch_token(v_schedule.code,v_worker_id);
    v_request_id:=net.http_post(
      url:=rtrim(v_project_url,'/')||'/functions/v1/'||v_schedule.worker_function_name,
      body:=jsonb_build_object('dispatchToken',v_raw_token,'workerId',v_worker_id),
      params:='{}'::jsonb,
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_publishable_key,'apikey',v_publishable_key,'x-request-id',v_token_id::text),
      timeout_milliseconds:=v_schedule.http_timeout_milliseconds);
    update eventing.worker_dispatch_tokens set http_request_id=v_request_id where id=v_token_id;
    v_dispatched:=v_dispatched+1;
  end loop;
  update eventing.scheduler_runs set status='succeeded',completed_at=now(),details=jsonb_build_object(
    'queueLength',coalesce(v_metrics.queue_length,0),'activeReceipts',v_active_receipts,
    'pendingDispatches',v_pending_dispatches,'requestedInvocations',v_invocations,'dispatchedInvocations',v_dispatched)
  where id=v_run_id;
  return jsonb_build_object('status','succeeded','invocations',v_dispatched,'queueLength',coalesce(v_metrics.queue_length,0));
exception when others then
  if v_run_id is not null then update eventing.scheduler_runs set status='failed',completed_at=now(),details=jsonb_build_object('sqlstate',sqlstate,'message',sqlerrm) where id=v_run_id; end if;
  raise;
end $$;

create or replace function eventing.dispatch_active_workers()
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare r record; v_results jsonb:='[]'::jsonb;
begin
  for r in select code from eventing.worker_schedules where status='active' order by code loop
    v_results:=v_results||jsonb_build_array(eventing.dispatch_worker_schedule(r.code));
  end loop;
  return v_results;
end $$;

create or replace function eventing.reconcile_dispatch_requests()
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_expired integer:=0; v_responses integer:=0; v_failed integer:=0;
begin
  update eventing.worker_dispatch_tokens set status='expired' where status='pending' and expires_at<=now();
  get diagnostics v_expired=row_count;
  with responses as (
    select t.id,r.status_code,r.error_msg,r.timed_out,r.created
    from eventing.worker_dispatch_tokens t join net._http_response r on r.id=t.http_request_id
    where t.http_request_id is not null and t.responded_at is null
  )
  update eventing.worker_dispatch_tokens t set
    http_status_code=r.status_code,
    http_error=left(coalesce(r.error_msg,case when r.timed_out then 'http_timeout' else null end),1000),
    responded_at=r.created,
    status=case when t.status='pending' and (r.timed_out or r.error_msg is not null or r.status_code<200 or r.status_code>=300) then 'failed' else t.status end
  from responses r where t.id=r.id;
  get diagnostics v_responses=row_count;
  select count(*) into v_failed from eventing.worker_dispatch_tokens
    where responded_at>=now()-interval '5 minutes' and (http_status_code<200 or http_status_code>=300 or http_error is not null);
  return jsonb_build_object('expiredTokens',v_expired,'responsesRecorded',v_responses,'recentFailures',v_failed);
end $$;

grant execute on function eventing.dispatch_worker_schedule(text) to app_worker;
grant execute on function eventing.dispatch_active_workers() to app_worker;
grant execute on function eventing.reconcile_dispatch_requests() to app_worker;

create or replace function eventing.provider_message_exists(p_queue_name text,p_provider_message_id text)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare v_exists boolean:=false;
begin
  if p_queue_name is null or p_queue_name !~ '^[a-z0-9_]+$' then raise exception 'invalid_provider_queue_name' using errcode='22023'; end if;
  if p_provider_message_id is null or p_provider_message_id !~ '^[0-9]+$' then return false; end if;
  execute format('select exists(select 1 from pgmq.%I where msg_id=$1)','q_'||p_queue_name) into v_exists using p_provider_message_id::bigint;
  return coalesce(v_exists,false);
end $$;

create or replace function eventing.republish_job(p_job_id uuid)
returns text language plpgsql security definer set search_path=pg_catalog as $$
declare v_job eventing.queue_jobs%rowtype; v_definition eventing.queue_definitions%rowtype; v_message_id bigint;
begin
  select * into v_job from eventing.queue_jobs where id=p_job_id for update;
  if not found then raise exception 'queue_job_not_found' using errcode='P0002'; end if;
  if v_job.status in ('completed','dead_lettered','cancelled') then raise exception 'queue_job_not_republishable' using errcode='55000'; end if;
  if exists(select 1 from eventing.queue_receipts where job_id=v_job.id and status='in_flight' and visibility_deadline>now()) then raise exception 'queue_job_has_active_receipt' using errcode='55000'; end if;
  select * into v_definition from eventing.queue_definitions where code=v_job.queue_code and status='active';
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;
  select send into v_message_id from pgmq.send(v_definition.provider_queue_name,eventing.queue_job_envelope(v_job.id),
    jsonb_build_object('job_id',v_job.id,'job_type',v_job.job_type,'deduplication_key',v_job.deduplication_key,'payload_hash',v_job.payload_hash,'reconciled',true),0) limit 1;
  if v_message_id is null then raise exception 'queue_republish_failed' using errcode='58000'; end if;
  update eventing.queue_jobs set status='queued',provider_message_id=v_message_id::text,available_at=now(),enqueued_at=coalesce(enqueued_at,now()) where id=v_job.id;
  return v_message_id::text;
end $$;

create or replace function eventing.reconcile_queue_system(p_queue_code text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_definition eventing.queue_definitions%rowtype; v_run_id uuid;
  v_expired_receipts integer:=0; v_expired_attempts integer:=0; v_released_jobs integer:=0;
  v_republished integer:=0; v_archived_terminal integer:=0; v_orphans integer:=0; v_scan_jobs_created integer:=0;
  v_job record; v_provider record; v_file record; v_provider_job_id uuid; v_new_job_id uuid; v_archived boolean;
  v_uuid_pattern constant text:='^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
begin
  if not pg_try_advisory_xact_lock(hashtextextended('queue-reconcile:'||p_queue_code,0)) then return jsonb_build_object('status','skipped','reason','reconciler_locked'); end if;
  select * into v_definition from eventing.queue_definitions where code=p_queue_code and status='active';
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;
  insert into eventing.scheduler_runs(scheduler_name,queue_code,run_kind,status)
    values('queue-reconcile:'||p_queue_code,p_queue_code,'reconcile','running') returning id into v_run_id;
  update eventing.queue_receipts set status='expired',completed_at=now()
    where queue_code=p_queue_code and status='in_flight' and visibility_deadline<=now();
  get diagnostics v_expired_receipts=row_count;
  update eventing.queue_attempts a set outcome='visibility_expired',finished_at=now(),error_code=coalesce(error_code,'visibility_timeout')
    where a.outcome='processing' and exists(select 1 from eventing.queue_receipts r where r.id=a.receipt_id and r.queue_code=p_queue_code and r.status='expired');
  get diagnostics v_expired_attempts=row_count;
  update eventing.queue_jobs j set status='retry_scheduled',available_at=now(),last_error_code=coalesce(last_error_code,'visibility_timeout')
    where j.queue_code=p_queue_code and j.status='in_flight'
      and not exists(select 1 from eventing.queue_receipts r where r.job_id=j.id and r.status='in_flight' and r.visibility_deadline>now());
  get diagnostics v_released_jobs=row_count;
  for v_job in select j.id,j.provider_message_id from eventing.queue_jobs j
    where j.queue_code=p_queue_code and j.status in ('created','queued','retry_scheduled','in_flight')
      and not exists(select 1 from eventing.queue_receipts r where r.job_id=j.id and r.status='in_flight' and r.visibility_deadline>now())
    order by j.created_at limit 100
  loop
    if not eventing.provider_message_exists(v_definition.provider_queue_name,v_job.provider_message_id) then perform eventing.republish_job(v_job.id); v_republished:=v_republished+1; end if;
  end loop;
  for v_job in select j.id,j.provider_message_id from eventing.queue_jobs j
    where j.queue_code=p_queue_code and j.status in ('completed','dead_lettered','cancelled') and j.provider_message_id is not null
    order by j.updated_at limit 100
  loop
    if eventing.provider_message_exists(v_definition.provider_queue_name,v_job.provider_message_id) then
      select pgmq.archive(v_definition.provider_queue_name,v_job.provider_message_id::bigint) into v_archived;
      if coalesce(v_archived,false) then v_archived_terminal:=v_archived_terminal+1; end if;
    end if;
  end loop;
  for v_provider in execute format('select msg_id,read_ct,message from pgmq.%I order by msg_id limit 100','q_'||v_definition.provider_queue_name)
  loop
    v_provider_job_id:=null;
    if coalesce(v_provider.message->>'jobId','')~v_uuid_pattern then v_provider_job_id:=(v_provider.message->>'jobId')::uuid; end if;
    if v_provider_job_id is null or not exists(select 1 from eventing.queue_jobs where id=v_provider_job_id and queue_code=p_queue_code) then
      perform eventing.dead_letter_provider_message(p_queue_code,null,v_provider.msg_id::text,v_provider.read_ct,
        case when v_provider_job_id is null then 'invalid_job_envelope' else 'orphan_provider_message' end,
        jsonb_build_object('reconciled',true),v_provider.message);
      v_orphans:=v_orphans+1;
    end if;
  end loop;
  if p_queue_code='file_scan' then
    for v_file in select f.id,f.owner_organization_id,f.storage_provider,f.bucket,f.object_key,f.content_type,f.size_bytes,f.sha256,f.retention_class,
      coalesce(i.upload_profile_code,'unknown') as upload_profile_code
      from core.file_objects f left join core.file_upload_intents i on i.id=f.upload_intent_id
      where f.security_status='scan_pending' and f.scan_job_id is null and f.deleted_at is null
      order by f.created_at limit 100 for update of f skip locked
    loop
      v_new_job_id:=eventing.enqueue_job('file_scan','file.malware_scan.requested',1,'file_scan:'||v_file.id::text||':'||v_file.sha256,
        null,v_file.owner_organization_id,'file_object',v_file.id,
        jsonb_build_object('fileObjectId',v_file.id,'uploadProfileCode',v_file.upload_profile_code,'storageProvider',v_file.storage_provider,
          'bucket',v_file.bucket,'objectKey',v_file.object_key,'contentType',v_file.content_type,'sizeBytes',v_file.size_bytes,
          'sha256',v_file.sha256,'retentionClass',v_file.retention_class,'reconciled',true),0);
      update core.file_objects set scan_job_id=v_new_job_id where id=v_file.id;
      v_scan_jobs_created:=v_scan_jobs_created+1;
    end loop;
  end if;
  update eventing.scheduler_runs set status='succeeded',completed_at=now(),details=jsonb_build_object(
    'expiredReceipts',v_expired_receipts,'expiredAttempts',v_expired_attempts,'releasedJobs',v_released_jobs,
    'republishedJobs',v_republished,'archivedTerminalMessages',v_archived_terminal,'orphanMessages',v_orphans,'scanJobsCreated',v_scan_jobs_created)
    where id=v_run_id;
  return jsonb_build_object('status','succeeded','expiredReceipts',v_expired_receipts,'republishedJobs',v_republished,'orphanMessages',v_orphans,'scanJobsCreated',v_scan_jobs_created);
exception when others then
  if v_run_id is not null then update eventing.scheduler_runs set status='failed',completed_at=now(),details=jsonb_build_object('sqlstate',sqlstate,'message',sqlerrm) where id=v_run_id; end if;
  raise;
end $$;

grant execute on function eventing.provider_message_exists(text,text) to app_worker;
grant execute on function eventing.republish_job(uuid) to app_worker;
grant execute on function eventing.reconcile_queue_system(text) to app_worker;

create or replace function eventing.capture_queue_metrics(p_queue_code text)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_definition eventing.queue_definitions%rowtype; v_metrics pgmq.metrics_result; v_snapshot_id bigint;
  v_jobs_by_status jsonb; v_open_dead_letters bigint; v_in_flight bigint; v_expired_5m bigint;
  v_dispatch_failures_5m bigint; v_cron_failures_5m bigint; v_scan_pending bigint:=0;
  v_release_pending bigint:=0; v_oldest_scan_age integer;
begin
  select * into v_definition from eventing.queue_definitions where code=p_queue_code;
  if not found then raise exception 'queue_definition_not_found' using errcode='P0002'; end if;
  select * into v_metrics from pgmq.metrics(v_definition.provider_queue_name);
  select coalesce(jsonb_object_agg(status,cnt),'{}'::jsonb) into v_jobs_by_status
    from (select status,count(*) cnt from eventing.queue_jobs where queue_code=p_queue_code group by status) s;
  select count(*) into v_open_dead_letters from eventing.queue_dead_letters where source_queue_code=p_queue_code and status='open';
  select count(*) into v_in_flight from eventing.queue_receipts where queue_code=p_queue_code and status='in_flight' and visibility_deadline>now();
  select count(*) into v_expired_5m from eventing.queue_receipts where queue_code=p_queue_code and status='expired' and completed_at>=now()-interval '5 minutes';
  select count(*) into v_dispatch_failures_5m from eventing.worker_dispatch_tokens
    where queue_code=p_queue_code and responded_at>=now()-interval '5 minutes'
      and (http_status_code<200 or http_status_code>=300 or http_error is not null);
  select count(*) into v_cron_failures_5m from cron.job_run_details d join cron.job j on j.jobid=d.jobid
    where j.jobname like 'estimulo-%' and d.start_time>=now()-interval '5 minutes' and d.status not in ('succeeded','running');
  if p_queue_code='file_scan' then
    select count(*) filter(where security_status='scan_pending'),count(*) filter(where security_status='release_pending'),
      extract(epoch from now()-min(created_at) filter(where security_status='scan_pending'))::integer
      into v_scan_pending,v_release_pending,v_oldest_scan_age
    from core.file_objects where security_status in ('scan_pending','release_pending') and deleted_at is null;
  end if;
  insert into eventing.queue_metric_snapshots(
    queue_code,captured_at,queue_length,total_messages,oldest_message_age_seconds,open_dead_letters,
    in_flight_receipts,expired_receipts_5m,dispatch_failures_5m,cron_failures_5m,
    scan_pending_count,release_pending_count,oldest_scan_pending_age_seconds,jobs_by_status)
  values(p_queue_code,now(),coalesce(v_metrics.queue_length,0),coalesce(v_metrics.total_messages,0),v_metrics.oldest_msg_age_sec,
    v_open_dead_letters,v_in_flight,v_expired_5m,v_dispatch_failures_5m,v_cron_failures_5m,
    v_scan_pending,v_release_pending,v_oldest_scan_age,v_jobs_by_status)
  returning id into v_snapshot_id;
  return v_snapshot_id;
end $$;

create or replace function eventing.evaluate_queue_alerts(p_queue_code text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_snapshot eventing.queue_metric_snapshots%rowtype; v_policy eventing.queue_alert_policies%rowtype;
  v_value numeric; v_severity text; v_opened integer:=0; v_resolved integer:=0;
begin
  select * into v_snapshot from eventing.queue_metric_snapshots where queue_code=p_queue_code order by captured_at desc limit 1;
  if not found then raise exception 'queue_metric_snapshot_not_found' using errcode='P0002'; end if;
  for v_policy in select * from eventing.queue_alert_policies where queue_code=p_queue_code and status='active' order by alert_code loop
    v_value:=case v_policy.metric_code
      when 'queue_length' then v_snapshot.queue_length
      when 'oldest_message_age_seconds' then coalesce(v_snapshot.oldest_message_age_seconds,0)
      when 'open_dead_letters' then v_snapshot.open_dead_letters
      when 'expired_receipts_5m' then v_snapshot.expired_receipts_5m
      when 'dispatch_failures_5m' then v_snapshot.dispatch_failures_5m
      when 'cron_failures_5m' then v_snapshot.cron_failures_5m
      when 'oldest_scan_pending_age_seconds' then coalesce(v_snapshot.oldest_scan_pending_age_seconds,0)
      else 0 end;
    if v_value>=v_policy.warning_threshold then
      v_severity:=case when v_value>=v_policy.critical_threshold then 'critical' else 'warning' end;
      insert into eventing.operational_alerts(queue_code,alert_code,severity,status,current_value,warning_threshold,critical_threshold,first_seen_at,last_seen_at,occurrence_count,details)
      values(p_queue_code,v_policy.alert_code,v_severity,'open',v_value,v_policy.warning_threshold,v_policy.critical_threshold,now(),now(),1,
        jsonb_build_object('metricCode',v_policy.metric_code,'snapshotId',v_snapshot.id,'description',v_policy.description))
      on conflict(queue_code,alert_code) where status in ('open','acknowledged') do update set
        severity=excluded.severity,current_value=excluded.current_value,warning_threshold=excluded.warning_threshold,
        critical_threshold=excluded.critical_threshold,last_seen_at=now(),occurrence_count=eventing.operational_alerts.occurrence_count+1,details=excluded.details;
      v_opened:=v_opened+1;
    else
      update eventing.operational_alerts set status='resolved',resolved_at=now(),last_seen_at=now(),current_value=v_value
        where queue_code=p_queue_code and alert_code=v_policy.alert_code and status in ('open','acknowledged');
      v_resolved:=v_resolved+case when found then 1 else 0 end;
    end if;
  end loop;
  return jsonb_build_object('evaluatedAt',now(),'activeOrUpdated',v_opened,'resolved',v_resolved);
end $$;

create or replace function eventing.capture_and_evaluate_queue(p_queue_code text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_snapshot_id bigint; v_alerts jsonb;
begin
  v_snapshot_id:=eventing.capture_queue_metrics(p_queue_code);
  v_alerts:=eventing.evaluate_queue_alerts(p_queue_code);
  return jsonb_build_object('snapshotId',v_snapshot_id,'alerts',v_alerts);
end $$;

create or replace function public.queue_get_operational_status(p_queue_code text)
returns jsonb language sql security definer set search_path=pg_catalog as $$
  select jsonb_build_object(
    'queueCode',p_queue_code,
    'latestSnapshot',(select to_jsonb(s) from eventing.queue_metric_snapshots s where s.queue_code=p_queue_code order by s.captured_at desc limit 1),
    'activeAlerts',coalesce((select jsonb_agg(to_jsonb(a) order by a.severity desc,a.first_seen_at) from eventing.operational_alerts a where a.queue_code=p_queue_code and a.status in ('open','acknowledged')),'[]'::jsonb),
    'workerSchedules',coalesce((select jsonb_agg(to_jsonb(w) order by w.code) from eventing.worker_schedules w where w.queue_code=p_queue_code),'[]'::jsonb),
    'recentSchedulerRuns',coalesce((select jsonb_agg(to_jsonb(x) order by x.started_at desc) from (select * from eventing.scheduler_runs r where r.queue_code=p_queue_code order by r.started_at desc limit 20) x),'[]'::jsonb)
  );
$$;

create or replace function public.queue_acknowledge_alert(p_alert_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare v_count integer;
begin
  update eventing.operational_alerts set status='acknowledged',acknowledged_at=now() where id=p_alert_id and status='open';
  get diagnostics v_count=row_count; return v_count=1;
end $$;

create or replace function eventing.cleanup_scheduler_history()
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_tokens integer; v_runs integer; v_metrics integer; v_cron integer;
begin
  delete from eventing.worker_dispatch_tokens where created_at<now()-interval '2 days' and status in ('claimed','expired','failed','revoked');
  get diagnostics v_tokens=row_count;
  delete from eventing.scheduler_runs where created_at<now()-interval '30 days'; get diagnostics v_runs=row_count;
  delete from eventing.queue_metric_snapshots where captured_at<now()-interval '30 days'; get diagnostics v_metrics=row_count;
  delete from cron.job_run_details where start_time<now()-interval '30 days'; get diagnostics v_cron=row_count;
  return jsonb_build_object('dispatchTokens',v_tokens,'schedulerRuns',v_runs,'metricSnapshots',v_metrics,'cronRuns',v_cron);
end $$;

grant execute on function eventing.capture_queue_metrics(text) to app_worker;
grant execute on function eventing.evaluate_queue_alerts(text) to app_worker;
grant execute on function eventing.capture_and_evaluate_queue(text) to app_worker;
grant execute on function eventing.cleanup_scheduler_history() to app_worker;
revoke all on function public.queue_get_operational_status(text) from public,anon,authenticated;
revoke all on function public.queue_acknowledge_alert(uuid) from public,anon,authenticated;
grant execute on function public.queue_get_operational_status(text) to service_role;
grant execute on function public.queue_acknowledge_alert(uuid) to service_role;

-- Schedule names are stable and provider-specific only to the Supabase test environment.
select cron.schedule('estimulo-file-scan-dispatch','30 seconds',$$select eventing.dispatch_worker_schedule('file_scan_worker');$$);
select cron.schedule('estimulo-queue-reconcile','* * * * *',$$select eventing.reconcile_dispatch_requests(); select eventing.reconcile_queue_system('file_scan');$$);
select cron.schedule('estimulo-queue-metrics-alerts','* * * * *',$$select eventing.capture_and_evaluate_queue('file_scan');$$);
select cron.schedule('estimulo-scheduler-history-cleanup','17 3 * * *',$$select eventing.cleanup_scheduler_history();$$);
