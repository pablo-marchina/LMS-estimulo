begin;

-- All extension data is accessed through authenticated SECURITY DEFINER RPCs.
-- Enabling RLS without public policies keeps direct Data API access fail-closed
-- while preserving service-role and function-owner execution.
alter table catalog.external_credential_issuers enable row level security;
alter table experience.platform_settings enable row level security;
alter table experience.extension_commands enable row level security;
alter table catalog.themes enable row level security;
alter table catalog.library_item_theme_links enable row level security;
alter table catalog.journey_theme_links enable row level security;
alter table engagement.certificate_template_assets enable row level security;
alter table engagement.certificate_template_assignments enable row level security;
alter table core.tracking_links enable row level security;
alter table core.tracking_visits enable row level security;
alter table core.acquisition_touchpoints enable row level security;
alter table experience.b2b_pages enable row level security;
alter table experience.b2b_page_versions enable row level security;
alter table experience.b2b_access_groups enable row level security;
alter table experience.b2b_group_members enable row level security;
alter table experience.b2b_page_user_access enable row level security;
alter table experience.b2b_page_group_access enable row level security;
alter table engagement.reward_settings enable row level security;
alter table engagement.reward_wallets enable row level security;
alter table engagement.rewards enable row level security;
alter table engagement.reward_redemptions enable row level security;
alter table engagement.reward_ledger enable row level security;
alter table assessment.delivery_configurations enable row level security;
alter table assessment.delivery_submissions enable row level security;
alter table assessment.delivery_submission_files enable row level security;
alter table assessment.delivery_reviews enable row level security;
alter table intelligence.behavior_score_snapshots enable row level security;

revoke all on table catalog.external_credential_issuers from public, anon, authenticated;
revoke all on table experience.platform_settings from public, anon, authenticated;
revoke all on table experience.extension_commands from public, anon, authenticated;
revoke all on table catalog.themes from public, anon, authenticated;
revoke all on table catalog.library_item_theme_links from public, anon, authenticated;
revoke all on table catalog.journey_theme_links from public, anon, authenticated;
revoke all on table engagement.certificate_template_assets from public, anon, authenticated;
revoke all on table engagement.certificate_template_assignments from public, anon, authenticated;
revoke all on table core.tracking_links from public, anon, authenticated;
revoke all on table core.tracking_visits from public, anon, authenticated;
revoke all on table core.acquisition_touchpoints from public, anon, authenticated;
revoke all on table experience.b2b_pages from public, anon, authenticated;
revoke all on table experience.b2b_page_versions from public, anon, authenticated;
revoke all on table experience.b2b_access_groups from public, anon, authenticated;
revoke all on table experience.b2b_group_members from public, anon, authenticated;
revoke all on table experience.b2b_page_user_access from public, anon, authenticated;
revoke all on table experience.b2b_page_group_access from public, anon, authenticated;
revoke all on table engagement.reward_settings from public, anon, authenticated;
revoke all on table engagement.reward_wallets from public, anon, authenticated;
revoke all on table engagement.rewards from public, anon, authenticated;
revoke all on table engagement.reward_redemptions from public, anon, authenticated;
revoke all on table engagement.reward_ledger from public, anon, authenticated;
revoke all on table assessment.delivery_configurations from public, anon, authenticated;
revoke all on table assessment.delivery_submissions from public, anon, authenticated;
revoke all on table assessment.delivery_submission_files from public, anon, authenticated;
revoke all on table assessment.delivery_reviews from public, anon, authenticated;
revoke all on table intelligence.behavior_score_snapshots from public, anon, authenticated;

commit;
