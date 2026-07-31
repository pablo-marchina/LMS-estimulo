begin;

-- Cross-cutting configuration and legal documents
create table if not exists experience.platform_settings (
  organization_id uuid primary key references iam.organizations(id) on delete cascade,
  platform_name text not null default 'Plataforma Estímulo',
  support_phone text,
  support_whatsapp text,
  support_email text,
  support_hours text,
  institutional_links jsonb not null default '[]'::jsonb,
  footer_text text,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid not null references iam.user_accounts(id),
  updated_at timestamptz not null default now(),
  constraint platform_settings_links_array check (jsonb_typeof(institutional_links) = 'array')
);

create table if not exists governance.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references iam.organizations(id) on delete cascade,
  document_type text not null check (document_type in ('terms_of_use','privacy_policy')),
  version_number integer not null check (version_number > 0),
  status text not null default 'draft' check (status in ('draft','published','retired')),
  title text not null check (length(btrim(title)) between 3 and 200),
  body text not null check (length(btrim(body)) between 20 and 100000),
  require_reacceptance boolean not null default false,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  published_at timestamptz,
  retired_at timestamptz,
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  unique (organization_id, document_type, version_number)
);
create unique index if not exists legal_document_one_published
  on governance.legal_document_versions(organization_id, document_type)
  where status='published';

create table if not exists governance.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  legal_document_version_id uuid not null references governance.legal_document_versions(id),
  user_account_id uuid not null references iam.user_accounts(id),
  accepted_at timestamptz not null default now(),
  source text not null default 'participant_web',
  metadata jsonb not null default '{}'::jsonb,
  unique (legal_document_version_id, user_account_id)
);

create table if not exists experience.extension_commands (
  id uuid primary key default gen_random_uuid(),
  actor_user_account_id uuid not null references iam.user_accounts(id),
  organization_id uuid references iam.organizations(id),
  command_scope text not null,
  idempotency_key text not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (actor_user_account_id, command_scope, idempotency_key)
);

-- Managed themes
create table if not exists catalog.themes (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_-]{1,79}$'),
  name text not null check (length(btrim(name)) between 2 and 120),
  description text,
  visual_metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','inactive','retired')),
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_organization_id, code),
  unique (owner_organization_id, name)
);

create table if not exists catalog.library_item_theme_links (
  library_item_id uuid not null references catalog.library_items(id) on delete cascade,
  theme_id uuid not null references catalog.themes(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (library_item_id, theme_id)
);

create table if not exists catalog.journey_theme_links (
  journey_definition_id uuid not null references catalog.journey_definitions(id) on delete cascade,
  theme_id uuid not null references catalog.themes(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (journey_definition_id, theme_id)
);

-- Certificate template catalog and inheritance
create table if not exists engagement.certificate_template_assets (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id) on delete cascade,
  file_object_id uuid not null references core.file_objects(id),
  name text not null check (length(btrim(name)) between 2 and 200),
  media_type text not null check (media_type in ('image','pdf')),
  status text not null default 'active' check (status in ('active','retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  unique (owner_organization_id, file_object_id)
);

create table if not exists engagement.certificate_template_assignments (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id) on delete cascade,
  scope_type text not null check (scope_type in ('global','program','journey')),
  scope_id uuid,
  template_asset_id uuid not null references engagement.certificate_template_assets(id),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certificate_template_scope check (
    (scope_type='global' and scope_id is null) or
    (scope_type in ('program','journey') and scope_id is not null)
  ),
  constraint certificate_template_period check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index if not exists certificate_template_active_scope
  on engagement.certificate_template_assignments(owner_organization_id, scope_type, coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid))
  where active;

-- Tracking links and complete visit history
create table if not exists core.tracking_links (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9_-]{2,79}$'),
  name text not null check (length(btrim(name)) between 2 and 160),
  destination_path text not null check (destination_path ~ '^/' and length(destination_path) <= 500),
  audience text not null default 'both' check (audience in ('new','existing','both')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  custom_parameters jsonb not null default '{}'::jsonb,
  skip_steps jsonb not null default '{}'::jsonb,
  partner text,
  channel text,
  notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses bigint check (max_uses is null or max_uses > 0),
  status text not null default 'active' check (status in ('active','inactive','retired')),
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug),
  constraint tracking_links_custom_object check (jsonb_typeof(custom_parameters)='object'),
  constraint tracking_links_skip_object check (jsonb_typeof(skip_steps)='object'),
  constraint tracking_links_period check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists core.tracking_visits (
  id uuid primary key default gen_random_uuid(),
  tracking_link_id uuid not null references core.tracking_links(id) on delete cascade,
  visit_token_hash text not null check (visit_token_hash ~ '^[0-9a-f]{64}$'),
  anonymous_id text,
  user_account_id uuid references iam.user_accounts(id),
  entrepreneur_id uuid references core.entrepreneurs(id),
  session_id text,
  landing_path text not null,
  referrer text,
  device_type text,
  browser text,
  operating_system text,
  user_agent text,
  ip_hash text,
  parameters jsonb not null default '{}'::jsonb,
  conversion_kind text,
  occurred_at timestamptz not null default now(),
  associated_at timestamptz,
  unique (visit_token_hash),
  constraint tracking_visits_parameters_object check (jsonb_typeof(parameters)='object')
);
create index if not exists tracking_visits_link_time on core.tracking_visits(tracking_link_id, occurred_at desc);
create index if not exists tracking_visits_user_time on core.tracking_visits(user_account_id, occurred_at desc);

create table if not exists core.acquisition_touchpoints (
  id uuid primary key default gen_random_uuid(),
  user_account_id uuid not null references iam.user_accounts(id),
  entrepreneur_id uuid references core.entrepreneurs(id),
  tracking_visit_id uuid references core.tracking_visits(id),
  attribution_kind text not null check (attribution_kind in ('first_touch','last_touch','signup','conversion')),
  captured_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);
create index if not exists acquisition_touchpoints_user_time on core.acquisition_touchpoints(user_account_id, captured_at desc);
create unique index if not exists acquisition_touchpoints_first
  on core.acquisition_touchpoints(user_account_id, attribution_kind)
  where attribution_kind='first_touch';

-- B2B pages and access groups
create table if not exists experience.b2b_pages (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_-]{1,79}$'),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9_-]{2,99}$'),
  name text not null check (length(btrim(name)) between 2 and 180),
  status text not null default 'active' check (status in ('active','retired')),
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_organization_id, code),
  unique (owner_organization_id, slug)
);

