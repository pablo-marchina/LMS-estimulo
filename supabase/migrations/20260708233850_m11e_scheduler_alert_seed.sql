-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708233850
-- Remote name: m11e_scheduler_alert_seed
-- Remote SQL SHA-256: f59a95a36f58258658d8cd0703eb023856afe66462c3fbe22e381a8c31c10336
-- Do not edit after reconciliation; corrections require a new migration.

insert into eventing.worker_schedules(
  code,queue_code,worker_function_name,schedule_expression,batch_size,
  visibility_timeout_seconds,max_parallel_invocations,token_ttl_seconds,
  http_timeout_milliseconds,status
) values (
  'file_scan_worker','file_scan','file-scan-worker','30 seconds',5,120,4,90,5000,'active'
) on conflict (code) do update set
  queue_code=excluded.queue_code,
  worker_function_name=excluded.worker_function_name,
  schedule_expression=excluded.schedule_expression,
  batch_size=excluded.batch_size,
  visibility_timeout_seconds=excluded.visibility_timeout_seconds,
  max_parallel_invocations=excluded.max_parallel_invocations,
  token_ttl_seconds=excluded.token_ttl_seconds,
  http_timeout_milliseconds=excluded.http_timeout_milliseconds,
  status=excluded.status;

insert into eventing.queue_alert_policies(
  queue_code,alert_code,metric_code,warning_threshold,critical_threshold,
  evaluation_window_seconds,status,description
) values
 ('file_scan','queue_backlog','queue_length',20,100,300,'active','Mensagens ativas acumuladas na fila.'),
 ('file_scan','queue_age','oldest_message_age_seconds',120,300,300,'active','Idade da mensagem mais antiga acima do objetivo operacional.'),
 ('file_scan','dead_letters_open','open_dead_letters',1,5,300,'active','Dead letters abertas exigem investigação.'),
 ('file_scan','visibility_expirations','expired_receipts_5m',3,10,300,'active','Receipts expirados sugerem workers lentos ou interrompidos.'),
 ('file_scan','dispatch_failures','dispatch_failures_5m',1,3,300,'active','Falhas recentes ao invocar workers.'),
 ('file_scan','cron_failures','cron_failures_5m',1,3,300,'active','Falhas recentes dos jobs pg_cron da plataforma.'),
 ('file_scan','scan_pending_age','oldest_scan_pending_age_seconds',300,900,300,'active','Arquivo aguardando scan por tempo excessivo.')
on conflict (queue_code,alert_code) do update set
 metric_code=excluded.metric_code,
 warning_threshold=excluded.warning_threshold,
 critical_threshold=excluded.critical_threshold,
 evaluation_window_seconds=excluded.evaluation_window_seconds,
 status=excluded.status,
 description=excluded.description;
