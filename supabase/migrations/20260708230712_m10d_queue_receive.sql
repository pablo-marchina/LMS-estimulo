-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708230712
-- Remote name: m10d_queue_receive
-- Remote SQL SHA-256: ade1a65c27b61bf803096dc5806be9ed704b79ad8f91ed9677cbd86157aaa97d
-- Do not edit after reconciliation; corrections require a new migration.

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
