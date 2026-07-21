set lock_timeout = '5s';
set statement_timeout = '5min';

create index activity_comment_moderations_organization_idx
  on engagement.activity_comment_moderations(organization_id);

create index activity_comments_journey_idx
  on engagement.activity_comments(journey_instance_id);

create index activity_comments_moderated_by_idx
  on engagement.activity_comments(moderated_by_user_account_id);

create index activity_utility_rating_revisions_activity_version_idx
  on engagement.activity_utility_rating_revisions(activity_version_id);

create index activity_utility_rating_revisions_entrepreneur_idx
  on engagement.activity_utility_rating_revisions(entrepreneur_id);

create index activity_utility_rating_revisions_event_idx
  on engagement.activity_utility_rating_revisions(event_id);

create index activity_utility_rating_revisions_journey_idx
  on engagement.activity_utility_rating_revisions(journey_instance_id);

create index activity_utility_rating_revisions_organization_idx
  on engagement.activity_utility_rating_revisions(organization_id);

create index activity_utility_ratings_activity_version_idx
  on engagement.activity_utility_ratings(activity_version_id);

create index activity_utility_ratings_actor_idx
  on engagement.activity_utility_ratings(actor_user_account_id);

create index activity_utility_ratings_entrepreneur_idx
  on engagement.activity_utility_ratings(entrepreneur_id);

create index activity_utility_ratings_journey_idx
  on engagement.activity_utility_ratings(journey_instance_id);

create index activity_utility_ratings_latest_event_idx
  on engagement.activity_utility_ratings(latest_event_id);
