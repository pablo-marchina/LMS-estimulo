-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709000921
-- Remote name: m12c_security_operations_registry
-- Remote SQL SHA-256: d12b9c81b69097e1d6b015de3275cb2adfcbe0a50f4071b055c165cbcc00bafb
-- Do not edit after reconciliation; corrections require a new migration.

create table governance.security_incidents (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  incident_type text not null,
  severity text not null,
  status text not null default 'detected',
  detected_at timestamptz not null,
  occurred_from timestamptz,
  occurred_until timestamptz,
  contained_at timestamptz,
  eradicated_at timestamptz,
  recovered_at timestamptz,
  closed_at timestamptz,
  personal_data_involved boolean not null default false,
  sensitive_personal_data_involved boolean not null default false,
  affected_subjects_estimate bigint,
  affected_records_estimate bigint,
  impact_summary text,
  containment_summary text,
  root_cause_summary text,
  notification_assessment_status text not null default 'pending',
  notification_assessment_reference text,
  regulator_notified_at timestamptz,
  data_subjects_notified_at timestamptz,
  owner_role text not null,
  created_by uuid references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_security_incident_code check (code ~ '^[A-Z0-9][A-Z0-9_-]{3,80}$'),
  constraint ck_security_incident_type check (incident_type in ('confidentiality','integrity','availability','credential_compromise','malware','ransomware','unauthorized_access','data_exfiltration','misconfiguration','vendor_incident','fraud','other')),
  constraint ck_security_incident_severity check (severity in ('low','medium','high','critical')),
  constraint ck_security_incident_status check (status in ('detected','triage','investigating','contained','eradicated','recovering','monitoring','closed','false_positive')),
  constraint ck_security_incident_notification check (notification_assessment_status in ('pending','not_required','required','notified','overdue')),
  constraint ck_security_incident_estimates check ((affected_subjects_estimate is null or affected_subjects_estimate>=0) and (affected_records_estimate is null or affected_records_estimate>=0)),
  constraint ck_security_incident_dates check ((occurred_until is null or occurred_from is null or occurred_until>=occurred_from) and (closed_at is null or closed_at>=detected_at))
);

create table governance.security_incident_events (
  id uuid primary key default gen_random_uuid(),
  security_incident_id uuid not null references governance.security_incidents(id) on delete cascade,
  event_type text not null,
  actor_user_account_id uuid references iam.user_accounts(id),
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  evidence_reference text,
  created_at timestamptz not null default now(),
  constraint ck_security_incident_event_type check (event_type in ('detected','classified','assigned','triage_updated','evidence_collected','contained','eradicated','recovery_started','recovered','notification_assessed','regulator_notified','data_subjects_notified','postmortem_completed','closed','reopened','note'))
);

create table governance.secret_inventory (
  id uuid primary key default gen_random_uuid(),
  secret_code text not null unique,
  environment text not null,
  provider text not null,
  storage_reference text not null,
  purpose text not null,
  owner_role text not null,
  rotation_policy text not null,
  maximum_age_days integer,
  last_rotated_at timestamptz,
  next_rotation_due_at timestamptz,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_secret_inventory_code check (secret_code ~ '^[A-Z][A-Z0-9_]{2,100}$'),
  constraint ck_secret_inventory_environment check (environment in ('local','test','staging','production','shared')),
  constraint ck_secret_inventory_provider check (provider in ('supabase_vault','aws_secrets_manager','github_actions','local_environment','other')),
  constraint ck_secret_inventory_rotation check (rotation_policy in ('automatic','scheduled_manual','on_demand','immutable_public','not_applicable')),
  constraint ck_secret_inventory_age check (maximum_age_days is null or maximum_age_days between 1 and 3650),
  constraint ck_secret_inventory_status check (status in ('active','rotation_due','compromised','revoked','retired')),
  constraint ck_secret_inventory_no_value check (storage_reference !~* '(secret|token|password|key)=[^[:space:]]+')
);

