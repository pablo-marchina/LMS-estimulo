create or replace function public.list_participant_point_rules(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog'
as $function$
declare v_entrepreneur_id uuid; v_items jsonb;
begin
  select entrepreneur.id into v_entrepreneur_id from core.entrepreneurs entrepreneur join iam.user_accounts account on account.id=entrepreneur.user_account_id where entrepreneur.user_account_id=p_actor_user_account_id and entrepreneur.status='active' and account.status='active';
  if v_entrepreneur_id is null then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'definition_id',definition.id,
    'name',definition.name,
    'amount',version.amount,
    'frequency',case version.recurrence_policy->>'scope'
      when 'enrollment_activity' then 'per_activity'
      when 'enrollment_assessment' then 'per_assessment'
      when 'participant_day' then 'daily'
      when 'participant_week' then 'weekly'
      when 'event' then 'unlimited'
      else 'once'
    end,
    'maximum_awards',coalesce((version.recurrence_policy->>'maximum')::integer,1)
  ) order by definition.name),'[]'::jsonb) into v_items
  from engagement.point_rule_definitions definition
  join lateral (select item.* from engagement.point_rule_versions item where item.point_rule_definition_id=definition.id and item.status='published' and item.published_at is not null order by item.version_number desc limit 1) version on true
  where definition.owner_organization_id='427d7ce5-c341-54cf-a3a2-c2936e4a0a27'::uuid and definition.status='active';
  return jsonb_build_object('point_rules',v_items);
end;
$function$;
revoke all on function public.list_participant_point_rules(uuid) from public,anon,authenticated;
grant execute on function public.list_participant_point_rules(uuid) to service_role;