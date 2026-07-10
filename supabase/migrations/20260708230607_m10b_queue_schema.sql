-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708230607
-- Remote name: m10b_queue_schema
-- Remote SQL SHA-256: 5f5bb7178e4192d462b0bc269bcd5eae383a24dedad9af13ce88b8e4223e98f6
-- Do not edit after reconciliation; corrections require a new migration.

-- Plataforma Estímulo — M10 — provider-neutral asynchronous jobs and PGMQ test adapter
-- Supabase test environment: PGMQ. AWS production target: SQS Standard + DLQ.
-- Application semantics are deliberately at-least-once and consumers must be idempotent.

set lock_timeout = '5s';
set statement_timeout = '5min';

create extension if not exists pgmq;

create table eventing.queue_definitions (
  code text primary key,
  provider text not null,
  provider_queue_name text not null,
  provider_dead_letter_queue_name text not null,
  message_schema_version integer not null default 1,
  visibility_timeout_seconds integer not null,
  max_receive_count integer not null,
  max_batch_size integer not null,
  retention_seconds integer not null,
  retry_policy jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_eventing_queue_definitions_provider_queue unique (provider, provider_queue_name),
  constraint ck_eventing_queue_definitions_code check (code ~ '^[a-z][a-z0-9_]{1,62}$'),
  constraint ck_eventing_queue_definitions_provider check (provider in ('pgmq','sqs')),
  constraint ck_eventing_queue_definitions_message_version check (message_schema_version > 0),
  constraint ck_eventing_queue_definitions_visibility check (visibility_timeout_seconds between 1 and 43200),
  constraint ck_eventing_queue_definitions_receive_count check (max_receive_count between 1 and 1000),
  constraint ck_eventing_queue_definitions_batch_size check (max_batch_size between 1 and 10),
  constraint ck_eventing_queue_definitions_retention check (retention_seconds between 60 and 1209600),
  constraint ck_eventing_queue_definitions_status check (status in ('active','paused','disabled'))
);

create table eventing.queue_jobs (
  id uuid primary key default gen_random_uuid(),
  queue_code text not null,
  job_type text not null,
  job_version integer not null default 1,
  deduplication_key text not null,
  source_event_id uuid,
  organization_id uuid,
  subject_type text,
  subject_id uuid,
  payload jsonb not null,
  payload_hash text not null,
  status text not null default 'created',
  provider text not null,
  provider_queue_name text not null,
  provider_message_id text,
  available_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  max_attempts integer not null,
  last_error_code text,
  last_error_details jsonb not null default '{}'::jsonb,
  enqueued_at timestamptz,
  last_received_at timestamptz,
  completed_at timestamptz,
  dead_lettered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_eventing_queue_jobs_deduplication unique (queue_code, deduplication_key),
  constraint ck_eventing_queue_jobs_job_type check (job_type ~ '^[a-z][a-z0-9_.-]{2,119}$'),
  constraint ck_eventing_queue_jobs_job_version check (job_version > 0),
  constraint ck_eventing_queue_jobs_deduplication_key check (length(deduplication_key) between 1 and 240),
  constraint ck_eventing_queue_jobs_payload_hash check (payload_hash ~ '^[a-f0-9]{64}$'),
  constraint ck_eventing_queue_jobs_status check (status in ('created','queued','in_flight','retry_scheduled','completed','dead_lettered','cancelled')),
  constraint ck_eventing_queue_jobs_attempt_count check (attempt_count >= 0),
  constraint ck_eventing_queue_jobs_max_attempts check (max_attempts > 0)
);

create unique index uq_eventing_queue_jobs_provider_message
  on eventing.queue_jobs(provider, provider_queue_name, provider_message_id)
  where provider_message_id is not null;

create table eventing.queue_receipts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  queue_code text not null,
  provider_message_id text not null,
  worker_id text not null,
  receive_count integer not null,
  received_at timestamptz not null default now(),
  visibility_deadline timestamptz not null,
  status text not null default 'in_flight',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ck_eventing_queue_receipts_worker_id check (length(trim(worker_id)) between 1 and 160),
  constraint ck_eventing_queue_receipts_receive_count check (receive_count > 0),
  constraint ck_eventing_queue_receipts_visibility check (visibility_deadline >= received_at),
  constraint ck_eventing_queue_receipts_status check (status in ('in_flight','acked','released','expired','dead_lettered','superseded'))
);

create table eventing.queue_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  receipt_id uuid not null,
  attempt_number integer not null,
  worker_id text not null,
  started_at timestamptz not null,
  visibility_deadline timestamptz not null,
  finished_at timestamptz,
  outcome text not null default 'processing',
  error_code text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint uq_eventing_queue_attempts_receipt unique (receipt_id),
  constraint ck_eventing_queue_attempts_number check (attempt_number > 0),
  constraint ck_eventing_queue_attempts_outcome check (outcome in ('processing','succeeded','retry_scheduled','visibility_expired','dead_lettered','duplicate_suppressed','failed')),
  constraint ck_eventing_queue_attempts_dates check (finished_at is null or finished_at >= started_at)
);

