\set ON_ERROR_STOP on

-- These records exist in the Supabase test environment but were created outside
-- the recovered migration history. They are materialized only inside the
-- ephemeral backend E2E database.

insert into diagnostics.items(
  id, diagnostic_version_id, dimension_id, code, item_type, prompt, configuration, position, is_required
) values
('1123079a-5743-525f-ad69-018620b98ab2', app_private.e14_deterministic_uuid('e14:diagnostic-version:v1'), app_private.e14_deterministic_uuid('e14:dimension:tool'), 'q1_digital_assistant_frequency', 'single_choice', 'Frequencia de uso de ferramentas digitais?', '{}'::jsonb, 1, true),
('33213323-eeaf-5519-ab52-63477f4244f7', app_private.e14_deterministic_uuid('e14:diagnostic-version:v1'), app_private.e14_deterministic_uuid('e14:dimension:tool'), 'q2_follow_instructions', 'single_choice', 'Avanco com instrucoes passo a passo?', '{}'::jsonb, 2, true),
('70f6c2a7-45d4-50f6-a024-f33470b9da1c', app_private.e14_deterministic_uuid('e14:diagnostic-version:v1'), app_private.e14_deterministic_uuid('e14:dimension:review'), 'q3_identify_components', 'single_choice', 'Consigo separar entrada regra e resultado?', '{}'::jsonb, 3, true),
('5a9cd4d9-b5f9-547a-add3-fefc56b2d943', app_private.e14_deterministic_uuid('e14:diagnostic-version:v1'), app_private.e14_deterministic_uuid('e14:dimension:review'), 'q4_review_output', 'single_choice', 'Reviso o resultado antes do uso?', '{}'::jsonb, 4, true)
on conflict (diagnostic_version_id, code) do nothing;

insert into diagnostics.item_options(id,item_id,code,label,value,position) values
('c48f4834-aa6c-54f0-a588-765cfc0a85c5','1123079a-5743-525f-ad69-018620b98ab2','o0','Nivel zero','{"score":0,"uncertain":false}'::jsonb,1),
('441aceec-ae34-55ee-a1a1-8c8d5163f6f5','1123079a-5743-525f-ad69-018620b98ab2','o1','Nivel um','{"score":1,"uncertain":false}'::jsonb,2),
('8981866f-c3d5-5ccd-a36c-2ffc4e402f2a','1123079a-5743-525f-ad69-018620b98ab2','o2','Nivel dois','{"score":2,"uncertain":false}'::jsonb,3),
('e3287ca7-248e-5fb9-acf8-db4bda47520c','1123079a-5743-525f-ad69-018620b98ab2','unknown','Nao sei avaliar','{"score":0,"uncertain":true}'::jsonb,4),
('4e7c5e47-5e1c-58e5-a961-610aa6c68e58','33213323-eeaf-5519-ab52-63477f4244f7','o0','Nivel zero','{"score":0,"uncertain":false}'::jsonb,1),
('dd6b9d29-cdcc-51b8-a360-444d966a782d','33213323-eeaf-5519-ab52-63477f4244f7','o1','Nivel um','{"score":1,"uncertain":false}'::jsonb,2),
('e52c57de-4120-5d5c-a752-ae5079f2f6ea','33213323-eeaf-5519-ab52-63477f4244f7','o2','Nivel dois','{"score":2,"uncertain":false}'::jsonb,3),
('7e3e71d7-d9fb-5ca1-ab79-ad2155b34048','33213323-eeaf-5519-ab52-63477f4244f7','unknown','Nao sei avaliar','{"score":0,"uncertain":true}'::jsonb,4),
('230b494d-9975-5691-a3b9-697f3137827b','70f6c2a7-45d4-50f6-a024-f33470b9da1c','o0','Nivel zero','{"score":0,"uncertain":false}'::jsonb,1),
('63dd975d-cd8f-533b-acbd-0a2257e40bd2','70f6c2a7-45d4-50f6-a024-f33470b9da1c','o1','Nivel um','{"score":1,"uncertain":false}'::jsonb,2),
('c5af7591-1ea5-56ea-a1e3-8276e07bc93a','70f6c2a7-45d4-50f6-a024-f33470b9da1c','o2','Nivel dois','{"score":2,"uncertain":false}'::jsonb,3),
('482db7b8-4391-590b-a3e1-5d47c6732ea0','70f6c2a7-45d4-50f6-a024-f33470b9da1c','unknown','Nao sei avaliar','{"score":0,"uncertain":true}'::jsonb,4),
('224144e9-b04d-5d89-a5b7-a3fcd6ef3f81','5a9cd4d9-b5f9-547a-add3-fefc56b2d943','o0','Nivel zero','{"score":0,"uncertain":false}'::jsonb,1),
('a69a666e-41ca-5a01-a86e-49c6a7a90307','5a9cd4d9-b5f9-547a-add3-fefc56b2d943','o1','Nivel um','{"score":1,"uncertain":false}'::jsonb,2),
('bd3aa627-df43-5244-a1e1-73ebf8c96289','5a9cd4d9-b5f9-547a-add3-fefc56b2d943','o2','Nivel dois','{"score":2,"uncertain":false}'::jsonb,3),
('87aa4c48-38e6-56c3-ac1d-acb4c4183984','5a9cd4d9-b5f9-547a-add3-fefc56b2d943','unknown','Nao sei avaliar','{"score":0,"uncertain":true}'::jsonb,4)
on conflict (item_id, code) do nothing;

