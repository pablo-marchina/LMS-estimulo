begin;

create index if not exists legal_acceptances_user_account_idx
  on governance.legal_acceptances(user_account_id);
create index if not exists legal_document_versions_created_by_idx
  on governance.legal_document_versions(created_by);

create index if not exists certificate_template_assets_file_object_idx
  on engagement.certificate_template_assets(file_object_id);
create index if not exists certificate_template_assets_created_by_idx
  on engagement.certificate_template_assets(created_by);
create index if not exists certificate_template_assignments_template_asset_idx
  on engagement.certificate_template_assignments(template_asset_id);
create index if not exists certificate_template_assignments_created_by_idx
  on engagement.certificate_template_assignments(created_by);

create index if not exists reward_wallets_organization_idx
  on engagement.reward_wallets(organization_id);
create index if not exists reward_ledger_organization_idx
  on engagement.reward_ledger(organization_id);
create index if not exists reward_ledger_redemption_idx
  on engagement.reward_ledger(redemption_id)
  where redemption_id is not null;
create index if not exists reward_ledger_created_by_idx
  on engagement.reward_ledger(created_by);
create index if not exists reward_redemptions_reward_idx
  on engagement.reward_redemptions(reward_id);
create index if not exists reward_redemptions_user_account_idx
  on engagement.reward_redemptions(user_account_id);

create index if not exists certificate_versions_issuer_idx
  on engagement.certificate_versions(issuer_id)
  where issuer_id is not null;

commit;
