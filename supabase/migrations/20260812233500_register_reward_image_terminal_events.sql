begin;

do $migration$
declare
  v_confirmed jsonb := jsonb_build_object(
    '$schema', 'https://json-schema.org/draft/2020-12/schema',
    'title', 'engagement.reward_image.confirmed',
    'type', 'object',
    'required', jsonb_build_array('request_hash', 'result'),
    'properties', jsonb_build_object(
      'request_hash', jsonb_build_object('type', 'string'),
      'result', jsonb_build_object(
        'type', 'object',
        'required', jsonb_build_array('file_object_id', 'original_filename', 'status'),
        'properties', jsonb_build_object(
          'file_object_id', jsonb_build_object('type', 'string', 'format', 'uuid'),
          'original_filename', jsonb_build_object('type', 'string'),
          'status', jsonb_build_object('type', 'string')
        ),
        'additionalProperties', true
      )
    ),
    'additionalProperties', true
  );
  v_failed jsonb := jsonb_build_object(
    '$schema', 'https://json-schema.org/draft/2020-12/schema',
    'title', 'engagement.reward_image.upload_failed',
    'type', 'object',
    'required', jsonb_build_array('result'),
    'properties', jsonb_build_object(
      'result', jsonb_build_object(
        'type', 'object',
        'required', jsonb_build_array('upload_intent_id', 'status', 'failure_code'),
        'properties', jsonb_build_object(
          'upload_intent_id', jsonb_build_object('type', 'string', 'format', 'uuid'),
          'status', jsonb_build_object('type', 'string'),
          'failure_code', jsonb_build_object('type', 'string')
        ),
        'additionalProperties', true
      )
    ),
    'additionalProperties', true
  );
begin
  insert into eventing.event_schemas(
    event_name, event_version, schema_uri, schema_document, schema_hash, status, published_at
  ) values (
    'engagement.reward_image.confirmed', 1,
    'urn:estimulo:event:engagement.reward_image.confirmed:1',
    v_confirmed,
    app_private.e14_request_hash(v_confirmed),
    'published', now()
  )
  on conflict (event_name, event_version) do update
    set schema_uri = excluded.schema_uri,
        schema_document = excluded.schema_document,
        schema_hash = excluded.schema_hash,
        status = 'published',
        published_at = coalesce(eventing.event_schemas.published_at, excluded.published_at);

  insert into eventing.event_schemas(
    event_name, event_version, schema_uri, schema_document, schema_hash, status, published_at
  ) values (
    'engagement.reward_image.upload_failed', 1,
    'urn:estimulo:event:engagement.reward_image.upload_failed:1',
    v_failed,
    app_private.e14_request_hash(v_failed),
    'published', now()
  )
  on conflict (event_name, event_version) do update
    set schema_uri = excluded.schema_uri,
        schema_document = excluded.schema_document,
        schema_hash = excluded.schema_hash,
        status = 'published',
        published_at = coalesce(eventing.event_schemas.published_at, excluded.published_at);
end;
$migration$;

commit;
