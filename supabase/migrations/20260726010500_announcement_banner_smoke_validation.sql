-- Historical migration retained for version compatibility.
-- The behavioral announcement smoke runs only when its controlled organization
-- and authorized administrator fixtures are present. Empty structural replay
-- must not depend on mutable operational identities or editorial content.
do $smoke$
declare
  v_admin uuid; v_org uuid; v_actor uuid:=gen_random_uuid(); v_entrepreneur uuid:=gen_random_uuid();
  v_intent jsonb; v_file jsonb; v_saved jsonb; v_announcement uuid; v_hub jsonb; v_descriptor jsonb;
begin
  select organization.id into v_org from iam.organizations organization
  where organization.slug='estimulo' and organization.status='active' limit 1;
  if v_org is null then
    raise notice 'announcement smoke skipped: organization fixture is not present during structural replay';
    return;
  end if;

  select account.id into v_admin from iam.user_accounts account
  where account.status='active' and app_private.e14_actor_has_permission(account.id,v_org,'engagement.manage')
  order by account.created_at limit 1;
  if v_admin is null then
    raise notice 'announcement smoke skipped: authorized administrator fixture is not present during structural replay';
    return;
  end if;

  begin
    insert into iam.user_accounts(id,email_normalized,status)
    values(v_actor,'runtime-smoke-banner-'||replace(v_actor::text,'-','')||'@invalid.local','active');
    insert into core.entrepreneurs(id,user_account_id,preferred_name,email_normalized,status,profile_data)
    values(v_entrepreneur,v_actor,'Runtime Smoke Banner','runtime-smoke-banner-'||replace(v_actor::text,'-','')||'@invalid.local','active','{}'::jsonb);

    v_intent:=public.create_announcement_banner_upload_intent(
      v_admin,v_org,'smoke-banner.webp','image/webp','supabase_storage','announcement-banners','smoke-banner-intent'
    );
    v_file:=public.confirm_announcement_banner_upload(
      v_admin,v_org,(v_intent->'data'->>'upload_intent_id')::uuid,'image/webp',1024,repeat('a',64),null,null,
      jsonb_build_object('width',1600,'height',600),'smoke-banner-confirm'
    );
    v_saved:=public.save_operator_announcement(
      v_admin,v_org,null,null,'Banner de validação','Banner de validação do carrossel',null,null,'published',100,null,null,
      (v_file->'data'->>'file_object_id')::uuid,'Banner horizontal de validação da Estímulo','image_only','smoke-banner-save'
    );
    v_announcement:=(v_saved->'data'->>'announcement_id')::uuid;
    v_hub:=public.get_participant_engagement_hub(v_actor);
    if not exists(
      select 1 from jsonb_array_elements(v_hub->'announcements') item
      where (item->>'id')::uuid=v_announcement and item->>'display_mode'='image_only'
    ) then raise exception 'SMOKE_GLOBAL_ANNOUNCEMENT_MISSING'; end if;
    v_descriptor:=public.get_announcement_banner_download(v_actor,v_announcement);
    if v_descriptor->>'object_key' is null or v_descriptor->>'bucket'<>'announcement-banners' then
      raise exception 'SMOKE_ANNOUNCEMENT_DESCRIPTOR_INVALID';
    end if;

    raise exception using errcode='ZX003',message='ROLLBACK_ANNOUNCEMENT_SMOKE';
  exception when sqlstate 'ZX003' then null;
  end;
end
$smoke$;
