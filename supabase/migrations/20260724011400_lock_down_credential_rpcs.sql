-- The web application invokes these commands through authenticated-rpc,
-- which verifies the JWT, resolves the internal identity and rejects actor
-- mismatches before calling Postgres with service_role.

revoke execute on function public.create_external_credential_upload_intent(uuid,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.confirm_external_credential_upload(uuid,uuid,text,text,date,date,text,text,bigint,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.abort_external_credential_upload(uuid,uuid,text,text) from public,anon,authenticated;
revoke execute on function public.list_participant_external_credentials(uuid) from public,anon,authenticated;
revoke execute on function public.get_external_credential_download(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.create_certificate_template_upload_intent(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.confirm_certificate_template_upload(uuid,uuid,uuid,text,bigint,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.configure_certificate_version(uuid,uuid,uuid,uuid,jsonb,text) from public,anon,authenticated;
revoke execute on function public.publish_certificate_version(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.get_certificate_render_payload(uuid,uuid) from public,anon,authenticated;

grant execute on function public.create_external_credential_upload_intent(uuid,text,text,text,text,text) to service_role;
grant execute on function public.confirm_external_credential_upload(uuid,uuid,text,text,date,date,text,text,bigint,text,text,text,text) to service_role;
grant execute on function public.abort_external_credential_upload(uuid,uuid,text,text) to service_role;
grant execute on function public.list_participant_external_credentials(uuid) to service_role;
grant execute on function public.get_external_credential_download(uuid,uuid) to service_role;
grant execute on function public.create_certificate_template_upload_intent(uuid,uuid,text,text,text,text,text) to service_role;
grant execute on function public.confirm_certificate_template_upload(uuid,uuid,uuid,text,bigint,text,text,text,text) to service_role;
grant execute on function public.configure_certificate_version(uuid,uuid,uuid,uuid,jsonb,text) to service_role;
grant execute on function public.publish_certificate_version(uuid,uuid,uuid,text) to service_role;
grant execute on function public.get_certificate_render_payload(uuid,uuid) to service_role;
