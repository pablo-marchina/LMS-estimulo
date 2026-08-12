-- Register the event emitted by create_reward_image_upload_intent.
-- Without this schema e14_append_event rejects every reward image upload intent
-- with EVENT_SCHEMA_NOT_FOUND:engagement.reward_image.upload_requested.

do $migration$
declare
  v_schema_document jsonb := jsonb_build_object(
    '$schema', 'https://json-schema.org/draft/2020-12/schema',
    'title', 'engagement.reward_image.upload_requested',
    'type', 'object',
    'required', jsonb_build_array('request_hash', 'result'),
    'properties', jsonb_build_object(
      'request_hash', jsonb_build_object('type', 'string'),
      'result', jsonb_build_object(
        'type', 'object',
        'required', jsonb_build_array(
          'upload_intent_id',
          'bucket',
          'object_key',
          'original_filename',
          'expected_content_type',
          'max_size_bytes'
        ),
        'properties', jsonb_build_object(
          'upload_intent_id', jsonb_build_object('type', 'string', 'format', 'uuid'),
          'bucket', jsonb_build_object('type', 'string'),
          'object_key', jsonb_build_object('type', 'string'),
          'original_filename', jsonb_build_object('type', 'string'),
          'expected_content_type', jsonb_build_object('type', 'string'),
          'max_size_bytes', jsonb_build_object('type', 'integer', 'minimum', 1)
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
    'engagement.reward_image.upload_requested',
    1,
    'urn:estimulo:event:engagement.reward_image.upload_requested:1',
    v_schema_document,
    app_private.e14_request_hash(v_schema_document),
    'published',
    now()
  )
  on conflict (event_name, event_version) do nothing;
end;
$migration$;
