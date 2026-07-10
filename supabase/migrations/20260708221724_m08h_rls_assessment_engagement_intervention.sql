-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708221724
-- Remote name: m08h_rls_assessment_engagement_intervention
-- Remote SQL SHA-256: b7f48db0ef41065fe3e5a203a397591d308b385471b9fe980eab9ed1b122b560
-- Do not edit after reconciliation; corrections require a new migration.

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
