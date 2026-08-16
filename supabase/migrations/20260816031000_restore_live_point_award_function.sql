-- Reproduce the hardened point-award function that is already active in production.
-- The recovered historical definition of this RPC contains an obsolete identifier
-- and must remain immutable; this terminal migration restores the live behavior.

create or replace function public.award_participant_action_points(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid,
  p_action_code text,
  p_source_reference text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_ent uuid;
  v_org uuid;
  v_rule uuid;
  v_amount integer;
  v_ledger uuid;
  v_event uuid;
  v_projection uuid;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_ent := app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_ent is null then
    raise exception 'ENTREPRENEUR_NOT_FOUND' using errcode='P0002';
  end if;

  if p_journey_instance_id is not null then
    select definition.owner_organization_id
      into v_org
      from orchestration.journey_instances instance
      join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
      join catalog.journey_versions version on version.id=enrollment.journey_version_id
      join catalog.journey_definitions definition on definition.id=version.journey_definition_id
     where instance.id=p_journey_instance_id
       and enrollment.entrepreneur_id=v_ent;
    if v_org is null then
      raise exception 'JOURNEY_INSTANCE_NOT_AVAILABLE' using errcode='P0002';
    end if;
  else
    select id into v_org
      from iam.organizations
     where slug='estimulo' and status='active'
     limit 1;
  end if;

  select version.id,version.amount
    into v_rule,v_amount
    from engagement.point_rule_definitions definition
    join engagement.point_rule_versions version on version.point_rule_definition_id=definition.id
   where definition.owner_organization_id=v_org
     and definition.code=p_action_code
     and definition.status='active'
     and version.status='published'
   order by version.version_number desc
   limit 1;
  if v_rule is null then
    raise exception 'POINT_RULE_NOT_PUBLISHED' using errcode='P0002';
  end if;

  v_ledger := app_private.e14_deterministic_uuid(
    'points|'||p_actor_user_account_id::text||'|'||p_action_code||'|'||coalesce(p_source_reference,'')
  );
  if exists(select 1 from engagement.point_ledger where id=v_ledger or idempotency_key=p_idempotency_key) then
    select amount into v_amount
      from engagement.point_ledger
     where id=v_ledger or idempotency_key=p_idempotency_key
     limit 1;
    return jsonb_build_object('replayed',true,'amount',v_amount,'action_code',p_action_code);
  end if;

  v_event := app_private.e14_deterministic_uuid('points-event|'||v_ledger::text);
  perform app_private.e14_append_event(
    v_event,
    'engagement.points.awarded',
    'point_ledger',
    v_ledger,
    'user_account',
    p_actor_user_account_id,
    v_org,
    p_journey_instance_id,
    'point_ledger',
    v_ledger,
    1,
    v_event,
    null,
    jsonb_build_object(
      'code',p_action_code,
      'amount',v_amount,
      'source_reference',p_source_reference,
      'entrepreneur_id',v_ent
    )
  );

  insert into engagement.point_ledger(
    id,entrepreneur_id,journey_instance_id,point_rule_version_id,amount,
    source_event_id,idempotency_key,reason,reverses_entry_id,occurred_at
  ) values(
    v_ledger,v_ent,p_journey_instance_id,v_rule,v_amount,
    v_event,p_idempotency_key,p_action_code,null,now()
  );

  select id into v_projection
    from engagement.point_balance_projections
   where entrepreneur_id=v_ent
     and journey_instance_id is not distinct from p_journey_instance_id
   order by updated_at desc
   limit 1;

  if v_projection is null then
    insert into engagement.point_balance_projections(
      id,entrepreneur_id,journey_instance_id,balance,last_ledger_entry_id,projection_version,updated_at
    ) values(
      app_private.e14_deterministic_uuid('point-balance|'||v_ent::text||'|'||coalesce(p_journey_instance_id::text,'global')),
      v_ent,p_journey_instance_id,v_amount,v_ledger,1,now()
    );
  else
    update engagement.point_balance_projections
       set balance=balance+v_amount,
           last_ledger_entry_id=v_ledger,
           projection_version=projection_version+1,
           updated_at=now()
     where id=v_projection;
  end if;

  return jsonb_build_object(
    'replayed',false,
    'amount',v_amount,
    'action_code',p_action_code,
    'ledger_id',v_ledger
  );
end;
$$;

revoke all on function public.award_participant_action_points(uuid,uuid,text,text,text)
  from public,anon,authenticated;
grant execute on function public.award_participant_action_points(uuid,uuid,text,text,text)
  to service_role;
