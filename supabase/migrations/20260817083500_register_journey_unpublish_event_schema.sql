begin;

do $migration$
declare
  v_schema_document jsonb := jsonb_build_object(
    '$schema', 'https://json-schema.org/draft/2020-12/schema',
    'title', 'admin.journey.unpublished',
    'type', 'object',
    'additionalProperties', true
  );
begin
  insert into eventing.event_schemas(
    id,
    event_name,
    event_version,
    schema_uri,
    schema_document,
    schema_hash,
    status,
    published_at
  ) values (
    gen_random_uuid(),
    'admin.journey.unpublished',
    1,
    'urn:estimulo:event:admin.journey.unpublished:1',
    v_schema_document,
    app_private.e14_request_hash(v_schema_document),
    'published',
    now()
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
