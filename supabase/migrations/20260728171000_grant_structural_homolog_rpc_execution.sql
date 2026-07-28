revoke all on function public.list_external_credential_issuers(uuid) from public, anon, authenticated;
revoke all on function public.get_participant_profile_summary(uuid) from public, anon, authenticated;
revoke all on function public.resolve_participant_diagnostic_entry(uuid) from public, anon, authenticated;

grant execute on function public.list_external_credential_issuers(uuid) to service_role;
grant execute on function public.get_participant_profile_summary(uuid) to service_role;
grant execute on function public.resolve_participant_diagnostic_entry(uuid) to service_role;
