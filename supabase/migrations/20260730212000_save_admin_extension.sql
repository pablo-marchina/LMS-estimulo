begin;

create or replace function public.save_admin_extension(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_resource_type text,
  p_payload jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_hash text := app_private.e14_request_hash(jsonb_build_object('resource_type',p_resource_type,'payload',p_payload,'organization_id',p_organization_id));
  v_existing experience.extension_commands%rowtype;
  v_result jsonb := '{}'::jsonb;
  v_id uuid;
  v_version_id uuid;
  v_next integer;
  v_status text;
  v_count bigint;
  v_theme_ids uuid[];
  v_user_ids uuid[];
  v_group_ids uuid[];
  v_redemption engagement.reward_redemptions%rowtype;
  v_wallet engagement.reward_wallets%rowtype;
  v_score_version_id uuid;
  rec record;
begin
  if not app_private.extension_admin_allowed(p_actor_user_account_id,p_organization_id) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if jsonb_typeof(coalesce(p_payload,'{}'::jsonb))<>'object' then
    raise exception 'PAYLOAD_INVALID' using errcode='22023';
  end if;

  select * into v_existing from experience.extension_commands
  where actor_user_account_id=p_actor_user_account_id
    and command_scope='admin:'||p_resource_type
    and idempotency_key=v_key;
  if found then
    if v_existing.request_hash<>v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return v_existing.result||jsonb_build_object('replayed',true);
  end if;

  case p_resource_type
    when 'platform_settings' then
      if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      insert into experience.platform_settings(
        organization_id,platform_name,support_phone,support_whatsapp,support_email,support_hours,institutional_links,footer_text,metadata,updated_by,updated_at
      ) values (
        p_organization_id,coalesce(nullif(btrim(p_payload->>'platform_name'),''),'Plataforma Estímulo'),
        nullif(btrim(p_payload->>'support_phone'),''),nullif(btrim(p_payload->>'support_whatsapp'),''),
        nullif(lower(btrim(p_payload->>'support_email')),''),nullif(btrim(p_payload->>'support_hours'),''),
        coalesce(p_payload->'institutional_links','[]'::jsonb),nullif(btrim(p_payload->>'footer_text'),''),
        coalesce(p_payload->'metadata','{}'::jsonb),p_actor_user_account_id,now()
      )
      on conflict(organization_id) do update set
        platform_name=excluded.platform_name,support_phone=excluded.support_phone,support_whatsapp=excluded.support_whatsapp,
        support_email=excluded.support_email,support_hours=excluded.support_hours,institutional_links=excluded.institutional_links,
        footer_text=excluded.footer_text,metadata=excluded.metadata,updated_by=excluded.updated_by,updated_at=now();
      v_result:=jsonb_build_object('organization_id',p_organization_id,'status','saved');

    when 'legal_document' then
      if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      if p_payload->>'document_type' not in ('terms_of_use','privacy_policy') then raise exception 'LEGAL_DOCUMENT_TYPE_INVALID' using errcode='22023'; end if;
      v_id:=nullif(p_payload->>'id','')::uuid;
      v_status:=coalesce(nullif(p_payload->>'status',''),'draft');
      if v_status not in ('draft','published') then raise exception 'LEGAL_DOCUMENT_STATUS_INVALID' using errcode='22023'; end if;
      if v_id is null then
        select coalesce(max(version_number),0)+1 into v_next from governance.legal_document_versions
        where organization_id=p_organization_id and document_type=p_payload->>'document_type';
        if v_status='published' then
          update governance.legal_document_versions set status='retired',retired_at=now()
          where organization_id=p_organization_id and document_type=p_payload->>'document_type' and status='published';
        end if;
        insert into governance.legal_document_versions(
          organization_id,document_type,version_number,status,title,body,require_reacceptance,content_hash,published_at,created_by
        ) values (
          p_organization_id,p_payload->>'document_type',v_next,v_status,btrim(p_payload->>'title'),btrim(p_payload->>'body'),
          coalesce((p_payload->>'require_reacceptance')::boolean,false),
          app_private.e14_request_hash(jsonb_build_object('title',p_payload->>'title','body',p_payload->>'body')),
          case when v_status='published' then now() end,p_actor_user_account_id
        ) returning id into v_id;
      else
        if v_status='published' then
          update governance.legal_document_versions set status='retired',retired_at=now()
          where organization_id=p_organization_id and document_type=p_payload->>'document_type' and status='published' and id<>v_id;
        end if;
        update governance.legal_document_versions set
          status=v_status,title=btrim(p_payload->>'title'),body=btrim(p_payload->>'body'),
          require_reacceptance=coalesce((p_payload->>'require_reacceptance')::boolean,false),
          content_hash=app_private.e14_request_hash(jsonb_build_object('title',p_payload->>'title','body',p_payload->>'body')),
          published_at=case when v_status='published' then coalesce(published_at,now()) end
        where id=v_id and organization_id=p_organization_id and status<>'retired';
        if not found then raise exception 'LEGAL_DOCUMENT_NOT_FOUND' using errcode='P0002'; end if;
      end if;
      v_result:=jsonb_build_object('id',v_id,'status',v_status);

    when 'theme' then
      if not (app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage')
        or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.content.manage')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      v_id:=nullif(p_payload->>'id','')::uuid;
      if v_id is null then
        insert into catalog.themes(owner_organization_id,code,name,description,visual_metadata,status,created_by)
        values(p_organization_id,lower(btrim(p_payload->>'code')),btrim(p_payload->>'name'),nullif(btrim(p_payload->>'description'),''),
          coalesce(p_payload->'visual_metadata','{}'::jsonb),coalesce(nullif(p_payload->>'status',''),'active'),p_actor_user_account_id)
        returning id into v_id;
      else
        update catalog.themes set code=lower(btrim(p_payload->>'code')),name=btrim(p_payload->>'name'),
          description=nullif(btrim(p_payload->>'description'),''),visual_metadata=coalesce(p_payload->'visual_metadata','{}'::jsonb),
          status=coalesce(nullif(p_payload->>'status',''),'active'),updated_at=now()
        where id=v_id and owner_organization_id=p_organization_id and status<>'retired';
        if not found then raise exception 'THEME_NOT_FOUND' using errcode='P0002'; end if;
      end if;
      v_result:=jsonb_build_object('id',v_id,'status','saved');

    when 'theme_delete' then
      v_id:=(p_payload->>'id')::uuid;
      select
        (select count(*) from catalog.library_item_theme_links where theme_id=v_id)
        +(select count(*) from catalog.journey_theme_links where theme_id=v_id)
      into v_count;
      if v_count>0 then raise exception 'THEME_IN_USE' using errcode='23503'; end if;
      update catalog.themes set status='retired',updated_at=now()
      where id=v_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'THEME_NOT_FOUND' using errcode='P0002'; end if;
      v_result:=jsonb_build_object('id',v_id,'status','retired');

    when 'library_themes_set' then
      v_id:=(p_payload->>'library_item_id')::uuid;
      if not exists(select 1 from catalog.library_items where id=v_id and owner_organization_id=p_organization_id) then raise exception 'LIBRARY_ITEM_NOT_FOUND' using errcode='P0002'; end if;
      select coalesce(array_agg(value::uuid),array[]::uuid[]) into v_theme_ids
      from jsonb_array_elements_text(coalesce(p_payload->'theme_ids','[]'::jsonb)) value;
      if exists(select 1 from unnest(v_theme_ids) x where not exists(select 1 from catalog.themes t where t.id=x and t.owner_organization_id=p_organization_id and t.status='active')) then
        raise exception 'THEME_INVALID' using errcode='22023';
      end if;
      delete from catalog.library_item_theme_links where library_item_id=v_id;
      insert into catalog.library_item_theme_links(library_item_id,theme_id)
      select v_id,unnest(v_theme_ids);
      update catalog.library_item_versions set topics=coalesce((
        select array_agg(t.name order by t.name) from catalog.library_item_theme_links l join catalog.themes t on t.id=l.theme_id where l.library_item_id=v_id
      ),array[]::text[])
      where library_item_id=v_id and status in ('draft','published');
      v_result:=jsonb_build_object('library_item_id',v_id,'theme_count',cardinality(v_theme_ids));

    when 'journey_themes_set' then
      v_id:=(p_payload->>'journey_definition_id')::uuid;
      if not exists(select 1 from catalog.journey_definitions where id=v_id and owner_organization_id=p_organization_id) then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;
      select coalesce(array_agg(value::uuid),array[]::uuid[]) into v_theme_ids
      from jsonb_array_elements_text(coalesce(p_payload->'theme_ids','[]'::jsonb)) value;
      if exists(select 1 from unnest(v_theme_ids) x where not exists(select 1 from catalog.themes t where t.id=x and t.owner_organization_id=p_organization_id and t.status='active')) then
        raise exception 'THEME_INVALID' using errcode='22023';
      end if;
      delete from catalog.journey_theme_links where journey_definition_id=v_id;
      insert into catalog.journey_theme_links(journey_definition_id,theme_id) select v_id,unnest(v_theme_ids);
      v_result:=jsonb_build_object('journey_definition_id',v_id,'theme_count',cardinality(v_theme_ids));

    when 'tracking_link' then
      if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'participant.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      v_id:=nullif(p_payload->>'id','')::uuid;
      if v_id is null then
        insert into core.tracking_links(
          owner_organization_id,slug,name,destination_path,audience,utm_source,utm_medium,utm_campaign,utm_content,utm_term,
          custom_parameters,skip_steps,partner,channel,notes,starts_at,ends_at,max_uses,status,created_by
        ) values (
          p_organization_id,lower(btrim(p_payload->>'slug')),btrim(p_payload->>'name'),btrim(p_payload->>'destination_path'),
          coalesce(nullif(p_payload->>'audience',''),'both'),nullif(btrim(p_payload->>'utm_source'),''),
          nullif(btrim(p_payload->>'utm_medium'),''),nullif(btrim(p_payload->>'utm_campaign'),''),
          nullif(btrim(p_payload->>'utm_content'),''),nullif(btrim(p_payload->>'utm_term'),''),
          coalesce(p_payload->'custom_parameters','{}'::jsonb),coalesce(p_payload->'skip_steps','{}'::jsonb),
          nullif(btrim(p_payload->>'partner'),''),nullif(btrim(p_payload->>'channel'),''),nullif(btrim(p_payload->>'notes'),''),
          nullif(p_payload->>'starts_at','')::timestamptz,nullif(p_payload->>'ends_at','')::timestamptz,
          nullif(p_payload->>'max_uses','')::bigint,coalesce(nullif(p_payload->>'status',''),'active'),p_actor_user_account_id
        ) returning id into v_id;
      else
        update core.tracking_links set slug=lower(btrim(p_payload->>'slug')),name=btrim(p_payload->>'name'),
          destination_path=btrim(p_payload->>'destination_path'),audience=coalesce(nullif(p_payload->>'audience',''),'both'),
          utm_source=nullif(btrim(p_payload->>'utm_source'),''),utm_medium=nullif(btrim(p_payload->>'utm_medium'),''),
          utm_campaign=nullif(btrim(p_payload->>'utm_campaign'),''),utm_content=nullif(btrim(p_payload->>'utm_content'),''),
          utm_term=nullif(btrim(p_payload->>'utm_term'),''),custom_parameters=coalesce(p_payload->'custom_parameters','{}'::jsonb),
          skip_steps=coalesce(p_payload->'skip_steps','{}'::jsonb),partner=nullif(btrim(p_payload->>'partner'),''),
          channel=nullif(btrim(p_payload->>'channel'),''),notes=nullif(btrim(p_payload->>'notes'),''),
          starts_at=nullif(p_payload->>'starts_at','')::timestamptz,ends_at=nullif(p_payload->>'ends_at','')::timestamptz,
          max_uses=nullif(p_payload->>'max_uses','')::bigint,status=coalesce(nullif(p_payload->>'status',''),'active'),updated_at=now()
        where id=v_id and owner_organization_id=p_organization_id and status<>'retired';
        if not found then raise exception 'TRACKING_LINK_NOT_FOUND' using errcode='P0002'; end if;
      end if;
      v_result:=jsonb_build_object('id',v_id,'public_path','/r/'||(select slug from core.tracking_links where id=v_id));

    when 'tracking_link_archive' then
      v_id:=(p_payload->>'id')::uuid;
      update core.tracking_links set status='retired',updated_at=now() where id=v_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'TRACKING_LINK_NOT_FOUND' using errcode='P0002'; end if;
      v_result:=jsonb_build_object('id',v_id,'status','retired');

    when 'certificate_template_register' then
      if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      if not exists(select 1 from core.file_objects f where f.id=(p_payload->>'file_object_id')::uuid and f.owner_organization_id=p_organization_id and f.security_status='clean') then
        raise exception 'CERTIFICATE_TEMPLATE_FILE_INVALID' using errcode='22023';
      end if;
      insert into engagement.certificate_template_assets(owner_organization_id,file_object_id,name,media_type,metadata,created_by)
      values(p_organization_id,(p_payload->>'file_object_id')::uuid,btrim(p_payload->>'name'),
        case when p_payload->>'content_type'='application/pdf' then 'pdf' else 'image' end,
        coalesce(p_payload->'metadata','{}'::jsonb),p_actor_user_account_id)
      on conflict(owner_organization_id,file_object_id) do update set name=excluded.name,status='active',metadata=excluded.metadata
      returning id into v_id;
      if coalesce(p_payload->>'scope_type','')<>'' then
        update engagement.certificate_template_assignments set active=false,updated_at=now()
        where owner_organization_id=p_organization_id and scope_type=p_payload->>'scope_type'
          and coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid)=coalesce(nullif(p_payload->>'scope_id','')::uuid,'00000000-0000-0000-0000-000000000000'::uuid)
          and active;
        insert into engagement.certificate_template_assignments(owner_organization_id,scope_type,scope_id,template_asset_id,created_by)
        values(p_organization_id,p_payload->>'scope_type',nullif(p_payload->>'scope_id','')::uuid,v_id,p_actor_user_account_id);
      end if;
      v_result:=jsonb_build_object('template_asset_id',v_id,'status','registered');

    when 'certificate_template_assignment' then
      update engagement.certificate_template_assignments set active=false,updated_at=now()
      where owner_organization_id=p_organization_id and scope_type=p_payload->>'scope_type'
        and coalesce(scope_id,'00000000-0000-0000-0000-000000000000'::uuid)=coalesce(nullif(p_payload->>'scope_id','')::uuid,'00000000-0000-0000-0000-000000000000'::uuid)
        and active;
      if nullif(p_payload->>'template_asset_id','') is not null then
        insert into engagement.certificate_template_assignments(owner_organization_id,scope_type,scope_id,template_asset_id,created_by)
        select p_organization_id,p_payload->>'scope_type',nullif(p_payload->>'scope_id','')::uuid,
          (p_payload->>'template_asset_id')::uuid,p_actor_user_account_id
        where exists(select 1 from engagement.certificate_template_assets a where a.id=(p_payload->>'template_asset_id')::uuid and a.owner_organization_id=p_organization_id and a.status='active');
      end if;
      v_result:=jsonb_build_object('status','saved');

    when 'b2b_group' then
      if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'participant.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      v_id:=nullif(p_payload->>'id','')::uuid;
      if v_id is null then
        insert into experience.b2b_access_groups(owner_organization_id,name,description,created_by)
        values(p_organization_id,btrim(p_payload->>'name'),nullif(btrim(p_payload->>'description'),''),p_actor_user_account_id)
        returning id into v_id;
      else
        update experience.b2b_access_groups set name=btrim(p_payload->>'name'),description=nullif(btrim(p_payload->>'description'),''),updated_at=now()
        where id=v_id and owner_organization_id=p_organization_id and status='active';
        if not found then raise exception 'B2B_GROUP_NOT_FOUND' using errcode='P0002'; end if;
      end if;
      select coalesce(array_agg(value::uuid),array[]::uuid[]) into v_user_ids from jsonb_array_elements_text(coalesce(p_payload->'user_ids','[]'::jsonb)) value;
      delete from experience.b2b_group_members where group_id=v_id;
      insert into experience.b2b_group_members(group_id,user_account_id,added_by)
      select v_id,x,p_actor_user_account_id from unnest(v_user_ids) x
      where exists(select 1 from iam.user_accounts u where u.id=x and u.status='active');
      v_result:=jsonb_build_object('id',v_id,'member_count',cardinality(v_user_ids));

    when 'b2b_page' then
      if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'participant.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      v_id:=nullif(p_payload->>'id','')::uuid;
      v_version_id:=nullif(p_payload->>'version_id','')::uuid;
      v_status:=coalesce(nullif(p_payload->>'status',''),'draft');
      if v_id is null then
        insert into experience.b2b_pages(owner_organization_id,code,slug,name,created_by)
        values(p_organization_id,lower(btrim(p_payload->>'code')),lower(btrim(p_payload->>'slug')),btrim(p_payload->>'name'),p_actor_user_account_id)
        returning id into v_id;
      else
        update experience.b2b_pages set code=lower(btrim(p_payload->>'code')),slug=lower(btrim(p_payload->>'slug')),
          name=btrim(p_payload->>'name'),updated_at=now()
        where id=v_id and owner_organization_id=p_organization_id and status='active';
        if not found then raise exception 'B2B_PAGE_NOT_FOUND' using errcode='P0002'; end if;
      end if;
      if v_version_id is null then
        select coalesce(max(version_number),0)+1 into v_next from experience.b2b_page_versions where b2b_page_id=v_id;
        insert into experience.b2b_page_versions(
          b2b_page_id,version_number,status,title,description,blocks,starts_at,ends_at,content_hash,published_at,created_by
        ) values (
          v_id,v_next,'draft',btrim(p_payload->>'title'),nullif(btrim(p_payload->>'description'),''),
          coalesce(p_payload->'blocks','[]'::jsonb),nullif(p_payload->>'starts_at','')::timestamptz,nullif(p_payload->>'ends_at','')::timestamptz,
          app_private.e14_request_hash(coalesce(p_payload->'blocks','[]'::jsonb)),null,p_actor_user_account_id
        ) returning id into v_version_id;
      else
        update experience.b2b_page_versions set title=btrim(p_payload->>'title'),description=nullif(btrim(p_payload->>'description'),''),
          blocks=coalesce(p_payload->'blocks','[]'::jsonb),starts_at=nullif(p_payload->>'starts_at','')::timestamptz,
          ends_at=nullif(p_payload->>'ends_at','')::timestamptz,content_hash=app_private.e14_request_hash(coalesce(p_payload->'blocks','[]'::jsonb))
        where id=v_version_id and b2b_page_id=v_id and status in ('draft','published');
        if not found then raise exception 'B2B_PAGE_VERSION_NOT_FOUND' using errcode='P0002'; end if;
      end if;
      if v_status='published' then
        update experience.b2b_page_versions set status='retired' where b2b_page_id=v_id and status='published' and id<>v_version_id;
        update experience.b2b_page_versions set status='published',published_at=coalesce(published_at,now()) where id=v_version_id;
      else
        update experience.b2b_page_versions set status='draft',published_at=null where id=v_version_id and status<>'retired';
      end if;
      select coalesce(array_agg(value::uuid),array[]::uuid[]) into v_user_ids from jsonb_array_elements_text(coalesce(p_payload->'user_ids','[]'::jsonb)) value;
      select coalesce(array_agg(value::uuid),array[]::uuid[]) into v_group_ids from jsonb_array_elements_text(coalesce(p_payload->'group_ids','[]'::jsonb)) value;
      delete from experience.b2b_page_user_access where b2b_page_id=v_id;
      delete from experience.b2b_page_group_access where b2b_page_id=v_id;
      insert into experience.b2b_page_user_access(b2b_page_id,user_account_id,granted_by)
      select v_id,x,p_actor_user_account_id from unnest(v_user_ids) x where exists(select 1 from iam.user_accounts u where u.id=x and u.status='active');
      insert into experience.b2b_page_group_access(b2b_page_id,group_id,granted_by)
      select v_id,x,p_actor_user_account_id from unnest(v_group_ids) x where exists(select 1 from experience.b2b_access_groups g where g.id=x and g.owner_organization_id=p_organization_id and g.status='active');
      v_result:=jsonb_build_object('id',v_id,'version_id',v_version_id,'status',v_status);

    when 'b2b_page_delete' then
      v_id:=(p_payload->>'id')::uuid;
      update experience.b2b_pages set status='retired',updated_at=now() where id=v_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'B2B_PAGE_NOT_FOUND' using errcode='P0002'; end if;
      update experience.b2b_page_versions set status='retired' where b2b_page_id=v_id and status='draft';
      v_result:=jsonb_build_object('id',v_id,'status','retired');

    when 'reward_settings' then
      if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      insert into engagement.reward_settings(organization_id,source_points_per_unit,reward_points_per_unit,updated_by)
      values(p_organization_id,coalesce((p_payload->>'source_points_per_unit')::integer,1),coalesce((p_payload->>'reward_points_per_unit')::integer,1),p_actor_user_account_id)
      on conflict(organization_id) do update set source_points_per_unit=excluded.source_points_per_unit,
        reward_points_per_unit=excluded.reward_points_per_unit,updated_by=excluded.updated_by,updated_at=now();
      v_result:=jsonb_build_object('status','saved');

    when 'reward' then
      if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      v_id:=nullif(p_payload->>'id','')::uuid;
      if v_id is null then
        insert into engagement.rewards(
          owner_organization_id,code,name,description,reward_type,cost_points,stock_quantity,max_per_user,starts_at,ends_at,
          regulation,image_file_object_id,fulfillment_configuration,status,created_by
        ) values (
          p_organization_id,lower(btrim(p_payload->>'code')),btrim(p_payload->>'name'),btrim(p_payload->>'description'),
          p_payload->>'reward_type',(p_payload->>'cost_points')::integer,nullif(p_payload->>'stock_quantity','')::integer,
          nullif(p_payload->>'max_per_user','')::integer,nullif(p_payload->>'starts_at','')::timestamptz,nullif(p_payload->>'ends_at','')::timestamptz,
          btrim(p_payload->>'regulation'),nullif(p_payload->>'image_file_object_id','')::uuid,
          coalesce(p_payload->'fulfillment_configuration','{}'::jsonb),coalesce(nullif(p_payload->>'status',''),'draft'),p_actor_user_account_id
        ) returning id into v_id;
      else
        update engagement.rewards set code=lower(btrim(p_payload->>'code')),name=btrim(p_payload->>'name'),
          description=btrim(p_payload->>'description'),reward_type=p_payload->>'reward_type',
          cost_points=(p_payload->>'cost_points')::integer,stock_quantity=nullif(p_payload->>'stock_quantity','')::integer,
          max_per_user=nullif(p_payload->>'max_per_user','')::integer,starts_at=nullif(p_payload->>'starts_at','')::timestamptz,
          ends_at=nullif(p_payload->>'ends_at','')::timestamptz,regulation=btrim(p_payload->>'regulation'),
          image_file_object_id=nullif(p_payload->>'image_file_object_id','')::uuid,
          fulfillment_configuration=coalesce(p_payload->'fulfillment_configuration','{}'::jsonb),
          status=coalesce(nullif(p_payload->>'status',''),'draft'),updated_at=now()
        where id=v_id and owner_organization_id=p_organization_id and status<>'retired';
        if not found then raise exception 'REWARD_NOT_FOUND' using errcode='P0002'; end if;
      end if;
      v_result:=jsonb_build_object('id',v_id,'status','saved');

    when 'redemption_status' then
      if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      select rr.* into v_redemption
      from engagement.reward_redemptions rr join engagement.rewards r on r.id=rr.reward_id
      where rr.id=(p_payload->>'id')::uuid and r.owner_organization_id=p_organization_id
      for update of rr;
      if not found then raise exception 'REDEMPTION_NOT_FOUND' using errcode='P0002'; end if;
      v_status:=p_payload->>'status';
      if v_status not in ('pending','approved','preparing','sent','available','delivered','cancelled') then raise exception 'REDEMPTION_STATUS_INVALID' using errcode='22023'; end if;
      if v_status='cancelled' and v_redemption.status<>'cancelled' then
        select * into v_wallet from engagement.reward_wallets where entrepreneur_id=v_redemption.entrepreneur_id for update;
        update engagement.reward_wallets set balance=balance+v_redemption.points_spent,version=version+1,updated_at=now()
        where entrepreneur_id=v_redemption.entrepreneur_id returning * into v_wallet;
        update engagement.rewards set stock_quantity=case when stock_quantity is null then null else stock_quantity+v_redemption.quantity end,updated_at=now()
        where id=v_redemption.reward_id;
        insert into engagement.reward_ledger(entrepreneur_id,organization_id,redemption_id,reward_points_delta,balance_after,reason,idempotency_key,metadata,created_by)
        values(v_redemption.entrepreneur_id,p_organization_id,v_redemption.id,v_redemption.points_spent,v_wallet.balance,'redemption_refund',
          v_key||':refund',jsonb_build_object('reason',p_payload->>'cancellation_reason'),p_actor_user_account_id);
      end if;
      update engagement.reward_redemptions set status=v_status,
        fulfillment_details=coalesce(p_payload->'fulfillment_details',fulfillment_details),
        cancellation_reason=case when v_status='cancelled' then nullif(btrim(p_payload->>'cancellation_reason'),'') else cancellation_reason end,
        cancelled_at=case when v_status='cancelled' then now() else cancelled_at end,
        delivered_at=case when v_status='delivered' then now() else delivered_at end,
        updated_at=now()
      where id=v_redemption.id;
      v_result:=jsonb_build_object('id',v_redemption.id,'status',v_status);

    when 'delivery_configuration' then
      if not (app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'assessment.review')
        or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage')
        or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'library.content.manage')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      v_id:=nullif(p_payload->>'id','')::uuid;
      if v_id is null then
        insert into assessment.delivery_configurations(
          owner_organization_id,target_type,activity_version_id,library_item_version_id,title,instructions,
          allowed_submission_types,required_submission_types,max_files,max_file_size_bytes,max_attempts,starts_at,due_at,ends_at,
          allow_late,allow_resubmit,grade_strategy,grading_mode,passing_score,rubric,reference_material,ai_instructions,
          points_configuration,status,created_by
        ) values (
          p_organization_id,p_payload->>'target_type',
          case when p_payload->>'target_type'='activity' then (p_payload->>'target_id')::uuid end,
          case when p_payload->>'target_type'='library' then (p_payload->>'target_id')::uuid end,
          btrim(p_payload->>'title'),btrim(p_payload->>'instructions'),
          array(select jsonb_array_elements_text(coalesce(p_payload->'allowed_submission_types','["text"]'::jsonb))),
          array(select jsonb_array_elements_text(coalesce(p_payload->'required_submission_types','[]'::jsonb))),
          coalesce((p_payload->>'max_files')::integer,5),coalesce((p_payload->>'max_file_size_bytes')::bigint,26214400),
          nullif(p_payload->>'max_attempts','')::integer,nullif(p_payload->>'starts_at','')::timestamptz,
          nullif(p_payload->>'due_at','')::timestamptz,nullif(p_payload->>'ends_at','')::timestamptz,
          coalesce((p_payload->>'allow_late')::boolean,false),coalesce((p_payload->>'allow_resubmit')::boolean,true),
          coalesce(nullif(p_payload->>'grade_strategy',''),'highest'),coalesce(nullif(p_payload->>'grading_mode',''),'ai_human_review'),
          nullif(p_payload->>'passing_score','')::numeric,coalesce(p_payload->'rubric','{"criteria":[]}'::jsonb),
          coalesce(p_payload->'reference_material','[]'::jsonb),nullif(btrim(p_payload->>'ai_instructions'),''),
          coalesce(p_payload->'points_configuration','{}'::jsonb),coalesce(nullif(p_payload->>'status',''),'active'),p_actor_user_account_id
        ) returning id into v_id;
      else
        update assessment.delivery_configurations set title=btrim(p_payload->>'title'),instructions=btrim(p_payload->>'instructions'),
          allowed_submission_types=array(select jsonb_array_elements_text(coalesce(p_payload->'allowed_submission_types','["text"]'::jsonb))),
          required_submission_types=array(select jsonb_array_elements_text(coalesce(p_payload->'required_submission_types','[]'::jsonb))),
          max_files=coalesce((p_payload->>'max_files')::integer,5),max_file_size_bytes=coalesce((p_payload->>'max_file_size_bytes')::bigint,26214400),
          max_attempts=nullif(p_payload->>'max_attempts','')::integer,starts_at=nullif(p_payload->>'starts_at','')::timestamptz,
          due_at=nullif(p_payload->>'due_at','')::timestamptz,ends_at=nullif(p_payload->>'ends_at','')::timestamptz,
          allow_late=coalesce((p_payload->>'allow_late')::boolean,false),allow_resubmit=coalesce((p_payload->>'allow_resubmit')::boolean,true),
          grade_strategy=coalesce(nullif(p_payload->>'grade_strategy',''),'highest'),grading_mode=coalesce(nullif(p_payload->>'grading_mode',''),'ai_human_review'),
          passing_score=nullif(p_payload->>'passing_score','')::numeric,rubric=coalesce(p_payload->'rubric','{"criteria":[]}'::jsonb),
          reference_material=coalesce(p_payload->'reference_material','[]'::jsonb),ai_instructions=nullif(btrim(p_payload->>'ai_instructions'),''),
          points_configuration=coalesce(p_payload->'points_configuration','{}'::jsonb),status=coalesce(nullif(p_payload->>'status',''),'active'),updated_at=now()
        where id=v_id and owner_organization_id=p_organization_id and status<>'retired';
        if not found then raise exception 'DELIVERY_CONFIGURATION_NOT_FOUND' using errcode='P0002'; end if;
      end if;
      v_result:=jsonb_build_object('id',v_id,'status','saved');

    when 'delivery_review' then
      if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'assessment.review') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      if not exists(
        select 1 from assessment.delivery_submissions s join assessment.delivery_configurations c on c.id=s.delivery_configuration_id
        where s.id=(p_payload->>'submission_id')::uuid and c.owner_organization_id=p_organization_id
      ) then raise exception 'DELIVERY_SUBMISSION_NOT_FOUND' using errcode='P0002'; end if;
      update assessment.delivery_reviews set status='superseded'
      where delivery_submission_id=(p_payload->>'submission_id')::uuid and status='approved';
      insert into assessment.delivery_reviews(
        delivery_submission_id,review_type,reviewer_user_account_id,rubric_snapshot,criterion_scores,score,feedback,confidence,
        model_reference,status,change_reason,metadata
      )
      select (p_payload->>'submission_id')::uuid,'human',p_actor_user_account_id,c.rubric,
        coalesce(p_payload->'criterion_scores','[]'::jsonb),nullif(p_payload->>'score','')::numeric,
        nullif(btrim(p_payload->>'feedback'),''),null,null,'approved',nullif(btrim(p_payload->>'change_reason'),''),
        coalesce(p_payload->'metadata','{}'::jsonb)
      from assessment.delivery_configurations c join assessment.delivery_submissions s on s.delivery_configuration_id=c.id
      where s.id=(p_payload->>'submission_id')::uuid;
      update assessment.delivery_submissions set final_score=nullif(p_payload->>'score','')::numeric,
        final_feedback=nullif(btrim(p_payload->>'feedback'),''),
        status=coalesce(nullif(p_payload->>'status',''),'corrected'),
        approved_at=case when coalesce(nullif(p_payload->>'status',''),'corrected')='approved' then now() else approved_at end,
        updated_at=now()
      where id=(p_payload->>'submission_id')::uuid;
      v_result:=jsonb_build_object('submission_id',p_payload->>'submission_id','status',coalesce(nullif(p_payload->>'status',''),'corrected'));

    when 'optional_diagnostic' then
      if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'diagnostic.configuration.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      v_id:=nullif(p_payload->>'id','')::uuid;
      if v_id is null then
        insert into diagnostics.optional_availability(
          owner_organization_id,diagnostic_version_id,display_title,display_description,starts_at,ends_at,max_attempts,retry_interval_days,
          show_result,points_on_completion,audience,status,created_by
        ) values (
          p_organization_id,(p_payload->>'diagnostic_version_id')::uuid,btrim(p_payload->>'display_title'),
          nullif(btrim(p_payload->>'display_description'),''),nullif(p_payload->>'starts_at','')::timestamptz,
          nullif(p_payload->>'ends_at','')::timestamptz,nullif(p_payload->>'max_attempts','')::integer,
          coalesce((p_payload->>'retry_interval_days')::integer,0),coalesce((p_payload->>'show_result')::boolean,true),
          coalesce((p_payload->>'points_on_completion')::integer,0),coalesce(p_payload->'audience','{"type":"all"}'::jsonb),
          coalesce(nullif(p_payload->>'status',''),'draft'),p_actor_user_account_id
        ) returning id into v_id;
      else
        update diagnostics.optional_availability set diagnostic_version_id=(p_payload->>'diagnostic_version_id')::uuid,
          display_title=btrim(p_payload->>'display_title'),display_description=nullif(btrim(p_payload->>'display_description'),''),
          starts_at=nullif(p_payload->>'starts_at','')::timestamptz,ends_at=nullif(p_payload->>'ends_at','')::timestamptz,
          max_attempts=nullif(p_payload->>'max_attempts','')::integer,retry_interval_days=coalesce((p_payload->>'retry_interval_days')::integer,0),
          show_result=coalesce((p_payload->>'show_result')::boolean,true),points_on_completion=coalesce((p_payload->>'points_on_completion')::integer,0),
          audience=coalesce(p_payload->'audience','{"type":"all"}'::jsonb),status=coalesce(nullif(p_payload->>'status',''),'draft'),updated_at=now()
        where id=v_id and owner_organization_id=p_organization_id and status<>'retired';
        if not found then raise exception 'OPTIONAL_DIAGNOSTIC_NOT_FOUND' using errcode='P0002'; end if;
      end if;
      v_result:=jsonb_build_object('id',v_id,'status','saved');

    when 'behavior_recalculate' then
      if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'participant.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      select sv.id into v_score_version_id
      from intelligence.score_versions sv join intelligence.score_definitions sd on sd.id=sv.score_definition_id
      where sd.owner_organization_id=p_organization_id and sd.code='behavioral_engagement_v1' and sv.status='published'
      order by sv.version_number desc limit 1;
      if v_score_version_id is null then raise exception 'BEHAVIOR_SCORE_MODEL_NOT_FOUND' using errcode='P0002'; end if;

      for rec in
        select e.id as entrepreneur_id,e.user_account_id,
          count(ev.event_id)::bigint as event_count,
          min(ev.occurred_at) as coverage_started_at,
          count(distinct ev.occurred_at::date)::numeric as active_days,
          count(*) filter(where ev.payload->>'interaction_type' in ('page_view','content_view','video_progress','library_open'))::numeric as depth_events,
          count(*) filter(where ev.payload->>'interaction_type' in ('content_complete','activity_complete','delivery_submit','diagnostic_complete'))::numeric as completion_events,
          count(*) filter(where ev.payload->>'interaction_type' in ('search','library_open','b2b_open','reward_view'))::numeric as autonomy_events,
          count(distinct date_trunc('week',ev.occurred_at))::numeric as active_weeks
        from core.entrepreneurs e
        left join eventing.events ev on ev.actor_id=e.user_account_id and ev.event_name='behavior.interaction.recorded'
          and ev.organization_id=p_organization_id
        where e.status='active'
        group by e.id,e.user_account_id
      loop
        insert into intelligence.behavior_score_snapshots(
          owner_organization_id,entrepreneur_id,score_version_id,total_score,dimensions,confidence,event_count,
          coverage_started_at,calculated_at,input_snapshot_hash
        ) values (
          p_organization_id,rec.entrepreneur_id,v_score_version_id,
          round((
            least(100,rec.event_count*2.5)+
            least(100,rec.active_days*8)+
            least(100,rec.depth_events*5)+
            least(100,rec.completion_events*12)+
            least(100,rec.autonomy_events*7)+
            least(100,coalesce((select avg(s.final_score) from assessment.delivery_submissions s where s.entrepreneur_id=rec.entrepreneur_id and s.final_score is not null),0))+
            least(100,rec.completion_events*8)+
            least(100,rec.active_weeks*15)
          )/8.0,2),
          jsonb_build_object(
            'engagement',least(100,rec.event_count*2.5),
            'consistency',least(100,rec.active_days*8),
            'depth',least(100,rec.depth_events*5),
            'completion',least(100,rec.completion_events*12),
            'autonomy',least(100,rec.autonomy_events*7),
            'quality',least(100,coalesce((select avg(s.final_score) from assessment.delivery_submissions s where s.entrepreneur_id=rec.entrepreneur_id and s.final_score is not null),0)),
            'evolution',least(100,rec.completion_events*8),
            'return_frequency',least(100,rec.active_weeks*15)
          ),
          least(1.0,rec.event_count/30.0),rec.event_count,coalesce(rec.coverage_started_at,now()),now(),
          encode(extensions.digest(convert_to(rec.entrepreneur_id::text||':'||rec.event_count::text||':'||coalesce(rec.coverage_started_at::text,''),'UTF8'),'sha256'),'hex')
        )
        on conflict(entrepreneur_id,score_version_id) do update set
          total_score=excluded.total_score,dimensions=excluded.dimensions,confidence=excluded.confidence,
          event_count=excluded.event_count,coverage_started_at=excluded.coverage_started_at,
          calculated_at=excluded.calculated_at,input_snapshot_hash=excluded.input_snapshot_hash;
      end loop;
      get diagnostics v_count = row_count;
      v_result:=jsonb_build_object('recalculated',v_count,'score_version_id',v_score_version_id);

    else
      raise exception 'RESOURCE_TYPE_NOT_SUPPORTED' using errcode='22023';
  end case;

  insert into experience.extension_commands(actor_user_account_id,organization_id,command_scope,idempotency_key,request_hash,result)
  values(p_actor_user_account_id,p_organization_id,'admin:'||p_resource_type,v_key,v_hash,v_result);

  perform governance.write_audit_entry(
    'admin_extension_'||p_resource_type,'platform_extension',coalesce(v_id,p_organization_id),
    jsonb_build_object('resource_type',p_resource_type,'result',v_result),'internal',p_organization_id,p_actor_user_account_id
  );

  return v_result||jsonb_build_object('replayed',false);
end;
$$;

revoke all on function public.save_admin_extension(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_admin_extension(uuid,uuid,text,jsonb,text) to service_role;

commit;
