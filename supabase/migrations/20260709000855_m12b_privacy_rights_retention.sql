-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709000855
-- Remote name: m12b_privacy_rights_retention
-- Remote SQL SHA-256: ab50dced63ffcf96cdd94277e001c04b9c9e3fa0c7611cdb2a4a461ef089629e
-- Do not edit after reconciliation; corrections require a new migration.

alter table governance.privacy_requests
  add column if not exists requester_type text not null default 'data_subject',
  add column if not exists identity_verification_status text not null default 'pending',
  add column if not exists identity_verified_at timestamptz,
  add column if not exists intake_channel text not null default 'internal',
  add column if not exists scope jsonb not null default '{}'::jsonb,
  add column if not exists assigned_role text,
  add column if not exists legal_hold_checked_at timestamptz,
  add column if not exists rejection_reason_code text,
  add column if not exists updated_at timestamptz not null default now();

alter table governance.privacy_requests
  add constraint ck_privacy_requests_type check (request_type in ('confirmation','access','correction','anonymization','blocking','deletion','portability','information_sharing','consent_information','consent_withdrawal','automated_decision_review','objection','other')),
  add constraint ck_privacy_requests_status check (status in ('received','identity_verification','validated','in_progress','waiting_third_party','waiting_legal_review','fulfilled','partially_fulfilled','rejected','cancelled')),
  add constraint ck_privacy_requests_requester check (requester_type in ('data_subject','legal_representative','authorized_agent','internal_control')),
  add constraint ck_privacy_requests_verification check (identity_verification_status in ('pending','verified','failed','not_required')),
  add constraint ck_privacy_requests_channel check (intake_channel in ('web','email','phone','whatsapp','in_person','regulator','internal')),
  add constraint ck_privacy_requests_completed check (completed_at is null or completed_at>=requested_at);

create trigger trg_privacy_requests_updated_at before update on governance.privacy_requests for each row execute function governance.set_updated_at();

create table governance.privacy_request_events (
  id uuid primary key default gen_random_uuid(),
  privacy_request_id uuid not null references governance.privacy_requests(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_user_account_id uuid references iam.user_accounts(id),
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  evidence_reference text,
  created_at timestamptz not null default now(),
  constraint ck_privacy_request_event_type check (event_type in ('received','identity_verified','identity_failed','scope_defined','assigned','search_started','third_party_requested','legal_review_requested','correction_applied','data_export_generated','consent_withdrawn','decision_reviewed','fulfilled','partially_fulfilled','rejected','cancelled','note'))
);

create table governance.legal_holds (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  reason_category text not null,
  legal_reference text,
  status text not null default 'draft',
  effective_from timestamptz not null,
  effective_until timestamptz,
  approved_by uuid references iam.user_accounts(id),
  approved_at timestamptz,
  released_by uuid references iam.user_accounts(id),
  released_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_legal_hold_code check (code ~ '^[a-z][a-z0-9_:-]{2,100}$'),
  constraint ck_legal_hold_reason check (reason_category in ('litigation','regulatory_investigation','fraud_investigation','contractual_dispute','audit','law_enforcement','other')),
  constraint ck_legal_hold_status check (status in ('draft','active','released','expired','cancelled')),
  constraint ck_legal_hold_period check (effective_until is null or effective_until>=effective_from),
  constraint ck_legal_hold_approval check ((status in ('active','released','expired')) = (approved_at is not null))
);

create table governance.legal_hold_targets (
  legal_hold_id uuid not null references governance.legal_holds(id) on delete cascade,
  target_type text not null,
  target_reference text not null,
  scope jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key(legal_hold_id,target_type,target_reference),
  constraint ck_legal_hold_target_type check (target_type in ('entrepreneur','business','organization','data_asset','processing_activity','file_object','event_partition','privacy_request','custom'))
);

create table governance.retention_runs (
  id uuid primary key default gen_random_uuid(),
  retention_policy_id uuid not null references governance.retention_policies(id),
  run_type text not null,
  status text not null default 'planned',
  dry_run boolean not null default true,
  cutoff_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  initiated_by uuid references iam.user_accounts(id),
  summary jsonb not null default '{}'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  constraint ck_retention_run_type check (run_type in ('scheduled','manual','privacy_request','legal_hold_release','proof')),
  constraint ck_retention_run_status check (status in ('planned','running','succeeded','partially_succeeded','failed','cancelled')),
  constraint ck_retention_run_dates check (completed_at is null or started_at is not null and completed_at>=started_at)
);

create table governance.retention_actions (
  id uuid primary key default gen_random_uuid(),
  retention_run_id uuid not null references governance.retention_runs(id) on delete cascade,
  target_type text not null,
  target_reference text not null,
  proposed_action text not null,
  status text not null default 'candidate',
  legal_hold_id uuid references governance.legal_holds(id),
  reason_code text,
  before_hash text,
  after_hash text,
  executed_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint uq_retention_actions_target unique(retention_run_id,target_type,target_reference),
  constraint ck_retention_action_type check (proposed_action in ('delete','anonymize','aggregate','archive_restricted','manual_review','retain')),
  constraint ck_retention_action_status check (status in ('candidate','blocked_legal_hold','approved','executing','succeeded','failed','skipped')),
  constraint ck_retention_action_hashes check ((before_hash is null or before_hash ~ '^[a-f0-9]{64}$') and (after_hash is null or after_hash ~ '^[a-f0-9]{64}$'))
);

create index ix_privacy_requests_status_due on governance.privacy_requests(status,due_at);
create index ix_privacy_request_events_request on governance.privacy_request_events(privacy_request_id,occurred_at);
create index ix_legal_holds_status_period on governance.legal_holds(status,effective_from,effective_until);
create index ix_legal_hold_targets_reference on governance.legal_hold_targets(target_type,target_reference);
create index ix_retention_runs_policy_status on governance.retention_runs(retention_policy_id,status,created_at desc);
create index ix_retention_actions_status on governance.retention_actions(status,created_at);

create trigger trg_legal_holds_updated_at before update on governance.legal_holds for each row execute function governance.set_updated_at();
create trigger trg_privacy_request_events_append_only before update or delete on governance.privacy_request_events for each row execute function governance.reject_mutation();
