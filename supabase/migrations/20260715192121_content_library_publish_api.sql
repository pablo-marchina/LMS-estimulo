create or replace function public.publish_library_content(p_actor_user_account_id uuid,p_organization_id uuid,p_library_item_version_id uuid,p_expected_content_hash text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid:=app_private.e14_command_event_id('publish_library_content',p_actor_user_account_id,p_library_item_version_id,v_key);
  v_request_hash text:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'library_item_version_id',p_library_item_version_id,'expected_content_hash',p_expected_content_hash));
  v_result jsonb; v_item_id uuid; v_version_number integer; v_content_hash text; v_status text;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id; return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result); end if;
  select v.library_item_id,v.version_number,v.content_hash,v.status into v_item_id,v_version_number,v_content_hash,v_status from catalog.library_item_versions v join catalog.library_items i on i.id=v.library_item_id where v.id=p_library_item_version_id and i.owner_organization_id=p_organization_id for update of v;
  if v_item_id is null then raise exception 'LIBRARY_CONTENT_NOT_FOUND' using errcode='P0002'; end if;
  if v_status<>'draft' then raise exception 'LIBRARY_VERSION_NOT_DRAFT' using errcode='22023'; end if;
  if v_content_hash<>p_expected_content_hash then raise exception 'CONTENT_HASH_MISMATCH' using errcode='40001'; end if;
  update catalog.library_item_versions set status='retired',retired_at=now() where library_item_id=v_item_id and status='published';
  update catalog.library_item_versions set status='published',published_at=now(),retired_at=null where id=p_library_item_version_id;
  update catalog.library_items set status='active',updated_at=now() where id=v_item_id;
  v_result:=jsonb_build_object('library_item_id',v_item_id,'library_item_version_id',p_library_item_version_id,'version_number',v_version_number,'status','published','content_hash',v_content_hash);
  perform app_private.e14_append_event(v_event_id,'catalog.library_content.published','library_content',p_library_item_version_id,'user',p_actor_user_account_id,p_organization_id,null,'library_item',v_item_id,v_version_number,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result));
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end; $$;
revoke all on function public.publish_library_content(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.publish_library_content(uuid,uuid,uuid,text,text) to postgres,service_role,app_worker;
