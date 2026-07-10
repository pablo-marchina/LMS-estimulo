-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708234709
-- Remote name: m11o_cleanup_concurrency_proof
-- Remote SQL SHA-256: 5f167778143ececb975340f18d97048164a3914faefeb917950574ed0a9265b6
-- Do not edit after reconciliation; corrections require a new migration.

alter table eventing.queue_attempts disable trigger trg_eventing_queue_attempts_append_only;

create temporary table m11_proof_jobs on commit drop as
select id from eventing.queue_jobs
where payload->>'proofRunId'='45f88548-9fe0-4eab-9e8d-081ce9b7bace';

create temporary table m11_proof_workers on commit drop as
select distinct r.worker_id
from eventing.queue_receipts r join m11_proof_jobs j on j.id=r.job_id;

delete from eventing.worker_dispatch_tokens
where claimed_by in (select worker_id from m11_proof_workers);

delete from eventing.queue_attempts
where job_id in (select id from m11_proof_jobs);

delete from eventing.queue_receipts
where job_id in (select id from m11_proof_jobs);

delete from eventing.queue_dead_letters
where job_id in (select id from m11_proof_jobs);

delete from eventing.queue_jobs
where id in (select id from m11_proof_jobs);

delete from pgmq.q_estimulo_file_scan_jobs
where message->'payload'->>'proofRunId'='45f88548-9fe0-4eab-9e8d-081ce9b7bace';

delete from pgmq.a_estimulo_file_scan_jobs
where message->'payload'->>'proofRunId'='45f88548-9fe0-4eab-9e8d-081ce9b7bace';

delete from pgmq.q_estimulo_file_scan_dlq
where message->'message'->'payload'->>'proofRunId'='45f88548-9fe0-4eab-9e8d-081ce9b7bace';

delete from pgmq.a_estimulo_file_scan_dlq
where message->'message'->'payload'->>'proofRunId'='45f88548-9fe0-4eab-9e8d-081ce9b7bace';

delete from eventing.queue_metric_snapshots
where queue_code='file_scan' and open_dead_letters>0
  and captured_at>=timestamp with time zone '2026-07-08 23:44:30+00';

alter table eventing.queue_attempts enable trigger trg_eventing_queue_attempts_append_only;
