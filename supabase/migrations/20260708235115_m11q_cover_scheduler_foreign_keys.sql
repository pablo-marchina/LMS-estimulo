-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708235115
-- Remote name: m11q_cover_scheduler_foreign_keys
-- Remote SQL SHA-256: 43c3d96ea7a3646451f459a6f0d4f2287c4ec53bf1fd543d27e1ca75f8e1431a
-- Do not edit after reconciliation; corrections require a new migration.

create index if not exists ix_eventing_worker_schedules_queue_code
  on eventing.worker_schedules(queue_code);
create index if not exists ix_eventing_worker_dispatch_tokens_schedule_code
  on eventing.worker_dispatch_tokens(schedule_code);
