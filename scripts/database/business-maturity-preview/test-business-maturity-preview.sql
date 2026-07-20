begin;

do $$
declare
  v_org uuid:=app_private.e14_deterministic_uuid('e14:organization');
  v_operator uuid:=app_private.e14_deterministic_uuid('e14:user:operator');
  v_participant uuid:=app_private.e14_deterministic_uuid('e14:user:participant');
  v_operator_role uuid:=app_private.e14_deterministic_uuid('e14:role:operator');
  v_permission uuid;
  v_preview jsonb;
begin
  select id into strict v_permission from iam.permission_definitions
  where code='diagnostic.configuration.manage';
  insert into iam.role_permissions(role_id,permission_id)
  values(v_operator_role,v_permission)
  on conflict do nothing;

  v_preview:=public.get_business_maturity_draft(v_operator,v_org);
  if v_preview#>>'{definition,status}'<>'draft' then raise exception 'definition preview must be draft'; end if;
  if v_preview#>>'{version,status}'<>'draft' then raise exception 'version preview must be draft'; end if;
  if jsonb_array_length(v_preview->'dimensions')<>6 then raise exception 'preview must expose six dimensions'; end if;
  if jsonb_array_length(v_preview->'segments')<>3 then raise exception 'preview must expose three segments'; end if;
  if (v_preview->>'assignment_count')::integer<>0 then raise exception 'draft preview cannot have assignments'; end if;
  if coalesce((v_preview#>>'{version,configuration,activation_allowed}')::boolean,true) then raise exception 'preview must show activation blocked'; end if;

  begin
    perform public.get_business_maturity_draft(v_participant,v_org);
    raise exception 'participant unexpectedly accessed maturity preview';
  exception when insufficient_privilege then null;
  end;

  if has_function_privilege('authenticated','public.get_business_maturity_draft(uuid,uuid)','execute')
     or has_function_privilege('anon','public.get_business_maturity_draft(uuid,uuid)','execute') then
    raise exception 'browser roles must not execute maturity preview RPC';
  end if;
end;
$$;

rollback;
