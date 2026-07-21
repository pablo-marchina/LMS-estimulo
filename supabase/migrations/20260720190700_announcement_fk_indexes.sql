set lock_timeout = '5s';
set statement_timeout = '5min';

create index if not exists ix_engagement_announcements_created_by
  on engagement.announcements(created_by);

create index if not exists ix_engagement_announcements_updated_by
  on engagement.announcements(updated_by);
