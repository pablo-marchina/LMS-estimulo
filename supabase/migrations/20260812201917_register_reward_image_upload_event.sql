insert into eventing.event_schemas (
  id,
  event_name,
  event_version,
  schema_uri,
  schema_document,
  schema_hash,
  status,
  published_at
)
values (
  'a8488423-540f-4179-8c0c-0d3a6cdac5cc'::uuid,
  'engagement.reward_image.upload_requested',
  1,
  'urn:estimulo:event:engagement.reward_image.upload_requested:1',
  '{"type":"object","title":"engagement.reward_image.upload_requested","$schema":"https://json-schema.org/draft/2020-12/schema","required":["request_hash","result"],"properties":{"result":{"type":"object","required":["upload_intent_id","bucket","object_key","original_filename","expected_content_type","max_size_bytes"],"properties":{"bucket":{"type":"string"},"object_key":{"type":"string"},"max_size_bytes":{"type":"integer","minimum":1},"upload_intent_id":{"type":"string","format":"uuid"},"original_filename":{"type":"string"},"expected_content_type":{"type":"string"}},"additionalProperties":true},"request_hash":{"type":"string"}},"additionalProperties":true}'::jsonb,
  'f1931df81abdc61f71a38ffb6e2e1ee64c69ab8f797c93c76762ce731e8294b3',
  'published',
  '2026-08-12 20:19:03.640053+00'::timestamptz
)
on conflict (event_name, event_version) do update
set schema_uri = excluded.schema_uri,
    schema_document = excluded.schema_document,
    schema_hash = excluded.schema_hash,
    status = excluded.status,
    published_at = excluded.published_at;
