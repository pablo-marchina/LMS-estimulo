-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708232000
-- Remote name: m10j_cleanup_worker_runtime_proof
-- Remote SQL SHA-256: b6ff5f22abf727ea4a8e49922b7e263c4c96fad4bf5bff9bb0789f797fd7cfb7
-- Do not edit after reconciliation; corrections require a new migration.

alter table core.file_security_scans disable trigger trg_core_file_security_scans_append_only;
alter table eventing.queue_attempts disable trigger trg_eventing_queue_attempts_append_only;

delete from core.file_security_scans
where queue_job_id = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

update core.file_objects
set scan_job_id = null
where id = 'b6125abc-9d7d-4a78-b51c-2a80d6c5a48a'::uuid;

delete from core.file_objects
where id = 'b6125abc-9d7d-4a78-b51c-2a80d6c5a48a'::uuid;

delete from eventing.queue_attempts
where job_id = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

delete from eventing.queue_receipts
where job_id = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

delete from eventing.queue_dead_letters
where job_id = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

delete from eventing.queue_jobs
where id = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

delete from pgmq.a_estimulo_file_scan_jobs
where (message->>'jobId')::uuid = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

delete from pgmq.a_estimulo_file_scan_dlq
where nullif(message->'message'->>'jobId','')::uuid = 'efd1a3a7-0902-4f6d-8793-9f18f2b74e29'::uuid;

delete from iam.organizations
where id = '9896ecee-a1f6-48d5-a75c-7702060ed679'::uuid;

alter table core.file_security_scans enable trigger trg_core_file_security_scans_append_only;
alter table eventing.queue_attempts enable trigger trg_eventing_queue_attempts_append_only;

drop extension if exists http;
