set lock_timeout = '5s';
set statement_timeout = '5min';

with event_names(event_name) as (
  values ('iam.role.granted'),('iam.role.revoked')
), schemas as (
  select
    event_name,
    jsonb_build_object(
      '$schema','https://json-schema.org/draft/2020-12/schema',
      'title',event_name,
      'type','object',
      'additionalProperties',true,
      'required',jsonb_build_array('request_hash','result'),
      'properties',jsonb_build_object(
        'request_hash',jsonb_build_object('type','string'),
        'result',jsonb_build_object('type','object')
      )
    ) as schema_document
  from event_names
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
on conflict (event_name,event_version) do nothing;
