-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708234034
-- Remote name: m11j_dispatch_response_reconciliation
-- Remote SQL SHA-256: 0798681010fa95ba9e8ae9c0314b9472284bc1e7d2f6e3c556c38bf8d6c9b7cb
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function eventing.reconcile_dispatch_requests()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_expired integer := 0;
  v_responses integer := 0;
  v_failed integer := 0;
begin
  update eventing.worker_dispatch_tokens
  set status='expired'
  where status='pending' and expires_at<=now();
  get diagnostics v_expired = row_count;

  with responses as (
    select t.id,r.status_code,r.error_msg,r.timed_out,r.created
    from eventing.worker_dispatch_tokens t
    join net._http_response r on r.id=t.http_request_id
    where t.http_request_id is not null and t.responded_at is null
  )
  update eventing.worker_dispatch_tokens t
  set http_status_code=r.status_code,
      http_error=left(coalesce(r.error_msg,case when r.timed_out then 'http_timeout' else null end),1000),
      responded_at=r.created,
      status=case
        when t.status='pending' and (r.timed_out or r.error_msg is not null or r.status_code<200 or r.status_code>=300) then 'failed'
        else t.status
      end
  from responses r
  where t.id=r.id;
  get diagnostics v_responses = row_count;

  select count(*) into v_failed
  from eventing.worker_dispatch_tokens
  where responded_at>=now()-interval '5 minutes'
    and (http_status_code<200 or http_status_code>=300 or http_error is not null);

  return jsonb_build_object('expiredTokens',v_expired,'responsesRecorded',v_responses,'recentFailures',v_failed);
end;
$$;

grant execute on function eventing.reconcile_dispatch_requests() to app_worker;
