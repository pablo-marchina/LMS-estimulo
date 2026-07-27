begin;

revoke all on function public.abort_library_upload(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.abort_library_upload(uuid,uuid,uuid,text,text) to service_role;

revoke all on function public.confirm_library_upload(uuid,uuid,uuid,text,bigint,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.confirm_library_upload(uuid,uuid,uuid,text,bigint,text,text,text,jsonb,text) to service_role;

revoke all on function public.create_library_upload_intent(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_library_upload_intent(uuid,uuid,text,text,text,text,text) to service_role;

revoke all on function public.get_library_file_download(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_library_file_download(uuid,uuid) to service_role;

revoke all on function public.save_library_content_draft(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text,text,text,text,text[],text,uuid[],boolean,uuid,text) from public,anon,authenticated;
grant execute on function public.save_library_content_draft(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text,text,text,text,text[],text,uuid[],boolean,uuid,text) to service_role;

revoke all on function public.list_admin_identity_resolution_cases(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.list_admin_identity_resolution_cases(uuid,uuid,text) to service_role;

revoke all on function public.resolve_admin_identity_resolution_case(uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.resolve_admin_identity_resolution_case(uuid,uuid,uuid,text,text,text,text) to service_role;

revoke all on function public.enqueue_identity_resolution_case(uuid,uuid,uuid,text,jsonb,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.enqueue_identity_resolution_case(uuid,uuid,uuid,text,jsonb,jsonb,uuid,text) to service_role;

revoke all on function public.publish_admin_journey_version(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.publish_admin_journey_version(uuid,uuid,uuid,text,text) to service_role;

commit;