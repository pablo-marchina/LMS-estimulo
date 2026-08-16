-- progress_projections.current_step_id references orchestration.path_steps.id.
-- A later completion helper regression wrote step_instances.id instead, causing
-- valid lesson completions to fail with an FK violation. Keep the projection
-- semantic stable by storing the selected path step id.

create or replace function app_private.e14_complete_progress(a uuid)
returns void
language plpgsql
security definer
set search_path='pg_catalog'
as $$
begin
  update orchestration.step_instances step_instance
  set status='available',available_at=coalesce(step_instance.available_at,now()),aggregate_version=step_instance.aggregate_version+1,updated_at=now()
  from orchestration.path_assignments assignment,orchestration.path_steps path_step
  where step_instance.path_assignment_id=assignment.id
    and step_instance.path_step_id=path_step.id
    and assignment.journey_instance_id=a
    and assignment.status='active'
    and path_step.path_template_id=assignment.path_template_id
    and step_instance.status='locked'
    and not exists(
      select 1 from orchestration.path_steps previous_step
      left join orchestration.step_instances previous_instance on previous_instance.path_assignment_id=assignment.id and previous_instance.path_step_id=previous_step.id
      where previous_step.path_template_id=assignment.path_template_id
        and previous_step.is_required
        and (previous_step.position_hint,previous_step.id)<(path_step.position_hint,path_step.id)
        and coalesce(previous_instance.status,'locked')<>'completed'
    );

  insert into orchestration.progress_projections(journey_instance_id,completed_required_steps,total_required_steps,completion_ratio,current_step_id,last_activity_at,projection_version,updated_at)
  select a,
    count(*) filter(where template.is_required and path_step.is_required and step.status='completed')::integer,
    count(*) filter(where template.is_required and path_step.is_required)::integer,
    case when count(*) filter(where template.is_required and path_step.is_required)>0
      then count(*) filter(where template.is_required and path_step.is_required and step.status='completed')::numeric/count(*) filter(where template.is_required and path_step.is_required)
      else 0 end,
    (select candidate_step.id
       from orchestration.path_assignments candidate_assignment
       join orchestration.path_templates candidate_template on candidate_template.id=candidate_assignment.path_template_id
       join orchestration.step_instances candidate on candidate.path_assignment_id=candidate_assignment.id
       join orchestration.path_steps candidate_step on candidate_step.id=candidate.path_step_id
      where candidate_assignment.journey_instance_id=a
        and candidate_assignment.status='active'
        and candidate.status in ('available','in_progress')
      order by case candidate.status when 'in_progress' then 0 else 1 end,candidate_template.position,candidate_step.position_hint,candidate_step.id
      limit 1),
    now(),1,now()
  from orchestration.path_assignments assignment
  join orchestration.path_templates template on template.id=assignment.path_template_id
  join orchestration.step_instances step on step.path_assignment_id=assignment.id
  join orchestration.path_steps path_step on path_step.id=step.path_step_id
  where assignment.journey_instance_id=a and assignment.status in ('active','completed')
  on conflict(journey_instance_id) do update set
    completed_required_steps=excluded.completed_required_steps,
    total_required_steps=excluded.total_required_steps,
    completion_ratio=excluded.completion_ratio,
    current_step_id=excluded.current_step_id,
    last_activity_at=now(),
    projection_version=orchestration.progress_projections.projection_version+1,
    updated_at=now();
end;
$$;
