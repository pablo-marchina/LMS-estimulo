\set ON_ERROR_STOP on

create or replace function public.review_practice_submission(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_submission_id uuid,
  p_status text,
  p_feedback text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_submission assessment.submissions%rowtype;
  v_existing assessment.reviews%rowtype;
  v_file core.file_objects%rowtype;
  v_journey_instance_id uuid;
  v_request_hash text;
  v_review_id uuid;
  v_event_id uuid;
  v_new_version bigint;
  v_snapshot jsonb;
  v_feedback text:=nullif(btrim(coalesce(p_feedback,'')),'');
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if p_status not in ('accepted','rejected') then raise exception 'PRACTICE_REVIEW_STATUS_INVALID' using errcode='22023'; end if;
  if p_status='rejected' and v_feedback is null then raise exception 'PRACTICE_REVIEW_FEEDBACK_REQUIRED' using errcode='22023'; end if;
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'assessment.review') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object('submission_id',p_submission_id,'status',p_status,'feedback',v_feedback));
  select * into v_existing from assessment.reviews
  where reviewer_user_account_id=p_actor_user_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.request_hash<>v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return jsonb_build_object('request_id',v_existing.source_event_id,'idempotency_key',p_idempotency_key,'replayed',true,'data',v_existing.result_snapshot);
  end if;

  select s into v_submission
  from assessment.submissions s
  join orchestration.step_instances si on si.id=s.step_instance_id
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
  where s.id=p_submission_id and app_private.journey_owner_organization_id(ji.id)=p_organization_id
  for update of s;
  if not found then raise exception 'PRACTICE_SUBMISSION_NOT_FOUND' using errcode='P0002'; end if;

  select ji.id into v_journey_instance_id
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
  where si.id=v_submission.step_instance_id;

  select f into v_file
  from assessment.submission_evidence se join core.file_objects f on f.id=se.file_object_id
  where se.submission_id=p_submission_id and se.position=1;
  if not found or v_file.security_status<>'clean' or v_file.deleted_at is not null then
    raise exception 'PRACTICE_FILE_NOT_REVIEWABLE' using errcode='55000';
  end if;

  v_review_id:=app_private.e14_deterministic_uuid('practice-review:'||p_actor_user_account_id::text||':'||p_idempotency_key);
  v_event_id:=app_private.e14_command_event_id('review_practice_submission',p_actor_user_account_id,p_submission_id,p_idempotency_key);
  v_new_version:=v_submission.aggregate_version+1;
  v_snapshot:=jsonb_build_object(
    'submission_id',p_submission_id,'review_id',v_review_id,'status',p_status,
    'feedback',v_feedback,'reviewed_at',clock_timestamp(),'aggregate_version',v_new_version
  );

  insert into assessment.reviews(
    id,submission_id,reviewer_user_account_id,review_type,rubric_version_id,status,
    feedback,reviewed_at,source_event_id,idempotency_key,request_hash,result_snapshot,changed
  ) values (
    v_review_id,p_submission_id,p_actor_user_account_id,'manual',null,p_status,
    v_feedback,clock_timestamp(),v_event_id,p_idempotency_key,v_request_hash,v_snapshot,true
  );
  update assessment.submissions
  set status=p_status,accepted_at=case when p_status='accepted' then clock_timestamp() else null end,
      aggregate_version=v_new_version
  where id=p_submission_id;

  perform app_private.e14_append_event(
    v_event_id,'learning.practice.review.completed','user_account',p_actor_user_account_id,
    'user_account',p_actor_user_account_id,p_organization_id,v_journey_instance_id,
    'practice_submission',p_submission_id,v_new_version,v_event_id,null,
    jsonb_build_object(
      'submission_id',p_submission_id,'review_id',v_review_id,
      'status',p_status,'feedback_present',v_feedback is not null
    )
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',p_idempotency_key,'replayed',false,'data',v_snapshot);
end;
$$;

create or replace function public.get_practice_download_descriptor(
  p_actor_user_account_id uuid,
  p_submission_id uuid
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
  v_file core.file_objects%rowtype;
  v_filename text;
begin
  select app_private.journey_owner_organization_id(ji.id),s.entrepreneur_id,
         coalesce(f.original_filename,i.original_filename)
  into v_organization_id,v_entrepreneur_id,v_filename
  from assessment.submissions s
  join orchestration.step_instances si on si.id=s.step_instance_id
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
  left join core.file_upload_intents i on i.id=s.upload_intent_id
  join assessment.submission_evidence se on se.submission_id=s.id and se.position=1
  join core.file_objects f on f.id=se.file_object_id
  where s.id=p_submission_id;
  if v_organization_id is null then raise exception 'PRACTICE_SUBMISSION_NOT_FOUND' using errcode='P0002'; end if;

  select f into v_file
  from assessment.submission_evidence se join core.file_objects f on f.id=se.file_object_id
  where se.submission_id=p_submission_id and se.position=1;

  v_actor_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if not (v_actor_entrepreneur_id is not null and v_actor_entrepreneur_id=v_entrepreneur_id)
     and not app_private.e14_actor_has_permission(p_actor_user_account_id,v_organization_id,'assessment.review') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_file.security_status<>'clean' or v_file.deleted_at is not null then
    raise exception 'PRACTICE_FILE_NOT_DOWNLOADABLE' using errcode='55000';
  end if;
  return jsonb_build_object(
    'submission_id',p_submission_id,'file_object_id',v_file.id,
    'storage_provider',v_file.storage_provider,'bucket',v_file.bucket,'object_key',v_file.object_key,
    'content_type',v_file.content_type,'size_bytes',v_file.size_bytes,'sha256',v_file.sha256,
    'original_filename',v_filename
  );
end;
$$;