create table governance.access_reviews (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  review_scope text not null,
  status text not null default 'planned',
  period_start date not null,
  period_end date not null,
  reviewer_role text not null,
  started_at timestamptz,
  completed_at timestamptz,
  reviewed_identities integer not null default 0,
  access_removed_count integer not null default 0,
  exceptions_count integer not null default 0,
  evidence_reference text,
  findings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ck_access_review_environment check (environment in ('test','staging','production','all')),
  constraint ck_access_review_scope check (review_scope in ('database_roles','application_roles','cloud_iam','third_party_access','service_accounts','all')),
  constraint ck_access_review_status check (status in ('planned','running','completed','completed_with_exceptions','cancelled')),
  constraint ck_access_review_period check (period_end>=period_start),
  constraint ck_access_review_counts check (reviewed_identities>=0 and access_removed_count>=0 and exceptions_count>=0)
);

create table governance.backup_restore_tests (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  backup_type text not null,
  scope text not null,
  status text not null default 'planned',
  backup_reference text,
  restore_target_reference text,
  point_in_time timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  rpo_seconds integer,
  rto_seconds integer,
  integrity_verified boolean,
  application_smoke_verified boolean,
  storage_objects_verified boolean,
  evidence_reference text,
  findings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ck_backup_test_environment check (environment in ('test','staging','production')),
  constraint ck_backup_test_type check (backup_type in ('logical_dump','snapshot','point_in_time_recovery','cross_region_copy','storage_object_restore','full_disaster_recovery')),
  constraint ck_backup_test_scope check (scope in ('database','storage','database_and_storage','full_platform')),
  constraint ck_backup_test_status check (status in ('planned','running','succeeded','partially_succeeded','failed','cancelled')),
  constraint ck_backup_test_objectives check ((rpo_seconds is null or rpo_seconds>=0) and (rto_seconds is null or rto_seconds>=0)),
  constraint ck_backup_test_dates check (completed_at is null or started_at is not null and completed_at>=started_at)
);

create table governance.production_readiness_controls (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  control_code text not null,
  control_domain text not null,
  title text not null,
  description text not null,
  blocking boolean not null default true,
  status text not null default 'pending',
  evidence_reference text,
  owner_role text not null,
  due_at timestamptz,
  verified_by uuid references iam.user_accounts(id),
  verified_at timestamptz,
  exception_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_production_readiness_controls unique(environment,control_code),
  constraint ck_readiness_environment check (environment in ('test','staging','production')),
  constraint ck_readiness_code check (control_code ~ '^[A-Z][A-Z0-9_]{2,100}$'),
  constraint ck_readiness_domain check (control_domain in ('privacy','legal','security','identity','data','operations','resilience','observability','vendor','application','cloud','credit_governance')),
  constraint ck_readiness_status check (status in ('pending','in_progress','passed','failed','blocked','not_applicable','accepted_risk')),
  constraint ck_readiness_verification check ((status='passed')=(verified_at is not null))
);

create index ix_security_incidents_status_severity on governance.security_incidents(status,severity,detected_at desc);
create index ix_security_incident_events_incident on governance.security_incident_events(security_incident_id,occurred_at);
create index ix_secret_inventory_due on governance.secret_inventory(status,next_rotation_due_at);
create index ix_access_reviews_environment_status on governance.access_reviews(environment,status,period_end desc);
create index ix_backup_restore_tests_environment_status on governance.backup_restore_tests(environment,status,created_at desc);
create index ix_readiness_environment_status on governance.production_readiness_controls(environment,status,blocking);

create trigger trg_security_incidents_updated_at before update on governance.security_incidents for each row execute function governance.set_updated_at();
create trigger trg_secret_inventory_updated_at before update on governance.secret_inventory for each row execute function governance.set_updated_at();
create trigger trg_readiness_controls_updated_at before update on governance.production_readiness_controls for each row execute function governance.set_updated_at();
create trigger trg_security_incident_events_append_only before update or delete on governance.security_incident_events for each row execute function governance.reject_mutation();
