-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708222008
-- Remote name: m08m_fix_pgcrypto_schema_qualification
-- Remote SQL SHA-256: 40742b7d1fff809b59c18f7b946ca3f379fe67ef6f96631de97ae2dce676279e
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
  v_payload_hash := encode(extensions.digest(convert_to(coalesce(p_payload, '{}'::jsonb)::text, 'UTF8'), 'sha256'), 'hex');

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
