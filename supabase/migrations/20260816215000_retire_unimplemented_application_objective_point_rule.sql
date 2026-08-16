-- The Vanessa review requires every visible points rule to map to an action that
-- actually exists in the product. This legacy rule never had a trigger event in
-- recurrence_policy and there is no corresponding event schema, so keeping it
-- active would advertise a reward that can never be earned.
update engagement.point_rule_definitions
set status = 'retired'
where code = 'choose_application_objective'
  and status <> 'retired';