create table if not exists experience.b2b_page_versions (
  id uuid primary key default gen_random_uuid(),
  b2b_page_id uuid not null references experience.b2b_pages(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft' check (status in ('draft','published','retired')),
  title text not null check (length(btrim(title)) between 2 and 200),
  description text,
  blocks jsonb not null default '[]'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  published_at timestamptz,
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  unique (b2b_page_id, version_number),
  constraint b2b_blocks_array check (jsonb_typeof(blocks)='array'),
  constraint b2b_period check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index if not exists b2b_one_published_version
  on experience.b2b_page_versions(b2b_page_id)
  where status='published';

create table if not exists experience.b2b_access_groups (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 160),
  description text,
  status text not null default 'active' check (status in ('active','retired')),
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_organization_id, name)
);

create table if not exists experience.b2b_group_members (
  group_id uuid not null references experience.b2b_access_groups(id) on delete cascade,
  user_account_id uuid not null references iam.user_accounts(id) on delete cascade,
  added_by uuid not null references iam.user_accounts(id),
  added_at timestamptz not null default now(),
  primary key (group_id, user_account_id)
);

create table if not exists experience.b2b_page_user_access (
  b2b_page_id uuid not null references experience.b2b_pages(id) on delete cascade,
  user_account_id uuid not null references iam.user_accounts(id) on delete cascade,
  granted_by uuid not null references iam.user_accounts(id),
  granted_at timestamptz not null default now(),
  primary key (b2b_page_id, user_account_id)
);

create table if not exists experience.b2b_page_group_access (
  b2b_page_id uuid not null references experience.b2b_pages(id) on delete cascade,
  group_id uuid not null references experience.b2b_access_groups(id) on delete cascade,
  granted_by uuid not null references iam.user_accounts(id),
  granted_at timestamptz not null default now(),
  primary key (b2b_page_id, group_id)
);

-- Rewards, wallet and immutable ledger
create table if not exists engagement.reward_settings (
  organization_id uuid primary key references iam.organizations(id) on delete cascade,
  source_points_per_unit integer not null default 1 check (source_points_per_unit > 0),
  reward_points_per_unit integer not null default 1 check (reward_points_per_unit > 0),
  updated_by uuid not null references iam.user_accounts(id),
  updated_at timestamptz not null default now()
);

