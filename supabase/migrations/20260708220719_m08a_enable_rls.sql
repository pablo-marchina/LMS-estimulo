-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708220719
-- Remote name: m08a_enable_rls
-- Remote SQL SHA-256: 9c6de9fcf70bca1da6b3949f7955968ff6f257a27dbcf6c0bf9acde94641afd1
-- Do not edit after reconciliation; corrections require a new migration.

set lock_timeout = '5s';
set statement_timeout = '5min';

alter table iam.user_accounts enable row level security;
alter table iam.external_identities enable row level security;
alter table iam.organizations enable row level security;
alter table iam.organization_memberships enable row level security;
alter table iam.membership_roles enable row level security;
alter table core.entrepreneurs enable row level security;
alter table core.businesses enable row level security;
alter table core.business_memberships enable row level security;
alter table core.file_objects enable row level security;
alter table orchestration.enrollments enable row level security;
alter table orchestration.journey_instances enable row level security;
alter table orchestration.path_assignments enable row level security;
alter table orchestration.step_instances enable row level security;
alter table orchestration.activity_sessions enable row level security;
alter table orchestration.progress_projections enable row level security;
alter table orchestration.personalization_decisions enable row level security;
alter table diagnostics.sessions enable row level security;
alter table diagnostics.responses enable row level security;
alter table diagnostics.results enable row level security;
alter table diagnostics.dimension_results enable row level security;
alter table diagnostics.segment_assignments enable row level security;
alter table diagnostics.archetype_assignments enable row level security;
alter table assessment.attempts enable row level security;
alter table assessment.responses enable row level security;
alter table assessment.results enable row level security;
alter table assessment.submissions enable row level security;
alter table assessment.submission_evidence enable row level security;
alter table assessment.reviews enable row level security;
alter table assessment.review_scores enable row level security;
alter table engagement.point_ledger enable row level security;
alter table engagement.point_balance_projections enable row level security;
alter table engagement.badge_awards enable row level security;
alter table engagement.certificate_issuances enable row level security;
alter table engagement.streak_projections enable row level security;
alter table intervention.instances enable row level security;
alter table intervention.delivery_attempts enable row level security;
alter table intervention.responses enable row level security;
alter table integration.connections enable row level security;
alter table integration.external_object_mappings enable row level security;
alter table integration.sync_jobs enable row level security;
alter table integration.sync_attempts enable row level security;
alter table integration.conflicts enable row level security;
alter table integration.webhook_receipts enable row level security;
alter table intelligence.feature_values enable row level security;
alter table intelligence.score_results enable row level security;
alter table intelligence.score_contributions enable row level security;
alter table governance.consent_records enable row level security;
alter table governance.privacy_requests enable row level security;
alter table governance.audit_log enable row level security;
