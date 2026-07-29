-- The original track presentation command emitted this event without first
-- registering its schema, causing every color/icon/required-state update to
-- roll back. Register it before the generic editor uses that command.

do $migration$
declare
  v_schema jsonb:=jsonb_build_object(
    '$schema','https://json-schema.org/draft/2020-12/schema',
    'title','admin.path.presentation.configured',
    'type','object',
    'additionalProperties',true
  );
begin
  insert into eventing.event_schemas(
    id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
  ) values (
    gen_random_uuid(),'admin.path.presentation.configured',1,
    'urn:estimulo:event:admin.path.presentation.configured:1',
    v_schema,app_private.e14_request_hash(v_schema),'published',now()
  ) on conflict(event_name,event_version) do nothing;
end;
$migration$;
