begin;

update iam.organizations
set organization_type='nonprofit',
    slug='estimulo',
    legal_name='Instituto Estímulo de Crédito',
    display_name='Estímulo',
    metadata=jsonb_build_object('platform','capacitacao','institutional',true),
    updated_at=now()
where id='427d7ce5-c341-54cf-a3a2-c2936e4a0a27'::uuid;

update iam.user_accounts
set status='disabled'
where email_normalized in ('e14.operator@invalid.example','e14.participant@invalid.example');

update core.entrepreneurs
set status='inactive'
where user_account_id in (
  select id from iam.user_accounts where email_normalized='e14.participant@invalid.example'
);

update orchestration.enrollments enrollment
set status='cancelled'
from catalog.journey_versions version
join catalog.journey_definitions definition on definition.id=version.journey_definition_id
where enrollment.journey_version_id=version.id
  and definition.code in ('e14_runtime_validation_journey','task4_verify_journey');

update orchestration.journey_instances instance
set status='ended',ended_at=coalesce(ended_at,now()),updated_at=now()
from orchestration.enrollments enrollment
join catalog.journey_versions version on version.id=enrollment.journey_version_id
join catalog.journey_definitions definition on definition.id=version.journey_definition_id
where instance.enrollment_id=enrollment.id
  and definition.code in ('e14_runtime_validation_journey','task4_verify_journey');

update catalog.journey_definitions
set status='retired',updated_at=now()
where code in ('e14_runtime_validation_journey','task4_verify_journey');

update catalog.programs
set status='retired',updated_at=now()
where code='e14_runtime_validation';

update diagnostics.diagnostic_definitions
set status='retired'
where code='e14_runtime_readiness_diagnostic';

update engagement.point_rule_definitions
set name=case code
  when 'e14_activity_complete_v1' then 'Concluir uma aula'
  when 'e14_quick_check_pass_v1' then 'Aprovar uma avaliação'
  else name end
where code in ('e14_activity_complete_v1','e14_quick_check_pass_v1');

create or replace function public.list_participant_point_rules(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid;
  v_items jsonb;
begin
  select entrepreneur.id
  into v_entrepreneur_id
  from core.entrepreneurs entrepreneur
  join iam.user_accounts account on account.id=entrepreneur.user_account_id
  where entrepreneur.user_account_id=p_actor_user_account_id
    and entrepreneur.status='active'
    and account.status='active';
  if v_entrepreneur_id is null then
    raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'definition_id',definition.id,
    'name',definition.name,
    'amount',version.amount,
    'frequency',case version.recurrence_policy->>'scope'
      when 'enrollment_activity' then 'per_activity'
      when 'enrollment_assessment' then 'per_assessment'
      when 'day' then 'daily'
      when 'week' then 'weekly'
      when 'unlimited' then 'unlimited'
      else 'once'
    end,
    'maximum_awards',coalesce((version.recurrence_policy->>'maximum')::integer,1)
  ) order by definition.name),'[]'::jsonb)
  into v_items
  from engagement.point_rule_definitions definition
  join lateral (
    select item.*
    from engagement.point_rule_versions item
    where item.point_rule_definition_id=definition.id
      and item.status='published'
      and item.published_at is not null
    order by item.version_number desc
    limit 1
  ) version on true
  where definition.owner_organization_id='427d7ce5-c341-54cf-a3a2-c2936e4a0a27'::uuid
    and definition.status='active';

  return jsonb_build_object('point_rules',v_items);
end;
$function$;

revoke all on function public.list_participant_point_rules(uuid) from public,anon,authenticated;
grant execute on function public.list_participant_point_rules(uuid) to service_role;

commit;