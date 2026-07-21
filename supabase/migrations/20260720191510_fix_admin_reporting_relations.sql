set lock_timeout = '5s';
set statement_timeout = '5min';

create or replace function public.get_admin_reporting_dashboard(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog
as $$
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'reporting.read') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  return jsonb_build_object(
    'organization_id',p_organization_id,
    'generated_at',now(),
    'metrics',jsonb_build_object(
      'participants',(
        select count(distinct en.entrepreneur_id)
        from orchestration.enrollments en
        join catalog.journey_versions jv on jv.id=en.journey_version_id
        join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
        where jd.owner_organization_id=p_organization_id
      ),
      'enrollments',(
        select count(*)
        from orchestration.enrollments en
        join catalog.journey_versions jv on jv.id=en.journey_version_id
        join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
        where jd.owner_organization_id=p_organization_id
      ),
      'completed_journeys',(
        select count(*)
        from orchestration.journey_instances ji
        join orchestration.enrollments en on en.id=ji.enrollment_id
        join catalog.journey_versions jv on jv.id=en.journey_version_id
        join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
        where jd.owner_organization_id=p_organization_id and ji.status='completed'
      ),
      'average_progress',(
        select coalesce(round(avg(pp.completion_ratio*100)::numeric,2),0)
        from orchestration.progress_projections pp
        join orchestration.journey_instances ji on ji.id=pp.journey_instance_id
        join orchestration.enrollments en on en.id=ji.enrollment_id
        join catalog.journey_versions jv on jv.id=en.journey_version_id
        join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
        where jd.owner_organization_id=p_organization_id
      ),
      'points_issued',(
        select coalesce(sum(pl.amount),0)
        from engagement.point_ledger pl
        join engagement.point_rule_versions prv on prv.id=pl.point_rule_version_id
        join engagement.point_rule_definitions prd on prd.id=prv.point_rule_definition_id
        where prd.owner_organization_id=p_organization_id
      ),
      'comments',(select count(*) from engagement.activity_comments where organization_id=p_organization_id),
      'practice_submissions',(
        select count(*)
        from assessment.submissions s
        join orchestration.step_instances si on si.id=s.step_instance_id
        join orchestration.path_assignments pa on pa.id=si.path_assignment_id
        join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
        where app_private.journey_owner_organization_id(ji.id)=p_organization_id
      ),
      'average_utility_rating',(
        select coalesce(round(avg(rating)::numeric,2),0)
        from engagement.activity_utility_ratings
        where organization_id=p_organization_id
      ),
      'badges_awarded',(
        select count(*)
        from engagement.badge_awards ba
        join engagement.badge_versions bv on bv.id=ba.badge_version_id
        join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
        where bd.owner_organization_id=p_organization_id and ba.revoked_at is null
      ),
      'certificates_issued',(
        select count(*)
        from engagement.certificate_issuances ci
        join engagement.certificate_versions cv on cv.id=ci.certificate_version_id
        join engagement.certificate_definitions cd on cd.id=cv.certificate_definition_id
        where cd.owner_organization_id=p_organization_id and ci.status='issued'
      )
    ),
    'journeys',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'journey',jd.name,
        'version',jv.version_number,
        'enrollments',x.enrollments,
        'completed',x.completed,
        'average_progress',x.average_progress
      ) order by jd.name,jv.version_number),'[]'::jsonb)
      from (
        select en.journey_version_id,
               count(*) enrollments,
               count(*) filter(where ji.status='completed') completed,
               coalesce(round(avg(pp.completion_ratio*100)::numeric,2),0) average_progress
        from orchestration.enrollments en
        left join orchestration.journey_instances ji on ji.enrollment_id=en.id
        left join orchestration.progress_projections pp on pp.journey_instance_id=ji.id
        group by en.journey_version_id
      ) x
      join catalog.journey_versions jv on jv.id=x.journey_version_id
      join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
      where jd.owner_organization_id=p_organization_id
    ),
    'recent_events',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'event_name',e.event_name,
        'occurred_at',e.occurred_at,
        'aggregate_type',e.aggregate_type,
        'aggregate_id',e.aggregate_id
      ) order by e.occurred_at desc),'[]'::jsonb)
      from (
        select * from eventing.events
        where organization_id=p_organization_id
        order by occurred_at desc
        limit 50
      ) e
    )
  );
end;
$$;

revoke all on function public.get_admin_reporting_dashboard(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_admin_reporting_dashboard(uuid,uuid) to service_role,app_worker;
