insert into eventing.event_schemas(id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at)
select gen_random_uuid(),source.event_name,1,'urn:estimulo:event:'||source.event_name||':1',
  jsonb_build_object('$schema','https://json-schema.org/draft/2020-12/schema','title',source.event_name,'type','object','additionalProperties',true),
  encode(digest(convert_to(source.event_name||':1:announcement-banner-v1','UTF8'),'sha256'),'hex'),'published',now()
from (values
  ('engagement.announcement_banner.upload_requested'::text),
  ('engagement.announcement_banner.upload_confirmed'::text),
  ('engagement.announcement_banner.upload_failed'::text)
) source(event_name)
where not exists(
  select 1 from eventing.event_schemas existing
  where existing.event_name=source.event_name and existing.event_version=1
);
