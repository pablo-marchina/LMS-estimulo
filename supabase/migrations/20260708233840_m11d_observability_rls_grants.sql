-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708233840
-- Remote name: m11d_observability_rls_grants
-- Remote SQL SHA-256: f781c2fd93a69adfef38f0d9c2ab94348e936407812a790ecffb9e66564dc1b6
-- Do not edit after reconciliation; corrections require a new migration.

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

grant select,insert,update,delete on eventing.worker_schedules,eventing.worker_dispatch_tokens,eventing.scheduler_runs,eventing.queue_metric_snapshots,eventing.queue_alert_policies,eventing.operational_alerts to app_worker;
grant usage,select on sequence eventing.queue_metric_snapshots_id_seq to app_worker;
