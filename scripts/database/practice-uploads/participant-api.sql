\set ON_ERROR_STOP on

create or replace function public.create_practice_upload_intent(
  p_actor_user_account_id uuid,
  p_step_instance_id uuid,
  p_original_filename text,
  p_expected_content_type text,
  p_storage_provider text,
  p_bucket text,
  p_allow_public_use boolean,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_filename text:=app_private.safe_object_filename(p_original_filename);
  v_content_type text:=lower(btrim(coalesce(p_expected_content_type,'')));
  v_request_hash text;
  v_existing assessment.submissions%rowtype;
  v_profile core.file_upload_profiles%rowtype;
  v_spec assessment.practice_specs%rowtype;
  v_journey_instance_id uuid;
  v_organization_id uuid;
  v_entrepreneur_id uuid;
  v_actor_entrepreneur_id uuid;
  v_activity_version_id uuid;
  v_submission_id uuid;
  v_intent_id uuid;
  v_submission_number integer;
  v_extension text;
  v_object_key text;
  v_created_at timestamptz:=clock_timestamp();
  v_event_id uuid;
  v_snapshot jsonb;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if p_storage_provider not in ('supabase_storage','s3') then
    raise exception 'PRACTICE_STORAGE_PROVIDER_UNSUPPORTED' using errcode='22023';
  end if;
  if nullif(btrim(p_bucket),'') is null then
    raise exception 'PRACTICE_STORAGE_BUCKET_REQUIRED' using errcode='22023';
  end if;

  select ji.id,app_private.journey_owner_organization_id(ji.id),en.entrepreneur_id,si.activity_version_id
  into v_journey_instance_id,v_organization_id,v_entrepreneur_id,v_activity_version_id
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
  join orchestration.enrollments en on en.id=ji.enrollment_id
  where si.id=p_step_instance_id;

  if v_journey_instance_id is null or v_organization_id is null then
    raise exception 'PRACTICE_STEP_NOT_FOUND' using errcode='P0002';
  end if;
  v_actor_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_actor_entrepreneur_id is null or v_actor_entrepreneur_id<>v_entrepreneur_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select * into v_spec from assessment.practice_specs where activity_version_id=v_activity_version_id;
  if not found then
    raise exception 'PRACTICE_UPLOAD_NOT_ENABLED' using errcode='55000';
  end if;
  select * into v_profile from core.file_upload_profiles where code='practice_evidence_v1' and status='active';
  if not found then
    raise exception 'PRACTICE_UPLOAD_PROFILE_NOT_FOUND' using errcode='P0002';
  end if;

  if not v_content_type=any(v_profile.allowed_mime_types) then
    raise exception 'PRACTICE_CONTENT_TYPE_NOT_ALLOWED' using errcode='22023';
  end if;
  v_extension:=lower(regexp_replace(v_filename,'^.*\.',''));
  if v_extension=v_filename or not v_extension=any(v_profile.allowed_extensions) then
    raise exception 'PRACTICE_FILE_EXTENSION_NOT_ALLOWED' using errcode='22023';
  end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'step_instance_id',p_step_instance_id,
    'filename',v_filename,
    'content_type',v_content_type,
    'storage_provider',p_storage_provider,
    'bucket',btrim(p_bucket),
    'allow_public_use',coalesce(p_allow_public_use,false)
  ));

  select * into v_existing from assessment.submissions
  where created_by_user_account_id=p_actor_user_account_id
    and creation_idempotency_key=p_idempotency_key;
  if found then
    if v_existing.creation_request_hash<>v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505';
    end if;
    return jsonb_build_object(
      'request_id',app_private.e14_command_event_id('create_practice_upload_intent',p_actor_user_account_id,p_step_instance_id,p_idempotency_key),
      'idempotency_key',p_idempotency_key,'replayed',true,'data',v_existing.creation_snapshot
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended('practice-submission:'||p_step_instance_id::text,0));
  select count(*)::integer+1 into v_submission_number
  from assessment.submissions
  where step_instance_id=p_step_instance_id and status<>'failed';
  if v_spec.max_submissions is not null and v_submission_number>v_spec.max_submissions then
    raise exception 'PRACTICE_SUBMISSION_LIMIT_REACHED' using errcode='22023';
  end if;

  v_submission_id:=app_private.e14_deterministic_uuid('practice-submission:'||p_actor_user_account_id::text||':'||p_idempotency_key);
  v_intent_id:=app_private.e14_deterministic_uuid('practice-upload-intent:'||p_actor_user_account_id::text||':'||p_idempotency_key);
  v_object_key:='quarantine/'||v_organization_id::text||'/'||p_actor_user_account_id::text||'/'||v_intent_id::text||'/'||v_filename;

  insert into core.file_upload_intents(
    id,owner_organization_id,requested_by_user_account_id,requested_by_entrepreneur_id,
    upload_profile_code,storage_provider,bucket,object_key,original_filename,
    expected_content_type,max_size_bytes,retention_class,status,expires_at
  ) values (
    v_intent_id,v_organization_id,p_actor_user_account_id,v_entrepreneur_id,
    v_profile.code,p_storage_provider,btrim(p_bucket),v_object_key,v_filename,
    v_content_type,v_profile.max_size_bytes,v_profile.retention_class,'pending_upload',now()+interval '30 minutes'
  );

  v_snapshot:=jsonb_build_object(
    'submission_id',v_submission_id,
    'upload_intent_id',v_intent_id,
    'journey_instance_id',v_journey_instance_id,
    'step_instance_id',p_step_instance_id,
    'activity_version_id',v_activity_version_id,
    'submission_number',v_submission_number,
    'status','upload_pending',
    'bucket',btrim(p_bucket),
    'object_key',v_object_key,
    'original_filename',v_filename,
    'expected_content_type',v_content_type,
    'max_size_bytes',v_profile.max_size_bytes,
    'expires_at',now()+interval '30 minutes',
    'allow_public_use',coalesce(p_allow_public_use,false),
    'terms_version',v_spec.terms_version
  );

  insert into assessment.submissions(
    id,step_instance_id,activity_version_id,entrepreneur_id,submission_number,status,
    submitted_at,aggregate_version,allow_public_use,created_by_user_account_id,
    upload_intent_id,creation_idempotency_key,creation_request_hash,creation_snapshot
  ) values (
    v_submission_id,p_step_instance_id,v_activity_version_id,v_entrepreneur_id,
    v_submission_number,'upload_pending',v_created_at,1,coalesce(p_allow_public_use,false),
    p_actor_user_account_id,v_intent_id,p_idempotency_key,v_request_hash,v_snapshot
  );

  v_event_id:=app_private.e14_command_event_id('create_practice_upload_intent',p_actor_user_account_id,p_step_instance_id,p_idempotency_key);
  perform app_private.e14_append_event(
    v_event_id,'learning.practice.upload.requested','user_account',p_actor_user_account_id,
    'user_account',p_actor_user_account_id,v_organization_id,v_journey_instance_id,
    'practice_submission',v_submission_id,1,v_event_id,null,
    jsonb_build_object(
      'submission_id',v_submission_id,'step_instance_id',p_step_instance_id,
      'upload_intent_id',v_intent_id,'allow_public_use',coalesce(p_allow_public_use,false)
    )
  );

  return jsonb_build_object('request_id',v_event_id,'idempotency_key',p_idempotency_key,'replayed',false,'data',v_snapshot);
