-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708233826
-- Remote name: m11c_observability_tables
-- Remote SQL SHA-256: 71063d5d267dc69feeab106c0d95509b987f6c39136323ef4c5011182e349981
-- Do not edit after reconciliation; corrections require a new migration.

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
  constraint fk_operational_alerts_policy foreign key (queue_code,alert_code) references eventing.queue_alert_policies(queue_code,alert_code),
  constraint ck_operational_alerts_severity check (severity in ('warning','critical')),
  constraint ck_operational_alerts_status check (status in ('open','acknowledged','resolved')),
  constraint ck_operational_alerts_occurrences check (occurrence_count > 0)
);

create unique index uq_operational_alerts_active on eventing.operational_alerts(queue_code,alert_code) where status in ('open','acknowledged');
create index ix_scheduler_runs_queue_started on eventing.scheduler_runs(queue_code,started_at desc);
create index ix_queue_metric_snapshots_queue_captured on eventing.queue_metric_snapshots(queue_code,captured_at desc);
create index ix_operational_alerts_queue_status on eventing.operational_alerts(queue_code,status,last_seen_at desc);

create trigger trg_queue_alert_policies_updated_at before update on eventing.queue_alert_policies for each row execute function governance.set_updated_at();
create trigger trg_operational_alerts_updated_at before update on eventing.operational_alerts for each row execute function governance.set_updated_at();
