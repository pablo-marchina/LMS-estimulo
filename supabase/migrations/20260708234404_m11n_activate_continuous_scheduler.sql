-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708234404
-- Remote name: m11n_activate_continuous_scheduler
-- Remote SQL SHA-256: b573e89c076431115cfa8f7cf19c721cc5cf62fcbf1b4c5d83d0610ed78db377
-- Do not edit after reconciliation; corrections require a new migration.

select cron.schedule(
  'estimulo-file-scan-dispatch',
  '30 seconds',
  $$select eventing.dispatch_worker_schedule('file_scan_worker');$$
);

select cron.schedule(
  'estimulo-queue-reconcile',
  '* * * * *',
  $$select eventing.reconcile_dispatch_requests(); select eventing.reconcile_queue_system('file_scan');$$
);

select cron.schedule(
  'estimulo-queue-metrics-alerts',
  '* * * * *',
  $$select eventing.capture_and_evaluate_queue('file_scan');$$
);

select cron.schedule(
  'estimulo-scheduler-history-cleanup',
  '17 3 * * *',
  $$select eventing.cleanup_scheduler_history();$$
);