end;
$$;

create or replace function public.confirm_practice_upload(
  p_actor_user_account_id uuid,
  p_submission_id uuid,
  p_upload_intent_id uuid,
  p_actual_content_type text,
  p_actual_size_bytes bigint,
  p_sha256 text,
  p_provider_object_version text,
  p_etag text,
  p_metadata jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_submission assessment.submissions%rowtype;
  v_intent core.file_upload_intents%rowtype;
  v_profile core.file_upload_profiles%rowtype;
  v_actor_entrepreneur_id uuid;
  v_organization_id uuid;
  v_journey_instance_id uuid;
  v_request_hash text;
  v_file_id uuid;
  v_job_id uuid;
  v_security_status text;
  v_event_id uuid;
  v_snapshot jsonb;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if p_actual_size_bytes<0 then raise exception 'PRACTICE_FILE_SIZE_INVALID' using errcode='22023'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'PRACTICE_SHA256_INVALID' using errcode='22023'; end if;

  select * into v_submission from assessment.submissions where id=p_submission_id for update;
  if not found then raise exception 'PRACTICE_SUBMISSION_NOT_FOUND' using errcode='P0002'; end if;
  v_actor_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_actor_entrepreneur_id is null or v_actor_entrepreneur_id<>v_submission.entrepreneur_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'submission_id',p_submission_id,'upload_intent_id',p_upload_intent_id,
    'content_type',lower(btrim(p_actual_content_type)),'size_bytes',p_actual_size_bytes,
    'sha256',p_sha256,'provider_object_version',p_provider_object_version,'etag',p_etag
  ));
  if v_submission.confirmation_idempotency_key is not null then
    if v_submission.confirmation_idempotency_key<>p_idempotency_key
       or v_submission.confirmation_request_hash<>v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505';
    end if;
    return jsonb_build_object(
      'request_id',app_private.e14_command_event_id('confirm_practice_upload',p_actor_user_account_id,p_submission_id,p_idempotency_key),
      'idempotency_key',p_idempotency_key,'replayed',true,'data',v_submission.confirmation_snapshot
    );
  end if;

  if v_submission.upload_intent_id is distinct from p_upload_intent_id or v_submission.status<>'upload_pending' then
    raise exception 'PRACTICE_UPLOAD_NOT_PENDING' using errcode='55000';
  end if;
  select * into v_intent from core.file_upload_intents where id=p_upload_intent_id for update;
  if not found then raise exception 'PRACTICE_UPLOAD_INTENT_NOT_FOUND' using errcode='P0002'; end if;
  select * into v_profile from core.file_upload_profiles where code=v_intent.upload_profile_code;
  if not found then raise exception 'PRACTICE_UPLOAD_PROFILE_NOT_FOUND' using errcode='P0002'; end if;
  if v_intent.status<>'pending_upload' or v_intent.expires_at<=now() then
    raise exception 'PRACTICE_UPLOAD_INTENT_EXPIRED' using errcode='55000';
  end if;
  if lower(btrim(p_actual_content_type))<>v_intent.expected_content_type then
    raise exception 'PRACTICE_CONTENT_TYPE_MISMATCH' using errcode='22023';
  end if;
  if p_actual_size_bytes>v_intent.max_size_bytes then
    raise exception 'PRACTICE_FILE_TOO_LARGE' using errcode='22023';
  end if;

  select app_private.journey_owner_organization_id(ji.id),ji.id
  into v_organization_id,v_journey_instance_id
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
  where si.id=v_submission.step_instance_id;

  v_file_id:=app_private.e14_deterministic_uuid('practice-file:'||p_submission_id::text);
  v_security_status:=case when v_profile.requires_malware_scan then 'scan_pending' else 'release_pending' end;
  insert into core.file_objects(
    id,owner_organization_id,storage_provider,bucket,object_key,content_type,size_bytes,sha256,
    security_status,retention_class,upload_intent_id,created_by_user_account_id,original_filename,
    provider_object_version,etag,verified_at,quarantined_at,metadata
  ) values (
    v_file_id,v_intent.owner_organization_id,v_intent.storage_provider,v_intent.bucket,v_intent.object_key,
    lower(btrim(p_actual_content_type)),p_actual_size_bytes,p_sha256,v_security_status,v_intent.retention_class,
    v_intent.id,p_actor_user_account_id,v_intent.original_filename,nullif(btrim(p_provider_object_version),''),
    nullif(btrim(p_etag),''),now(),now(),coalesce(p_metadata,'{}'::jsonb)
  );

  if v_profile.requires_malware_scan then
    v_job_id:=eventing.enqueue_job(
      'file_scan','file.malware_scan.requested',1,
      'file_scan:'||v_file_id::text||':'||p_sha256,null,v_intent.owner_organization_id,
      'file_object',v_file_id,
      jsonb_build_object(
        'fileObjectId',v_file_id,'uploadProfileCode',v_intent.upload_profile_code,
        'storageProvider',v_intent.storage_provider,'bucket',v_intent.bucket,
        'objectKey',v_intent.object_key,'contentType',lower(btrim(p_actual_content_type)),
        'sizeBytes',p_actual_size_bytes,'sha256',p_sha256,'retentionClass',v_intent.retention_class
      ),0
    );
    update core.file_objects set scan_job_id=v_job_id where id=v_file_id;
  end if;

  update core.file_upload_intents
  set status='confirmed',uploaded_at=now(),confirmed_at=now(),file_object_id=v_file_id
  where id=v_intent.id;
  insert into assessment.submission_evidence(id,submission_id,file_object_id,evidence_type,position,metadata)
  values(
    app_private.e14_deterministic_uuid('practice-evidence:'||p_submission_id::text),p_submission_id,v_file_id,
    'file',1,jsonb_build_object('original_filename',v_intent.original_filename,'terms_version',
      (select terms_version from assessment.practice_specs where activity_version_id=v_submission.activity_version_id),
      'allow_public_use',v_submission.allow_public_use)
  );

  v_snapshot:=jsonb_build_object(
    'submission_id',p_submission_id,'file_object_id',v_file_id,'status','processing',
    'security_status',v_security_status,'original_filename',v_intent.original_filename,
    'content_type',lower(btrim(p_actual_content_type)),'size_bytes',p_actual_size_bytes,
    'allow_public_use',v_submission.allow_public_use,'submitted_at',clock_timestamp()
  );
  update assessment.submissions
  set status='processing',submitted_at=clock_timestamp(),aggregate_version=2,
      confirmation_idempotency_key=p_idempotency_key,
      confirmation_request_hash=v_request_hash,confirmation_snapshot=v_snapshot
  where id=p_submission_id;

  v_event_id:=app_private.e14_command_event_id('confirm_practice_upload',p_actor_user_account_id,p_submission_id,p_idempotency_key);
  perform app_private.e14_append_event(
    v_event_id,'learning.practice.evidence.confirmed','user_account',p_actor_user_account_id,
    'user_account',p_actor_user_account_id,v_organization_id,v_journey_instance_id,
    'practice_submission',p_submission_id,2,v_event_id,null,
    jsonb_build_object(
      'submission_id',p_submission_id,'file_object_id',v_file_id,
      'security_status',v_security_status,'size_bytes',p_actual_size_bytes
    )
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',p_idempotency_key,'replayed',false,'data',v_snapshot);
end;
$$;

create or replace function public.abort_practice_upload(
  p_actor_user_account_id uuid,
  p_submission_id uuid,
  p_failure_code text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_submission assessment.submissions%rowtype;
  v_actor_entrepreneur_id uuid;
  v_organization_id uuid;
  v_journey_instance_id uuid;
  v_event_id uuid;
  v_code text:=left(coalesce(nullif(btrim(p_failure_code),''),'upload_failed'),120);
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  select * into v_submission from assessment.submissions where id=p_submission_id for update;
  if not found then raise exception 'PRACTICE_SUBMISSION_NOT_FOUND' using errcode='P0002'; end if;
  v_actor_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_actor_entrepreneur_id is null or v_actor_entrepreneur_id<>v_submission.entrepreneur_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_submission.status='failed' then
    return jsonb_build_object('request_id',app_private.e14_command_event_id('abort_practice_upload',p_actor_user_account_id,p_submission_id,p_idempotency_key),'idempotency_key',p_idempotency_key,'replayed',true,'data',jsonb_build_object('submission_id',p_submission_id,'status','failed','failure_code',v_code));
  end if;
  if v_submission.status<>'upload_pending' then raise exception 'PRACTICE_UPLOAD_NOT_PENDING' using errcode='55000'; end if;

  update core.file_upload_intents set status='aborted',aborted_at=now(),failure_code=v_code
  where id=v_submission.upload_intent_id and status='pending_upload';
  update assessment.submissions set status='failed',aggregate_version=aggregate_version+1
  where id=p_submission_id;

  select app_private.journey_owner_organization_id(ji.id),ji.id
  into v_organization_id,v_journey_instance_id
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
  where si.id=v_submission.step_instance_id;

  v_event_id:=app_private.e14_command_event_id('abort_practice_upload',p_actor_user_account_id,p_submission_id,p_idempotency_key);
  perform app_private.e14_append_event(
    v_event_id,'learning.practice.upload.failed','user_account',p_actor_user_account_id,
    'user_account',p_actor_user_account_id,v_organization_id,v_journey_instance_id,
    'practice_submission',p_submission_id,v_submission.aggregate_version+1,v_event_id,null,
    jsonb_build_object('submission_id',p_submission_id,'failure_code',v_code)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',p_idempotency_key,'replayed',false,'data',jsonb_build_object('submission_id',p_submission_id,'status','failed','failure_code',v_code));
end;
$$;

create or replace function public.list_practice_submissions(
  p_actor_user_account_id uuid,
  p_step_instance_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
declare
  v_organization_id uuid;
  v_entrepreneur_id uuid;
  v_actor_entrepreneur_id uuid;
  v_activity_version_id uuid;
  v_spec assessment.practice_specs%rowtype;
  v_submissions jsonb;
begin
  select app_private.journey_owner_organization_id(ji.id),en.entrepreneur_id,si.activity_version_id
  into v_organization_id,v_entrepreneur_id,v_activity_version_id
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
  join orchestration.enrollments en on en.id=ji.enrollment_id
  where si.id=p_step_instance_id;
  if v_organization_id is null then raise exception 'PRACTICE_STEP_NOT_FOUND' using errcode='P0002'; end if;
  v_actor_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if not (v_actor_entrepreneur_id is not null and v_actor_entrepreneur_id=v_entrepreneur_id)
     and not app_private.e14_actor_has_permission(p_actor_user_account_id,v_organization_id,'journey.execution.read') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  select * into v_spec from assessment.practice_specs where activity_version_id=v_activity_version_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'step_instance_id',s.step_instance_id,'submission_number',s.submission_number,
    'status',case
      when s.status in ('accepted','rejected','failed') then s.status
      when f.security_status='clean' and coalesce(v_spec.review_required,false) then 'awaiting_review'
      when f.security_status='clean' then 'available'
      when f.security_status='infected' then 'blocked'
      when f.security_status='manual_review' then 'manual_review'
      else s.status
    end,
    'security_status',f.security_status,'file_object_id',f.id,
    'original_filename',coalesce(f.original_filename,i.original_filename),
    'content_type',f.content_type,'size_bytes',f.size_bytes,
    'allow_public_use',s.allow_public_use,'submitted_at',s.submitted_at,
    'can_download',coalesce(f.security_status='clean' and f.deleted_at is null,false),
    'review_status',r.status,'review_feedback',r.feedback,'reviewed_at',r.reviewed_at
  ) order by s.submission_number desc),'[]'::jsonb)
  into v_submissions
  from assessment.submissions s
  left join core.file_upload_intents i on i.id=s.upload_intent_id
  left join assessment.submission_evidence se on se.submission_id=s.id and se.position=1
  left join core.file_objects f on f.id=se.file_object_id
  left join lateral (
    select rv.status,rv.feedback,rv.reviewed_at
    from assessment.reviews rv where rv.submission_id=s.id
    order by rv.reviewed_at desc,rv.id desc limit 1
  ) r on true
  where s.step_instance_id=p_step_instance_id
    and (s.entrepreneur_id=v_entrepreneur_id or app_private.e14_actor_has_permission(p_actor_user_account_id,v_organization_id,'journey.execution.read'));

  return jsonb_build_object(
    'step_instance_id',p_step_instance_id,
    'practice',case when v_spec.activity_version_id is null then null else jsonb_build_object(
      'enabled',true,'submission_mode',v_spec.submission_mode,
      'allowed_evidence_types',v_spec.allowed_evidence_types,
      'max_submissions',v_spec.max_submissions,'review_required',v_spec.review_required,
      'terms_version',v_spec.terms_version,'upload_profile_code','practice_evidence_v1'
    ) end,
    'submissions',v_submissions
  );
end;
$$;

revoke all on function public.create_practice_upload_intent(uuid,uuid,text,text,text,text,boolean,text) from public,anon,authenticated;
revoke all on function public.confirm_practice_upload(uuid,uuid,uuid,text,bigint,text,text,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.abort_practice_upload(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.list_practice_submissions(uuid,uuid) from public,anon,authenticated;

grant execute on function public.create_practice_upload_intent(uuid,uuid,text,text,text,text,boolean,text) to service_role,app_worker;
grant execute on function public.confirm_practice_upload(uuid,uuid,uuid,text,bigint,text,text,text,jsonb,text) to service_role,app_worker;
grant execute on function public.abort_practice_upload(uuid,uuid,text,text) to service_role,app_worker;
grant execute on function public.list_practice_submissions(uuid,uuid) to service_role,app_worker;
