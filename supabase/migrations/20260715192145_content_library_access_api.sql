create or replace function public.record_library_content_access(p_actor_user_account_id uuid,p_library_item_version_id uuid,p_action text,p_source text,p_journey_instance_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid:=app_private.e14_command_event_id('record_library_content_access',p_actor_user_account_id,p_library_item_version_id,v_key);
  v_request_hash text; v_result jsonb; v_item_id uuid; v_org_id uuid; v_version_number integer; v_slug text; v_kind text; v_external_url text; v_visibility text;
begin
  if p_action not in ('view','open') then raise exception 'INVALID_LIBRARY_ACCESS_ACTION' using errcode='22023'; end if;
  if length(trim(coalesce(p_source,''))) not between 2 and 80 then raise exception 'INVALID_LIBRARY_ACCESS_SOURCE' using errcode='22023'; end if;
  select i.id,i.owner_organization_id,v.version_number,i.slug,v.content_kind,v.external_url,v.visibility into v_item_id,v_org_id,v_version_number,v_slug,v_kind,v_external_url,v_visibility from catalog.library_items i join catalog.library_item_versions v on v.library_item_id=i.id where v.id=p_library_item_version_id and i.status='active' and v.status='published';
  if v_item_id is null or not app_private.library_actor_can_view(p_actor_user_account_id,v_org_id,v_visibility) then raise exception 'LIBRARY_CONTENT_NOT_FOUND' using errcode='P0002'; end if;
  if p_journey_instance_id is not null and not exists(select 1 from orchestration.journey_instances ji join orchestration.enrollments en on en.id=ji.enrollment_id join core.entrepreneurs e on e.id=en.entrepreneur_id where ji.id=p_journey_instance_id and e.user_account_id=p_actor_user_account_id) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  v_request_hash:=app_private.e14_request_hash(jsonb_build_object('library_item_version_id',p_library_item_version_id,'action',p_action,'source',trim(p_source),'journey_instance_id',p_journey_instance_id));
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id; return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result); end if;
  v_result:=jsonb_build_object('library_item_id',v_item_id,'library_item_version_id',p_library_item_version_id,'slug',v_slug,'content_kind',v_kind,'external_url',case when p_action='open' and v_kind='external_link' then v_external_url else null end,'action',p_action);
  perform app_private.e14_append_event(v_event_id,'learning.library_content.accessed','library_content',p_library_item_version_id,'user',p_actor_user_account_id,v_org_id,p_journey_instance_id,'library_item',v_item_id,v_version_number,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result,'action',p_action,'source',trim(p_source)));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end; $$;
revoke all on function public.record_library_content_access(uuid,uuid,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.record_library_content_access(uuid,uuid,text,text,uuid,text) to postgres,service_role,app_worker;
