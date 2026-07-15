\set ON_ERROR_STOP on

set statement_timeout='120s';
set lock_timeout='10s';

create temporary table practice_upload_test_results(
  name text primary key,
  value jsonb not null
) on commit preserve rows;

create or replace function pg_temp.practice_assert(p_condition boolean,p_message text)
returns void language plpgsql as $$
begin
  if coalesce(p_condition,false) is not true then
    raise exception 'PRACTICE_UPLOAD_ASSERTION_FAILED: %',p_message;
  end if;
end;
$$;

create or replace function pg_temp.practice_expect_error(p_sql text,p_expected text)
returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if sqlerrm=p_expected then return; end if;
    raise;
  end;
  raise exception 'PRACTICE_UPLOAD_EXPECTED_ERROR_NOT_RAISED: %',p_expected;
end;
$$;

select
  app_private.e14_deterministic_uuid('e14:user:operator')::text operator_id,
  app_private.e14_deterministic_uuid('e14:user:participant')::text participant_id,
  app_private.e14_deterministic_uuid('e14:entrepreneur')::text entrepreneur_id,
  app_private.e14_deterministic_uuid('e14:organization')::text organization_id,
  app_private.e14_deterministic_uuid('e14:activity-version:v1')::text activity_version_id,
  app_private.e14_deterministic_uuid('practice-upload:test:unauthorized')::text unauthorized_id
\gset practice_

select si.id::text step_instance_id
from orchestration.step_instances si
join orchestration.path_assignments pa on pa.id=si.path_assignment_id
join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
join orchestration.enrollments en on en.id=ji.enrollment_id
where en.entrepreneur_id=:'practice_entrepreneur_id'::uuid
order by si.created_at desc limit 1
\gset practice_

select count(*)::text events_before from eventing.events \gset practice_
select count(*)::text outbox_before from eventing.outbox \gset practice_

insert into assessment.practice_specs(
  activity_version_id,submission_mode,allowed_evidence_types,max_submissions,
  review_required,rubric_version_id,terms_version
) values (
  :'practice_activity_version_id'::uuid,'file',array['file'],3,true,null,'practice-terms-v1'
) on conflict (activity_version_id) do update set
  submission_mode=excluded.submission_mode,
  allowed_evidence_types=excluded.allowed_evidence_types,
  max_submissions=excluded.max_submissions,
  review_required=excluded.review_required,
  terms_version=excluded.terms_version;

insert into practice_upload_test_results values(
  'create',public.create_practice_upload_intent(
    :'practice_participant_id'::uuid,:'practice_step_instance_id'::uuid,
    ' Evidência ChatGPT.pdf ','application/pdf','supabase_storage','practice-evidence',true,
    'practice-upload-create-v1'
  )
);
select value#>>'{data,submission_id}' submission_id,
       value#>>'{data,upload_intent_id}' upload_intent_id,
       value#>>'{data,object_key}' object_key
from practice_upload_test_results where name='create'
\gset practice_

