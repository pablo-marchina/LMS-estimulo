-- Plataforma Estímulo — M10 — provider-neutral asynchronous jobs and PGMQ test adapter
-- Supabase test environment: PGMQ. AWS production target: SQS Standard + DLQ.
-- Application semantics are deliberately at-least-once and consumers must be idempotent.

set lock_timeout = '5s';
set statement_timeout = '5min';

create extension if not exists pgmq;

-- -------------------------------------------------------------------------
-- Logical queues and provider-neutral job state.
-- -------------------------------------------------------------------------
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

create trigger trg_eventing_queue_definitions_updated_at
before update on eventing.queue_definitions
for each row execute function governance.set_updated_at();

create trigger trg_eventing_queue_jobs_updated_at
before update on eventing.queue_jobs
for each row execute function governance.set_updated_at();

create trigger trg_eventing_queue_attempts_append_only
before delete on eventing.queue_attempts
for each row execute function governance.reject_mutation();

-- -------------------------------------------------------------------------
-- File scan linkage.
-- -------------------------------------------------------------------------
alter table core.file_objects
  add column if not exists scan_job_id uuid;

alter table core.file_security_scans
  add column if not exists queue_job_id uuid;

alter table core.file_objects
  add constraint fk_core_file_objects_scan_job_id foreign key (scan_job_id) references eventing.queue_jobs(id),
  add constraint uq_core_file_objects_scan_job_id unique (scan_job_id);

alter table core.file_security_scans
  add constraint fk_core_file_security_scans_queue_job_id foreign key (queue_job_id) references eventing.queue_jobs(id),
  add constraint uq_core_file_security_scans_queue_job_id unique (queue_job_id);

create index ix_core_file_security_scans_queue_job_id on core.file_security_scans(queue_job_id);

-- -------------------------------------------------------------------------
-- PGMQ queues for the shared Supabase test environment.
-- PGMQ schema remains private and is never exposed through PostgREST.
-- -------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------
-- Queue provider adapter and lifecycle functions.
-- -------------------------------------------------------------------------
create or replace function eventing.queue_job_envelope(p_job_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'envelopeVersion', qd.message_schema_version,
    'jobId', j.id,
    'queueCode', j.queue_code,
    'jobType', j.job_type,
    'jobVersion', j.job_version,
    'deduplicationKey', j.deduplication_key,
    'sourceEventId', j.source_event_id,
    'organizationId', j.organization_id,
    'subjectType', j.subject_type,
    'subjectId', j.subject_id,
    'enqueuedAt', coalesce(j.enqueued_at, j.created_at),
    'payload', j.payload
  )
  from eventing.queue_jobs j
  join eventing.queue_definitions qd on qd.code = j.queue_code
  where j.id = p_job_id;
$$;

