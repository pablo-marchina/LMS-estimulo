begin;

do $$
declare
  v_count bigint;
  v_profile record;
begin
  select count(*) into v_count
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname ilike '%scan%';
  if v_count<>0 then raise exception 'scanner functions remain: %',v_count; end if;

  select count(*) into v_count
  from information_schema.tables
  where (table_schema='core' and table_name ilike '%scan%')
     or (table_schema='pgmq' and table_name ilike '%file_scan%');
  if v_count<>0 then raise exception 'scanner tables remain: %',v_count; end if;

  select count(*) into v_count
  from information_schema.columns
  where table_schema in ('core','eventing')
    and (column_name ilike '%scan%' or table_name ilike '%scan%');
  if v_count<>0 then raise exception 'scanner columns remain: %',v_count; end if;

  if exists(select 1 from eventing.queue_definitions where code='file_scan') then raise exception 'scanner queue remains'; end if;
  if exists(select 1 from eventing.worker_schedules where queue_code='file_scan') then raise exception 'scanner schedule remains'; end if;
  if exists(select 1 from cron.job where command ilike '%file_scan%' or jobname ilike '%scan%') then raise exception 'scanner cron remains'; end if;
  if exists(select 1 from eventing.event_schemas where event_name ilike '%scan%' or event_name ilike '%malware%') then raise exception 'scanner event schema remains'; end if;

  select * into v_profile from core.file_upload_profiles where code='practice_evidence_v1';
  if not found then raise exception 'practice evidence profile missing'; end if;
  if to_jsonb(v_profile) ? 'requires_malware_scan' then raise exception 'scanner flag remains on upload profile'; end if;

  if has_function_privilege('anon','public.confirm_practice_upload(uuid,uuid,uuid,text,bigint,text,text,text,jsonb,text)','execute')
     or has_function_privilege('authenticated','public.confirm_practice_upload(uuid,uuid,uuid,text,bigint,text,text,text,jsonb,text)','execute') then
    raise exception 'browser roles can call private upload confirmation directly';
  end if;
end;
$$;

rollback;
