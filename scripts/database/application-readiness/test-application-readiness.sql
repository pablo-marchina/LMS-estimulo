begin;

do $$
declare
  v_result jsonb;
begin
  v_result:=public.get_application_readiness();
  if v_result->>'status'<>'ready' then raise exception 'application database readiness is not ready'; end if;
  if not coalesce((v_result#>>'{checks,identity_schema}')::boolean,false) then raise exception 'identity schema check failed'; end if;
  if not coalesce((v_result#>>'{checks,outbox_schema}')::boolean,false) then raise exception 'outbox schema check failed'; end if;
  if has_function_privilege('anon','public.get_application_readiness()','execute')
     or has_function_privilege('authenticated','public.get_application_readiness()','execute') then
    raise exception 'browser roles must not execute readiness RPC';
  end if;
  if not has_function_privilege('service_role','public.get_application_readiness()','execute') then
    raise exception 'service role must execute readiness RPC';
  end if;
end;
$$;

rollback;
