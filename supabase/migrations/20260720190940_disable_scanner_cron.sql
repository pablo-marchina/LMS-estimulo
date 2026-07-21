set lock_timeout = '5s';
set statement_timeout = '5min';

do $$
declare
  v_job record;
begin
  for v_job in
    select jobid
    from cron.job
    where jobname in (
      'estimulo-file-scan-dispatch',
      'estimulo-queue-reconcile',
      'estimulo-queue-metrics-alerts'
    )
       or command ilike '%file_scan%'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;
end;
$$;
