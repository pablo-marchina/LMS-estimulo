-- -------------------------------------------------------------------------
-- Concrete RLS policies for the initial production release. Direct browser
-- grants remain disabled; these policies provide defense in depth for the API.
-- -------------------------------------------------------------------------
create policy user_accounts_select_self_or_admin on iam.user_accounts
for select using (
  id = app_private.current_user_account_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.read', app_private.current_organization_id(), 'user_account', id)
);

create policy user_accounts_write_admin on iam.user_accounts
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.manage', app_private.current_organization_id(), 'user_account', id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.manage', app_private.current_organization_id(), 'user_account', id)
);

create policy external_identities_select_self_or_admin on iam.external_identities
for select using (
  user_account_id = app_private.current_user_account_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.read', app_private.current_organization_id(), 'user_account', user_account_id)
);

create policy external_identities_write_admin on iam.external_identities
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.manage', app_private.current_organization_id(), 'user_account', user_account_id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.accounts.manage', app_private.current_organization_id(), 'user_account', user_account_id)
);

create policy organizations_select_member on iam.organizations
for select using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from iam.organization_memberships om
    where om.organization_id = iam.organizations.id
      and om.user_account_id = app_private.current_user_account_id()
      and om.status = 'active'
      and om.valid_from <= now()
      and (om.valid_until is null or om.valid_until > now())
  )
  or app_private.has_permission('iam.organizations.read', iam.organizations.id, 'organization', iam.organizations.id)
);

create policy organizations_write_admin on iam.organizations
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.organizations.manage', iam.organizations.id, 'organization', iam.organizations.id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.organizations.manage', iam.organizations.id, 'organization', iam.organizations.id)
);

create policy memberships_select_self_or_admin on iam.organization_memberships
for select using (
  user_account_id = app_private.current_user_account_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('iam.memberships.read', organization_id, 'organization_membership', id)
);

create policy memberships_write_admin on iam.organization_memberships
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.memberships.manage', organization_id, 'organization_membership', id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('iam.memberships.manage', organization_id, 'organization_membership', id)
);

create policy membership_roles_select_self_or_admin on iam.membership_roles
for select using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from iam.organization_memberships om
    where om.id = membership_id
      and (
        om.user_account_id = app_private.current_user_account_id()
        or app_private.has_permission('iam.memberships.read', om.organization_id, 'organization_membership', om.id)
      )
  )
);

create policy membership_roles_write_admin on iam.membership_roles
for all using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from iam.organization_memberships om
    where om.id = membership_id
      and app_private.has_permission('iam.memberships.manage', om.organization_id, 'organization_membership', om.id)
  )
) with check (
  app_private.is_trusted_worker()
  or exists (
    select 1 from iam.organization_memberships om
    where om.id = membership_id
      and app_private.has_permission('iam.memberships.manage', om.organization_id, 'organization_membership', om.id)
  )
);

create policy entrepreneurs_select_authorized on core.entrepreneurs
for select using (app_private.can_access_entrepreneur(id));

create policy entrepreneurs_write_authorized on core.entrepreneurs
for all using (
  id = app_private.current_entrepreneur_id() or app_private.can_manage_entrepreneur(id)
) with check (
  id = app_private.current_entrepreneur_id() or app_private.can_manage_entrepreneur(id)
);

create policy businesses_select_authorized on core.businesses
for select using (app_private.can_access_business(id));

create policy businesses_write_operator on core.businesses
for all using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from orchestration.enrollments e
    join catalog.journey_versions jv on jv.id = e.journey_version_id
    join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
    where e.business_id = core.businesses.id
      and app_private.has_permission('participant.manage', jd.owner_organization_id, 'business', core.businesses.id)
  )
) with check (app_private.is_trusted_worker() or app_private.can_access_business(core.businesses.id));

create policy business_memberships_select_authorized on core.business_memberships
for select using (
  app_private.can_access_entrepreneur(entrepreneur_id)
  and app_private.can_access_business(business_id)
);