create table eventing.queue_dead_letters (
  id uuid primary key default gen_random_uuid(),
  job_id uuid,
  source_queue_code text not null,
  provider_source_message_id text,
  provider_dead_letter_message_id text,
  receive_count integer not null,
  reason_code text not null,
  reason_details jsonb not null default '{}'::jsonb,
  message_snapshot jsonb not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  redriven_at timestamptz,
  resolved_at timestamptz,
  resolution text,
  constraint ck_eventing_queue_dead_letters_receive_count check (receive_count >= 0),
  constraint ck_eventing_queue_dead_letters_status check (status in ('open','redriven','resolved','discarded'))
);

create unique index uq_eventing_queue_dead_letters_open_job
  on eventing.queue_dead_letters(job_id)
  where job_id is not null and status = 'open';

alter table eventing.queue_jobs
  add constraint fk_eventing_queue_jobs_queue_code foreign key (queue_code) references eventing.queue_definitions(code),
  add constraint fk_eventing_queue_jobs_source_event_id foreign key (source_event_id) references eventing.events(event_id),
  add constraint fk_eventing_queue_jobs_organization_id foreign key (organization_id) references iam.organizations(id);

alter table eventing.queue_receipts
  add constraint fk_eventing_queue_receipts_job_id foreign key (job_id) references eventing.queue_jobs(id),
  add constraint fk_eventing_queue_receipts_queue_code foreign key (queue_code) references eventing.queue_definitions(code);

alter table eventing.queue_attempts
  add constraint fk_eventing_queue_attempts_job_id foreign key (job_id) references eventing.queue_jobs(id),
  add constraint fk_eventing_queue_attempts_receipt_id foreign key (receipt_id) references eventing.queue_receipts(id);

alter table eventing.queue_dead_letters
  add constraint fk_eventing_queue_dead_letters_job_id foreign key (job_id) references eventing.queue_jobs(id),
  add constraint fk_eventing_queue_dead_letters_source_queue_code foreign key (source_queue_code) references eventing.queue_definitions(code);

create index ix_eventing_queue_jobs_status_available on eventing.queue_jobs(queue_code, status, available_at, created_at);
create index ix_eventing_queue_jobs_subject on eventing.queue_jobs(subject_type, subject_id, created_at desc);
create index ix_eventing_queue_jobs_source_event_id on eventing.queue_jobs(source_event_id);
create index ix_eventing_queue_jobs_organization_id on eventing.queue_jobs(organization_id);
create index ix_eventing_queue_receipts_job_status on eventing.queue_receipts(job_id, status, visibility_deadline desc);
create index ix_eventing_queue_receipts_worker_status on eventing.queue_receipts(worker_id, status, received_at desc);
create index ix_eventing_queue_receipts_queue_code on eventing.queue_receipts(queue_code);
create index ix_eventing_queue_attempts_job_started on eventing.queue_attempts(job_id, started_at desc);
create index ix_eventing_queue_dead_letters_queue_status on eventing.queue_dead_letters(source_queue_code, status, created_at);

create trigger trg_eventing_queue_definitions_updated_at before update on eventing.queue_definitions for each row execute function governance.set_updated_at();
create trigger trg_eventing_queue_jobs_updated_at before update on eventing.queue_jobs for each row execute function governance.set_updated_at();
create trigger trg_eventing_queue_attempts_append_only before delete on eventing.queue_attempts for each row execute function governance.reject_mutation();

alter table core.file_objects add column if not exists scan_job_id uuid;
alter table core.file_security_scans add column if not exists queue_job_id uuid;

alter table core.file_objects
  add constraint fk_core_file_objects_scan_job_id foreign key (scan_job_id) references eventing.queue_jobs(id),
  add constraint uq_core_file_objects_scan_job_id unique (scan_job_id);

alter table core.file_security_scans
  add constraint fk_core_file_security_scans_queue_job_id foreign key (queue_job_id) references eventing.queue_jobs(id),
  add constraint uq_core_file_security_scans_queue_job_id unique (queue_job_id);

create index ix_core_file_security_scans_queue_job_id on core.file_security_scans(queue_job_id);

do $$
begin
  if not exists (select 1 from pgmq.list_queues() where queue_name = 'estimulo_file_scan_jobs') then
    perform pgmq.create('estimulo_file_scan_jobs');
  end if;
  if not exists (select 1 from pgmq.list_queues() where queue_name = 'estimulo_file_scan_dlq') then
    perform pgmq.create('estimulo_file_scan_dlq');
  end if;
end $$;

insert into eventing.queue_definitions(
  code, provider, provider_queue_name, provider_dead_letter_queue_name,
  message_schema_version, visibility_timeout_seconds, max_receive_count,
  max_batch_size, retention_seconds, retry_policy, status
) values (
  'file_scan', 'pgmq', 'estimulo_file_scan_jobs', 'estimulo_file_scan_dlq',
  1, 120, 5, 10, 1209600,
  '{"strategy":"exponential","base_seconds":15,"maximum_seconds":900,"jitter":"full"}'::jsonb,
  'active'
) on conflict (code) do update set
  provider = excluded.provider,
  provider_queue_name = excluded.provider_queue_name,
  provider_dead_letter_queue_name = excluded.provider_dead_letter_queue_name,
  message_schema_version = excluded.message_schema_version,
  visibility_timeout_seconds = excluded.visibility_timeout_seconds,
  max_receive_count = excluded.max_receive_count,
  max_batch_size = excluded.max_batch_size,
  retention_seconds = excluded.retention_seconds,
  retry_policy = excluded.retry_policy,
  status = excluded.status;
