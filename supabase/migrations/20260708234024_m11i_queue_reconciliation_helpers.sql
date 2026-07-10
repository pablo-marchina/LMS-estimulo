-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708234024
-- Remote name: m11i_queue_reconciliation_helpers
-- Remote SQL SHA-256: 94cc24e56d31603e72e299114a085079a31e98a92a7518c12d2ee1cd4082a327
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function eventing.provider_message_exists(
  p_queue_name text,
  p_provider_message_id text
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_exists boolean := false;
begin
  if p_queue_name is null or p_queue_name !~ '^[a-z0-9_]+$' then
    raise exception 'invalid_provider_queue_name' using errcode='22023';
  end if;
  if p_provider_message_id is null or p_provider_message_id !~ '^[0-9]+$' then
    return false;
  end if;
  execute format('select exists(select 1 from pgmq.%I where msg_id=$1)','q_'||p_queue_name)
    into v_exists using p_provider_message_id::bigint;
  return coalesce(v_exists,false);
end;
$$;

create or replace function eventing.republish_job(p_job_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_job eventing.queue_jobs%rowtype;
  v_definition eventing.queue_definitions%rowtype;
  v_message_id bigint;
begin
  select * into v_job from eventing.queue_jobs where id=p_job_id for update;
  if not found then raise exception 'queue_job_not_found' using errcode='P0002'; end if;
  if v_job.status in ('completed','dead_lettered','cancelled') then
    raise exception 'queue_job_not_republishable' using errcode='55000';
  end if;
  if exists(select 1 from eventing.queue_receipts where job_id=v_job.id and status='in_flight' and visibility_deadline>now()) then
    raise exception 'queue_job_has_active_receipt' using errcode='55000';
  end if;

  select * into v_definition from eventing.queue_definitions where code=v_job.queue_code and status='active';
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;
  if v_definition.provider<>'pgmq' then raise exception 'queue_provider_not_supported' using errcode='0A000'; end if;

  select send into v_message_id
  from pgmq.send(
    v_definition.provider_queue_name,
    eventing.queue_job_envelope(v_job.id),
    jsonb_build_object(
      'job_id',v_job.id,
      'job_type',v_job.job_type,
      'deduplication_key',v_job.deduplication_key,
      'payload_hash',v_job.payload_hash,
      'reconciled',true
    ),
    0
  ) limit 1;
  if v_message_id is null then raise exception 'queue_republish_failed' using errcode='58000'; end if;

  update eventing.queue_jobs
  set status='queued',provider_message_id=v_message_id::text,available_at=now(),enqueued_at=coalesce(enqueued_at,now())
  where id=v_job.id;
  return v_message_id::text;
end;
$$;

grant execute on function eventing.provider_message_exists(text,text) to app_worker;
grant execute on function eventing.republish_job(uuid) to app_worker;