create policy business_memberships_write_operator on core.business_memberships
for all using (app_private.can_manage_entrepreneur(entrepreneur_id))
with check (app_private.can_manage_entrepreneur(entrepreneur_id));

create policy file_objects_select_authorized on core.file_objects
for select using (app_private.can_access_file_object(id));

create policy file_objects_write_operator on core.file_objects
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('file.manage', owner_organization_id, 'file_object', id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('file.manage', owner_organization_id, 'file_object', id)
);

-- Journey execution tables.
create policy enrollments_select_authorized on orchestration.enrollments
for select using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.is_trusted_worker()
  or exists (
    select 1 from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
    where jv.id = orchestration.enrollments.journey_version_id
      and app_private.has_permission('journey.execution.read', jd.owner_organization_id, 'enrollment', orchestration.enrollments.id)
  )
);

create policy enrollments_write_operator on orchestration.enrollments
for all using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
    where jv.id = orchestration.enrollments.journey_version_id
      and app_private.has_permission('journey.execution.manage', jd.owner_organization_id, 'enrollment', orchestration.enrollments.id)
  )
) with check (
  app_private.is_trusted_worker()
  or exists (
    select 1 from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
    where jv.id = orchestration.enrollments.journey_version_id
      and app_private.has_permission('journey.execution.manage', jd.owner_organization_id, 'enrollment', orchestration.enrollments.id)
  )
);

create policy journey_instances_select_authorized on orchestration.journey_instances
for select using (app_private.can_access_journey_instance(id));

create policy journey_instances_write_authorized on orchestration.journey_instances
for all using (
  app_private.can_access_journey_instance(id) or app_private.can_manage_journey_instance(id)
) with check (
  app_private.can_access_journey_instance(id) or app_private.can_manage_journey_instance(id)
);

create policy path_assignments_authorized on orchestration.path_assignments
for all using (app_private.can_access_journey_instance(journey_instance_id))
with check (app_private.can_access_journey_instance(journey_instance_id));

create policy step_instances_authorized on orchestration.step_instances
for all using (app_private.can_access_step_instance(id))
with check (app_private.can_access_step_instance(id));

create policy activity_sessions_authorized on orchestration.activity_sessions
for all using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_step_instance(step_instance_id)
) with check (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_step_instance(step_instance_id)
);

create policy progress_projections_authorized on orchestration.progress_projections
for select using (app_private.can_access_journey_instance(journey_instance_id));

create policy progress_projections_worker_write on orchestration.progress_projections
for all using (app_private.is_trusted_worker() or app_private.can_manage_journey_instance(journey_instance_id))
with check (app_private.is_trusted_worker() or app_private.can_manage_journey_instance(journey_instance_id));

create policy personalization_decisions_authorized on orchestration.personalization_decisions
for select using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_entrepreneur(entrepreneur_id)
);

create policy personalization_decisions_worker_write on orchestration.personalization_decisions
for all using (app_private.is_trusted_worker() or app_private.can_manage_entrepreneur(entrepreneur_id))
with check (app_private.is_trusted_worker() or app_private.can_manage_entrepreneur(entrepreneur_id));

-- Diagnostics.
create policy diagnostic_sessions_authorized on diagnostics.sessions
for all using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_entrepreneur(entrepreneur_id)
) with check (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_entrepreneur(entrepreneur_id)
);

create policy diagnostic_responses_authorized on diagnostics.responses
for select using (
  exists (select 1 from diagnostics.sessions s where s.id = session_id and app_private.can_access_entrepreneur(s.entrepreneur_id))
);

create policy diagnostic_responses_insert_authorized on diagnostics.responses
for insert with check (
  exists (select 1 from diagnostics.sessions s where s.id = session_id and s.entrepreneur_id = app_private.current_entrepreneur_id())
  or app_private.is_trusted_worker()
);

create policy diagnostic_results_authorized on diagnostics.results
for select using (
  exists (select 1 from diagnostics.sessions s where s.id = session_id and app_private.can_access_entrepreneur(s.entrepreneur_id))
);

