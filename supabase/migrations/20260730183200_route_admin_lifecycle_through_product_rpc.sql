begin;

alter function public.save_admin_product_resource(uuid,uuid,text,jsonb,text)
  rename to save_admin_product_resource_base;

revoke all on function public.save_admin_product_resource_base(uuid,uuid,text,jsonb,text)
  from public,anon,authenticated;

grant execute on function public.save_admin_product_resource_base(uuid,uuid,text,jsonb,text)
  to service_role;

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
  if p_resource_type='journey_retire' then
    return public.retire_admin_journey(
      p_actor_user_account_id,
      p_organization_id,
      nullif(p_payload->>'journey_definition_id','')::uuid,
      p_idempotency_key
    );
  end if;

  if p_resource_type='diagnostic_transition' then
    return public.publish_admin_diagnostic_transition(
      p_actor_user_account_id,
      p_organization_id,
      nullif(p_payload->>'diagnostic_version_id','')::uuid,
      coalesce(p_payload->'archetype_mapping','{}'::jsonb),
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

revoke all on function public.save_admin_product_resource(uuid,uuid,text,jsonb,text)
  from public,anon,authenticated;

grant execute on function public.save_admin_product_resource(uuid,uuid,text,jsonb,text)
  to service_role;

revoke execute on function public.retire_admin_journey(uuid,uuid,uuid,text)
  from service_role;
revoke execute on function public.publish_admin_diagnostic_transition(uuid,uuid,uuid,jsonb,text)
  from service_role;

commit;
