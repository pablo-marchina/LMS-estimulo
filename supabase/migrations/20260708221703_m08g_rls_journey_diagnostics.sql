-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260708221703
-- Remote name: m08g_rls_journey_diagnostics
-- Remote SQL SHA-256: 7ae226a69937dc86c74d4bc16fff499167ef7179dc12b064c811728fcd3e847b
-- Do not edit after reconciliation; corrections require a new migration.

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
