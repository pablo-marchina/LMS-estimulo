-- Plataforma Estímulo — M06 — canonical events, transactional outbox and external integrations
-- Generated from the approved v0.2 baseline. Do not edit a migration after it has been applied.
set lock_timeout = '5s';
set statement_timeout = '5min';

create table eventing.event_schemas (
  id uuid default gen_random_uuid() not null,
  event_name text not null,
  event_version integer not null,
  schema_uri text not null,
  schema_document jsonb not null,
  schema_hash text not null,
  status text not null,
  published_at timestamptz not null,
  constraint pk_eventing_event_schemas primary key (id),
  constraint uq_eventing_event_schemas_event_name_event_version unique (event_name, event_version),
  constraint uq_eventing_event_schemas_schema_hash unique (schema_hash)
);

create table eventing.events (
  event_id uuid default gen_random_uuid() not null,
  event_name text not null,
  event_version integer not null,
  occurred_at timestamptz not null,
  received_at timestamptz default now() not null,
  producer text not null,
  subject_type text not null,
  subject_id uuid,
  actor_type text not null,
  actor_id uuid,
  organization_id uuid,
  journey_instance_id uuid,
  aggregate_type text,
  aggregate_id uuid,
  aggregate_version bigint default 0,
  partition_key text not null,
  correlation_id uuid not null,
  causation_id uuid,
  traceparent text,
  evidence_nature text not null,
  privacy_class text not null,
  payload jsonb not null,
  payload_hash text not null,
  schema_id uuid not null,
  created_at timestamptz default now() not null,
  constraint pk_eventing_events primary key (event_id)
);

create table eventing.outbox (
  id uuid default gen_random_uuid() not null,
  event_id uuid default gen_random_uuid() not null,
  route_key text not null,
  status text not null,
  available_at timestamptz not null,
  claimed_at timestamptz,
  claimed_by text,
  attempt_count integer default 0 not null,
  last_error_code text,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  constraint pk_eventing_outbox primary key (id),
  constraint uq_eventing_outbox_event_id_route_key unique (event_id, route_key)
);

create table eventing.consumer_definitions (
  id uuid default gen_random_uuid() not null,
  code text not null,
  name text not null,
  status text not null,
  max_attempts integer not null,
  retry_policy jsonb not null,
  dead_letter_policy jsonb not null,
  constraint pk_eventing_consumer_definitions primary key (id),
  constraint uq_eventing_consumer_definitions_code unique (code)
);

create table eventing.consumer_inbox (
  consumer_id uuid not null,
  event_id uuid default gen_random_uuid() not null,
  status text not null,
  received_at timestamptz default now() not null,
  processing_started_at timestamptz,
  processed_at timestamptz,
  attempt_count integer default 0 not null,
  last_error_code text,
  constraint pk_eventing_consumer_inbox primary key (consumer_id, event_id)
);

create table eventing.delivery_attempts (
  id uuid default gen_random_uuid() not null,
  outbox_id uuid not null,
  consumer_id uuid not null,
  attempt_number integer not null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  error_code text,
  error_details jsonb not null,
  constraint pk_eventing_delivery_attempts primary key (id),
  constraint uq_eventing_delivery_attempts_outbox_id_consumer_id_44932c15 unique (outbox_id, consumer_id, attempt_number)
);

create table eventing.dead_letters (
  id uuid default gen_random_uuid() not null,
  event_id uuid default gen_random_uuid() not null,
  consumer_id uuid,
  source_type text not null,
  reason_code text not null,
  reason_details jsonb not null,
  status text not null,
  created_at timestamptz default now() not null,
  resolved_at timestamptz,
  resolution text,
  constraint pk_eventing_dead_letters primary key (id)
);

create table eventing.projection_checkpoints (
  projection_code text not null,
  partition_key text not null,
  last_event_id uuid,
  last_received_at timestamptz,
  projection_version bigint default 0 not null,
  updated_at timestamptz default now() not null,
  constraint pk_eventing_projection_checkpoints primary key (projection_code, partition_key)
);

create table integration.connections (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  provider text not null,
  environment text not null,
  status text not null,
  secret_reference text not null,
  configuration jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint pk_integration_connections primary key (id),
  constraint uq_integration_connections_organization_id_provider_f7a42132 unique (organization_id, provider, environment)
);

