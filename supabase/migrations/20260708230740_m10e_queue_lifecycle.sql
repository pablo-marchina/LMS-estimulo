-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708230740
-- Remote name: m10e_queue_lifecycle
-- Remote SQL SHA-256: 5fc6f06cedde66ce423d2a8e98f3ab381a2a430fe54333b9d86f4a82f6cc8d02
-- Do not edit after reconciliation; corrections require a new migration.

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
