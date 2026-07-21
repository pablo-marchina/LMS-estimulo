set lock_timeout = '5s';
set statement_timeout = '5min';

delete from eventing.queue_metric_snapshots
where queue_code='file_scan';