create table if not exists engagement.reward_wallets (
  entrepreneur_id uuid primary key references core.entrepreneurs(id) on delete cascade,
  organization_id uuid not null references iam.organizations(id),
  balance integer not null default 0 check (balance >= 0),
  lifetime_converted integer not null default 0 check (lifetime_converted >= 0),
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists engagement.rewards (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_-]{1,79}$'),
  name text not null check (length(btrim(name)) between 2 and 180),
  description text not null,
  reward_type text not null check (reward_type in ('physical','digital','experience','service')),
  cost_points integer not null check (cost_points > 0),
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  max_per_user integer check (max_per_user is null or max_per_user > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  regulation text not null,
  image_file_object_id uuid references core.file_objects(id),
  fulfillment_configuration jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','inactive','retired')),
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_organization_id, code),
  constraint rewards_period check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint rewards_fulfillment_object check (jsonb_typeof(fulfillment_configuration)='object')
);

create table if not exists engagement.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references engagement.rewards(id),
  entrepreneur_id uuid not null references core.entrepreneurs(id),
  user_account_id uuid not null references iam.user_accounts(id),
  quantity integer not null default 1 check (quantity > 0),
  points_spent integer not null check (points_spent > 0),
  status text not null default 'pending' check (status in ('pending','approved','preparing','sent','available','delivered','cancelled')),
  fulfillment_details jsonb not null default '{}'::jsonb,
  cancellation_reason text,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz,
  cancelled_at timestamptz
);
create index if not exists reward_redemptions_entrepreneur_time on engagement.reward_redemptions(entrepreneur_id, requested_at desc);
create index if not exists reward_redemptions_status on engagement.reward_redemptions(status, requested_at);

create table if not exists engagement.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid not null references core.entrepreneurs(id),
  organization_id uuid not null references iam.organizations(id),
  redemption_id uuid references engagement.reward_redemptions(id),
  reward_points_delta integer not null,
  engagement_points_delta integer not null default 0,
  balance_after integer not null check (balance_after >= 0),
  reason text not null check (reason in ('conversion','redemption','redemption_refund','admin_adjustment')),
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references iam.user_accounts(id),
  occurred_at timestamptz not null default now(),
  unique (entrepreneur_id, idempotency_key)
);

-- Generalized deliveries for both activities and library content
create table if not exists assessment.delivery_configurations (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id) on delete cascade,
  target_type text not null check (target_type in ('activity','library')),
  activity_version_id uuid references catalog.activity_versions(id) on delete cascade,
  library_item_version_id uuid references catalog.library_item_versions(id) on delete cascade,
  title text not null check (length(btrim(title)) between 2 and 200),
  instructions text not null,
  allowed_submission_types text[] not null default array['text']::text[],
  required_submission_types text[] not null default '{}'::text[],
  max_files integer not null default 5 check (max_files between 0 and 20),
  max_file_size_bytes bigint not null default 26214400 check (max_file_size_bytes between 1024 and 104857600),
  max_attempts integer check (max_attempts is null or max_attempts > 0),
  starts_at timestamptz,
  due_at timestamptz,
  ends_at timestamptz,
  allow_late boolean not null default false,
  allow_resubmit boolean not null default true,
  grade_strategy text not null default 'highest' check (grade_strategy in ('highest','latest','average')),
  grading_mode text not null default 'ai_human_review' check (grading_mode in ('automatic','ai_human_review','ai_assistant')),
  passing_score numeric check (passing_score is null or passing_score between 0 and 100),
  rubric jsonb not null default '{"criteria":[]}'::jsonb,
  reference_material jsonb not null default '[]'::jsonb,
  ai_instructions text,
  points_configuration jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft','active','inactive','retired')),
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_target check (
    (target_type='activity' and activity_version_id is not null and library_item_version_id is null) or
    (target_type='library' and library_item_version_id is not null and activity_version_id is null)
  ),
  constraint delivery_period check (
    (due_at is null or starts_at is null or due_at > starts_at) and
    (ends_at is null or starts_at is null or ends_at > starts_at)
  ),
  constraint delivery_rubric_object check (jsonb_typeof(rubric)='object'),
  constraint delivery_reference_array check (jsonb_typeof(reference_material)='array')
);
create unique index if not exists delivery_configuration_activity_active
  on assessment.delivery_configurations(activity_version_id)
  where activity_version_id is not null and status in ('draft','active');
create unique index if not exists delivery_configuration_library_active
  on assessment.delivery_configurations(library_item_version_id)
  where library_item_version_id is not null and status in ('draft','active');

