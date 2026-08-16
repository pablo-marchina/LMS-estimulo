-- Every visible points rule must map to an action that actually exists in the product.
-- This legacy rule has no trigger event or corresponding event schema, so it cannot
-- remain active as an earnable reward.
update engagement.point_rule_definitions
set status = 'retired'
where code = 'choose_application_objective'
  and status <> 'retired';
