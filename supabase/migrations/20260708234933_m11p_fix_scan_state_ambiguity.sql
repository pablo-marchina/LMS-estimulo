-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708234933
-- Remote name: m11p_fix_scan_state_ambiguity
-- Remote SQL SHA-256: c92e4200412ba6260c1c9493e03c00724cf2d1bb56c740d58e62656cc4d4ec44
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
  v_scan_found boolean := false;
begin
  select * into v_file from core.file_objects f where f.id=p_file_object_id;
  if not found then raise exception 'file_object_not_found' using errcode='P0002'; end if;
  if v_file.scan_job_id is distinct from p_queue_job_id then
    raise exception 'file_scan_job_mismatch' using errcode='22023';
  end if;

  select s.* into v_scan
  from core.file_security_scans s
  where s.queue_job_id=p_queue_job_id
  order by s.completed_at desc
  limit 1;
  v_scan_found := found;

  return query select
    v_file.id,
    p_queue_job_id,
    v_file.security_status,
    v_scan_found,
    case when v_scan_found then v_scan.scan_status else null end,
    v_file.bucket,
    v_file.object_key,
    case
      when v_file.object_key like 'quarantine/%' then regexp_replace(v_file.object_key,'^quarantine/','protected/')
      when v_file.object_key like 'protected/%' then v_file.object_key
      else null
    end;
end;
$$;