create policy diagnostic_results_worker_write on diagnostics.results
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy dimension_results_authorized on diagnostics.dimension_results
for select using (
  exists (
    select 1 from diagnostics.results r
    join diagnostics.sessions s on s.id = r.session_id
    where r.id = result_id and app_private.can_access_entrepreneur(s.entrepreneur_id)
  )
);

create policy dimension_results_worker_write on diagnostics.dimension_results
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy segment_assignments_authorized on diagnostics.segment_assignments
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy segment_assignments_worker_write on diagnostics.segment_assignments
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy archetype_assignments_governed on diagnostics.archetype_assignments
for select using (
  app_private.can_access_entrepreneur(entrepreneur_id)
  and classification_status <> 'disabled'
);

create policy archetype_assignments_worker_write on diagnostics.archetype_assignments
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

-- Assessments and practical submissions.
create policy assessment_attempts_authorized on assessment.attempts
for all using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_step_instance(step_instance_id)
) with check (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_step_instance(step_instance_id)
);

create policy assessment_responses_authorized on assessment.responses
for select using (
  exists (select 1 from assessment.attempts a where a.id = attempt_id and app_private.can_access_entrepreneur(a.entrepreneur_id))
);

create policy assessment_responses_insert_authorized on assessment.responses
for insert with check (
  exists (select 1 from assessment.attempts a where a.id = attempt_id and a.entrepreneur_id = app_private.current_entrepreneur_id())
  or app_private.is_trusted_worker()
);

create policy assessment_results_authorized on assessment.results
for select using (
  exists (select 1 from assessment.attempts a where a.id = attempt_id and app_private.can_access_entrepreneur(a.entrepreneur_id))
);

create policy assessment_results_worker_write on assessment.results
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy submissions_authorized on assessment.submissions
for all using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_step_instance(step_instance_id)
) with check (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.can_manage_step_instance(step_instance_id)
);

create policy submission_evidence_authorized on assessment.submission_evidence
for all using (
  exists (select 1 from assessment.submissions s where s.id = submission_id and app_private.can_access_entrepreneur(s.entrepreneur_id))
) with check (
  exists (select 1 from assessment.submissions s where s.id = submission_id and app_private.can_access_entrepreneur(s.entrepreneur_id))
);

create policy reviews_select_authorized on assessment.reviews
for select using (
  exists (select 1 from assessment.submissions s where s.id = submission_id and app_private.can_access_entrepreneur(s.entrepreneur_id))
  or reviewer_user_account_id = app_private.current_user_account_id()
);

create policy reviews_write_reviewer on assessment.reviews
for all using (
  app_private.is_trusted_worker()
  or reviewer_user_account_id = app_private.current_user_account_id()
) with check (
  app_private.is_trusted_worker()
  or reviewer_user_account_id = app_private.current_user_account_id()
);

create policy review_scores_select_authorized on assessment.review_scores
for select using (
  exists (select 1 from assessment.reviews r where r.id = review_id and (r.reviewer_user_account_id = app_private.current_user_account_id() or app_private.is_trusted_worker()))
  or exists (
    select 1 from assessment.reviews r
    join assessment.submissions s on s.id = r.submission_id
    where r.id = review_id and s.entrepreneur_id = app_private.current_entrepreneur_id()
  )
);

create policy review_scores_write_reviewer on assessment.review_scores
for all using (
  exists (select 1 from assessment.reviews r where r.id = review_id and (r.reviewer_user_account_id = app_private.current_user_account_id() or app_private.is_trusted_worker()))
) with check (
  exists (select 1 from assessment.reviews r where r.id = review_id and (r.reviewer_user_account_id = app_private.current_user_account_id() or app_private.is_trusted_worker()))
);

-- Engagement is readable by the participant, but only workers/operators mutate it.
create policy point_ledger_select_authorized on engagement.point_ledger
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy point_ledger_worker_insert on engagement.point_ledger
for insert with check (app_private.is_trusted_worker());

