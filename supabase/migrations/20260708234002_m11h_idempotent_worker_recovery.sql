-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708234002
-- Remote name: m11h_idempotent_worker_recovery
-- Remote SQL SHA-256: 93662e9018fff757e89af171c778029c21882e99efaf40f7c7913bb242ee5fad
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.file_get_scan_job_state(
  p_queue_job_id uuid,
  p_file_object_id uuid
) returns table(
  file_object_id uuid,
  queue_job_id uuid,
  security_status text,
  scan_applied boolean,
  scan_status text,
  source_bucket text,
  source_object_key text,
  target_object_key text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_file core.file_objects%rowtype;
  v_scan core.file_security_scans%rowtype;
begin
  select * into v_file from core.file_objects where id=p_file_object_id;
  if not found then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  if v_file.scan_job_id is distinct from p_queue_job_id then
    raise exception 'file_scan_job_mismatch' using errcode='22023';
  end if;

  select * into v_scan
  from core.file_security_scans
  where queue_job_id=p_queue_job_id
  order by completed_at desc
  limit 1;

  return query select
    v_file.id,
    p_queue_job_id,
    v_file.security_status,
    found,
    case when found then v_scan.scan_status else null end,
    v_file.bucket,
    v_file.object_key,
    case
      when v_file.object_key like 'quarantine/%' then regexp_replace(v_file.object_key,'^quarantine/','protected/')
      when v_file.object_key like 'protected/%' then v_file.object_key
      else null
    end;
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
  v_outcome text;
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

  v_outcome := case
    when lower(coalesce(p_result_details->>'duplicateSuppressed','false'))='true' then 'duplicate_suppressed'
    else 'succeeded'
  end;

  update eventing.queue_receipts set status='acked',completed_at=now() where id=v_receipt.id;
  update eventing.queue_attempts
  set outcome=v_outcome,finished_at=now(),details=details||coalesce(p_result_details,'{}'::jsonb)
  where receipt_id=v_receipt.id and outcome='processing';
  update eventing.queue_jobs
  set status='completed',completed_at=now(),last_error_code=null,last_error_details='{}'::jsonb
  where id=v_receipt.job_id;
  return true;
end;
$$;

revoke all on function public.file_get_scan_job_state(uuid,uuid) from public,anon,authenticated;
grant execute on function public.file_get_scan_job_state(uuid,uuid) to service_role;
