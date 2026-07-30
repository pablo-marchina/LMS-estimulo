begin;

-- The maturity preview endpoint belonged to the removed administration module.
-- The final release must not expose the function or retain execution grants.
do $$
declare
  v_signature regprocedure;
begin
  v_signature:=to_regprocedure('public.get_business_maturity_draft(uuid,uuid)');
  if v_signature is not null then
    raise exception 'obsolete business maturity preview RPC remains';
  end if;

  if exists (
    select 1
    from information_schema.routine_privileges
    where specific_schema='public'
      and routine_name='get_business_maturity_draft'
      and grantee in ('PUBLIC','anon','authenticated','service_role','app_worker')
  ) then
    raise exception 'obsolete business maturity preview grants remain';
  end if;
end;
$$;

rollback;
