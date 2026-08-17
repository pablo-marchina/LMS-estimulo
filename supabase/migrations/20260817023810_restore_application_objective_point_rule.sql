update engagement.point_rule_definitions d
set status = 'active'
where d.code = 'choose_application_objective'
  and d.status = 'retired'
  and exists (
    select 1
    from engagement.point_rule_versions v
    where v.point_rule_definition_id = d.id
      and v.status = 'published'
  );
