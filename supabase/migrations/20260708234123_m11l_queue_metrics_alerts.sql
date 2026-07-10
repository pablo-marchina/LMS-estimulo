-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708234123
-- Remote name: m11l_queue_metrics_alerts
-- Remote SQL SHA-256: 2b65f7d82d2cfebce73726cd98f4cdca05285737a8cbfd22a2b19bfa56d22846
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function eventing.capture_queue_metrics(p_queue_code text)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_metrics pgmq.metrics_result;
  v_snapshot_id bigint;
  v_jobs_by_status jsonb;
  v_open_dead_letters bigint;
  v_in_flight bigint;
  v_expired_5m bigint;
  v_dispatch_failures_5m bigint;
  v_cron_failures_5m bigint;
  v_scan_pending bigint := 0;
  v_release_pending bigint := 0;
  v_oldest_scan_age integer;
begin
  select * into v_definition from eventing.queue_definitions where code=p_queue_code;
  if not found then raise exception 'queue_definition_not_found' using errcode='P0002'; end if;
  if v_definition.provider<>'pgmq' then raise exception 'metrics_provider_not_supported' using errcode='0A000'; end if;
  select * into v_metrics from pgmq.metrics(v_definition.provider_queue_name);

  select coalesce(jsonb_object_agg(status,cnt),'{}'::jsonb) into v_jobs_by_status
  from (select status,count(*) as cnt from eventing.queue_jobs where queue_code=p_queue_code group by status) s;
  select count(*) into v_open_dead_letters from eventing.queue_dead_letters where source_queue_code=p_queue_code and status='open';
  select count(*) into v_in_flight from eventing.queue_receipts where queue_code=p_queue_code and status='in_flight' and visibility_deadline>now();
  select count(*) into v_expired_5m from eventing.queue_receipts where queue_code=p_queue_code and status='expired' and completed_at>=now()-interval '5 minutes';
  select count(*) into v_dispatch_failures_5m
  from eventing.worker_dispatch_tokens
  where queue_code=p_queue_code and responded_at>=now()-interval '5 minutes'
    and (http_status_code<200 or http_status_code>=300 or http_error is not null);
  select count(*) into v_cron_failures_5m
  from cron.job_run_details d join cron.job j on j.jobid=d.jobid
  where j.jobname like 'estimulo-%' and d.start_time>=now()-interval '5 minutes'
    and d.status not in ('succeeded','running');

  if p_queue_code='file_scan' then
    select count(*),
           count(*) filter (where security_status='release_pending'),
           extract(epoch from now()-min(created_at) filter (where security_status='scan_pending'))::integer
    into v_scan_pending,v_release_pending,v_oldest_scan_age
    from core.file_objects
    where security_status in ('scan_pending','release_pending') and deleted_at is null;
    v_scan_pending := v_scan_pending-v_release_pending;
  end if;

  insert into eventing.queue_metric_snapshots(
    queue_code,captured_at,queue_length,total_messages,oldest_message_age_seconds,
    open_dead_letters,in_flight_receipts,expired_receipts_5m,dispatch_failures_5m,
    cron_failures_5m,scan_pending_count,release_pending_count,
    oldest_scan_pending_age_seconds,jobs_by_status
  ) values (
    p_queue_code,now(),coalesce(v_metrics.queue_length,0),coalesce(v_metrics.total_messages,0),v_metrics.oldest_msg_age_sec,
    v_open_dead_letters,v_in_flight,v_expired_5m,v_dispatch_failures_5m,
    v_cron_failures_5m,v_scan_pending,v_release_pending,v_oldest_scan_age,v_jobs_by_status
  ) returning id into v_snapshot_id;
  return v_snapshot_id;
end;
$$;

create or replace function eventing.evaluate_queue_alerts(p_queue_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_snapshot eventing.queue_metric_snapshots%rowtype;
  v_policy eventing.queue_alert_policies%rowtype;
  v_value numeric;
  v_severity text;
  v_opened integer := 0;
  v_resolved integer := 0;
begin
  select * into v_snapshot from eventing.queue_metric_snapshots
  where queue_code=p_queue_code order by captured_at desc limit 1;
  if not found then raise exception 'queue_metric_snapshot_not_found' using errcode='P0002'; end if;

  for v_policy in select * from eventing.queue_alert_policies where queue_code=p_queue_code and status='active' order by alert_code loop
    v_value := case v_policy.metric_code
      when 'queue_length' then v_snapshot.queue_length
      when 'oldest_message_age_seconds' then coalesce(v_snapshot.oldest_message_age_seconds,0)
      when 'open_dead_letters' then v_snapshot.open_dead_letters
      when 'expired_receipts_5m' then v_snapshot.expired_receipts_5m
      when 'dispatch_failures_5m' then v_snapshot.dispatch_failures_5m
      when 'cron_failures_5m' then v_snapshot.cron_failures_5m
      when 'oldest_scan_pending_age_seconds' then coalesce(v_snapshot.oldest_scan_pending_age_seconds,0)
      else 0 end;

    if v_value>=v_policy.warning_threshold then
      v_severity := case when v_value>=v_policy.critical_threshold then 'critical' else 'warning' end;
      insert into eventing.operational_alerts(
        queue_code,alert_code,severity,status,current_value,warning_threshold,
        critical_threshold,first_seen_at,last_seen_at,occurrence_count,details
      ) values (
        p_queue_code,v_policy.alert_code,v_severity,'open',v_value,
        v_policy.warning_threshold,v_policy.critical_threshold,now(),now(),1,
        jsonb_build_object('metricCode',v_policy.metric_code,'snapshotId',v_snapshot.id,'description',v_policy.description)
      ) on conflict (queue_code,alert_code) where status in ('open','acknowledged')
      do update set
        severity=excluded.severity,current_value=excluded.current_value,
        warning_threshold=excluded.warning_threshold,critical_threshold=excluded.critical_threshold,
        last_seen_at=now(),occurrence_count=eventing.operational_alerts.occurrence_count+1,
        details=excluded.details;
      v_opened:=v_opened+1;
    else
      update eventing.operational_alerts
      set status='resolved',resolved_at=now(),last_seen_at=now(),current_value=v_value
      where queue_code=p_queue_code and alert_code=v_policy.alert_code and status in ('open','acknowledged');
      v_resolved:=v_resolved+case when found then 1 else 0 end;
    end if;
  end loop;

  return jsonb_build_object('evaluatedAt',now(),'activeOrUpdated',v_opened,'resolved',v_resolved);
end;
$$;

create or replace function eventing.capture_and_evaluate_queue(p_queue_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare v_snapshot_id bigint; v_alerts jsonb;
begin
  v_snapshot_id:=eventing.capture_queue_metrics(p_queue_code);
  v_alerts:=eventing.evaluate_queue_alerts(p_queue_code);
  return jsonb_build_object('snapshotId',v_snapshot_id,'alerts',v_alerts);
end;
$$;

grant execute on function eventing.capture_queue_metrics(text) to app_worker;
grant execute on function eventing.evaluate_queue_alerts(text) to app_worker;
grant execute on function eventing.capture_and_evaluate_queue(text) to app_worker;
