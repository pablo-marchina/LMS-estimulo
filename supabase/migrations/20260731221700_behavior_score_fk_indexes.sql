begin;

create index if not exists ix_behavior_score_configuration_history_configuration
  on intelligence.behavior_score_configuration_history(configuration_id);
create index if not exists ix_behavior_score_configuration_history_organization
  on intelligence.behavior_score_configuration_history(owner_organization_id);
create index if not exists ix_behavior_score_configuration_history_changed_by
  on intelligence.behavior_score_configuration_history(changed_by);
create index if not exists ix_behavior_score_configurations_updated_by
  on intelligence.behavior_score_configurations(updated_by);
create index if not exists ix_behavior_score_history_configuration
  on intelligence.behavior_score_history(configuration_id);
create index if not exists ix_behavior_score_history_score_version
  on intelligence.behavior_score_history(score_version_id);
create index if not exists ix_behavior_score_snapshots_configuration
  on intelligence.behavior_score_snapshots(configuration_id);
create index if not exists ix_behavior_score_snapshots_organization
  on intelligence.behavior_score_snapshots(owner_organization_id);
create index if not exists ix_behavior_score_snapshots_score_version
  on intelligence.behavior_score_snapshots(score_version_id);

commit;