insert into orchestration.path_templates(id,journey_version_id,code,name,description,is_default,status) values
('829dabbd-aaec-5de0-a443-9d1de02b0334',app_private.e14_deterministic_uuid('e14:journey-version:v1'),'guided','Caminho guiado','Apresentacao guiada da atividade.',true,'draft'),
('6e43a0d5-ccf7-5e16-a6e8-9e8d1e39cd1c',app_private.e14_deterministic_uuid('e14:journey-version:v1'),'standard','Caminho direto','Apresentacao direta da atividade.',false,'draft')
on conflict (journey_version_id, code) do nothing;

insert into orchestration.path_steps(
  id,path_template_id,code,activity_version_id,position_hint,is_required,
  availability_rule_version_id,completion_rule_version_id,due_offset,metadata
) values
('3adecac4-6198-56f5-a243-d00f895d0786','829dabbd-aaec-5de0-a443-9d1de02b0334','activity',app_private.e14_deterministic_uuid('e14:activity-version:v1'),1,true,null,null,null,'{"presentation_mode":"guided","required_sections":["input","rule","output","human_validation"]}'::jsonb),
('83797c1d-8de4-5aa3-a749-5dafdd33a808','6e43a0d5-ccf7-5e16-a6e8-9e8d1e39cd1c','activity',app_private.e14_deterministic_uuid('e14:activity-version:v1'),1,true,null,null,null,'{"presentation_mode":"standard","required_sections":["input","rule","output","human_validation"]}'::jsonb)
on conflict (path_template_id, code) do nothing;

with event_names(event_name) as (
  values
    ('assessment.answer.recorded'),('assessment.attempt.failed'),('assessment.attempt.passed'),
    ('assessment.attempt.scored'),('assessment.attempt.started'),('assessment.attempt.submitted'),
    ('assessment.feedback.available'),('catalog.activity_version.published'),
    ('catalog.assessment_version.published'),('catalog.diagnostic_version.published'),
    ('catalog.journey_version.published'),('diagnostic.response.recorded'),
    ('diagnostic.result.generated'),('diagnostic.session.completed'),('diagnostic.session.started'),
    ('engagement.points.awarded'),('journey.enrollment.activated'),('journey.enrollment.created'),
    ('journey.instance.available'),('journey.instance.completed'),('journey.instance.started'),
    ('journey.path.assigned'),('journey.path.completed'),('journey.path.started'),
    ('journey.step.available'),('learning.activity.completed'),('learning.activity.progressed'),
    ('learning.activity.started'),('personalization.uncertainty.recorded')
), documents as (
  select event_name,jsonb_build_object(
    'type','object','title',event_name,
    '$schema','https://json-schema.org/draft/2020-12/schema',
    'additionalProperties',true
  ) as schema_document
  from event_names
)
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select
  app_private.e14_deterministic_uuid('e14:event-schema:' || event_name || ':1'),
  event_name,1,'urn:estimulo:event:' || event_name || ':1',schema_document,
  app_private.e14_request_hash(schema_document),'published',
  '2026-07-09T05:10:56.317612Z'::timestamptz
from documents
on conflict do nothing;
