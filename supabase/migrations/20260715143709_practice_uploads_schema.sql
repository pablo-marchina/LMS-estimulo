insert into core.file_upload_profiles(
  code,description,allowed_mime_types,allowed_extensions,max_size_bytes,
  retention_class,requires_malware_scan,status
) values (
  'practice_evidence_v1',
  'Evidence uploaded by a participant for an LMS practice activity.',
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  array['pdf','png','jpg','jpeg','webp','txt','docx'],
  6291456,
  'learning_evidence',
  true,
  'active'
) on conflict (code) do update set
  description=excluded.description,
  allowed_mime_types=excluded.allowed_mime_types,
  allowed_extensions=excluded.allowed_extensions,
  max_size_bytes=excluded.max_size_bytes,
  retention_class=excluded.retention_class,
  requires_malware_scan=excluded.requires_malware_scan,
  status=excluded.status;

alter table assessment.submissions
  add column if not exists created_by_user_account_id uuid,
  add column if not exists upload_intent_id uuid,
  add column if not exists creation_idempotency_key text,
  add column if not exists creation_request_hash text,
  add column if not exists creation_snapshot jsonb,
  add column if not exists confirmation_idempotency_key text,
  add column if not exists confirmation_request_hash text,
  add column if not exists confirmation_snapshot jsonb;

alter table assessment.submissions
  drop constraint if exists fk_assessment_submissions_created_by_user_account,
  add constraint fk_assessment_submissions_created_by_user_account
    foreign key (created_by_user_account_id) references iam.user_accounts(id),
  drop constraint if exists fk_assessment_submissions_upload_intent,
  add constraint fk_assessment_submissions_upload_intent
    foreign key (upload_intent_id) references core.file_upload_intents(id);

create unique index if not exists uq_assessment_submissions_creation_idempotency
  on assessment.submissions(created_by_user_account_id,creation_idempotency_key)
  where creation_idempotency_key is not null;
create unique index if not exists uq_assessment_submissions_confirmation_idempotency
  on assessment.submissions(created_by_user_account_id,confirmation_idempotency_key)
  where confirmation_idempotency_key is not null;
create unique index if not exists uq_assessment_submissions_upload_intent
  on assessment.submissions(upload_intent_id)
  where upload_intent_id is not null;

alter table assessment.reviews
  add column if not exists idempotency_key text,
  add column if not exists request_hash text,
  add column if not exists result_snapshot jsonb,
  add column if not exists changed boolean;

create unique index if not exists uq_assessment_reviews_actor_idempotency
  on assessment.reviews(reviewer_user_account_id,idempotency_key)
  where reviewer_user_account_id is not null and idempotency_key is not null;

with schemas(event_name,schema_document) as (
  values
  ('learning.practice.upload.requested','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":true,"required":["submission_id","step_instance_id","upload_intent_id","allow_public_use"],"properties":{"submission_id":{"type":"string","format":"uuid"},"step_instance_id":{"type":"string","format":"uuid"},"upload_intent_id":{"type":"string","format":"uuid"},"allow_public_use":{"type":"boolean"}}}'::jsonb),
  ('learning.practice.evidence.confirmed','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":true,"required":["submission_id","file_object_id","security_status","size_bytes"],"properties":{"submission_id":{"type":"string","format":"uuid"},"file_object_id":{"type":"string","format":"uuid"},"security_status":{"type":"string"},"size_bytes":{"type":"integer","minimum":0}}}'::jsonb),
  ('learning.practice.upload.failed','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":true,"required":["submission_id","failure_code"],"properties":{"submission_id":{"type":"string","format":"uuid"},"failure_code":{"type":"string"}}}'::jsonb),
  ('learning.practice.review.completed','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":true,"required":["submission_id","review_id","status","feedback_present"],"properties":{"submission_id":{"type":"string","format":"uuid"},"review_id":{"type":"string","format":"uuid"},"status":{"enum":["accepted","rejected"]},"feedback_present":{"type":"boolean"}}}'::jsonb)
)
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select
  app_private.e14_deterministic_uuid('event-schema:'||event_name||':1'),event_name,1,
  'urn:estimulo:event:'||event_name||':1',schema_document,
  app_private.e14_request_hash(schema_document),'published',now()
from schemas on conflict (event_name,event_version) do nothing;

insert into iam.role_permissions(role_id,permission_id)
select distinct source_grant.role_id,target_permission.id
from iam.role_permissions source_grant
join iam.permission_definitions source_permission
  on source_permission.id=source_grant.permission_id
 and source_permission.code='journey.execution.manage'
join iam.permission_definitions target_permission
  on target_permission.code='assessment.review'
on conflict (role_id,permission_id) do nothing;
