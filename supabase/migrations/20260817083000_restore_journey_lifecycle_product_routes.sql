begin;

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

  return public.save_admin_product_resource_base(
    p_actor_user_account_id,
    p_organization_id,
    p_resource_type,
    p_payload,
    p_idempotency_key
  );
end;
$function$;

revoke all on function public.save_admin_product_resource(uuid, uuid, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.save_admin_product_resource(uuid, uuid, text, jsonb, text)
  to service_role;

comment on function public.save_admin_product_resource(uuid, uuid, text, jsonb, text) is
  'Routes administrative product commands without dropping journey lifecycle handlers when new resource types are added.';

commit;
