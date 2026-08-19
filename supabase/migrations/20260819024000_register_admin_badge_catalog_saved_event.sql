-- save_admin_badge_catalog emits this event after persisting the definition/version.
-- Registering the schema is required or e14_append_event aborts and rolls back
-- the entire badge save transaction.
do $migration$
declare
  v_schema_document jsonb := jsonb_build_object(
    '$schema', 'https://json-schema.org/draft/2020-12/schema',
    'title', 'admin.badge.catalog.saved',
    'type', 'object',
    'required', jsonb_build_array('request_hash', 'result'),
    'properties', jsonb_build_object(
      'request_hash', jsonb_build_object('type', 'string'),
      'result', jsonb_build_object(
        'type', 'object',
        'required', jsonb_build_array('definition_id', 'version_id', 'status'),
        'properties', jsonb_build_object(
          'definition_id', jsonb_build_object('type', 'string', 'format', 'uuid'),
          'version_id', jsonb_build_object('type', 'string', 'format', 'uuid'),
          'criteria_rule_version_id', jsonb_build_object('type', jsonb_build_array('string', 'null')),
          'status', jsonb_build_object('type', 'string', 'enum', jsonb_build_array('draft', 'published'))
        ),
        'additionalProperties', true
      )
    ),
    'additionalProperties', true
  );
begin
  insert into eventing.event_schemas (
    event_name,
    event_version,
    schema_uri,
    schema_document,
    schema_hash,
    status,
    published_at
  )
  values (
    'admin.badge.catalog.saved',
    1,
    'urn:estimulo:event:admin.badge.catalog.saved:1',
    v_schema_document,
    app_private.e14_request_hash(v_schema_document),
    'published',
    now()
  )
  on conflict (event_name, event_version) do update
  set schema_uri=excluded.schema_uri,
      schema_document=excluded.schema_document,
      schema_hash=excluded.schema_hash,
      status='published',
      published_at=coalesce(eventing.event_schemas.published_at, excluded.published_at);
end;
$migration$;
