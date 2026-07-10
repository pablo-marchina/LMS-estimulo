-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708234311
-- Remote name: m11m_operational_status_cleanup
-- Remote SQL SHA-256: 3f12b04a9e2fb1f0a9c556be866df35a0c5d458289142c2a26b6e068fe27575e
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.queue_get_operational_status(p_queue_code text)
returns jsonb
language sql
security definer
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'queueCode',p_queue_code,
    'latestSnapshot',(
      select to_jsonb(s) from eventing.queue_metric_snapshots s
      where s.queue_code=p_queue_code order by s.captured_at desc limit 1
    ),
    'activeAlerts',coalesce((
      select jsonb_agg(to_jsonb(a) order by a.severity desc,a.first_seen_at)
      from eventing.operational_alerts a
      where a.queue_code=p_queue_code and a.status in ('open','acknowledged')
    ),'[]'::jsonb),
    'workerSchedules',coalesce((
      select jsonb_agg(to_jsonb(w) order by w.code)
      from eventing.worker_schedules w where w.queue_code=p_queue_code
    ),'[]'::jsonb),
    'recentSchedulerRuns',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.started_at desc)
      from (
        select * from eventing.scheduler_runs r
        where r.queue_code=p_queue_code order by r.started_at desc limit 20
      ) x
    ),'[]'::jsonb)
  );
$$;

create or replace function public.queue_acknowledge_alert(p_alert_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_count integer;
begin
  update eventing.operational_alerts
  set status='acknowledged',acknowledged_at=now()
  where id=p_alert_id and status='open';
  get diagnostics v_count=row_count;
  return v_count=1;
end;
$$;

create or replace function eventing.cleanup_scheduler_history()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_tokens integer;
  v_runs integer;
  v_metrics integer;
  v_cron integer;
begin
  delete from eventing.worker_dispatch_tokens
  where created_at<now()-interval '2 days' and status in ('claimed','expired','failed','revoked');
  get diagnostics v_tokens=row_count;
  delete from eventing.scheduler_runs where created_at<now()-interval '30 days';
  get diagnostics v_runs=row_count;
  delete from eventing.queue_metric_snapshots where captured_at<now()-interval '30 days';
  get diagnostics v_metrics=row_count;
  delete from cron.job_run_details where start_time<now()-interval '30 days';
  get diagnostics v_cron=row_count;
  return jsonb_build_object('dispatchTokens',v_tokens,'schedulerRuns',v_runs,'metricSnapshots',v_metrics,'cronRuns',v_cron);
end;
$$;

revoke all on function public.queue_get_operational_status(text) from public,anon,authenticated;
revoke all on function public.queue_acknowledge_alert(uuid) from public,anon,authenticated;
grant execute on function public.queue_get_operational_status(text) to service_role;
grant execute on function public.queue_acknowledge_alert(uuid) to service_role;
grant execute on function eventing.cleanup_scheduler_history() to app_worker;
