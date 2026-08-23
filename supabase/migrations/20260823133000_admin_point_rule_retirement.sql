create or replace function public.retire_admin_point_rule(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_point_rule_definition_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text := app_private.e14_request_hash(jsonb_build_object('point_rule_definition_id', p_point_rule_definition_id));
  v_event_id uuid := app_private.e14_command_event_id('retire_admin_point_rule', p_actor_user_account_id, p_organization_id, v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_before jsonb;
  v_after jsonb;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id, p_organization_id, 'engagement.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select payload ->> 'request_hash', payload -> 'result'
    into v_existing_hash, v_existing_result
    from eventing.events
   where event_id = v_event_id;
  if found then
    if v_existing_hash is distinct from v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '23505';
    end if;
    return coalesce(v_existing_result, '{}'::jsonb) || jsonb_build_object('replayed', true);
  end if;

  perform app_private.e14_lock_scope('point-rule-definition|' || p_point_rule_definition_id::text);
  select to_jsonb(definition)
    into v_before
    from engagement.point_rule_definitions definition
   where definition.id = p_point_rule_definition_id
     and definition.owner_organization_id = p_organization_id
   for update;
  if not found then
    raise exception 'POINT_RULE_NOT_FOUND' using errcode = 'P0002';
  end if;

  update engagement.point_rule_definitions
     set status = 'retired', updated_at = now()
   where id = p_point_rule_definition_id;

  select to_jsonb(definition)
    into v_after
    from engagement.point_rule_definitions definition
   where definition.id = p_point_rule_definition_id;

  v_result := jsonb_build_object(
    'definition_id', p_point_rule_definition_id,
    'status', 'retired'
  );

  select coalesce(max(aggregate_version), 0) + 1
    into v_aggregate_version
    from eventing.events
   where aggregate_type = 'point_rule'
     and aggregate_id = p_point_rule_definition_id;

  perform app_private.e14_append_event(
    v_event_id,
    'admin.product.configuration.saved',
    'point_rule',
    p_point_rule_definition_id,
    'user_account',
    p_actor_user_account_id,
    p_organization_id,
    null,
    'point_rule',
    p_point_rule_definition_id,
    v_aggregate_version,
    v_event_id,
    null,
    jsonb_build_object(
      'resource_type', 'point_rule',
      'action', 'retired',
      'request_hash', v_request_hash,
      'previous_value', v_before,
      'new_value', v_after,
      'result', v_result
    )
  );

  return v_result || jsonb_build_object('replayed', false);
end;
$function$;

create or replace function public.save_admin_product_resource(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_resource_type text,
  p_payload jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
begin
  if p_resource_type = 'journey_retire' then
    return public.retire_admin_journey(
      p_actor_user_account_id,
      p_organization_id,
      nullif(p_payload ->> 'journey_definition_id', '')::uuid,
      p_idempotency_key
    );
  end if;

  if p_resource_type = 'journey_unpublish_to_draft' then
    return public.unpublish_admin_journey_to_draft(
      p_actor_user_account_id,
      p_organization_id,
      nullif(p_payload ->> 'journey_version_id', '')::uuid,
      p_idempotency_key
    );
  end if;

  if p_resource_type = 'journey_draft_delete' then
    return public.delete_admin_journey_draft(
      p_actor_user_account_id,
      p_organization_id,
      nullif(p_payload ->> 'journey_version_id', '')::uuid,
      p_idempotency_key
    );
  end if;

  if p_resource_type = 'diagnostic_transition' then
    return public.publish_admin_diagnostic_transition(
      p_actor_user_account_id,
      p_organization_id,
      nullif(p_payload ->> 'diagnostic_version_id', '')::uuid,
      coalesce(p_payload -> 'archetype_mapping', '{}'::jsonb),
      p_idempotency_key
    );
  end if;

  if p_resource_type = 'program' then
    return public.save_admin_program(
      p_actor_user_account_id,
      p_organization_id,
      p_payload,
      p_idempotency_key
    );
  end if;

  if p_resource_type = 'point_rule_retire' then
    return public.retire_admin_point_rule(
      p_actor_user_account_id,
      p_organization_id,
      nullif(p_payload ->> 'point_rule_definition_id', '')::uuid,
      p_idempotency_key
    );
  end if;

  return public.save_admin_product_resource_base(
    p_actor_user_account_id,
    p_organization_id,
    p_resource_type,
    p_payload,
    p_idempotency_key
  );
end;
$function$;
