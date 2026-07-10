-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709001355
-- Remote name: m12i_payload_redaction_hash_integrity
-- Remote SQL SHA-256: 2437fd3a252a3739d9082b4a36cf3c9c1fbddcc8a00982c4bbc52aca35cff7ca
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function governance.redact_payload_and_hash()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
begin
  new.payload:=governance.redact_jsonb(coalesce(new.payload,'{}'::jsonb));
  new.payload_hash:=encode(extensions.digest(convert_to(new.payload::text,'UTF8'),'sha256'),'hex');
  return new;
end;
$$;

drop trigger if exists trg_eventing_events_redact on eventing.events;
drop trigger if exists trg_eventing_queue_jobs_redact on eventing.queue_jobs;
create trigger trg_eventing_events_redact_hash before insert or update of payload on eventing.events for each row execute function governance.redact_payload_and_hash();
create trigger trg_eventing_queue_jobs_redact_hash before insert or update of payload on eventing.queue_jobs for each row execute function governance.redact_payload_and_hash();

create or replace function eventing.enqueue_job(
  p_queue_code text,p_job_type text,p_job_version integer,p_deduplication_key text,
  p_source_event_id uuid,p_organization_id uuid,p_subject_type text,p_subject_id uuid,
  p_payload jsonb,p_delay_seconds integer default 0
) returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_definition eventing.queue_definitions%rowtype;
  v_job_id uuid;
  v_message_id bigint;
  v_payload_hash text;
  v_payload jsonb;
  v_existing_status text;
begin
  if p_job_version<1 then raise exception 'invalid_job_version' using errcode='22023'; end if;
  if p_delay_seconds<0 or p_delay_seconds>900 then raise exception 'invalid_job_delay' using errcode='22023'; end if;
  if p_job_type is null or p_job_type !~ '^[a-z][a-z0-9_.-]{2,119}$' then raise exception 'invalid_job_type' using errcode='22023'; end if;
  if p_deduplication_key is null or length(p_deduplication_key) not between 1 and 240 then raise exception 'invalid_deduplication_key' using errcode='22023'; end if;

  select * into v_definition from eventing.queue_definitions where code=p_queue_code and status='active' for share;
  if not found then raise exception 'queue_definition_not_active' using errcode='P0002'; end if;

  v_payload:=governance.redact_jsonb(coalesce(p_payload,'{}'::jsonb));
  v_payload_hash:=encode(extensions.digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex');

  insert into eventing.queue_jobs(
    queue_code,job_type,job_version,deduplication_key,source_event_id,organization_id,
    subject_type,subject_id,payload,payload_hash,status,provider,provider_queue_name,available_at,max_attempts
  ) values (
    v_definition.code,p_job_type,p_job_version,p_deduplication_key,p_source_event_id,p_organization_id,
    p_subject_type,p_subject_id,v_payload,v_payload_hash,'created',v_definition.provider,
    v_definition.provider_queue_name,now()+make_interval(secs=>p_delay_seconds),v_definition.max_receive_count
  ) on conflict(queue_code,deduplication_key) do nothing returning id into v_job_id;

  if v_job_id is null then
    select id,status into v_job_id,v_existing_status from eventing.queue_jobs
    where queue_code=p_queue_code and deduplication_key=p_deduplication_key;
    if v_existing_status='cancelled' then raise exception 'deduplicated_job_cancelled' using errcode='55000'; end if;
    return v_job_id;
  end if;

  if v_definition.provider<>'pgmq' then raise exception 'queue_provider_not_available_in_test_environment' using errcode='0A000'; end if;
  select send into v_message_id
  from pgmq.send(
    v_definition.provider_queue_name,eventing.queue_job_envelope(v_job_id),
    jsonb_build_object('job_id',v_job_id,'job_type',p_job_type,'deduplication_key',p_deduplication_key,'payload_hash',v_payload_hash),
    p_delay_seconds
  ) limit 1;
  if v_message_id is null then raise exception 'queue_publish_failed' using errcode='58000'; end if;
  update eventing.queue_jobs set status='queued',provider_message_id=v_message_id::text,enqueued_at=now(),available_at=now()+make_interval(secs=>p_delay_seconds) where id=v_job_id;
  return v_job_id;
end;
$$;

create or replace function eventing.append_event(
  p_event_id uuid,p_event_name text,p_event_version integer,p_occurred_at timestamptz,p_producer text,
  p_subject_type text,p_subject_id uuid,p_actor_type text,p_actor_id uuid,p_organization_id uuid,
  p_journey_instance_id uuid,p_aggregate_type text,p_aggregate_id uuid,p_aggregate_version bigint,
  p_partition_key text,p_correlation_id uuid,p_causation_id uuid,p_traceparent text,
  p_evidence_nature text,p_privacy_class text,p_payload jsonb,p_schema_id uuid,p_route_keys text[]
) returns uuid
language plpgsql
set search_path=pg_catalog
as $$
declare
  v_route text;
  v_payload_hash text;
  v_payload jsonb;
begin
  if p_event_id is null or p_correlation_id is null or p_schema_id is null then raise exception 'event_identity_fields_required' using errcode='22023'; end if;
  if p_event_version<1 or p_aggregate_version<0 then raise exception 'invalid_event_version' using errcode='22023'; end if;
  if p_route_keys is null or cardinality(p_route_keys)=0 then raise exception 'event_route_required' using errcode='22023'; end if;
  v_payload:=governance.redact_jsonb(coalesce(p_payload,'{}'::jsonb));
  v_payload_hash:=encode(extensions.digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex');

  insert into eventing.events(
    event_id,event_name,event_version,occurred_at,producer,subject_type,subject_id,actor_type,actor_id,
    organization_id,journey_instance_id,aggregate_type,aggregate_id,aggregate_version,partition_key,
    correlation_id,causation_id,traceparent,evidence_nature,privacy_class,payload,payload_hash,schema_id
  ) values (
    p_event_id,p_event_name,p_event_version,p_occurred_at,p_producer,p_subject_type,p_subject_id,p_actor_type,p_actor_id,
    p_organization_id,p_journey_instance_id,p_aggregate_type,p_aggregate_id,p_aggregate_version,p_partition_key,
    p_correlation_id,p_causation_id,p_traceparent,p_evidence_nature,p_privacy_class,v_payload,v_payload_hash,p_schema_id
  );
  foreach v_route in array p_route_keys loop
    if v_route is null or length(trim(v_route))=0 then raise exception 'invalid_route_key' using errcode='22023'; end if;
    insert into eventing.outbox(event_id,route_key,status,available_at)
    values(p_event_id,trim(v_route),'pending',now()) on conflict(event_id,route_key) do nothing;
  end loop;
  return p_event_id;
end;
$$;
