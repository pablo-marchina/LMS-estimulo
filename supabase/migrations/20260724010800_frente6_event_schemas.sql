-- Register audit event schemas required by the Frente 6 identity and library commands.

with names(event_name) as (
  values
    ('integration.identity_resolution.queued'),
    ('integration.identity_resolution.decision_recorded'),
    ('catalog.library_file.upload_requested'),
    ('catalog.library_file.upload_confirmed'),
    ('catalog.library_file.upload_failed')
), schemas as (
  select event_name,
    jsonb_build_object(
      '$schema','https://json-schema.org/draft/2020-12/schema',
      'title',event_name,
      'type','object',
      'required',jsonb_build_array('result'),
      'properties',jsonb_build_object(
        'request_hash',jsonb_build_object('type','string'),
        'result',jsonb_build_object('type','object')
      ),
      'additionalProperties',true
    ) as schema_document
  from names
)
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select
  app_private.e14_deterministic_uuid('event-schema:'||event_name||':1'),
  event_name,
  1,
  'urn:estimulo:event:'||event_name||':1',
  schema_document,
  app_private.e14_request_hash(schema_document),
  'published',
  now()
from schemas
on conflict (event_name,event_version) do update set
  schema_uri=excluded.schema_uri,
  schema_document=excluded.schema_document,
  schema_hash=excluded.schema_hash,
  status='published',
  published_at=excluded.published_at;
