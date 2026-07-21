set lock_timeout = '5s';
set statement_timeout = '5min';

create or replace function public.get_participant_engagement_hub(
  p_actor_user_account_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_entrepreneur_id uuid;
  v_preferred_name text;
  v_email text;
  v_organizations uuid[];
  v_announcements jsonb;
  v_ranking jsonb;
  v_own_rank jsonb;
  v_point_history jsonb;
  v_rewards jsonb;
  v_archetype jsonb;
begin
  select entrepreneur.id,entrepreneur.preferred_name,account.email_normalized
  into v_entrepreneur_id,v_preferred_name,v_email
  from core.entrepreneurs entrepreneur
  join iam.user_accounts account on account.id=entrepreneur.user_account_id
  where entrepreneur.user_account_id=p_actor_user_account_id
    and entrepreneur.status='active'
    and account.status='active';
  if v_entrepreneur_id is null then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;

  select coalesce(array_agg(distinct definition.owner_organization_id),'{}'::uuid[])
  into v_organizations
  from orchestration.enrollments enrollment
  join catalog.journey_versions version on version.id=enrollment.journey_version_id
  join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  where enrollment.entrepreneur_id=v_entrepreneur_id
    and enrollment.status in ('assigned','accepted','active','completed');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',announcement.id,
    'title',announcement.title,
    'body',announcement.body,
    'cta_label',announcement.cta_label,
    'cta_url',announcement.cta_url,
    'priority',announcement.priority,
    'starts_at',announcement.starts_at,
    'ends_at',announcement.ends_at
  ) order by announcement.priority desc,announcement.starts_at desc nulls last,announcement.created_at desc),'[]'::jsonb)
  into v_announcements
  from engagement.announcements announcement
  where announcement.organization_id=any(v_organizations)
    and announcement.status='published'
    and (announcement.starts_at is null or announcement.starts_at<=now())
    and (announcement.ends_at is null or announcement.ends_at>now());

  with balances as (
    select enrollment.entrepreneur_id,coalesce(sum(balance.balance),0)::bigint as points
    from orchestration.journey_instances instance
    join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
    join catalog.journey_versions version on version.id=enrollment.journey_version_id
    join catalog.journey_definitions definition on definition.id=version.journey_definition_id
    left join engagement.point_balance_projections balance on balance.journey_instance_id=instance.id
    where definition.owner_organization_id=any(v_organizations)
      and enrollment.status in ('assigned','accepted','active','completed')
    group by enrollment.entrepreneur_id
  ), ranked as (
    select balance.entrepreneur_id,balance.points,
      dense_rank() over(order by balance.points desc,balance.entrepreneur_id) as position
    from balances balance
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'position',ranked.position,
    'participant',case when ranked.entrepreneur_id=v_entrepreneur_id then 'Você'
      else 'Empreendedor '||upper(substr(md5(ranked.entrepreneur_id::text),1,4)) end,
    'points',ranked.points,
    'is_current',ranked.entrepreneur_id=v_entrepreneur_id
  ) order by ranked.position,ranked.entrepreneur_id) filter(where ranked.position<=10),'[]'::jsonb)
  into v_ranking
  from ranked;

  with balances as (
    select enrollment.entrepreneur_id,coalesce(sum(balance.balance),0)::bigint as points
    from orchestration.journey_instances instance
    join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
    join catalog.journey_versions version on version.id=enrollment.journey_version_id
    join catalog.journey_definitions definition on definition.id=version.journey_definition_id
    left join engagement.point_balance_projections balance on balance.journey_instance_id=instance.id
    where definition.owner_organization_id=any(v_organizations)
      and enrollment.status in ('assigned','accepted','active','completed')
    group by enrollment.entrepreneur_id
  ), ranked as (
    select balance.entrepreneur_id,balance.points,
      dense_rank() over(order by balance.points desc,balance.entrepreneur_id) as position
    from balances balance
  )
  select jsonb_build_object('position',ranked.position,'points',ranked.points)
  into v_own_rank
  from ranked
  where ranked.entrepreneur_id=v_entrepreneur_id
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',ledger.id,
    'amount',ledger.amount,
    'reason',ledger.reason,
    'occurred_at',ledger.occurred_at,
    'journey_instance_id',ledger.journey_instance_id
  ) order by ledger.occurred_at desc,ledger.id desc),'[]'::jsonb)
  into v_point_history
  from (
    select item.*
    from engagement.point_ledger item
    where item.entrepreneur_id=v_entrepreneur_id
    order by item.occurred_at desc,item.id desc
    limit 30
  ) ledger;

  with reward_rows as (
    select
      'badge'::text as reward_type,version.id as version_id,version.title,
      version.description,
      exists(select 1 from engagement.badge_awards award
        where award.entrepreneur_id=v_entrepreneur_id and award.badge_version_id=version.id and award.revoked_at is null) as earned
    from engagement.badge_versions version
    join engagement.badge_definitions definition on definition.id=version.badge_definition_id
    where definition.owner_organization_id=any(v_organizations)
      and version.status='published'
      and version.published_at is not null
    union all
    select
      'certificate'::text,version.id,definition.name,
      'Certificado de conclusão da jornada'::text,
      exists(select 1 from engagement.certificate_issuances issuance
        where issuance.entrepreneur_id=v_entrepreneur_id and issuance.certificate_version_id=version.id and issuance.status='issued' and issuance.revoked_at is null)
    from engagement.certificate_versions version
    join engagement.certificate_definitions definition on definition.id=version.certificate_definition_id
    where definition.owner_organization_id=any(v_organizations)
      and version.status='published'
      and version.published_at is not null
      and exists(select 1 from orchestration.enrollments enrollment
        where enrollment.entrepreneur_id=v_entrepreneur_id and enrollment.journey_version_id=version.journey_version_id)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'type',reward_type,'version_id',version_id,'title',title,'description',description,'earned',earned
  ) order by earned desc,reward_type,title),'[]'::jsonb)
  into v_rewards
  from reward_rows;

  select jsonb_build_object(
    'assignment_id',assignment.id,
    'name',definition.name,
    'description',definition.description,
    'classification_status',assignment.classification_status,
    'probability',assignment.probability,
    'assigned_at',assignment.assigned_at
  ) into v_archetype
  from diagnostics.archetype_assignments assignment
  left join diagnostics.archetype_versions version on version.id=assignment.primary_archetype_version_id
  left join diagnostics.archetype_definitions definition on definition.id=version.archetype_definition_id
  where assignment.entrepreneur_id=v_entrepreneur_id
  order by assignment.assigned_at desc
  limit 1;

  return jsonb_build_object(
    'entrepreneur_id',v_entrepreneur_id,
    'preferred_name',v_preferred_name,
    'email',v_email,
    'announcements',coalesce(v_announcements,'[]'::jsonb),
    'ranking',coalesce(v_ranking,'[]'::jsonb),
    'own_rank',v_own_rank,
    'point_history',coalesce(v_point_history,'[]'::jsonb),
    'rewards',coalesce(v_rewards,'[]'::jsonb),
    'archetype',v_archetype
  );
end;
$$;
