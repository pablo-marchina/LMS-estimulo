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

