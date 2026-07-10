-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708234100
-- Remote name: m11k_queue_reconciliation
-- Remote SQL SHA-256: 3078c4db66af24831cc99ff8e4bc0c83d6b8832e38770ad8b1d205897f1884a8
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function eventing.reconcile_queue_system(p_queue_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_run_id uuid;
  v_expired_receipts integer := 0;
  v_expired_attempts integer := 0;
  v_released_jobs integer := 0;
  v_republished integer := 0;
  v_archived_terminal integer := 0;
  v_orphans integer := 0;
  v_scan_jobs_created integer := 0;
  v_job record;
  v_provider record;
  v_file record;
  v_provider_job_id uuid;
  v_new_job_id uuid;
  v_archived boolean;
  v_uuid_pattern constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
begin
  if not pg_try_advisory_xact_lock(hashtextextended('queue-reconcile:'||p_queue_code,0)) then
    return jsonb_build_object('status','skipped','reason','reconciler_locked');
  end if;

  select * into v_definition from eventing.queue_definitions where code=p_queue_code and status='active';
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;
  if v_definition.provider<>'pgmq' then raise exception 'reconciler_provider_not_supported' using errcode='0A000'; end if;

  insert into eventing.scheduler_runs(scheduler_name,queue_code,run_kind,status)
  values('queue-reconcile:'||p_queue_code,p_queue_code,'reconcile','running')
  returning id into v_run_id;

  update eventing.queue_receipts
  set status='expired',completed_at=now()
  where queue_code=p_queue_code and status='in_flight' and visibility_deadline<=now();
  get diagnostics v_expired_receipts = row_count;

  update eventing.queue_attempts a
  set outcome='visibility_expired',finished_at=now(),error_code=coalesce(error_code,'visibility_timeout')
  where a.outcome='processing'
    and exists(select 1 from eventing.queue_receipts r where r.id=a.receipt_id and r.queue_code=p_queue_code and r.status='expired');
  get diagnostics v_expired_attempts = row_count;

  update eventing.queue_jobs j
  set status='retry_scheduled',available_at=now(),last_error_code=coalesce(last_error_code,'visibility_timeout')
  where j.queue_code=p_queue_code and j.status='in_flight'
    and not exists(select 1 from eventing.queue_receipts r where r.job_id=j.id and r.status='in_flight' and r.visibility_deadline>now());
  get diagnostics v_released_jobs = row_count;

  for v_job in
    select j.id,j.provider_message_id,j.status
    from eventing.queue_jobs j
    where j.queue_code=p_queue_code
      and j.status in ('created','queued','retry_scheduled','in_flight')
      and not exists(select 1 from eventing.queue_receipts r where r.job_id=j.id and r.status='in_flight' and r.visibility_deadline>now())
    order by j.created_at
    limit 100
  loop
    if not eventing.provider_message_exists(v_definition.provider_queue_name,v_job.provider_message_id) then
      perform eventing.republish_job(v_job.id);
      v_republished := v_republished+1;
    end if;
  end loop;

  for v_job in
    select j.id,j.provider_message_id
    from eventing.queue_jobs j
    where j.queue_code=p_queue_code and j.status in ('completed','dead_lettered','cancelled')
      and j.provider_message_id is not null
    order by j.updated_at
    limit 100
  loop
    if eventing.provider_message_exists(v_definition.provider_queue_name,v_job.provider_message_id) then
      select pgmq.archive(v_definition.provider_queue_name,v_job.provider_message_id::bigint) into v_archived;
      if coalesce(v_archived,false) then v_archived_terminal:=v_archived_terminal+1; end if;
    end if;
  end loop;

  for v_provider in execute format(
    'select msg_id,read_ct,message from pgmq.%I order by msg_id limit 100',
    'q_'||v_definition.provider_queue_name
  )
  loop
    v_provider_job_id := null;
    if coalesce(v_provider.message->>'jobId','') ~ v_uuid_pattern then
      v_provider_job_id := (v_provider.message->>'jobId')::uuid;
    end if;
    if v_provider_job_id is null or not exists(select 1 from eventing.queue_jobs where id=v_provider_job_id and queue_code=p_queue_code) then
      perform eventing.dead_letter_provider_message(
        p_queue_code,null,v_provider.msg_id::text,v_provider.read_ct,
        case when v_provider_job_id is null then 'invalid_job_envelope' else 'orphan_provider_message' end,
        jsonb_build_object('reconciled',true),v_provider.message
      );
      v_orphans:=v_orphans+1;
    end if;
  end loop;

  if p_queue_code='file_scan' then
    for v_file in
      select f.id,f.owner_organization_id,f.storage_provider,f.bucket,f.object_key,
             f.content_type,f.size_bytes,f.sha256,f.retention_class,
             coalesce(i.upload_profile_code,'unknown') as upload_profile_code
      from core.file_objects f
      left join core.file_upload_intents i on i.id=f.upload_intent_id
      where f.security_status='scan_pending' and f.scan_job_id is null and f.deleted_at is null
      order by f.created_at
      limit 100
      for update of f skip locked
    loop
      v_new_job_id := eventing.enqueue_job(
        'file_scan','file.malware_scan.requested',1,
        'file_scan:'||v_file.id::text||':'||v_file.sha256,
        null,v_file.owner_organization_id,'file_object',v_file.id,
        jsonb_build_object(
          'fileObjectId',v_file.id,'uploadProfileCode',v_file.upload_profile_code,
          'storageProvider',v_file.storage_provider,'bucket',v_file.bucket,
          'objectKey',v_file.object_key,'contentType',v_file.content_type,
          'sizeBytes',v_file.size_bytes,'sha256',v_file.sha256,
          'retentionClass',v_file.retention_class,'reconciled',true
        ),0
      );
      update core.file_objects set scan_job_id=v_new_job_id where id=v_file.id;
      v_scan_jobs_created:=v_scan_jobs_created+1;
    end loop;
  end if;

  update eventing.scheduler_runs
  set status='succeeded',completed_at=now(),details=jsonb_build_object(
    'expiredReceipts',v_expired_receipts,'expiredAttempts',v_expired_attempts,
    'releasedJobs',v_released_jobs,'republishedJobs',v_republished,
    'archivedTerminalMessages',v_archived_terminal,'orphanMessages',v_orphans,
    'scanJobsCreated',v_scan_jobs_created
  ) where id=v_run_id;

  return jsonb_build_object(
    'status','succeeded','expiredReceipts',v_expired_receipts,
    'republishedJobs',v_republished,'orphanMessages',v_orphans,
    'scanJobsCreated',v_scan_jobs_created
  );
exception when others then
  if v_run_id is not null then
    update eventing.scheduler_runs set status='failed',completed_at=now(),details=jsonb_build_object('sqlstate',sqlstate,'message',sqlerrm) where id=v_run_id;
  end if;
  raise;
end;
$$;

grant execute on function eventing.reconcile_queue_system(text) to app_worker;
