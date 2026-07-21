set lock_timeout = '5s';
set statement_timeout = '5min';

drop function if exists public.provision_test_signup_participant(uuid, text, text);

do $$
begin
  if to_regprocedure('public.provision_test_signup_participant(uuid,text,text)') is not null then
    raise exception 'TEST_PUBLIC_SIGNUP_FUNCTION_STILL_PRESENT';
  end if;
end;
$$;
