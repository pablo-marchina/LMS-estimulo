\set ON_ERROR_STOP on

-- Assertion-only gate: the migration replay above created the implementation.
-- This verifies the RPC and the exact semantic branch the web editor depends on.
do $$
declare
  v_definition text;
  v_acl text[];
begin
  if to_regprocedure('public.patch_admin_lesson(uuid,uuid,jsonb,text)') is null then
    raise exception 'PATCH_ADMIN_LESSON_RPC_MISSING';
  end if;

  v_definition := pg_get_functiondef('public.patch_admin_lesson(uuid,uuid,jsonb,text)'::regprocedure);

  if position('v_existing_library_item_version_id' in v_definition) = 0 then
    raise exception 'PATCH_ADMIN_LESSON_DOES_NOT_READ_EXISTING_LIBRARY_LINK';
  end if;

  if position('v_requested_library_item_version_id = v_existing_library_item_version_id' in v_definition) = 0 then
    raise exception 'PATCH_ADMIN_LESSON_DOES_NOT_DETECT_UNCHANGED_LIBRARY_LINK';
  end if;

  if position('''content_source'', ''current''' in v_definition) = 0 then
    raise exception 'PATCH_ADMIN_LESSON_DOES_NOT_PRESERVE_UNCHANGED_LIBRARY_ASSET';
  end if;

  if position('return public.save_admin_lesson' in lower(v_definition)) = 0 then
    raise exception 'PATCH_ADMIN_LESSON_DOES_NOT_DELEGATE_TO_CANONICAL_SAVE';
  end if;

  select coalesce(p.proacl::text[], '{}'::text[])
  into v_acl
  from pg_proc p
  where p.oid = 'public.patch_admin_lesson(uuid,uuid,jsonb,text)'::regprocedure;

  if has_function_privilege('anon', 'public.patch_admin_lesson(uuid,uuid,jsonb,text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.patch_admin_lesson(uuid,uuid,jsonb,text)', 'EXECUTE') then
    raise exception 'PATCH_ADMIN_LESSON_RPC_EXPOSED_TO_CLIENT_ROLES';
  end if;

  if not has_function_privilege('service_role', 'public.patch_admin_lesson(uuid,uuid,jsonb,text)', 'EXECUTE') then
    raise exception 'PATCH_ADMIN_LESSON_RPC_NOT_AVAILABLE_TO_SERVICE_ROLE';
  end if;
end $$;
