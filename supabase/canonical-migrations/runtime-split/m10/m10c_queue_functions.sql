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

