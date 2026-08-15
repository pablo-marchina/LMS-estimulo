-- Keep exactly one published +10 complete-lesson point rule per organization.
-- Historical rule versions remain preserved as deprecated records.
-- This migration is intentionally DML-only and idempotent.

with ranked_complete_lesson_rules as (
  select
    pv.id,
    row_number() over (
      partition by pd.owner_organization_id, pd.code
      order by
        pv.published_at desc nulls last,
        pv.version_number desc,
        pv.id desc
    ) as publication_rank
  from engagement.point_rule_definitions pd
  join engagement.point_rule_versions pv
    on pv.point_rule_definition_id = pd.id
  where pd.code = 'complete_lesson'
    and pd.status = 'published'
    and pv.status = 'published'
    and pv.recurrence_policy ->> 'event_type' = 'learning.activity.completed'
    and pv.amount = 10
)
update engagement.point_rule_versions pv
set status = 'deprecated'
from ranked_complete_lesson_rules ranked
where pv.id = ranked.id
  and ranked.publication_rank > 1;
