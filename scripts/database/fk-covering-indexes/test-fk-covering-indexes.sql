begin;

do $$
declare
  v_index text;
begin
  foreach v_index in array array[
    'engagement.activity_comment_moderations_organization_idx',
    'engagement.activity_comments_journey_idx',
    'engagement.activity_comments_moderated_by_idx',
    'engagement.activity_utility_rating_revisions_activity_version_idx',
    'engagement.activity_utility_rating_revisions_entrepreneur_idx',
    'engagement.activity_utility_rating_revisions_event_idx',
    'engagement.activity_utility_rating_revisions_journey_idx',
    'engagement.activity_utility_rating_revisions_organization_idx',
    'engagement.activity_utility_ratings_activity_version_idx',
    'engagement.activity_utility_ratings_actor_idx',
    'engagement.activity_utility_ratings_entrepreneur_idx',
    'engagement.activity_utility_ratings_journey_idx',
    'engagement.activity_utility_ratings_latest_event_idx'
  ] loop
    if to_regclass(v_index) is null then
      raise exception 'required covering index missing: %',v_index;
    end if;
  end loop;
end;
$$;

rollback;