create or replace function eventing.enqueue_job(
  p_queue_code text,
  p_job_type text,
  p_job_version integer,
  p_deduplication_key text,
  p_source_event_id uuid,
  p_organization_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_payload jsonb,
  p_delay_seconds integer default 0
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_job_id uuid;
  v_message_id bigint;
  v_payload_hash text;
  v_existing_status text;
begin
  if p_job_version < 1 then raise exception 'invalid_job_version' using errcode='22023'; end if;
  if p_delay_seconds < 0 or p_delay_seconds > 900 then raise exception 'invalid_job_delay' using errcode='22023'; end if;
  if p_job_type is null or p_job_type !~ '^[a-z][a-z0-9_.-]{2,119}$' then raise exception 'invalid_job_type' using errcode='22023'; end if;
  if p_deduplication_key is null or length(p_deduplication_key) not between 1 and 240 then raise exception 'invalid_deduplication_key' using errcode='22023'; end if;

  select * into v_definition
  from eventing.queue_definitions
  where code = p_queue_code and status = 'active'
  for share;
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;

  v_payload_hash := encode(extensions.digest(convert_to(coalesce(p_payload,'{}'::jsonb)::text,'UTF8'),'sha256'),'hex');

  insert into eventing.queue_jobs(
    queue_code, job_type, job_version, deduplication_key,
    source_event_id, organization_id, subject_type, subject_id,
    payload, payload_hash, status, provider, provider_queue_name,
    available_at, max_attempts
  ) values (
    v_definition.code, p_job_type, p_job_version, p_deduplication_key,
    p_source_event_id, p_organization_id, p_subject_type, p_subject_id,
    coalesce(p_payload,'{}'::jsonb), v_payload_hash, 'created',
    v_definition.provider, v_definition.provider_queue_name,
    now() + make_interval(secs => p_delay_seconds), v_definition.max_receive_count
  ) on conflict (queue_code, deduplication_key) do nothing
  returning id into v_job_id;

  if v_job_id is null then
    select id, status into v_job_id, v_existing_status
    from eventing.queue_jobs
    where queue_code = p_queue_code and deduplication_key = p_deduplication_key;
    if v_existing_status = 'cancelled' then
      raise exception 'deduplicated_job_cancelled' using errcode='55000';
    end if;
    return v_job_id;
  end if;

  if v_definition.provider <> 'pgmq' then
    raise exception 'queue_provider_not_available_in_test_environment' using errcode='0A000';
  end if;

  select send into v_message_id
  from pgmq.send(
    v_definition.provider_queue_name,
    eventing.queue_job_envelope(v_job_id),
    jsonb_build_object(
      'job_id', v_job_id,
      'job_type', p_job_type,
      'deduplication_key', p_deduplication_key,
      'payload_hash', v_payload_hash
    ),
    p_delay_seconds
  ) limit 1;

  if v_message_id is null then raise exception 'queue_publish_failed' using errcode='58000'; end if;

  update eventing.queue_jobs
     set status='queued', provider_message_id=v_message_id::text,
         enqueued_at=now(), available_at=now()+make_interval(secs=>p_delay_seconds)
   where id=v_job_id;

  return v_job_id;
end;
$$;

create or replace function eventing.dead_letter_provider_message(
  p_queue_code text,
  p_job_id uuid,
  p_provider_message_id text,
  p_receive_count integer,
  p_reason_code text,
  p_reason_details jsonb,
  p_message_snapshot jsonb
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_dlq_message_id bigint;
  v_dead_letter_id uuid;
  v_archived boolean;
begin
  select * into v_definition from eventing.queue_definitions where code=p_queue_code for share;
  if not found then raise exception 'queue_definition_not_found' using errcode='P0002'; end if;
  if v_definition.provider <> 'pgmq' then raise exception 'queue_provider_not_available_in_test_environment' using errcode='0A000'; end if;

  select send into v_dlq_message_id
  from pgmq.send(
    v_definition.provider_dead_letter_queue_name,
    jsonb_build_object(
      'deadLetterVersion',1,
      'sourceQueueCode',p_queue_code,
      'sourceProviderMessageId',p_provider_message_id,
      'receiveCount',greatest(coalesce(p_receive_count,0),0),
      'reasonCode',left(coalesce(p_reason_code,'unknown'),120),
      'reasonDetails',coalesce(p_reason_details,'{}'::jsonb),
      'failedAt',now(),
      'message',coalesce(p_message_snapshot,'{}'::jsonb)
    )
  ) limit 1;

  if v_dlq_message_id is null then raise exception 'dead_letter_publish_failed' using errcode='58000'; end if;

  if p_provider_message_id is not null and p_provider_message_id ~ '^[0-9]+$' then
    select pgmq.archive(v_definition.provider_queue_name,p_provider_message_id::bigint) into v_archived;
  end if;

  insert into eventing.queue_dead_letters(
    job_id, source_queue_code, provider_source_message_id,
    provider_dead_letter_message_id, receive_count, reason_code,
    reason_details, message_snapshot, status
  ) values (
    p_job_id, p_queue_code, p_provider_message_id,
    v_dlq_message_id::text, greatest(coalesce(p_receive_count,0),0),
    left(coalesce(p_reason_code,'unknown'),120),
    coalesce(p_reason_details,'{}'::jsonb), coalesce(p_message_snapshot,'{}'::jsonb), 'open'
  ) on conflict (job_id) where job_id is not null and status='open'
  do update set
    provider_source_message_id=excluded.provider_source_message_id,
    provider_dead_letter_message_id=excluded.provider_dead_letter_message_id,
    receive_count=excluded.receive_count,
    reason_code=excluded.reason_code,
    reason_details=excluded.reason_details,
    message_snapshot=excluded.message_snapshot
  returning id into v_dead_letter_id;

  if p_job_id is not null then
    update eventing.queue_jobs
       set status='dead_lettered', dead_lettered_at=now(),
           last_error_code=left(coalesce(p_reason_code,'unknown'),120),
           last_error_details=coalesce(p_reason_details,'{}'::jsonb),
           attempt_count=greatest(attempt_count,coalesce(p_receive_count,0))
     where id=p_job_id;
  end if;

  return v_dead_letter_id;
end;
$$;

create or replace function eventing.receive_jobs(
  p_queue_code text,
  p_worker_id text,
  p_batch_size integer default null,
  p_visibility_timeout_seconds integer default null
) returns table(
  receipt_handle uuid,
  job_id uuid,
  job_type text,
  job_version integer,
  receive_count integer,
  visibility_deadline timestamptz,
  enqueued_at timestamptz,
  payload jsonb,
  message_headers jsonb
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_message pgmq.message_record;
  v_job eventing.queue_jobs%rowtype;
  v_receipt_id uuid;
  v_batch_size integer;
  v_visibility integer;
  v_job_id uuid;
  v_attempt_id uuid;
begin
  if p_worker_id is null or length(trim(p_worker_id)) not between 1 and 160 then raise exception 'invalid_worker_id' using errcode='22023'; end if;
  select * into v_definition from eventing.queue_definitions where code=p_queue_code and status='active' for share;
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;
  if v_definition.provider <> 'pgmq' then raise exception 'queue_provider_not_available_in_test_environment' using errcode='0A000'; end if;
  v_batch_size := least(greatest(coalesce(p_batch_size,v_definition.max_batch_size),1),v_definition.max_batch_size);
  v_visibility := least(greatest(coalesce(p_visibility_timeout_seconds,v_definition.visibility_timeout_seconds),1),43200);

  for v_message in
    select * from pgmq.read(v_definition.provider_queue_name,v_visibility,v_batch_size)
  loop
    begin
      v_job_id := nullif(v_message.message->>'jobId','')::uuid;
    exception when others then
      v_job_id := null;
    end;

    if v_job_id is null then
      perform eventing.dead_letter_provider_message(
        p_queue_code,null,v_message.msg_id::text,v_message.read_ct,
        'invalid_job_envelope','{"field":"jobId"}'::jsonb,v_message.message
      );
      continue;
    end if;

    select * into v_job from eventing.queue_jobs where id=v_job_id for update;
    if not found then
      perform eventing.dead_letter_provider_message(
        p_queue_code,null,v_message.msg_id::text,v_message.read_ct,
        'orphan_provider_message',jsonb_build_object('jobId',v_job_id),v_message.message
      );
      continue;
    end if;

    update eventing.queue_receipts r
       set status='expired', completed_at=now()
     where r.job_id=v_job.id and r.status='in_flight' and r.visibility_deadline<=now();
    update eventing.queue_attempts a
       set outcome='visibility_expired', finished_at=now(), error_code=coalesce(a.error_code,'visibility_timeout')
     where a.job_id=v_job.id and a.outcome='processing'
       and exists (select 1 from eventing.queue_receipts r where r.id=a.receipt_id and r.status='expired');

    if v_job.status='completed' then
      perform pgmq.archive(v_definition.provider_queue_name,v_message.msg_id);
      continue;
    end if;
    if v_job.status='dead_lettered' then
      perform pgmq.archive(v_definition.provider_queue_name,v_message.msg_id);
      continue;
    end if;

    if v_message.read_ct > v_job.max_attempts then
      perform eventing.dead_letter_provider_message(
        p_queue_code,v_job.id,v_message.msg_id::text,v_message.read_ct,
        'max_receive_count_exceeded',jsonb_build_object('maxReceiveCount',v_job.max_attempts),v_message.message
      );
      continue;
    end if;

    v_receipt_id := gen_random_uuid();
    insert into eventing.queue_receipts(
      id,job_id,queue_code,provider_message_id,worker_id,
      receive_count,received_at,visibility_deadline,status
    ) values (
      v_receipt_id,v_job.id,p_queue_code,v_message.msg_id::text,trim(p_worker_id),
      v_message.read_ct,now(),v_message.vt,'in_flight'
    );

    insert into eventing.queue_attempts(
      job_id,receipt_id,attempt_number,worker_id,started_at,
      visibility_deadline,outcome,details
    ) values (
      v_job.id,v_receipt_id,v_message.read_ct,trim(p_worker_id),now(),
      v_message.vt,'processing',jsonb_build_object('providerMessageId',v_message.msg_id)
    ) returning id into v_attempt_id;

    update eventing.queue_jobs
       set status='in_flight', attempt_count=greatest(attempt_count,v_message.read_ct),
           last_received_at=now(), last_error_code=null, last_error_details='{}'::jsonb
     where id=v_job.id;

    receipt_handle := v_receipt_id;
    job_id := v_job.id;
    job_type := v_job.job_type;
    job_version := v_job.job_version;
    receive_count := v_message.read_ct;
    visibility_deadline := v_message.vt;
    enqueued_at := v_message.enqueued_at;
    payload := v_job.payload;
    message_headers := coalesce(v_message.headers,'{}'::jsonb);
    return next;
  end loop;
end;
$$;

create or replace function eventing.extend_job_visibility(
  p_receipt_handle uuid,
  p_worker_id text,
  p_visibility_timeout_seconds integer
) returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_receipt eventing.queue_receipts%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_message pgmq.message_record;
begin
  if p_visibility_timeout_seconds < 0 or p_visibility_timeout_seconds > 43200 then raise exception 'invalid_visibility_timeout' using errcode='22023'; end if;
  select * into v_receipt from eventing.queue_receipts where id=p_receipt_handle for update;
  if not found or v_receipt.worker_id<>trim(p_worker_id) or v_receipt.status<>'in_flight' then raise exception 'receipt_not_owned_or_inactive' using errcode='55000'; end if;
  select * into v_definition from eventing.queue_definitions where code=v_receipt.queue_code;
  select * into v_message from pgmq.set_vt(v_definition.provider_queue_name,v_receipt.provider_message_id::bigint,p_visibility_timeout_seconds) limit 1;
  if v_message.msg_id is null then raise exception 'provider_message_not_found' using errcode='P0002'; end if;
  update eventing.queue_receipts set visibility_deadline=v_message.vt where id=v_receipt.id;
  update eventing.queue_attempts set visibility_deadline=v_message.vt where receipt_id=v_receipt.id and outcome='processing';
  return v_message.vt;
end;
$$;

create or replace function eventing.ack_job(
  p_receipt_handle uuid,
  p_worker_id text,
  p_result_details jsonb default '{}'::jsonb
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_receipt eventing.queue_receipts%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_archived boolean;
begin
  select * into v_receipt from eventing.queue_receipts where id=p_receipt_handle for update;
  if not found then return false; end if;
  if v_receipt.worker_id<>trim(p_worker_id) then return false; end if;
  if v_receipt.status='acked' then return true; end if;
  if v_receipt.status<>'in_flight' then return false; end if;
  select * into v_definition from eventing.queue_definitions where code=v_receipt.queue_code;
  select pgmq.archive(v_definition.provider_queue_name,v_receipt.provider_message_id::bigint) into v_archived;
  if not coalesce(v_archived,false) then
    if exists(select 1 from eventing.queue_jobs where id=v_receipt.job_id and status='completed') then return true; end if;
    raise exception 'provider_ack_failed' using errcode='58000';
  end if;
  update eventing.queue_receipts set status='acked',completed_at=now() where id=v_receipt.id;
  update eventing.queue_attempts set outcome='succeeded',finished_at=now(),details=details||coalesce(p_result_details,'{}'::jsonb) where receipt_id=v_receipt.id and outcome='processing';
  update eventing.queue_jobs set status='completed',completed_at=now(),last_error_code=null,last_error_details='{}'::jsonb where id=v_receipt.job_id;
  return true;
end;
$$;

create or replace function eventing.dead_letter_job(
  p_receipt_handle uuid,
  p_worker_id text,
  p_reason_code text,
  p_reason_details jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_receipt eventing.queue_receipts%rowtype;
  v_job eventing.queue_jobs%rowtype;
  v_dead_letter_id uuid;
begin
  select * into v_receipt from eventing.queue_receipts where id=p_receipt_handle for update;
  if not found or v_receipt.worker_id<>trim(p_worker_id) or v_receipt.status<>'in_flight' then raise exception 'receipt_not_owned_or_inactive' using errcode='55000'; end if;
  select * into v_job from eventing.queue_jobs where id=v_receipt.job_id for update;
  v_dead_letter_id := eventing.dead_letter_provider_message(
    v_receipt.queue_code,v_job.id,v_receipt.provider_message_id,v_receipt.receive_count,
    p_reason_code,p_reason_details,eventing.queue_job_envelope(v_job.id)
  );
  update eventing.queue_receipts set status='dead_lettered',completed_at=now() where id=v_receipt.id;
  update eventing.queue_attempts set outcome='dead_lettered',finished_at=now(),error_code=left(coalesce(p_reason_code,'unknown'),120),details=details||coalesce(p_reason_details,'{}'::jsonb) where receipt_id=v_receipt.id and outcome='processing';
  return v_dead_letter_id;
end;
$$;

create or replace function eventing.retry_job(
  p_receipt_handle uuid,
  p_worker_id text,
  p_error_code text,
  p_delay_seconds integer,
  p_error_details jsonb default '{}'::jsonb
) returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_receipt eventing.queue_receipts%rowtype;
  v_job eventing.queue_jobs%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_message pgmq.message_record;
begin
  if p_delay_seconds < 0 or p_delay_seconds > 43200 then raise exception 'invalid_retry_delay' using errcode='22023'; end if;
  select * into v_receipt from eventing.queue_receipts where id=p_receipt_handle for update;
  if not found or v_receipt.worker_id<>trim(p_worker_id) or v_receipt.status<>'in_flight' then raise exception 'receipt_not_owned_or_inactive' using errcode='55000'; end if;
  select * into v_job from eventing.queue_jobs where id=v_receipt.job_id for update;
  if v_receipt.receive_count >= v_job.max_attempts then
    perform eventing.dead_letter_job(p_receipt_handle,p_worker_id,'max_receive_count_exceeded',coalesce(p_error_details,'{}'::jsonb)||jsonb_build_object('lastErrorCode',p_error_code));
    return 'dead_lettered';
  end if;
  select * into v_definition from eventing.queue_definitions where code=v_receipt.queue_code;
  select * into v_message from pgmq.set_vt(v_definition.provider_queue_name,v_receipt.provider_message_id::bigint,p_delay_seconds) limit 1;
  if v_message.msg_id is null then raise exception 'provider_retry_failed' using errcode='58000'; end if;
  update eventing.queue_receipts set status='released',completed_at=now(),visibility_deadline=v_message.vt where id=v_receipt.id;
  update eventing.queue_attempts set outcome='retry_scheduled',finished_at=now(),error_code=left(coalesce(p_error_code,'unknown'),120),details=details||coalesce(p_error_details,'{}'::jsonb) where receipt_id=v_receipt.id and outcome='processing';
  update eventing.queue_jobs set status='retry_scheduled',available_at=v_message.vt,last_error_code=left(coalesce(p_error_code,'unknown'),120),last_error_details=coalesce(p_error_details,'{}'::jsonb) where id=v_job.id;
  return 'retry_scheduled';
end;
$$;

create or replace function eventing.redrive_dead_letter(
  p_dead_letter_id uuid,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_dead eventing.queue_dead_letters%rowtype;
  v_job eventing.queue_jobs%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_new_message_id bigint;
  v_archived boolean;
begin
  select * into v_dead from eventing.queue_dead_letters where id=p_dead_letter_id for update;
  if not found then raise exception 'dead_letter_not_found' using errcode='P0002'; end if;
  if v_dead.status<>'open' then raise exception 'dead_letter_not_open' using errcode='55000'; end if;
  if v_dead.job_id is null then raise exception 'orphan_dead_letter_not_redrivable' using errcode='55000'; end if;
  select * into v_job from eventing.queue_jobs where id=v_dead.job_id for update;
  select * into v_definition from eventing.queue_definitions where code=v_dead.source_queue_code;
  select send into v_new_message_id from pgmq.send(v_definition.provider_queue_name,eventing.queue_job_envelope(v_job.id)) limit 1;
  if v_new_message_id is null then raise exception 'redrive_publish_failed' using errcode='58000'; end if;
  if v_dead.provider_dead_letter_message_id ~ '^[0-9]+$' then
    select pgmq.archive(v_definition.provider_dead_letter_queue_name,v_dead.provider_dead_letter_message_id::bigint) into v_archived;
  end if;
  update eventing.queue_jobs set status='queued',provider_message_id=v_new_message_id::text,attempt_count=0,available_at=now(),enqueued_at=now(),dead_lettered_at=null,last_error_code=null,last_error_details='{}'::jsonb where id=v_job.id;
  update eventing.queue_dead_letters set status='redriven',redriven_at=now(),resolution=left(coalesce(p_reason,'manual_redrive'),500) where id=v_dead.id;
  return v_job.id;
end;
$$;

create or replace function eventing.queue_metrics(p_queue_code text)
returns table(
  queue_code text,
  provider text,
  provider_queue_name text,
  visible_or_in_flight_messages bigint,
  total_messages bigint,
  oldest_message_age_seconds integer,
  open_dead_letters bigint,
  in_flight_receipts bigint,
  captured_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_metrics pgmq.metrics_result;
begin
  select * into v_definition from eventing.queue_definitions where code=p_queue_code;
  if not found then raise exception 'queue_definition_not_found' using errcode='P0002'; end if;
  select * into v_metrics from pgmq.metrics(v_definition.provider_queue_name);
  return query select
    v_definition.code,v_definition.provider,v_definition.provider_queue_name,
    v_metrics.queue_length,v_metrics.total_messages,v_metrics.oldest_msg_age_sec,
    (select count(*) from eventing.queue_dead_letters d where d.source_queue_code=v_definition.code and d.status='open'),
    (select count(*) from eventing.queue_receipts r where r.queue_code=v_definition.code and r.status='in_flight' and r.visibility_deadline>now()),
    now();
end;
$$;

-- -------------------------------------------------------------------------
-- File confirmation now enqueues a scan job in the same database transaction.
-- -------------------------------------------------------------------------
create or replace function public.file_confirm_upload(
  p_provider text,
  p_issuer text,
  p_subject text,
  p_email_normalized text,
  p_email_verified boolean,
  p_claims_fingerprint text,
  p_intent_id uuid,
  p_actual_content_type text,
  p_actual_size_bytes bigint,
  p_sha256 text,
  p_provider_object_version text,
  p_etag text,
  p_metadata jsonb default '{}'::jsonb
) returns table(
  file_object_id uuid,
  security_status text,
  bucket text,
  object_key text,
  sha256 text,
  size_bytes bigint
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_account_id uuid;
  v_intent core.file_upload_intents%rowtype;
  v_profile core.file_upload_profiles%rowtype;
  v_file_id uuid := gen_random_uuid();
  v_job_id uuid;
  v_security_status text;
begin
  if p_actual_size_bytes < 0 then raise exception 'invalid_file_size' using errcode='22023'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'invalid_sha256' using errcode='22023'; end if;

  v_account_id := iam.resolve_external_identity(
    p_provider, p_issuer, p_subject, p_email_normalized,
    p_email_verified, p_claims_fingerprint
  );

  select * into v_intent from core.file_upload_intents where id=p_intent_id for update;
  if not found then raise exception 'upload_intent_not_found' using errcode='P0002'; end if;
  select * into v_profile from core.file_upload_profiles where code=v_intent.upload_profile_code;
  if not found then raise exception 'upload_profile_not_found' using errcode='P0002'; end if;

  perform app_private.set_request_context(v_account_id, v_intent.owner_organization_id, 'file-upload-confirm', 'user');
  if v_intent.requested_by_user_account_id <> v_account_id
     and not app_private.has_permission('file.manage', v_intent.owner_organization_id, 'file_upload_intent', v_intent.id) then
    raise exception 'file_upload_not_authorized' using errcode='28000';
  end if;
  if v_intent.status <> 'pending_upload' then raise exception 'upload_intent_not_pending' using errcode='55000'; end if;
  if v_intent.expires_at <= now() then
    update core.file_upload_intents set status='expired', failure_code='intent_expired' where id=v_intent.id;
    raise exception 'upload_intent_expired' using errcode='55000';
  end if;
  if lower(trim(p_actual_content_type)) <> v_intent.expected_content_type then
    update core.file_upload_intents set status='rejected', failure_code='content_type_mismatch' where id=v_intent.id;
    raise exception 'content_type_mismatch' using errcode='22023';
  end if;
  if p_actual_size_bytes > v_intent.max_size_bytes then
    update core.file_upload_intents set status='rejected', failure_code='file_too_large' where id=v_intent.id;
    raise exception 'file_too_large' using errcode='22023';
  end if;

  v_security_status := case when v_profile.requires_malware_scan then 'scan_pending' else 'release_pending' end;

  insert into core.file_objects(
    id, owner_organization_id, storage_provider, bucket, object_key,
    content_type, size_bytes, sha256, security_status, retention_class,
    upload_intent_id, created_by_user_account_id, original_filename,
    provider_object_version, etag, verified_at, quarantined_at, metadata
  ) values (
    v_file_id, v_intent.owner_organization_id, v_intent.storage_provider,
    v_intent.bucket, v_intent.object_key, lower(trim(p_actual_content_type)),
    p_actual_size_bytes, p_sha256, v_security_status, v_intent.retention_class,
    v_intent.id, v_account_id, v_intent.original_filename,
    p_provider_object_version, p_etag, now(), now(), coalesce(p_metadata,'{}'::jsonb)
  );

  if v_profile.requires_malware_scan then
    v_job_id := eventing.enqueue_job(
      'file_scan',
      'file.malware_scan.requested',
      1,
      'file_scan:' || v_file_id::text || ':' || p_sha256,
      null,
      v_intent.owner_organization_id,
      'file_object',
      v_file_id,
      jsonb_build_object(
        'fileObjectId',v_file_id,
        'uploadProfileCode',v_intent.upload_profile_code,
        'storageProvider',v_intent.storage_provider,
        'bucket',v_intent.bucket,
        'objectKey',v_intent.object_key,
        'contentType',lower(trim(p_actual_content_type)),
        'sizeBytes',p_actual_size_bytes,
        'sha256',p_sha256,
        'retentionClass',v_intent.retention_class
      ),
      0
    );
    update core.file_objects set scan_job_id=v_job_id where id=v_file_id;
  end if;

  update core.file_upload_intents
     set status='confirmed', uploaded_at=now(), confirmed_at=now(), file_object_id=v_file_id
   where id=v_intent.id;

  return query
  select f.id, f.security_status, f.bucket, f.object_key, f.sha256, f.size_bytes
  from core.file_objects f where f.id=v_file_id;
end;
$$;

create or replace function public.file_apply_scan_result(
  p_queue_job_id uuid,
  p_file_object_id uuid,
  p_scanner_provider text,
  p_scanner_version text,
  p_scan_status text,
  p_threats jsonb,
  p_status_reasons jsonb,
  p_provider_reference text,
  p_started_at timestamptz,
  p_completed_at timestamptz
) returns table(
  file_object_id uuid,
  source_bucket text,
  source_object_key text,
  target_object_key text,
  next_security_status text,
  already_applied boolean
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_file core.file_objects%rowtype;
  v_job eventing.queue_jobs%rowtype;
  v_next text;
  v_target text;
  v_existing boolean;
begin
  if p_scan_status not in ('clean','infected','unsupported','access_denied','failed','manual_review') then raise exception 'invalid_scan_status' using errcode='22023'; end if;
  select * into v_job from eventing.queue_jobs where id=p_queue_job_id;
  if not found or v_job.job_type<>'file.malware_scan.requested' or v_job.subject_id is distinct from p_file_object_id then raise exception 'scan_job_file_mismatch' using errcode='22023'; end if;
  select * into v_file from core.file_objects where id=p_file_object_id for update;
  if not found then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  if v_file.scan_job_id is distinct from p_queue_job_id then raise exception 'file_scan_job_mismatch' using errcode='22023'; end if;

  select exists(select 1 from core.file_security_scans where queue_job_id=p_queue_job_id) into v_existing;
  if v_existing then
    v_target := case when v_file.security_status in ('release_pending','clean') then regexp_replace(v_file.object_key,'^quarantine/','protected/') else null end;
    return query select v_file.id,v_file.bucket,v_file.object_key,v_target,v_file.security_status,true;
    return;
  end if;

  if v_file.security_status not in ('quarantined','scan_pending','manual_review') then raise exception 'file_not_scannable' using errcode='55000'; end if;

  insert into core.file_security_scans(
    file_object_id,queue_job_id,scanner_provider,scanner_version,scan_status,
    threats,status_reasons,provider_reference,started_at,completed_at
  ) values (
    p_file_object_id,p_queue_job_id,trim(p_scanner_provider),nullif(trim(p_scanner_version),''),p_scan_status,
    coalesce(p_threats,'[]'::jsonb),coalesce(p_status_reasons,'[]'::jsonb),nullif(trim(p_provider_reference),''),p_started_at,coalesce(p_completed_at,now())
  );

  v_next := case p_scan_status when 'clean' then 'release_pending' when 'infected' then 'infected' else 'manual_review' end;
  if p_scan_status='clean' then
    v_target:=regexp_replace(v_file.object_key,'^quarantine/','protected/');
    if v_target=v_file.object_key then raise exception 'file_not_in_quarantine_prefix' using errcode='55000'; end if;
  end if;
  update core.file_objects set security_status=v_next,scan_completed_at=coalesce(p_completed_at,now()) where id=p_file_object_id;
  return query select v_file.id,v_file.bucket,v_file.object_key,v_target,v_next,false;
end;
$$;

-- The pre-queue scan RPC is no longer available to service_role.
revoke execute on function public.file_record_scan_result(uuid,text,text,text,jsonb,jsonb,text,timestamptz,timestamptz) from service_role;

-- -------------------------------------------------------------------------
-- Service-only RPC wrappers for Edge Function workers.
-- -------------------------------------------------------------------------
create or replace function public.queue_enqueue_job(
  p_queue_code text,
  p_job_type text,
  p_job_version integer,
  p_deduplication_key text,
  p_source_event_id uuid,
  p_organization_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_payload jsonb,
  p_delay_seconds integer default 0
) returns uuid
language sql security definer set search_path=pg_catalog as $$
  select eventing.enqueue_job(
    p_queue_code,p_job_type,p_job_version,p_deduplication_key,
    p_source_event_id,p_organization_id,p_subject_type,p_subject_id,p_payload,p_delay_seconds
  );
$$;

create or replace function public.queue_receive_jobs(p_queue_code text,p_worker_id text,p_batch_size integer default null,p_visibility_timeout_seconds integer default null)
returns table(receipt_handle uuid,job_id uuid,job_type text,job_version integer,receive_count integer,visibility_deadline timestamptz,enqueued_at timestamptz,payload jsonb,message_headers jsonb)
language sql security definer set search_path=pg_catalog as $$
  select * from eventing.receive_jobs(p_queue_code,p_worker_id,p_batch_size,p_visibility_timeout_seconds);
$$;

create or replace function public.queue_extend_visibility(p_receipt_handle uuid,p_worker_id text,p_visibility_timeout_seconds integer)
returns timestamptz language sql security definer set search_path=pg_catalog as $$
  select eventing.extend_job_visibility(p_receipt_handle,p_worker_id,p_visibility_timeout_seconds);
$$;

create or replace function public.queue_ack_job(p_receipt_handle uuid,p_worker_id text,p_result_details jsonb default '{}'::jsonb)
returns boolean language sql security definer set search_path=pg_catalog as $$
  select eventing.ack_job(p_receipt_handle,p_worker_id,p_result_details);
$$;

create or replace function public.queue_retry_job(p_receipt_handle uuid,p_worker_id text,p_error_code text,p_delay_seconds integer,p_error_details jsonb default '{}'::jsonb)
returns text language sql security definer set search_path=pg_catalog as $$
  select eventing.retry_job(p_receipt_handle,p_worker_id,p_error_code,p_delay_seconds,p_error_details);
$$;

create or replace function public.queue_dead_letter_job(p_receipt_handle uuid,p_worker_id text,p_reason_code text,p_reason_details jsonb default '{}'::jsonb)
returns uuid language sql security definer set search_path=pg_catalog as $$
  select eventing.dead_letter_job(p_receipt_handle,p_worker_id,p_reason_code,p_reason_details);
$$;

create or replace function public.queue_redrive_dead_letter(p_dead_letter_id uuid,p_reason text)
returns uuid language sql security definer set search_path=pg_catalog as $$
  select eventing.redrive_dead_letter(p_dead_letter_id,p_reason);
$$;

create or replace function public.queue_get_metrics(p_queue_code text)
returns table(queue_code text,provider text,provider_queue_name text,visible_or_in_flight_messages bigint,total_messages bigint,oldest_message_age_seconds integer,open_dead_letters bigint,in_flight_receipts bigint,captured_at timestamptz)
language sql security definer set search_path=pg_catalog as $$
  select * from eventing.queue_metrics(p_queue_code);
$$;

-- -------------------------------------------------------------------------
-- RLS and privileges. Queue internals are server-side only.
-- -------------------------------------------------------------------------
alter table eventing.queue_definitions enable row level security;
alter table eventing.queue_jobs enable row level security;
alter table eventing.queue_receipts enable row level security;
alter table eventing.queue_attempts enable row level security;
alter table eventing.queue_dead_letters enable row level security;

create policy queue_definitions_worker_select on eventing.queue_definitions for select to app_worker using (app_private.is_trusted_worker());
create policy queue_definitions_worker_insert on eventing.queue_definitions for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_definitions_worker_update on eventing.queue_definitions for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_definitions_worker_delete on eventing.queue_definitions for delete to app_worker using (app_private.is_trusted_worker());
create policy queue_jobs_worker_select on eventing.queue_jobs for select to app_worker using (app_private.is_trusted_worker());
create policy queue_jobs_worker_insert on eventing.queue_jobs for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_jobs_worker_update on eventing.queue_jobs for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_jobs_worker_delete on eventing.queue_jobs for delete to app_worker using (app_private.is_trusted_worker());
create policy queue_receipts_worker_select on eventing.queue_receipts for select to app_worker using (app_private.is_trusted_worker());
create policy queue_receipts_worker_insert on eventing.queue_receipts for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_receipts_worker_update on eventing.queue_receipts for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_receipts_worker_delete on eventing.queue_receipts for delete to app_worker using (app_private.is_trusted_worker());
create policy queue_attempts_worker_select on eventing.queue_attempts for select to app_worker using (app_private.is_trusted_worker());
create policy queue_attempts_worker_insert on eventing.queue_attempts for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_attempts_worker_update on eventing.queue_attempts for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_dead_letters_worker_select on eventing.queue_dead_letters for select to app_worker using (app_private.is_trusted_worker());
create policy queue_dead_letters_worker_insert on eventing.queue_dead_letters for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_dead_letters_worker_update on eventing.queue_dead_letters for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_dead_letters_worker_delete on eventing.queue_dead_letters for delete to app_worker using (app_private.is_trusted_worker());

revoke all on all tables in schema pgmq from public,anon,authenticated;
revoke all on all functions in schema pgmq from public,anon,authenticated;
revoke all on eventing.queue_definitions,eventing.queue_jobs,eventing.queue_receipts,eventing.queue_attempts,eventing.queue_dead_letters from public,anon,authenticated;

grant usage on schema pgmq to app_worker;
grant select,insert,update,delete on all tables in schema pgmq to app_worker;
grant execute on all functions in schema pgmq to app_worker;
grant select,insert,update,delete on eventing.queue_definitions,eventing.queue_jobs,eventing.queue_receipts,eventing.queue_attempts,eventing.queue_dead_letters to app_worker;
grant execute on function eventing.queue_job_envelope(uuid) to app_worker;
grant execute on function eventing.enqueue_job(text,text,integer,text,uuid,uuid,text,uuid,jsonb,integer) to app_worker;
grant execute on function eventing.dead_letter_provider_message(text,uuid,text,integer,text,jsonb,jsonb) to app_worker;
grant execute on function eventing.receive_jobs(text,text,integer,integer) to app_worker;
grant execute on function eventing.extend_job_visibility(uuid,text,integer) to app_worker;
grant execute on function eventing.ack_job(uuid,text,jsonb) to app_worker;
grant execute on function eventing.retry_job(uuid,text,text,integer,jsonb) to app_worker;
grant execute on function eventing.dead_letter_job(uuid,text,text,jsonb) to app_worker;
grant execute on function eventing.redrive_dead_letter(uuid,text) to app_worker;
grant execute on function eventing.queue_metrics(text) to app_worker;

revoke all on function public.queue_enqueue_job(text,text,integer,text,uuid,uuid,text,uuid,jsonb,integer) from public,anon,authenticated;
revoke all on function public.file_apply_scan_result(uuid,uuid,text,text,text,jsonb,jsonb,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.queue_receive_jobs(text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.queue_extend_visibility(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.queue_ack_job(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.queue_retry_job(uuid,text,text,integer,jsonb) from public,anon,authenticated;
revoke all on function public.queue_dead_letter_job(uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.queue_redrive_dead_letter(uuid,text) from public,anon,authenticated;
revoke all on function public.queue_get_metrics(text) from public,anon,authenticated;

grant execute on function public.queue_enqueue_job(text,text,integer,text,uuid,uuid,text,uuid,jsonb,integer) to service_role;
grant execute on function public.file_apply_scan_result(uuid,uuid,text,text,text,jsonb,jsonb,text,timestamptz,timestamptz) to service_role;
grant execute on function public.queue_receive_jobs(text,text,integer,integer) to service_role;
grant execute on function public.queue_extend_visibility(uuid,text,integer) to service_role;
grant execute on function public.queue_ack_job(uuid,text,jsonb) to service_role;
grant execute on function public.queue_retry_job(uuid,text,text,integer,jsonb) to service_role;
grant execute on function public.queue_dead_letter_job(uuid,text,text,jsonb) to service_role;
grant execute on function public.queue_redrive_dead_letter(uuid,text) to service_role;
grant execute on function public.queue_get_metrics(text) to service_role;
