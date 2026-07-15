\set ON_ERROR_STOP on

with schemas(event_name,schema_document) as (
  values
  ('learning.credentials.issued','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":true,"required":["journey_instance_id","request_hash","result"],"properties":{"journey_instance_id":{"type":"string","format":"uuid"},"step_instance_id":{"type":["string","null"]},"request_hash":{"type":"string"},"result":{"type":"object"}}}'::jsonb)
)
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select
  app_private.e14_deterministic_uuid('event-schema:'||event_name||':1'),event_name,1,
  'urn:estimulo:event:'||event_name||':1',schema_document,
  app_private.e14_request_hash(schema_document),'published',now()
from schemas on conflict (event_name,event_version) do nothing;

create or replace function app_private.credential_rule_matches(
  p_rule_version_id uuid,
  p_scope text,
  p_journey_version_id uuid,
  p_activity_version_id uuid,
  p_completed boolean,
  p_required_steps_completed boolean,
  p_assessments_passed boolean
) returns boolean
language sql
stable
set search_path=pg_catalog
as $$
  select exists (
    select 1
    from orchestration.rule_versions rv
    where rv.id=p_rule_version_id
      and rv.status='published'
      and rv.language='credential-v1'
      and rv.expression->>'scope'=p_scope
      and case p_scope
        when 'journey' then rv.expression->>'journey_version_id'=p_journey_version_id::text
        when 'activity' then rv.expression->>'activity_version_id'=p_activity_version_id::text
        else false
      end
      and case lower(coalesce(rv.expression->>'requires_completed_status','true'))
        when 'true' then p_completed when 'false' then true else false end
      and case lower(coalesce(rv.expression->>'requires_required_steps_completed','false'))
        when 'true' then p_required_steps_completed when 'false' then true else false end
      and case lower(coalesce(rv.expression->>'requires_passed_assessment','true'))
        when 'true' then p_assessments_passed when 'false' then true else false end
  );
$$;

revoke all on function app_private.credential_rule_matches(uuid,text,uuid,uuid,boolean,boolean,boolean)
  from public,anon,authenticated;
