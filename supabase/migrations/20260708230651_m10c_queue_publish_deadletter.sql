-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708230651
-- Remote name: m10c_queue_publish_deadletter
-- Remote SQL SHA-256: a66415c99a4066518459941b7f32ca53091416d946ece09a5aeef870d1000b9f
-- Do not edit after reconciliation; corrections require a new migration.

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
