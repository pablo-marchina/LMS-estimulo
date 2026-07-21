set lock_timeout = '5s';
set statement_timeout = '5min';

delete from eventing.operational_alerts
where queue_code='file_scan';