select pg_temp.practice_assert(
  (select value->>'replayed'='false' from practice_upload_test_results where name='create'),
  'first create must not replay'
);
select pg_temp.practice_assert(
  (select value#>>'{data,original_filename}'='evid-ncia-chatgpt.pdf' from practice_upload_test_results where name='create'),
  'filename must be normalized'
);
select pg_temp.practice_assert(
  (select count(*)=1 from assessment.submissions where id=:'practice_submission_id'::uuid and status='upload_pending' and allow_public_use),
  'pending submission missing'
);
select pg_temp.practice_assert(
  (select count(*)=1 from core.file_upload_intents where id=:'practice_upload_intent_id'::uuid and upload_profile_code='practice_evidence_v1' and status='pending_upload'),
  'upload intent missing'
);

insert into practice_upload_test_results values(
  'create_replay',public.create_practice_upload_intent(
    :'practice_participant_id'::uuid,:'practice_step_instance_id'::uuid,
    ' Evidência ChatGPT.pdf ','application/pdf','supabase_storage','practice-evidence',true,
    'practice-upload-create-v1'
  )
);
select pg_temp.practice_assert(
  (select value->>'replayed'='true' from practice_upload_test_results where name='create_replay'),
  'create replay flag missing'
);
select pg_temp.practice_expect_error(format(
  'select public.create_practice_upload_intent(%L::uuid,%L::uuid,%L,%L,%L,%L,%L,%L)',
  :'practice_participant_id',:'practice_step_instance_id','outro.pdf','application/pdf',
  'supabase_storage','practice-evidence',true,'practice-upload-create-v1'
),'IDEMPOTENCY_KEY_REUSED');
select pg_temp.practice_expect_error(format(
  'select public.create_practice_upload_intent(%L::uuid,%L::uuid,%L,%L,%L,%L,%L,%L)',
  :'practice_unauthorized_id',:'practice_step_instance_id','indevido.pdf','application/pdf',
  'supabase_storage','practice-evidence',false,'practice-upload-forbidden-v1'
),'FORBIDDEN');

insert into practice_upload_test_results values(
  'confirm',public.confirm_practice_upload(
    :'practice_participant_id'::uuid,:'practice_submission_id'::uuid,:'practice_upload_intent_id'::uuid,
    'application/pdf',1024,repeat('a',64),'provider-version-1','etag-1',
    '{"source":"database_e2e"}'::jsonb,'practice-upload-confirm-v1'
  )
);
select value#>>'{data,file_object_id}' file_object_id
from practice_upload_test_results where name='confirm'
\gset practice_
select scan_job_id::text scan_job_id from core.file_objects where id=:'practice_file_object_id'::uuid
\gset practice_

select pg_temp.practice_assert(
  (select value#>>'{data,security_status}'='scan_pending' from practice_upload_test_results where name='confirm'),
  'confirmation must queue scan'
);
select pg_temp.practice_assert(
  (select count(*)=1 from assessment.submission_evidence where submission_id=:'practice_submission_id'::uuid and file_object_id=:'practice_file_object_id'::uuid),
  'submission evidence missing'
);
select pg_temp.practice_assert(
  (select count(*)=1 from eventing.queue_jobs where id=:'practice_scan_job_id'::uuid and job_type='file.malware_scan.requested'),
  'scan job missing'
);
select pg_temp.practice_assert(
  (select count(*)=1 from core.file_upload_intents where id=:'practice_upload_intent_id'::uuid and status='confirmed'),
  'intent not confirmed'
);

insert into practice_upload_test_results values(
  'confirm_replay',public.confirm_practice_upload(
    :'practice_participant_id'::uuid,:'practice_submission_id'::uuid,:'practice_upload_intent_id'::uuid,
    'application/pdf',1024,repeat('a',64),'provider-version-1','etag-1',
    '{"source":"database_e2e"}'::jsonb,'practice-upload-confirm-v1'
  )
);
select pg_temp.practice_assert(
  (select value->>'replayed'='true' from practice_upload_test_results where name='confirm_replay'),
  'confirm replay flag missing'
);

insert into practice_upload_test_results values(
  'participant_processing',public.list_practice_submissions(
    :'practice_participant_id'::uuid,:'practice_step_instance_id'::uuid
  )
);
select pg_temp.practice_assert(
  (select value#>>'{practice,enabled}'='true' from practice_upload_test_results where name='participant_processing'),
  'practice configuration missing'
);
select pg_temp.practice_assert(
  (select value#>>'{submissions,0,status}'='processing' from practice_upload_test_results where name='participant_processing'),
  'participant processing status missing'
);

select * from public.file_apply_scan_result(
  :'practice_scan_job_id'::uuid,:'practice_file_object_id'::uuid,
  'synthetic_e2e_scanner','1','clean','[]'::jsonb,'[]'::jsonb,'scan-reference',now(),now()
);
select * from public.file_complete_release(
  :'practice_file_object_id'::uuid,
  regexp_replace(:'practice_object_key','^quarantine/','protected/'),
  'provider-version-2','etag-2'
);

insert into practice_upload_test_results values(
  'participant_clean',public.list_practice_submissions(
    :'practice_participant_id'::uuid,:'practice_step_instance_id'::uuid
  )
);
select pg_temp.practice_assert(
  (select value#>>'{submissions,0,status}'='awaiting_review' from practice_upload_test_results where name='participant_clean'),
  'clean evidence must await review'
);
select pg_temp.practice_assert(
  (select value#>>'{submissions,0,can_download}'='true' from practice_upload_test_results where name='participant_clean'),
  'clean evidence must be downloadable'
);

insert into practice_upload_test_results values(
  'descriptor',public.get_practice_download_descriptor(
    :'practice_participant_id'::uuid,:'practice_submission_id'::uuid
  )
);
select pg_temp.practice_assert(
  (select value->>'bucket'='practice-evidence' from practice_upload_test_results where name='descriptor'),
  'download descriptor bucket missing'
);
select pg_temp.practice_expect_error(format(
  'select public.get_practice_download_descriptor(%L::uuid,%L::uuid)',
  :'practice_unauthorized_id',:'practice_submission_id'
),'FORBIDDEN');

insert into practice_upload_test_results values(
  'operator_list',public.list_operator_practice_submissions(
    :'practice_operator_id'::uuid,:'practice_organization_id'::uuid,100
  )
);
select pg_temp.practice_assert(
  (select jsonb_array_length(value->'submissions')>=1 from practice_upload_test_results where name='operator_list'),
  'operator list missing submission'
);

insert into practice_upload_test_results values(
  'review',public.review_practice_submission(
    :'practice_operator_id'::uuid,:'practice_organization_id'::uuid,:'practice_submission_id'::uuid,
    'accepted','Evidência válida para a atividade.','practice-review-v1'
  )
);
select pg_temp.practice_assert(
  (select value#>>'{data,status}'='accepted' from practice_upload_test_results where name='review'),
  'review did not accept submission'
);
select pg_temp.practice_assert(
  (select count(*)=1 from assessment.reviews where submission_id=:'practice_submission_id'::uuid and status='accepted'),
  'review row missing'
);
select pg_temp.practice_assert(
  (select status='accepted' from assessment.submissions where id=:'practice_submission_id'::uuid),
  'submission status not accepted'
);

insert into practice_upload_test_results values(
  'review_replay',public.review_practice_submission(
    :'practice_operator_id'::uuid,:'practice_organization_id'::uuid,:'practice_submission_id'::uuid,
    'accepted','Evidência válida para a atividade.','practice-review-v1'
  )
);
select pg_temp.practice_assert(
  (select value->>'replayed'='true' from practice_upload_test_results where name='review_replay'),
  'review replay flag missing'
);
select pg_temp.practice_expect_error(format(
  'select public.review_practice_submission(%L::uuid,%L::uuid,%L::uuid,%L,%L,%L)',
  :'practice_participant_id',:'practice_organization_id',:'practice_submission_id',
  'rejected','Não autorizado.','practice-review-forbidden-v1'
),'FORBIDDEN');

insert into practice_upload_test_results values(
  'create_abort',public.create_practice_upload_intent(
    :'practice_participant_id'::uuid,:'practice_step_instance_id'::uuid,
    'rascunho.txt','text/plain','supabase_storage','practice-evidence',false,
    'practice-upload-create-abort-v1'
  )
);
select value#>>'{data,submission_id}' abort_submission_id
from practice_upload_test_results where name='create_abort'
\gset practice_
insert into practice_upload_test_results values(
  'abort',public.abort_practice_upload(
    :'practice_participant_id'::uuid,:'practice_abort_submission_id'::uuid,
    'provider_upload_failed','practice-upload-abort-v1'
  )
);
select pg_temp.practice_assert(
  (select status='failed' from assessment.submissions where id=:'practice_abort_submission_id'::uuid),
  'failed submission state missing'
);

select pg_temp.practice_assert(
  (select count(*)>=:'practice_events_before'::bigint+4 from eventing.events),
  'practice events missing'
);
select pg_temp.practice_assert(
  (select count(*)>=:'practice_outbox_before'::bigint+4 from eventing.outbox),
  'practice outbox items missing'
);

select jsonb_build_object(
  'status','ok',
  'submission_id',:'practice_submission_id',
  'file_object_id',:'practice_file_object_id',
  'review_status','accepted',
  'abort_status','failed'
) as practice_upload_e2e;
