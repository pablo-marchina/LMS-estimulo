-- Register audit events emitted by the generic journey editor commands.

do $migration$
declare
  v_event_name text;
  v_schema jsonb;
begin
  foreach v_event_name in array array[
    'catalog.journey_version.draft_cloned',
    'catalog.activity.parts.cleared',
    'engagement.path_badge.saved'
  ] loop
    v_schema:=jsonb_build_object(
      '$schema','https://json-schema.org/draft/2020-12/schema',
      'title',v_event_name,
      'type','object',
      'additionalProperties',true
    );
    insert into eventing.event_schemas(
      id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
    ) values (
      gen_random_uuid(),v_event_name,1,
      'urn:estimulo:event:'||v_event_name||':1',
      v_schema,app_private.e14_request_hash(v_schema),'published',now()
    ) on conflict(event_name,event_version) do nothing;
  end loop;
end;
$migration$;
