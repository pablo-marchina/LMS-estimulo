revoke execute on function public.verify_certificate(text) from anon,authenticated;
grant execute on function public.verify_certificate(text) to service_role,app_worker;
