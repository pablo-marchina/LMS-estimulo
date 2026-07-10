-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708230901
-- Remote name: m10g_queue_rpc_security
-- Remote SQL SHA-256: adc3a2b26cb8c0082242fe46b089e3d93d2c733e3e82a9501f85894cc3c8ce23
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.queue_receive_jobs(p_queue_code text,p_worker_id text,p_batch_size integer default null,p_visibility_timeout_seconds integer default null)
returns table(receipt_handle uuid,job_id uuid,job_type text,job_version integer,receive_count integer,visibility_deadline timestamptz,enqueued_at timestamptz,payload jsonb,message_headers jsonb)
language sql security definer set search_path=pg_catalog as $$
  select * from eventing.receive_jobs(p_queue_code,p_worker_id,p_batch_size,p_visibility_timeout_seconds);
$$;

create or replace function public.queue_extend_visibility(p_receipt_handle uuid,p_worker_id text,p_visibility_timeout_seconds integer)
returns timestamptz language sql security definer set search_path=pg_catalog as $$
  select eventing.extend_job_visibility(p_receipt_handle,p_worker_id,p_visibility_timeout_seconds);
$$;

create or replace function public.queue_ack_job(p_receipt_handle uuid,p_worker_id text,p_result_details jsonb default '{}'::jsonb)
returns boolean language sql security definer set search_path=pg_catalog as $$
  select eventing.ack_job(p_receipt_handle,p_worker_id,p_result_details);
$$;

create or replace function public.queue_retry_job(p_receipt_handle uuid,p_worker_id text,p_error_code text,p_delay_seconds integer,p_error_details jsonb default '{}'::jsonb)
returns text language sql security definer set search_path=pg_catalog as $$
  select eventing.retry_job(p_receipt_handle,p_worker_id,p_error_code,p_delay_seconds,p_error_details);
$$;

create or replace function public.queue_dead_letter_job(p_receipt_handle uuid,p_worker_id text,p_reason_code text,p_reason_details jsonb default '{}'::jsonb)
returns uuid language sql security definer set search_path=pg_catalog as $$
  select eventing.dead_letter_job(p_receipt_handle,p_worker_id,p_reason_code,p_reason_details);
$$;

create or replace function public.queue_redrive_dead_letter(p_dead_letter_id uuid,p_reason text)
returns uuid language sql security definer set search_path=pg_catalog as $$
  select eventing.redrive_dead_letter(p_dead_letter_id,p_reason);
$$;

create or replace function public.queue_get_metrics(p_queue_code text)
returns table(queue_code text,provider text,provider_queue_name text,visible_or_in_flight_messages bigint,total_messages bigint,oldest_message_age_seconds integer,open_dead_letters bigint,in_flight_receipts bigint,captured_at timestamptz)
language sql security definer set search_path=pg_catalog as $$
  select * from eventing.queue_metrics(p_queue_code);
$$;

alter table eventing.queue_definitions enable row level security;
alter table eventing.queue_jobs enable row level security;
alter table eventing.queue_receipts enable row level security;
alter table eventing.queue_attempts enable row level security;
alter table eventing.queue_dead_letters enable row level security;