create table if not exists assessment.delivery_submissions (
  id uuid primary key default gen_random_uuid(),
  delivery_configuration_id uuid not null references assessment.delivery_configurations(id),
  entrepreneur_id uuid not null references core.entrepreneurs(id),
  user_account_id uuid not null references iam.user_accounts(id),
  attempt_number integer not null check (attempt_number > 0),
  status text not null default 'submitted' check (status in ('draft','submitted','processing','ai_graded','awaiting_human_review','corrected','approved','rejected','returned','cancelled')),
  text_content text,
  external_link text,
  submitted_at timestamptz not null default now(),
  final_score numeric check (final_score is null or final_score between 0 and 100),
  final_feedback text,
  confidence numeric check (confidence is null or confidence between 0 and 1),
  grading_model text,
  grading_version text,
  ai_cost_metadata jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (delivery_configuration_id, entrepreneur_id, attempt_number)
);
create index if not exists delivery_submissions_entrepreneur on assessment.delivery_submissions(entrepreneur_id, submitted_at desc);
create index if not exists delivery_submissions_review on assessment.delivery_submissions(status, submitted_at);

create table if not exists assessment.delivery_submission_files (
  id uuid primary key default gen_random_uuid(),
  delivery_submission_id uuid not null references assessment.delivery_submissions(id) on delete cascade,
  file_object_id uuid not null references core.file_objects(id),
  evidence_type text not null,
  position integer not null check (position > 0),
  extracted_content text,
  extraction_status text not null default 'pending' check (extraction_status in ('pending','ready','unsupported','failed')),
  metadata jsonb not null default '{}'::jsonb,
  unique (delivery_submission_id, position),
  unique (delivery_submission_id, file_object_id)
);

create table if not exists assessment.delivery_reviews (
  id uuid primary key default gen_random_uuid(),
  delivery_submission_id uuid not null references assessment.delivery_submissions(id) on delete cascade,
  review_type text not null check (review_type in ('ai','human','override')),
  reviewer_user_account_id uuid references iam.user_accounts(id),
  rubric_snapshot jsonb not null,
  criterion_scores jsonb not null default '[]'::jsonb,
  score numeric check (score is null or score between 0 and 100),
  feedback text,
  confidence numeric check (confidence is null or confidence between 0 and 1),
  model_reference text,
  status text not null check (status in ('proposed','approved','rejected','superseded')),
  change_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Optional diagnostics, fully isolated from archetype assignments
create table if not exists diagnostics.optional_availability (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id) on delete cascade,
  diagnostic_version_id uuid not null references diagnostics.diagnostic_versions(id),
  display_title text not null,
  display_description text,
  starts_at timestamptz,
  ends_at timestamptz,
  max_attempts integer check (max_attempts is null or max_attempts > 0),
  retry_interval_days integer not null default 0 check (retry_interval_days >= 0),
  show_result boolean not null default true,
  points_on_completion integer not null default 0 check (points_on_completion >= 0),
  audience jsonb not null default '{"type":"all"}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','inactive','retired')),
  created_by uuid not null references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint optional_availability_period check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint optional_availability_audience check (jsonb_typeof(audience)='object')
);
create unique index if not exists optional_diagnostic_one_active
  on diagnostics.optional_availability(owner_organization_id, diagnostic_version_id)
  where status in ('draft','published');

create table if not exists diagnostics.optional_sessions (
  id uuid primary key default gen_random_uuid(),
  optional_availability_id uuid not null references diagnostics.optional_availability(id),
  diagnostic_version_id uuid not null references diagnostics.diagnostic_versions(id),
  entrepreneur_id uuid not null references core.entrepreneurs(id),
  user_account_id uuid not null references iam.user_accounts(id),
  attempt_number integer not null check (attempt_number > 0),
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  result_payload jsonb,
  unique (optional_availability_id, entrepreneur_id, attempt_number)
);

create table if not exists diagnostics.optional_responses (
  optional_session_id uuid not null references diagnostics.optional_sessions(id) on delete cascade,
  item_id uuid not null references diagnostics.items(id),
  item_option_id uuid references diagnostics.item_options(id),
  text_value text,
  answered_at timestamptz not null default now(),
  primary key (optional_session_id, item_id)
);

-- Behavioral score snapshots. The source remains structured eventing.events.
create table if not exists intelligence.behavior_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id) on delete cascade,
  entrepreneur_id uuid not null references core.entrepreneurs(id) on delete cascade,
  score_version_id uuid not null references intelligence.score_versions(id),
  total_score numeric not null,
  dimensions jsonb not null,
  confidence numeric not null check (confidence between 0 and 1),
  event_count bigint not null check (event_count >= 0),
  coverage_started_at timestamptz not null,
  calculated_at timestamptz not null default now(),
  input_snapshot_hash text not null check (input_snapshot_hash ~ '^[0-9a-f]{64}$'),
  unique (entrepreneur_id, score_version_id)
);

