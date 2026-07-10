-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708233810
-- Remote name: m11b_worker_schedule_tables
-- Remote SQL SHA-256: c8ea568d18f724d62b9a0032baa8a73caf7181c76bd398f38e28a8d7894395a3
-- Do not edit after reconciliation; corrections require a new migration.

set lock_timeout = '5s';
set statement_timeout = '5min';

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

create index ix_worker_dispatch_status_expiry on eventing.worker_dispatch_tokens(status,expires_at);
create index ix_worker_dispatch_queue_status on eventing.worker_dispatch_tokens(queue_code,status,issued_at desc);

create trigger trg_worker_schedules_updated_at before update on eventing.worker_schedules for each row execute function governance.set_updated_at();
