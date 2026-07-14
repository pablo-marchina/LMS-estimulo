-- Materialized from Supabase migration 20260714184729.
-- Remote name: activity_comments_schema
-- Corrections require a new migration.

create table engagement.activity_comments (
  id uuid primary key,
  organization_id uuid not null references iam.organizations(id),
  journey_instance_id uuid not null references orchestration.journey_instances(id),
  step_instance_id uuid not null references orchestration.step_instances(id),
  author_user_account_id uuid not null references iam.user_accounts(id),
  body text not null,
  status text not null default 'visible',
  aggregate_version bigint not null default 1,
  idempotency_key text not null,
  request_hash text not null,
  creation_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  moderated_by_user_account_id uuid references iam.user_accounts(id),
  moderated_at timestamptz,
  moderation_reason text,
  constraint activity_comments_status_check check (status in ('visible', 'hidden')),
  constraint activity_comments_body_check check (char_length(body) between 1 and 2000 and body = btrim(body)),
  constraint activity_comments_aggregate_version_check check (aggregate_version > 0),
  constraint activity_comments_idempotency_unique unique (author_user_account_id, idempotency_key)
);
create index activity_comments_step_created_idx on engagement.activity_comments(step_instance_id, created_at, id);
create index activity_comments_organization_status_created_idx on engagement.activity_comments(organization_id, status, created_at desc);
alter table engagement.activity_comments enable row level security;
alter table engagement.activity_comments force row level security;
revoke all on engagement.activity_comments from public, anon, authenticated;

create table engagement.activity_comment_moderations (
  id uuid primary key,
  comment_id uuid not null references engagement.activity_comments(id),
  organization_id uuid not null references iam.organizations(id),
  actor_user_account_id uuid not null references iam.user_accounts(id),
  from_status text not null,
  to_status text not null,
  reason text,
  changed boolean not null,
  idempotency_key text not null,
  request_hash text not null,
  result_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint activity_comment_moderations_status_check check (from_status in ('visible', 'hidden') and to_status in ('visible', 'hidden')),
  constraint activity_comment_moderations_reason_check check (to_status <> 'hidden' or nullif(btrim(reason), '') is not null),
  constraint activity_comment_moderations_idempotency_unique unique (actor_user_account_id, idempotency_key)
);
create index activity_comment_moderations_comment_created_idx on engagement.activity_comment_moderations(comment_id, created_at desc);
alter table engagement.activity_comment_moderations enable row level security;
alter table engagement.activity_comment_moderations force row level security;
revoke all on engagement.activity_comment_moderations from public, anon, authenticated;

with schemas(event_name, schema_document) as (
  values
  ('learning.activity.comment.created','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":true,"required":["comment_id","step_instance_id","body_length","status"],"properties":{"comment_id":{"type":"string","format":"uuid"},"step_instance_id":{"type":"string","format":"uuid"},"body_length":{"type":"integer","minimum":1,"maximum":2000},"status":{"const":"visible"}}}'::jsonb),
  ('learning.activity.comment.moderated','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":true,"required":["comment_id","from_status","to_status","changed","reason_present"],"properties":{"comment_id":{"type":"string","format":"uuid"},"from_status":{"enum":["visible","hidden"]},"to_status":{"enum":["visible","hidden"]},"changed":{"type":"boolean"},"reason_present":{"type":"boolean"}}}'::jsonb)
)
insert into eventing.event_schemas(id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at)
select app_private.e14_deterministic_uuid('event-schema:'||event_name||':1'),event_name,1,'urn:estimulo:event:'||event_name||':1',schema_document,app_private.e14_request_hash(schema_document),'published',now()
from schemas on conflict (event_name,event_version) do nothing;

insert into iam.role_permissions(role_id, permission_id)
select distinct source_grant.role_id, target_permission.id
from iam.role_permissions source_grant
join iam.permission_definitions source_permission on source_permission.id=source_grant.permission_id and source_permission.code='journey.execution.manage'
join iam.permission_definitions target_permission on target_permission.code='engagement.manage'
on conflict (role_id,permission_id) do nothing;