create policy point_balance_select_authorized on engagement.point_balance_projections
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy point_balance_worker_write on engagement.point_balance_projections
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy badge_awards_select_authorized on engagement.badge_awards
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy badge_awards_worker_write on engagement.badge_awards
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy certificate_issuances_select_authorized on engagement.certificate_issuances
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy certificate_issuances_worker_write on engagement.certificate_issuances
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy streaks_select_authorized on engagement.streak_projections
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy streaks_worker_write on engagement.streak_projections
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

-- Interventions.
create policy intervention_instances_select_authorized on intervention.instances
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy intervention_instances_worker_write on intervention.instances
for all using (app_private.is_trusted_worker() or app_private.can_manage_entrepreneur(entrepreneur_id))
with check (app_private.is_trusted_worker() or app_private.can_manage_entrepreneur(entrepreneur_id));

create policy intervention_delivery_operator on intervention.delivery_attempts
for all using (
  app_private.is_trusted_worker()
  or exists (
    select 1 from intervention.instances i
    where i.id = intervention_instance_id and app_private.can_manage_entrepreneur(i.entrepreneur_id)
  )
) with check (
  app_private.is_trusted_worker()
  or exists (
    select 1 from intervention.instances i
    where i.id = intervention_instance_id and app_private.can_manage_entrepreneur(i.entrepreneur_id)
  )
);

create policy intervention_responses_authorized on intervention.responses
for all using (
  exists (
    select 1 from intervention.instances i
    where i.id = intervention_instance_id and app_private.can_access_entrepreneur(i.entrepreneur_id)
  )
) with check (
  exists (
    select 1 from intervention.instances i
    where i.id = intervention_instance_id and app_private.can_access_entrepreneur(i.entrepreneur_id)
  )
);

-- Integration, intelligence and governance are operator/worker-only.
create policy integration_connections_operator on integration.connections
for all using (
  app_private.is_trusted_worker()
  or app_private.has_permission('integration.manage', organization_id, 'integration', id)
) with check (
  app_private.is_trusted_worker()
  or app_private.has_permission('integration.manage', organization_id, 'integration', id)
);

create policy external_mappings_worker on integration.external_object_mappings
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy sync_jobs_worker on integration.sync_jobs
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy sync_attempts_worker on integration.sync_attempts
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy integration_conflicts_worker on integration.conflicts
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy webhook_receipts_worker on integration.webhook_receipts
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy feature_values_governed on intelligence.feature_values
for select using (
  app_private.is_trusted_worker()
  or app_private.has_permission('intelligence.read', app_private.current_organization_id(), 'intelligence', id)
);

create policy feature_values_worker_write on intelligence.feature_values
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy score_results_governed on intelligence.score_results
for select using (
  app_private.is_trusted_worker()
  or app_private.has_permission('intelligence.read', app_private.current_organization_id(), 'intelligence', id)
);

create policy score_results_worker_write on intelligence.score_results
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy score_contributions_governed on intelligence.score_contributions
for select using (
  app_private.is_trusted_worker()
  or app_private.has_permission('intelligence.read', app_private.current_organization_id(), 'intelligence', score_result_id)
);

create policy score_contributions_worker_write on intelligence.score_contributions
for all using (app_private.is_trusted_worker()) with check (app_private.is_trusted_worker());

create policy consent_records_authorized on governance.consent_records
for select using (app_private.can_access_entrepreneur(entrepreneur_id));

create policy consent_records_insert_authorized on governance.consent_records
for insert with check (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('governance.manage', app_private.current_organization_id(), 'consent', id)
);

create policy privacy_requests_authorized on governance.privacy_requests
for all using (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('governance.manage', app_private.current_organization_id(), 'privacy_request', id)
) with check (
  entrepreneur_id = app_private.current_entrepreneur_id()
  or app_private.is_trusted_worker()
  or app_private.has_permission('governance.manage', app_private.current_organization_id(), 'privacy_request', id)
);

create policy audit_log_governed on governance.audit_log
for select using (
  app_private.is_trusted_worker()
  or app_private.has_permission('governance.manage', organization_id, 'audit_log', id)
);

create policy audit_log_worker_insert on governance.audit_log
for insert with check (app_private.is_trusted_worker());