create policy queue_definitions_worker_select on eventing.queue_definitions for select to app_worker using (app_private.is_trusted_worker());
create policy queue_definitions_worker_insert on eventing.queue_definitions for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_definitions_worker_update on eventing.queue_definitions for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_definitions_worker_delete on eventing.queue_definitions for delete to app_worker using (app_private.is_trusted_worker());
create policy queue_jobs_worker_select on eventing.queue_jobs for select to app_worker using (app_private.is_trusted_worker());
create policy queue_jobs_worker_insert on eventing.queue_jobs for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_jobs_worker_update on eventing.queue_jobs for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_jobs_worker_delete on eventing.queue_jobs for delete to app_worker using (app_private.is_trusted_worker());
create policy queue_receipts_worker_select on eventing.queue_receipts for select to app_worker using (app_private.is_trusted_worker());
create policy queue_receipts_worker_insert on eventing.queue_receipts for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_receipts_worker_update on eventing.queue_receipts for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_receipts_worker_delete on eventing.queue_receipts for delete to app_worker using (app_private.is_trusted_worker());
create policy queue_attempts_worker_select on eventing.queue_attempts for select to app_worker using (app_private.is_trusted_worker());
create policy queue_attempts_worker_insert on eventing.queue_attempts for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_attempts_worker_update on eventing.queue_attempts for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_dead_letters_worker_select on eventing.queue_dead_letters for select to app_worker using (app_private.is_trusted_worker());
create policy queue_dead_letters_worker_insert on eventing.queue_dead_letters for insert to app_worker with check (app_private.is_trusted_worker());
create policy queue_dead_letters_worker_update on eventing.queue_dead_letters for update to app_worker using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());
create policy queue_dead_letters_worker_delete on eventing.queue_dead_letters for delete to app_worker using (app_private.is_trusted_worker());

revoke all on all tables in schema pgmq from public,anon,authenticated;
revoke all on all functions in schema pgmq from public,anon,authenticated;
revoke all on eventing.queue_definitions,eventing.queue_jobs,eventing.queue_receipts,eventing.queue_attempts,eventing.queue_dead_letters from public,anon,authenticated;

grant usage on schema pgmq to app_worker;
grant select,insert,update,delete on all tables in schema pgmq to app_worker;
grant execute on all functions in schema pgmq to app_worker;
grant select,insert,update,delete on eventing.queue_definitions,eventing.queue_jobs,eventing.queue_receipts,eventing.queue_attempts,eventing.queue_dead_letters to app_worker;
grant execute on function eventing.queue_job_envelope(uuid) to app_worker;
grant execute on function eventing.enqueue_job(text,text,integer,text,uuid,uuid,text,uuid,jsonb,integer) to app_worker;
grant execute on function eventing.dead_letter_provider_message(text,uuid,text,integer,text,jsonb,jsonb) to app_worker;
grant execute on function eventing.receive_jobs(text,text,integer,integer) to app_worker;
grant execute on function eventing.extend_job_visibility(uuid,text,integer) to app_worker;
grant execute on function eventing.ack_job(uuid,text,jsonb) to app_worker;
grant execute on function eventing.retry_job(uuid,text,text,integer,jsonb) to app_worker;
grant execute on function eventing.dead_letter_job(uuid,text,text,jsonb) to app_worker;
grant execute on function eventing.redrive_dead_letter(uuid,text) to app_worker;
grant execute on function eventing.queue_metrics(text) to app_worker;

revoke all on function public.file_apply_scan_result(uuid,uuid,text,text,text,jsonb,jsonb,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.queue_receive_jobs(text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.queue_extend_visibility(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.queue_ack_job(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.queue_retry_job(uuid,text,text,integer,jsonb) from public,anon,authenticated;
revoke all on function public.queue_dead_letter_job(uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.queue_redrive_dead_letter(uuid,text) from public,anon,authenticated;
revoke all on function public.queue_get_metrics(text) from public,anon,authenticated;

grant execute on function public.file_apply_scan_result(uuid,uuid,text,text,text,jsonb,jsonb,text,timestamptz,timestamptz) to service_role;
grant execute on function public.queue_receive_jobs(text,text,integer,integer) to service_role;
grant execute on function public.queue_extend_visibility(uuid,text,integer) to service_role;
grant execute on function public.queue_ack_job(uuid,text,jsonb) to service_role;
grant execute on function public.queue_retry_job(uuid,text,text,integer,jsonb) to service_role;
grant execute on function public.queue_dead_letter_job(uuid,text,text,jsonb) to service_role;
grant execute on function public.queue_redrive_dead_letter(uuid,text) to service_role;
grant execute on function public.queue_get_metrics(text) to service_role;
