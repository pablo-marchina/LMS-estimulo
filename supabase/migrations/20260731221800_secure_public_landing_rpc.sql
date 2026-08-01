begin;

revoke all on function public.get_public_landing_journey() from public,anon,authenticated;
grant execute on function public.get_public_landing_journey() to service_role;

comment on function public.get_public_landing_journey() is
  'Service-role-only projection consumed through the public-landing-journey Edge Function.';

commit;