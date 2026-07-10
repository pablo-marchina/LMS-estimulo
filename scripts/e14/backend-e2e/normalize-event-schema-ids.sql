\set ON_ERROR_STOP on

create temporary table e14_event_schema_ids(
  id uuid primary key,
  event_name text unique not null
) on commit preserve rows;

insert into e14_event_schema_ids(id,event_name) values
('e85a6dae-d34f-45cb-9171-f67ce9a0d217','assessment.answer.recorded'),
('dbb838f7-04cb-4974-8bd4-d74652dc3974','assessment.attempt.failed'),
('5e9e983c-980c-4c33-9e0b-0f88ad310c38','assessment.attempt.passed'),
('3ad33088-ba40-4265-9f4d-d4363244bebe','assessment.attempt.scored'),
('358595b5-2c75-4d25-aab7-98a8ddbe00b6','assessment.attempt.started'),
('316e30d0-d03e-42d1-a0e4-fe62f8568716','assessment.attempt.submitted'),
('b5924a50-5d04-45e6-859e-e68f7ce6d81b','assessment.feedback.available'),
('de9faf1e-6edf-4fd5-8864-12b0a9547d5d','catalog.activity_version.published'),
('98d68962-dfa0-42f0-83e3-bccb00ba0a18','catalog.assessment_version.published'),
('cb29b3da-8173-4f89-9916-bfac4f1425e7','catalog.diagnostic_version.published'),
('4ae4f429-0105-4be8-a7c7-6b0e8d43c3cd','catalog.journey_version.published'),
('5107a3f3-36a8-43db-9ff0-628e92372c70','diagnostic.response.recorded'),
('e1dd0885-dca6-4d89-8741-5683e940b1c0','diagnostic.result.generated'),
('041e646a-d96f-4fe9-b0bd-1401f97bf153','diagnostic.session.completed'),
('5b3dbd7f-718e-4081-990e-37d96fa638de','diagnostic.session.started'),
('759ce3da-8b1f-4977-b2de-183775004afc','engagement.points.awarded'),
('8d87a872-8e4d-404d-99d8-956fc1df5a50','journey.enrollment.activated'),
('568818ae-8f69-4e10-81ee-953d53eb7578','journey.enrollment.created'),
('a77617ed-4df2-4a97-aa61-2b320fadf35b','journey.instance.available'),
('06398740-a20e-4b6c-a501-d1992bddf3f4','journey.instance.completed'),
('05dabb76-4f98-4ae3-84c5-63e4c25e9aa4','journey.instance.started'),
('7a5b9559-6b22-409a-a17d-39abd5e2c7c0','journey.path.assigned'),
('de21d6b1-7ac3-49ff-b14c-fe7adb2400d6','journey.path.completed'),
('8a88414d-e44a-4ebe-984a-40733da7a489','journey.path.started'),
('646223e0-18c3-4a7b-8865-dff76db0d173','journey.step.available'),
('92a76bac-6b22-4e8a-98ac-c529000d210e','learning.activity.completed'),
('b148150e-6b30-44a5-9b08-2cae44144ec4','learning.activity.progressed'),
('ae5dc35f-8ab3-45e7-ae79-94a869d88476','learning.activity.started'),
('7bbd12dc-7834-4c8d-b566-d5d9d80427e2','personalization.uncertainty.recorded');

delete from eventing.event_schemas es
using e14_event_schema_ids mapping
where es.event_name=mapping.event_name and es.event_version=1;

with documents as (
  select mapping.id,mapping.event_name,jsonb_build_object(
    'type','object','title',mapping.event_name,
    '$schema','https://json-schema.org/draft/2020-12/schema',
    'additionalProperties',true
  ) as schema_document
  from e14_event_schema_ids mapping
)
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select id,event_name,1,'urn:estimulo:event:'||event_name||':1',schema_document,
       app_private.e14_request_hash(schema_document),'published',
       '2026-07-09T05:10:56.317612Z'::timestamptz
from documents;
