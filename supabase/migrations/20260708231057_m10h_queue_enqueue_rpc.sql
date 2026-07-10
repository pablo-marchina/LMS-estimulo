-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708231057
-- Remote name: m10h_queue_enqueue_rpc
-- Remote SQL SHA-256: a6ddc71c097585d7e10051b55860c2e89f678921e11d6f6547f1d1eb3494de6f
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.queue_enqueue_job(
  p_queue_code text,
  p_job_type text,
  p_job_version integer,
  p_deduplication_key text,
  p_source_event_id uuid,
  p_organization_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_payload jsonb,
  p_delay_seconds integer default 0
) returns uuid
language sql security definer set search_path=pg_catalog as $$
  select eventing.enqueue_job(
    p_queue_code,p_job_type,p_job_version,p_deduplication_key,
    p_source_event_id,p_organization_id,p_subject_type,p_subject_id,p_payload,p_delay_seconds
  );
$$;
revoke all on function public.queue_enqueue_job(text,text,integer,text,uuid,uuid,text,uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.queue_enqueue_job(text,text,integer,text,uuid,uuid,text,uuid,jsonb,integer) to service_role;
