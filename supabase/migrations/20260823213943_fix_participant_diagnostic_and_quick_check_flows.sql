create or replace function app_private.e14_credit_i(
  a uuid,
  b jsonb,
  c uuid,
  d integer,
  e uuid,
  f integer,
  g text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  lid uuid;
  eid uuid;
  idem text;
  existing_amount integer;
begin
  lid := app_private.e14_deterministic_uuid((b->>'instance') || '|' || g);
  idem := 'e14|' || (b->>'instance') || '|' || g;

  perform app_private.e14_lock_scope('point-credit|' || idem);

  select ledger.source_event_id, ledger.amount
    into eid, existing_amount
    from engagement.point_ledger ledger
   where ledger.idempotency_key = idem
      or ledger.id = lid
   order by ledger.occurred_at
   limit 1;

  if found then
    return jsonb_build_object(
      'ledger_id', lid,
      'event_id', eid,
      'amount', existing_amount,
      'replayed', true
    );
  end if;

  eid := app_private.e14_ec(
    '759ce3da-8b1f-4977-b2de-183775004afc',
    c,
    d,
    a,
    (b->>'org')::uuid,
    (b->>'instance')::uuid,
    'point_ledger',
    lid,
    'point_ledger',
    lid,
    0,
    jsonb_build_object('amount', f, 'code', g)
  );

  insert into engagement.point_ledger(
    id,
    entrepreneur_id,
    journey_instance_id,
    point_rule_version_id,
    amount,
    source_event_id,
    idempotency_key,
    reason,
    occurred_at
  ) values (
    lid,
    (b->>'person')::uuid,
    (b->>'instance')::uuid,
    e,
    f,
    eid,
    idem,
    g,
    now()
  );

  return jsonb_build_object(
    'ledger_id', lid,
    'event_id', eid,
    'amount', f,
    'replayed', false
  );
end;
$function$;

create or replace function app_private.e14_write_c4(a jsonb, b jsonb, c uuid)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  r uuid;
  q numeric;
begin
  select assignment.id
    into r
    from orchestration.path_assignments assignment
   where assignment.journey_instance_id = (a->>'instance_id')::uuid
     and assignment.path_template_id = (b->>'t')::uuid
     and assignment.status = 'active'
   order by assignment.created_at desc, assignment.id
   limit 1;

  if found then
    return r;
  end if;

  r := app_private.e14_deterministic_uuid((a->>'instance_id') || 'a');
  q := case when (b->>'l')::boolean then 0.5 else 1.0 end;

  insert into orchestration.path_assignments(
    id,
    journey_instance_id,
    path_template_id,
    assignment_policy_id,
    status,
    reason,
    confidence,
    valid_from
  ) values (
    r,
    (a->>'instance_id')::uuid,
    (b->>'t')::uuid,
    null,
    'active',
    jsonb_build_object('result_id', c, 'technical_only', true),
    q,
    now()
  )
  on conflict do nothing;

  select assignment.id
    into r
    from orchestration.path_assignments assignment
   where assignment.journey_instance_id = (a->>'instance_id')::uuid
     and assignment.path_template_id = (b->>'t')::uuid
     and assignment.status = 'active'
   order by assignment.created_at desc, assignment.id
   limit 1;

  if r is null then
    raise exception 'PATH_ASSIGNMENT_NOT_AVAILABLE' using errcode = 'P0002';
  end if;

  return r;
end;
$function$;

create or replace function public.ensure_participant_diagnostic_entry(
  p_actor_user_account_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entry jsonb;
  v_journey_version_id uuid;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);

  v_entry := public.resolve_participant_diagnostic_entry(p_actor_user_account_id);
  if coalesce(v_entry->>'status', '') <> 'journey_required' then
    return v_entry;
  end if;

  perform app_private.e14_lock_scope('diagnostic-entry|' || p_actor_user_account_id::text);

  v_entry := public.resolve_participant_diagnostic_entry(p_actor_user_account_id);
  if coalesce(v_entry->>'status', '') <> 'journey_required' then
    return v_entry;
  end if;

  select version.id
    into v_journey_version_id
    from catalog.journey_versions version
    join catalog.journey_definitions definition
      on definition.id = version.journey_definition_id
   where version.status = 'published'
     and coalesce(version.configuration->>'visibility', '') <> 'internal_test_only'
     and coalesce((version.configuration->>'publishable_to_real_participants')::boolean, true)
     and (version.eligible_archetype_codes is null or cardinality(version.eligible_archetype_codes) = 0)
   order by
     case when version.configuration #>> '{presentation,featured}' = 'true' then 0 else 1 end,
     case
       when (version.configuration #>> '{presentation,featured_rank}') ~ '^[0-9]+$'
         then (version.configuration #>> '{presentation,featured_rank}')::integer
       else 9999
     end,
     version.created_at desc,
     version.id
   limit 1;

  if v_journey_version_id is null then
    return v_entry;
  end if;

  perform public.e14_self_enroll(
    p_actor_user_account_id,
    v_journey_version_id,
    'diagnostic-context:' || p_idempotency_key
  );

  return public.resolve_participant_diagnostic_entry(p_actor_user_account_id);
end;
$function$;

revoke execute on function public.ensure_participant_diagnostic_entry(uuid, text) from public;
revoke execute on function public.ensure_participant_diagnostic_entry(uuid, text) from anon;
revoke execute on function public.ensure_participant_diagnostic_entry(uuid, text) from authenticated;
grant execute on function public.ensure_participant_diagnostic_entry(uuid, text) to service_role;

comment on function public.ensure_participant_diagnostic_entry(uuid, text) is
  'Ensures a participant has an available journey instance to host the primary diagnostic without starting the journey, then returns the canonical diagnostic entry.';
