-- Keep exactly one canonical published complete-lesson point rule per organization.
-- Historical versions remain preserved as retired records.
-- This migration is intentionally DML-only and idempotent.
-- Published rows are changed only inside the repository's trusted postgres
-- transaction escape hatch and the escape hatch is closed immediately after.

select set_config('app.admin_live_edit', 'on', true);

with ranked_complete_lesson_rules as (
  select
    pv.id,
    row_number() over (
      partition by pd.owner_organization_id, pd.code
      order by
        (
          pv.amount = 5
          and pv.recurrence_policy ->> 'scope' = 'enrollment_activity'
          and pv.recurrence_policy ->> 'maximum' = '1'
          and pv.recurrence_policy #>> '{trigger,event_name}' = 'learning.activity.completed'
        ) desc,
        pv.version_number desc,
        pv.published_at desc nulls last,
        pv.id desc
    ) as publication_rank
  from engagement.point_rule_definitions pd
  join engagement.point_rule_versions pv
    on pv.point_rule_definition_id = pd.id
  where pd.code = 'complete_lesson'
    and pd.status = 'active'
    and pv.status = 'published'
)
update engagement.point_rule_versions pv
set status = 'retired'
from ranked_complete_lesson_rules ranked
where pv.id = ranked.id
  and ranked.publication_rank > 1;

select set_config('app.admin_live_edit', 'off', true);
