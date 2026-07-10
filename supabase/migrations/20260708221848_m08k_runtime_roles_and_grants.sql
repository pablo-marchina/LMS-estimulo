-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708221848
-- Remote name: m08k_runtime_roles_and_grants
-- Remote SQL SHA-256: 737264369069bfefe5914fc0ca3b27443911ae721adcf4e08b86996ce908f0dd
-- Do not edit after reconciliation; corrections require a new migration.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime nologin nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_worker') then
    create role app_worker nologin nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_readonly') then
    create role app_readonly nologin nobypassrls;
  end if;
end $$;

grant usage on schema app_private, iam, core, catalog, orchestration, diagnostics, assessment, engagement, intervention to app_runtime;
grant select on all tables in schema catalog to app_runtime;
grant select, insert, update, delete on iam.user_accounts, iam.external_identities, iam.organizations, iam.organization_memberships, iam.membership_roles to app_runtime;
grant select, insert, update, delete on core.entrepreneurs, core.businesses, core.business_memberships, core.file_objects to app_runtime;
grant select, insert, update, delete on orchestration.enrollments, orchestration.journey_instances, orchestration.path_assignments, orchestration.step_instances, orchestration.activity_sessions, orchestration.progress_projections, orchestration.personalization_decisions to app_runtime;
grant select, insert, update, delete on diagnostics.sessions, diagnostics.responses, diagnostics.results, diagnostics.dimension_results, diagnostics.segment_assignments, diagnostics.archetype_assignments to app_runtime;
grant select, insert, update, delete on assessment.attempts, assessment.responses, assessment.results, assessment.submissions, assessment.submission_evidence, assessment.reviews, assessment.review_scores to app_runtime;
grant select, insert, update, delete on engagement.point_ledger, engagement.point_balance_projections, engagement.badge_awards, engagement.certificate_issuances, engagement.streak_projections to app_runtime;
grant select, insert, update, delete on intervention.instances, intervention.delivery_attempts, intervention.responses to app_runtime;
grant execute on all functions in schema app_private to app_runtime;
grant execute on function iam.resolve_external_identity(text,text,text,text,boolean,text) to app_runtime;

grant usage on schema app_private, iam, core, catalog, orchestration, diagnostics, assessment, engagement, intervention, eventing, integration, intelligence, governance to app_worker;
grant select, insert, update, delete on all tables in schema iam, core, catalog, orchestration, diagnostics, assessment, engagement, intervention, eventing, integration, intelligence, governance to app_worker;
grant execute on all functions in schema app_private, iam, eventing to app_worker;

grant usage on schema catalog, reporting to app_readonly;
grant select on all tables in schema catalog, reporting to app_readonly;
