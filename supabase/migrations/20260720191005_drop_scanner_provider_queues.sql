set lock_timeout = '5s';
set statement_timeout = '5min';

do $$
begin
  if to_regclass('pgmq.q_estimulo_file_scan_jobs') is not null
     or to_regclass('pgmq.a_estimulo_file_scan_jobs') is not null then
    perform pgmq.drop_queue('estimulo_file_scan_jobs');
  end if;
  if to_regclass('pgmq.q_estimulo_file_scan_dlq') is not null
     or to_regclass('pgmq.a_estimulo_file_scan_dlq') is not null then
    perform pgmq.drop_queue('estimulo_file_scan_dlq');
  end if;
end;
$$;

delete from eventing.event_schemas
where event_name ilike '%malware%'
   or event_name ilike '%scan%';
