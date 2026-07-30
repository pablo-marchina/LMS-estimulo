-- Recover the activity asset progress table that existed in the Supabase test
-- database but was absent from the executable migration history.

create table if not exists orchestration.activity_asset_progress (
  id uuid primary key default gen_random_uuid(),
  step_instance_id uuid not null references orchestration.step_instances(id) on delete cascade,
  content_asset_id uuid not null references catalog.content_assets(id) on delete cascade,
  watched_seconds numeric not null default 0 check (watched_seconds >= 0),
  duration_seconds numeric check (duration_seconds is null or duration_seconds > 0),
  completion_ratio numeric not null default 0 check (completion_ratio >= 0 and completion_ratio <= 1),
  completed_at timestamptz,
  aggregate_version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (step_instance_id, content_asset_id)
);

create index if not exists ix_activity_asset_progress_step
  on orchestration.activity_asset_progress(step_instance_id);

alter table orchestration.activity_asset_progress enable row level security;
revoke all on table orchestration.activity_asset_progress from public, anon, authenticated;

comment on table orchestration.activity_asset_progress is
  'Server-only participant progress for versioned activity content assets.';
