-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708221802
-- Remote name: m08j_transactional_outbox_privileges
-- Remote SQL SHA-256: 5fe3f65c6222ce593581b4d97760bd77114d657ad3e029e7e569bcd0ce25cbc8
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function eventing.append_event(
  p_event_id uuid,
  p_event_name text,
  p_event_version integer,
  p_occurred_at timestamptz,
  p_producer text,
  p_subject_type text,
  p_subject_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_organization_id uuid,
  p_journey_instance_id uuid,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_aggregate_version bigint,
  p_partition_key text,
  p_correlation_id uuid,
  p_causation_id uuid,
  p_traceparent text,
  p_evidence_nature text,
  p_privacy_class text,
  p_payload jsonb,
  p_schema_id uuid,
  p_route_keys text[]
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_route text;
  v_payload_hash text;
begin
  if p_event_id is null or p_correlation_id is null or p_schema_id is null then
    raise exception 'event_identity_fields_required' using errcode = '22023';
  end if;
  if p_event_version < 1 or p_aggregate_version < 0 then
    raise exception 'invalid_event_version' using errcode = '22023';
  end if;
  if p_route_keys is null or cardinality(p_route_keys) = 0 then
    raise exception 'event_route_required' using errcode = '22023';
  end if;
  v_payload_hash := encode(digest(convert_to(coalesce(p_payload, '{}'::jsonb)::text, 'UTF8'), 'sha256'), 'hex');

  insert into eventing.events(
    event_id, event_name, event_version, occurred_at, producer,
    subject_type, subject_id, actor_type, actor_id, organization_id,
    journey_instance_id, aggregate_type, aggregate_id, aggregate_version,
    partition_key, correlation_id, causation_id, traceparent,
    evidence_nature, privacy_class, payload, payload_hash, schema_id
  ) values (
    p_event_id, p_event_name, p_event_version, p_occurred_at, p_producer,
    p_subject_type, p_subject_id, p_actor_type, p_actor_id, p_organization_id,
    p_journey_instance_id, p_aggregate_type, p_aggregate_id, p_aggregate_version,
    p_partition_key, p_correlation_id, p_causation_id, p_traceparent,
    p_evidence_nature, p_privacy_class, coalesce(p_payload, '{}'::jsonb), v_payload_hash, p_schema_id
  );

  foreach v_route in array p_route_keys loop
    if v_route is null or length(trim(v_route)) = 0 then
      raise exception 'invalid_route_key' using errcode = '22023';
    end if;
    insert into eventing.outbox(event_id, route_key, status, available_at)
    values (p_event_id, trim(v_route), 'pending', now())
    on conflict (event_id, route_key) do nothing;
  end loop;

  return p_event_id;
end;
$$;

create or replace function eventing.claim_outbox_batch(
  p_worker_id text,
  p_batch_size integer default 50,
  p_lease interval default interval '5 minutes'
) returns setof eventing.outbox
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if p_worker_id is null or length(trim(p_worker_id)) = 0 then
    raise exception 'worker_id_required' using errcode = '22023';
  end if;
  if p_batch_size < 1 or p_batch_size > 500 then
    raise exception 'invalid_batch_size' using errcode = '22023';
  end if;
  return query
  with candidates as (
    select o.id
    from eventing.outbox o
    where o.available_at <= now()
      and (
        o.status in ('pending', 'retry')
        or (o.status = 'processing' and o.claimed_at < now() - p_lease)
      )
    order by o.available_at, o.created_at
    for update skip locked
    limit p_batch_size
  )
  update eventing.outbox o
     set status = 'processing',
         claimed_at = now(),
         claimed_by = trim(p_worker_id),
         attempt_count = o.attempt_count + 1
    from candidates c
   where o.id = c.id
  returning o.*;
end;
$$;

create or replace function eventing.complete_outbox_item(
  p_outbox_id uuid,
  p_worker_id text
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  update eventing.outbox
     set status = 'completed', completed_at = now(), last_error_code = null
   where id = p_outbox_id and status = 'processing' and claimed_by = trim(p_worker_id);
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function eventing.retry_outbox_item(
  p_outbox_id uuid,
  p_worker_id text,
  p_error_code text,
  p_available_at timestamptz
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  update eventing.outbox
     set status = 'retry',
         available_at = greatest(p_available_at, now()),
         claimed_at = null,
         claimed_by = null,
         last_error_code = left(coalesce(p_error_code, 'unknown'), 120)
   where id = p_outbox_id and status = 'processing' and claimed_by = trim(p_worker_id);
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function eventing.move_outbox_to_dead_letter(
  p_outbox_id uuid,
  p_worker_id text,
  p_consumer_id uuid,
  p_reason_code text,
  p_reason_details jsonb
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_event_id uuid;
  v_dead_letter_id uuid;
begin
  select event_id into v_event_id
  from eventing.outbox
  where id = p_outbox_id and status = 'processing' and claimed_by = trim(p_worker_id)
  for update;
  if v_event_id is null then
    raise exception 'outbox_claim_not_owned' using errcode = '55000';
  end if;
  insert into eventing.dead_letters(
    event_id, consumer_id, source_type, reason_code, reason_details, status
  ) values (
    v_event_id, p_consumer_id, 'outbox', left(coalesce(p_reason_code, 'unknown'), 120),
    coalesce(p_reason_details, '{}'::jsonb), 'open'
  ) returning id into v_dead_letter_id;
  update eventing.outbox
     set status = 'dead_letter', completed_at = now(), last_error_code = left(coalesce(p_reason_code, 'unknown'), 120)
   where id = p_outbox_id;
  return v_dead_letter_id;
end;
$$;

create or replace function eventing.begin_consumer_processing(
  p_consumer_id uuid,
  p_event_id uuid
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  insert into eventing.consumer_inbox(
    consumer_id, event_id, status, processing_started_at, attempt_count
  ) values (
    p_consumer_id, p_event_id, 'processing', now(), 1
  ) on conflict (consumer_id, event_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function eventing.complete_consumer_processing(
  p_consumer_id uuid,
  p_event_id uuid
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  update eventing.consumer_inbox
     set status = 'processed', processed_at = now(), last_error_code = null
   where consumer_id = p_consumer_id and event_id = p_event_id and status = 'processing';
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

revoke all on all tables in schema eventing, integration, intelligence, governance from public;
revoke all on all functions in schema app_private from public;
revoke all on function iam.resolve_external_identity(text, text, text, text, boolean, text) from public;
revoke all on function iam.link_external_identity(uuid, text, text, text, text, boolean, text) from public;