create table integration.external_object_mappings (
  id uuid default gen_random_uuid() not null,
  connection_id uuid not null,
  internal_entity_type text not null,
  internal_entity_id uuid not null,
  external_object_type text not null,
  external_object_id text not null,
  status text not null,
  first_synced_at timestamptz not null,
  last_synced_at timestamptz not null,
  metadata jsonb not null,
  constraint pk_integration_external_object_mappings primary key (id),
  constraint uq_integration_external_object_mappings_connection__c7aca520 unique (connection_id, external_object_type, external_object_id),
  constraint uq_integration_external_object_mappings_connection__a8df7c70 unique (connection_id, internal_entity_type, internal_entity_id, external_object_type)
);

create table integration.mapping_definitions (
  id uuid default gen_random_uuid() not null,
  connection_id uuid not null,
  code text not null,
  direction text not null,
  internal_entity_type text not null,
  external_object_type text not null,
  status text not null,
  constraint pk_integration_mapping_definitions primary key (id),
  constraint uq_integration_mapping_definitions_connection_id_code unique (connection_id, code)
);

create table integration.mapping_versions (
  id uuid default gen_random_uuid() not null,
  mapping_definition_id uuid not null,
  version_number integer not null,
  status text not null,
  field_mappings jsonb not null,
  validation_schema jsonb not null,
  published_at timestamptz not null,
  content_hash text not null,
  constraint pk_integration_mapping_versions primary key (id),
  constraint uq_integration_mapping_versions_mapping_definition__48dd9ae1 unique (mapping_definition_id, version_number)
);

create table integration.sync_jobs (
  id uuid default gen_random_uuid() not null,
  connection_id uuid not null,
  mapping_version_id uuid not null,
  source_event_id uuid,
  operation text not null,
  internal_entity_type text not null,
  internal_entity_id uuid not null,
  idempotency_key text not null,
  status text not null,
  scheduled_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  external_object_id text,
  attempt_count integer default 0 not null,
  last_error_code text,
  constraint pk_integration_sync_jobs primary key (id),
  constraint uq_integration_sync_jobs_idempotency_key unique (idempotency_key)
);

create table integration.sync_attempts (
  id uuid default gen_random_uuid() not null,
  sync_job_id uuid not null,
  attempt_number integer not null,
  status text not null,
  request_hash text not null,
  response_status integer,
  response_reference text,
  started_at timestamptz not null,
  finished_at timestamptz,
  error_code text,
  error_details jsonb not null,
  constraint pk_integration_sync_attempts primary key (id),
  constraint uq_integration_sync_attempts_sync_job_id_attempt_number unique (sync_job_id, attempt_number)
);

create table integration.conflicts (
  id uuid default gen_random_uuid() not null,
  connection_id uuid not null,
  internal_entity_type text not null,
  internal_entity_id uuid not null,
  external_object_type text not null,
  external_object_id text,
  field_name text,
  internal_value_hash text,
  external_value_hash text,
  status text not null,
  detected_at timestamptz not null,
  resolved_at timestamptz,
  resolution text,
  constraint pk_integration_conflicts primary key (id)
);

create table integration.reconciliation_runs (
  id uuid default gen_random_uuid() not null,
  connection_id uuid not null,
  scope jsonb not null,
  status text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  summary jsonb not null,
  constraint pk_integration_reconciliation_runs primary key (id)
);

create table integration.reconciliation_items (
  id uuid default gen_random_uuid() not null,
  run_id uuid not null,
  internal_entity_type text not null,
  internal_entity_id uuid,
  external_object_type text not null,
  external_object_id text,
  status text not null,
  difference_summary jsonb not null,
  action_taken text,
  constraint pk_integration_reconciliation_items primary key (id)
);

create table integration.webhook_receipts (
  id uuid default gen_random_uuid() not null,
  connection_id uuid not null,
  provider_event_id text,
  received_at timestamptz default now() not null,
  signature_status text not null,
  replay_status text not null,
  payload_hash text not null,
  payload_object_reference text,
  status text not null,
  normalized_event_id uuid,
  rejection_reason text,
  constraint pk_integration_webhook_receipts primary key (id),
  constraint uq_integration_webhook_receipts_connection_id_provi_d62a0602 unique (connection_id, provider_event_id),
  constraint uq_integration_webhook_receipts_connection_id_payload_hash unique (connection_id, payload_hash)
);
