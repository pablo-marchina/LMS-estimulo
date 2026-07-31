create or replace function public.save_admin_program(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_payload jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_program_id uuid;
  v_code text;
  v_name text;
  v_description text;
  v_status text;
  v_request_hash text;
  v_event_id uuid;
  v_existing_hash text;
  v_existing_result jsonb;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'ADMIN_PAYLOAD_INVALID' using errcode = '22023';
  end if;
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'journey.definition.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_name := btrim(coalesce(p_payload ->> 'name', ''));
  v_description := nullif(btrim(coalesce(p_payload ->> 'description', '')), '');
  v_code := lower(btrim(coalesce(p_payload ->> 'code', '')));
  v_status := case when p_payload ->> 'status' = 'retired' then 'retired' else 'active' end;

  if length(v_name) < 2 then
    raise exception 'PROGRAM_NAME_REQUIRED' using errcode = '22023';
  end if;
  if v_code !~ '^[a-z][a-z0-9_\-]{1,79}$' then
    raise exception 'PROGRAM_CODE_INVALID' using errcode = '22023';
  end if;

  v_request_hash := app_private.e14_request_hash(
    jsonb_build_object('program', p_payload)
  );
  v_event_id := app_private.e14_command_event_id(
    'save_admin_program',
    p_actor_user_account_id,
    p_organization_id,
    p_idempotency_key
  );

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

  v_program_id := nullif(p_payload ->> 'id', '')::uuid;

  if v_program_id is null then
    insert into catalog.programs(
      id,
      owner_organization_id,
      code,
      name,
      description,
      status,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      p_organization_id,
      v_code,
      v_name,
      v_description,
      'active',
      now(),
      now()
    )
    returning id into v_program_id;
  else
    if v_status = 'retired' and exists (
      select 1
        from catalog.journey_definitions
       where program_id = v_program_id
         and owner_organization_id = p_organization_id
         and status <> 'retired'
    ) then
      raise exception 'PROGRAM_IN_USE' using errcode = '23503';
    end if;

    update catalog.programs
       set code = v_code,
           name = v_name,
           description = v_description,
           status = v_status,
           updated_at = now()
     where id = v_program_id
       and owner_organization_id = p_organization_id;

    if not found then
      raise exception 'PROGRAM_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  v_result := jsonb_build_object(
    'id', v_program_id,
    'name', v_name,
    'status', v_status
  );

  perform app_private.e14_lock_scope('program|' || v_program_id::text);
  select coalesce(max(aggregate_version), 0) + 1
    into v_aggregate_version
    from eventing.events
   where aggregate_type = 'program'
     and aggregate_id = v_program_id;

  perform app_private.e14_append_event(
    v_event_id,
    'admin.product.configuration.saved',
    'user_account',
    p_actor_user_account_id,
    'user_account',
    p_actor_user_account_id,
    p_organization_id,
    null,
    'program',
    v_program_id,
    v_aggregate_version,
    v_event_id,
    null,
    jsonb_build_object(
      'resource_type', 'program',
      'request_hash', v_request_hash,
      'result', v_result
    )
  );

  return v_result || jsonb_build_object('replayed', false);
end;
$function$;

revoke all on function public.save_admin_program(uuid, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.save_admin_program(uuid, uuid, jsonb, text) to service_role;
comment on function public.save_admin_program(uuid, uuid, jsonb, text) is
  'Creates, edits or safely retires programs through the authenticated server gateway.';