-- Register a strict event contract and analytics-only score model.
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select
  gen_random_uuid(),
  'behavior.interaction.recorded',
  1,
  'urn:estimulo:event:behavior.interaction.recorded:1',
  '{"type":"object","required":["interaction_type","schema_version","captured_at"],"properties":{"interaction_type":{"type":"string"},"schema_version":{"type":"integer"},"captured_at":{"type":"string"},"session_id":{"type":["string","null"]},"entity_type":{"type":["string","null"]},"entity_id":{"type":["string","null"]},"properties":{"type":"object"}}}'::jsonb,
  encode(digest('behavior.interaction.recorded:1','sha256'),'hex'),
  'published',
  now()
where not exists (
  select 1 from eventing.event_schemas where event_name='behavior.interaction.recorded' and event_version=1
);

with target_org as (
  select id from iam.organizations where slug='estimulo' limit 1
), inserted_definition as (
  insert into intelligence.score_definitions(
    id,owner_organization_id,code,name,purpose,status,allowed_uses,prohibited_uses
  )
  select gen_random_uuid(),id,'behavioral_engagement_v1','Score comportamental',
    'Análise administrativa e exportação ETL, sem efeitos na experiência do participante.',
    'active',
    array['administrative_analytics','reporting','etl_export']::text[],
    array['access_control','journey_eligibility','content_personalization','recommendations','rewards','notifications','user_experience']::text[]
  from target_org
  where not exists (
    select 1 from intelligence.score_definitions sd
    where sd.owner_organization_id=target_org.id and sd.code='behavioral_engagement_v1'
  )
  returning id
), definition as (
  select id from inserted_definition
  union all
  select sd.id from intelligence.score_definitions sd join target_org on target_org.id=sd.owner_organization_id
   where sd.code='behavioral_engagement_v1'
  limit 1
)
insert into intelligence.score_versions(
  id,score_definition_id,version_number,status,model_type,model_reference,input_schema,output_schema,
  decision_thresholds,validation_status,published_at,content_hash
)
select gen_random_uuid(),id,1,'published','rules',
  'behavioral-events-weighted-v1',
  '{"event_name":"behavior.interaction.recorded","capture_policy":"from_release_forward"}'::jsonb,
  '{"total_score":"number","dimensions":{"engagement":"number","consistency":"number","depth":"number","completion":"number","autonomy":"number","quality":"number","evolution":"number","return_frequency":"number"},"confidence":"number"}'::jsonb,
  null,'approved',now(),encode(digest('behavioral-events-weighted-v1','sha256'),'hex')
from definition
where not exists (
  select 1 from intelligence.score_versions sv where sv.score_definition_id=definition.id and sv.version_number=1
);

-- Generic ETL route; consumers can be attached later without changing producers.
insert into eventing.consumer_definitions(
  id,code,name,status,max_attempts,retry_policy,dead_letter_policy
)
select gen_random_uuid(),'generic_etl_export','Exportação ETL genérica','inactive',10,
  '{"strategy":"exponential","base_seconds":5,"max_seconds":3600}'::jsonb,
  '{"enabled":true,"retain_days":90}'::jsonb
where not exists (select 1 from eventing.consumer_definitions where code='generic_etl_export');

-- Keep all extension tables outside the public Data API.
revoke all on experience.platform_settings, experience.extension_commands from public, anon, authenticated;
revoke all on governance.legal_document_versions, governance.legal_acceptances from public, anon, authenticated;
revoke all on catalog.themes, catalog.library_item_theme_links, catalog.journey_theme_links from public, anon, authenticated;
revoke all on engagement.certificate_template_assets, engagement.certificate_template_assignments from public, anon, authenticated;
revoke all on core.tracking_links, core.tracking_visits, core.acquisition_touchpoints from public, anon, authenticated;
revoke all on experience.b2b_pages, experience.b2b_page_versions, experience.b2b_access_groups, experience.b2b_group_members, experience.b2b_page_user_access, experience.b2b_page_group_access from public, anon, authenticated;
revoke all on engagement.reward_settings, engagement.reward_wallets, engagement.rewards, engagement.reward_redemptions, engagement.reward_ledger from public, anon, authenticated;
revoke all on assessment.delivery_configurations, assessment.delivery_submissions, assessment.delivery_submission_files, assessment.delivery_reviews from public, anon, authenticated;
revoke all on diagnostics.optional_availability, diagnostics.optional_sessions, diagnostics.optional_responses from public, anon, authenticated;
revoke all on intelligence.behavior_score_snapshots from public, anon, authenticated;

commit;
