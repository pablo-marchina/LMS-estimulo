\set ON_ERROR_STOP on

create table if not exists catalog.library_items (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id),
  code text not null,
  slug text not null,
  status text not null default 'active',
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_items_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint library_items_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint library_items_status check (status in ('active','archived')),
  constraint library_items_org_code_unique unique (owner_organization_id, code),
  constraint library_items_slug_unique unique (slug)
);

create table if not exists catalog.library_item_versions (
  id uuid primary key default gen_random_uuid(),
  library_item_id uuid not null references catalog.library_items(id) on delete cascade,
  version_number integer not null,
  status text not null default 'draft',
  title text not null,
  summary text not null,
  body text,
  content_kind text not null,
  content_format text not null,
  level text not null,
  estimated_minutes integer not null,
  source_type text not null,
  source_name text not null,
  external_url text,
  language_code text not null default 'pt-BR',
  topics text[] not null default '{}'::text[],
  visibility text not null default 'authenticated',
  accessibility_metadata jsonb not null default '{}'::jsonb,
  content_hash text not null,
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  retired_at timestamptz,
  search_document tsvector not null default ''::tsvector,
  constraint library_item_versions_number check (version_number > 0),
  constraint library_item_versions_status check (status in ('draft','published','retired')),
  constraint library_item_versions_title_length check (length(trim(title)) between 3 and 200),
  constraint library_item_versions_summary_length check (length(trim(summary)) between 10 and 600),
  constraint library_item_versions_body_length check (body is null or length(body) <= 30000),
  constraint library_item_versions_kind check (content_kind in ('article','external_link')),
  constraint library_item_versions_format check (content_format in ('article','video','podcast','guide','tool','course','other')),
  constraint library_item_versions_level check (level in ('introductory','intermediate','advanced','all')),
  constraint library_item_versions_duration check (estimated_minutes between 1 and 600),
  constraint library_item_versions_source check (source_type in ('estimulo','partner','external')),
  constraint library_item_versions_language check (language_code ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  constraint library_item_versions_visibility check (visibility in ('authenticated','organization')),
  constraint library_item_versions_topics_limit check (cardinality(topics) <= 12),
  constraint library_item_versions_hash check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint library_item_versions_delivery check (
    (content_kind = 'article' and body is not null and length(trim(body)) > 0 and external_url is null)
    or
    (content_kind = 'external_link' and external_url ~ '^https://[^[:space:]]+$' and body is null)
  ),
  constraint library_item_versions_unique unique (library_item_id, version_number)
);

create or replace function app_private.library_item_search_document_trigger()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.search_document :=
    setweight(to_tsvector('pg_catalog.portuguese'::regconfig, coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.portuguese'::regconfig, coalesce(array_to_string(new.topics, ' '), '') || ' ' || coalesce(new.source_name, '')), 'B') ||
    setweight(to_tsvector('pg_catalog.portuguese'::regconfig, coalesce(new.summary, '') || ' ' || coalesce(new.body, '')), 'C');
  return new;
end;
$$;

drop trigger if exists library_item_versions_search_document on catalog.library_item_versions;
create trigger library_item_versions_search_document
before insert or update of title, summary, body, topics, source_name
on catalog.library_item_versions
for each row execute function app_private.library_item_search_document_trigger();

update catalog.library_item_versions set title = title where search_document = ''::tsvector;

create table if not exists catalog.library_item_journey_links (
  library_item_version_id uuid not null references catalog.library_item_versions(id) on delete cascade,
  journey_version_id uuid not null references catalog.journey_versions(id) on delete cascade,
  relation_type text not null default 'supplemental',
  created_at timestamptz not null default now(),
  primary key (library_item_version_id, journey_version_id),
  constraint library_item_journey_links_relation check (relation_type in ('supplemental','recommended'))
);

create index if not exists library_item_versions_search_idx
  on catalog.library_item_versions using gin(search_document);
create index if not exists library_item_versions_published_idx
  on catalog.library_item_versions(status, published_at desc)
  where status = 'published';
create index if not exists library_item_versions_filters_idx
  on catalog.library_item_versions(content_format, level, visibility)
  where status = 'published';
create index if not exists library_item_versions_topics_idx
  on catalog.library_item_versions using gin(topics);
create index if not exists library_item_journey_links_journey_idx
  on catalog.library_item_journey_links(journey_version_id, library_item_version_id);

alter table catalog.library_items enable row level security;
alter table catalog.library_items force row level security;
alter table catalog.library_item_versions enable row level security;
alter table catalog.library_item_versions force row level security;
alter table catalog.library_item_journey_links enable row level security;
alter table catalog.library_item_journey_links force row level security;

revoke all on catalog.library_items from public, anon, authenticated;
revoke all on catalog.library_item_versions from public, anon, authenticated;
revoke all on catalog.library_item_journey_links from public, anon, authenticated;
revoke all on function app_private.library_item_search_document_trigger() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from iam.permission_definitions where code = 'library.manage') then
    insert into iam.permission_definitions(id, code, resource_type, action, description)
    values (
      app_private.e14_deterministic_uuid('permission:library.manage'),
      'library.manage',
      'library_content',
      'manage',
      'Create, edit and publish content library entries.'
    );
  end if;

  insert into iam.role_permissions(role_id, permission_id)
  select distinct rp.role_id, target.id
  from iam.role_permissions rp
  join iam.permission_definitions source on source.id = rp.permission_id and source.code = 'journey.definition.publish'
  cross join iam.permission_definitions target
  where target.code = 'library.manage'
  on conflict do nothing;
end;
$$;

with event_names(event_name) as (
  values
    ('catalog.library_content.draft_saved'),
    ('catalog.library_content.published'),
    ('learning.library_content.accessed')
), documents as (
  select event_name, jsonb_build_object(
    'type','object',
    'title',event_name,
    '$schema','https://json-schema.org/draft/2020-12/schema',
    'additionalProperties',true
  ) as schema_document
  from event_names
)
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select
  app_private.e14_deterministic_uuid('library:event-schema:' || event_name || ':1'),
  event_name,
  1,
  'urn:estimulo:event:' || event_name || ':1',
  schema_document,
  app_private.e14_request_hash(schema_document),
  'published',
  now()
from documents
on conflict (event_name,event_version) do nothing;
