begin;

alter table engagement.announcements
  add column if not exists mobile_image_file_object_id uuid null references core.file_objects(id);
create index if not exists announcements_mobile_image_file_idx
  on engagement.announcements(mobile_image_file_object_id) where mobile_image_file_object_id is not null;

drop function if exists public.get_announcement_banner_download(uuid,uuid);
drop function if exists public.get_announcement_banner_download(uuid,uuid,text);
create or replace function public.get_announcement_banner_download(
  p_actor_user_account_id uuid,p_announcement_id uuid,p_variant text default 'desktop'
) returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog'
as $function$
declare v_file core.file_objects%rowtype; v_announcement engagement.announcements%rowtype; v_allowed boolean:=false; v_file_id uuid; v_variant text:=lower(btrim(coalesce(p_variant,'desktop')));
begin
  select * into v_announcement from engagement.announcements where id=p_announcement_id;
  if not found then raise exception 'ANNOUNCEMENT_NOT_FOUND' using errcode='P0002'; end if;
  if app_private.e14_actor_has_permission(p_actor_user_account_id,v_announcement.organization_id,'engagement.manage') then v_allowed:=true; end if;
  if not v_allowed and v_announcement.status='published'
    and (v_announcement.starts_at is null or v_announcement.starts_at<=now())
    and (v_announcement.ends_at is null or v_announcement.ends_at>now())
    and app_private.e14_entrepreneur_for_account(p_actor_user_account_id) is not null then v_allowed:=true; end if;
  if not v_allowed then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_variant not in ('desktop','mobile') then raise exception 'ANNOUNCEMENT_IMAGE_VARIANT_INVALID' using errcode='22023'; end if;
  v_file_id:=case when v_variant='mobile' then coalesce(v_announcement.mobile_image_file_object_id,v_announcement.image_file_object_id) else v_announcement.image_file_object_id end;
  if v_file_id is null then raise exception 'ANNOUNCEMENT_IMAGE_NOT_FOUND' using errcode='P0002'; end if;
  select * into v_file from core.file_objects where id=v_file_id and security_status='clean' and deleted_at is null;
  if not found then raise exception 'ANNOUNCEMENT_IMAGE_NOT_AVAILABLE' using errcode='P0002'; end if;
  return jsonb_build_object('announcement_id',v_announcement.id,'file_object_id',v_file.id,'bucket',v_file.bucket,'object_key',v_file.object_key,'content_type',v_file.content_type,'original_filename',v_file.original_filename);
end;
$function$;

drop function if exists public.save_operator_announcement(uuid,uuid,uuid,bigint,text,text,text,text,text,integer,timestamptz,timestamptz,uuid,text,text,text);
drop function if exists public.save_operator_announcement(uuid,uuid,uuid,bigint,text,text,text,text,text,integer,timestamptz,timestamptz,uuid,uuid,text,text,text);
create or replace function public.save_operator_announcement(
  p_actor_user_account_id uuid,p_organization_id uuid,p_announcement_id uuid,p_expected_version bigint,
  p_title text,p_body text,p_cta_label text,p_cta_url text,p_status text,p_priority integer,
  p_starts_at timestamptz,p_ends_at timestamptz,p_image_file_object_id uuid,p_mobile_image_file_object_id uuid,p_image_alt text,
  p_display_mode text,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_id uuid:=coalesce(p_announcement_id,gen_random_uuid());
  v_mode text:=lower(btrim(coalesce(p_display_mode,'image_with_text')));
  v_alt text:=nullif(btrim(coalesce(p_image_alt,'')),'');
  v_title text:=btrim(coalesce(p_title,''));
  v_body text:=btrim(coalesce(p_body,''));
  v_cta_label text:=nullif(btrim(coalesce(p_cta_label,'')),'');
  v_cta_url text:=nullif(btrim(coalesce(p_cta_url,'')),'');
  v_status text:=lower(btrim(coalesce(p_status,'')));
  v_priority integer:=coalesce(p_priority,0);
  v_request_hash text; v_event_id uuid; v_version bigint; v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_mode not in ('image_only','image_with_text') then raise exception 'ANNOUNCEMENT_DISPLAY_MODE_INVALID' using errcode='22023'; end if;
  if p_image_file_object_id is not null and not exists(
    select 1 from core.file_objects f where f.id=p_image_file_object_id and f.owner_organization_id=p_organization_id
      and f.retention_class='announcement_banner' and f.security_status='clean' and f.deleted_at is null
  ) then raise exception 'ANNOUNCEMENT_IMAGE_NOT_AVAILABLE' using errcode='22023'; end if;
  if p_mobile_image_file_object_id is not null and not exists(
    select 1 from core.file_objects f where f.id=p_mobile_image_file_object_id and f.owner_organization_id=p_organization_id
      and f.retention_class='announcement_banner' and f.security_status='clean' and f.deleted_at is null
  ) then raise exception 'ANNOUNCEMENT_MOBILE_IMAGE_NOT_AVAILABLE' using errcode='22023'; end if;
  if p_image_file_object_id is not null and (v_alt is null or length(v_alt) not between 3 and 240) then raise exception 'ANNOUNCEMENT_IMAGE_ALT_REQUIRED' using errcode='22023'; end if;
  if v_mode='image_only' and p_image_file_object_id is null then raise exception 'ANNOUNCEMENT_IMAGE_REQUIRED' using errcode='22023'; end if;
  if v_mode='image_only' then
    if v_title='' then v_title:=coalesce(v_alt,'Anúncio da Estímulo'); end if;
    if v_body='' then v_body:='Confira esta novidade da Estímulo.'; end if;
  end if;
  if length(v_title) not between 2 and 120 then raise exception 'ANNOUNCEMENT_TITLE_INVALID' using errcode='22023'; end if;
  if length(v_body) not between 2 and 1200 then raise exception 'ANNOUNCEMENT_BODY_INVALID' using errcode='22023'; end if;
  if v_status not in ('draft','published','retired') then raise exception 'ANNOUNCEMENT_STATUS_INVALID' using errcode='22023'; end if;
  if v_priority not between -1000 and 1000 then raise exception 'ANNOUNCEMENT_PRIORITY_INVALID' using errcode='22023'; end if;
  if (v_cta_label is null)<>(v_cta_url is null) then raise exception 'ANNOUNCEMENT_CTA_PAIR_REQUIRED' using errcode='22023'; end if;
  if v_cta_label is not null and length(v_cta_label)>60 then raise exception 'ANNOUNCEMENT_CTA_LABEL_INVALID' using errcode='22023'; end if;
  if v_cta_url is not null and v_cta_url!~'^(https://|/)[^[:space:]]+$' then raise exception 'ANNOUNCEMENT_CTA_URL_INVALID' using errcode='22023'; end if;
  if p_ends_at is not null and p_starts_at is not null and p_ends_at<=p_starts_at then raise exception 'ANNOUNCEMENT_WINDOW_INVALID' using errcode='22023'; end if;
  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,'announcement_id',p_announcement_id,'expected_version',p_expected_version,
    'title',v_title,'body',v_body,'cta_label',v_cta_label,'cta_url',v_cta_url,'status',v_status,
    'priority',v_priority,'starts_at',p_starts_at,'ends_at',p_ends_at,'image_file_object_id',p_image_file_object_id,
    'mobile_image_file_object_id',p_mobile_image_file_object_id,'image_alt',v_alt,'display_mode',v_mode
  ));
  v_event_id:=app_private.e14_command_event_id('save_operator_announcement_v2',p_actor_user_account_id,v_id,v_key);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('announcement:'||v_id::text,0));
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select event.payload->'result' into v_result from eventing.events event where event.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;
  if p_announcement_id is null then
    insert into engagement.announcements(
      id,organization_id,title,body,cta_label,cta_url,status,priority,starts_at,ends_at,
      image_file_object_id,mobile_image_file_object_id,image_alt,display_mode,created_by,updated_by,aggregate_version
    ) values(
      v_id,p_organization_id,v_title,v_body,v_cta_label,v_cta_url,v_status,v_priority,p_starts_at,p_ends_at,
      p_image_file_object_id,p_mobile_image_file_object_id,v_alt,v_mode,p_actor_user_account_id,p_actor_user_account_id,1
    );
    v_version:=1;
  else
    update engagement.announcements set
      title=v_title,body=v_body,cta_label=v_cta_label,cta_url=v_cta_url,status=v_status,priority=v_priority,
      starts_at=p_starts_at,ends_at=p_ends_at,image_file_object_id=p_image_file_object_id,mobile_image_file_object_id=p_mobile_image_file_object_id,image_alt=v_alt,
      display_mode=v_mode,updated_by=p_actor_user_account_id,aggregate_version=aggregate_version+1,updated_at=now()
    where id=v_id and organization_id=p_organization_id and aggregate_version=p_expected_version
    returning aggregate_version into v_version;
    if v_version is null then raise exception 'ANNOUNCEMENT_VERSION_CONFLICT' using errcode='40001'; end if;
  end if;
  v_result:=jsonb_build_object('announcement_id',v_id,'organization_id',p_organization_id,'status',v_status,'aggregate_version',v_version,'image_file_object_id',p_image_file_object_id,'mobile_image_file_object_id',p_mobile_image_file_object_id,'display_mode',v_mode);
  perform app_private.e14_append_event(
    v_event_id,'engagement.announcement.saved','announcement',v_id,'user',p_actor_user_account_id,p_organization_id,null,
    'announcement',v_id,v_version,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;

create or replace function public.list_operator_announcements(p_actor_user_account_id uuid,p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog'
as $function$
declare v_items jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',item.id,'title',item.title,'body',item.body,'cta_label',item.cta_label,'cta_url',item.cta_url,
    'status',item.status,'priority',item.priority,'starts_at',item.starts_at,'ends_at',item.ends_at,
    'image_file_object_id',item.image_file_object_id,'mobile_image_file_object_id',item.mobile_image_file_object_id,'image_alt',item.image_alt,'display_mode',item.display_mode,
    'aggregate_version',item.aggregate_version,'created_at',item.created_at,'updated_at',item.updated_at
  ) order by item.priority desc,item.created_at desc),'[]'::jsonb) into v_items
  from engagement.announcements item where item.organization_id=p_organization_id;
  return jsonb_build_object('organization_id',p_organization_id,'announcements',v_items);
end;
$function$;

create or replace function public.get_participant_engagement_hub(p_actor_user_account_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid; v_preferred_name text; v_email text; v_organizations uuid[];
  v_announcements jsonb; v_ranking jsonb; v_own_rank jsonb; v_point_history jsonb; v_rewards jsonb; v_archetype jsonb;
begin
  select entrepreneur.id,entrepreneur.preferred_name,account.email_normalized into v_entrepreneur_id,v_preferred_name,v_email
  from core.entrepreneurs entrepreneur join iam.user_accounts account on account.id=entrepreneur.user_account_id
  where entrepreneur.user_account_id=p_actor_user_account_id and entrepreneur.status='active' and account.status='active';
  if v_entrepreneur_id is null then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;
  select array_agg(distinct organization_id) into v_organizations from (
    select definition.owner_organization_id organization_id
    from orchestration.enrollments enrollment
    join catalog.journey_versions version on version.id=enrollment.journey_version_id
    join catalog.journey_definitions definition on definition.id=version.journey_definition_id
    where enrollment.entrepreneur_id=v_entrepreneur_id and enrollment.status in ('assigned','accepted','active','completed')
    union select id from iam.organizations where slug='estimulo' and status='active'
  ) organizations;
  v_organizations:=coalesce(v_organizations,'{}'::uuid[]);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',announcement.id,'title',announcement.title,'body',announcement.body,'cta_label',announcement.cta_label,
    'cta_url',announcement.cta_url,'priority',announcement.priority,'starts_at',announcement.starts_at,'ends_at',announcement.ends_at,
    'image_file_object_id',announcement.image_file_object_id,'mobile_image_file_object_id',announcement.mobile_image_file_object_id,'image_alt',announcement.image_alt,'display_mode',announcement.display_mode
  ) order by announcement.priority desc,announcement.starts_at desc nulls last,announcement.created_at desc),'[]'::jsonb) into v_announcements
  from engagement.announcements announcement
  where announcement.organization_id=any(v_organizations) and announcement.status='published'
    and (announcement.starts_at is null or announcement.starts_at<=now())
    and (announcement.ends_at is null or announcement.ends_at>now());
  with balances as (
    select entrepreneur.id entrepreneur_id,coalesce(sum(balance.balance),0)::bigint points
    from core.entrepreneurs entrepreneur
    left join engagement.point_balance_projections balance on balance.entrepreneur_id=entrepreneur.id
    where entrepreneur.status='active' group by entrepreneur.id
  ), ranked as (
    select balance.entrepreneur_id,balance.points,dense_rank() over(order by balance.points desc,balance.entrepreneur_id) position from balances balance
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'position',ranked.position,'participant',case when ranked.entrepreneur_id=v_entrepreneur_id then 'Você' else 'Empreendedor '||upper(substr(md5(ranked.entrepreneur_id::text),1,4)) end,
    'points',ranked.points,'is_current',ranked.entrepreneur_id=v_entrepreneur_id
  ) order by ranked.position,ranked.entrepreneur_id) filter(where ranked.position<=10),'[]'::jsonb) into v_ranking from ranked;
  with balances as (
    select entrepreneur.id entrepreneur_id,coalesce(sum(balance.balance),0)::bigint points
    from core.entrepreneurs entrepreneur left join engagement.point_balance_projections balance on balance.entrepreneur_id=entrepreneur.id
    where entrepreneur.status='active' group by entrepreneur.id
  ), ranked as (
    select balance.entrepreneur_id,balance.points,dense_rank() over(order by balance.points desc,balance.entrepreneur_id) position from balances balance
  ) select jsonb_build_object('position',position,'points',points) into v_own_rank from ranked where entrepreneur_id=v_entrepreneur_id limit 1;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',ledger.id,'amount',ledger.amount,'reason',coalesce(definition.name,ledger.reason),'occurred_at',ledger.occurred_at,'journey_instance_id',ledger.journey_instance_id
  ) order by ledger.occurred_at desc,ledger.id desc),'[]'::jsonb) into v_point_history
  from (select item.* from engagement.point_ledger item where item.entrepreneur_id=v_entrepreneur_id order by item.occurred_at desc,item.id desc limit 30) ledger
  left join engagement.point_rule_versions version on version.id=ledger.point_rule_version_id
  left join engagement.point_rule_definitions definition on definition.id=version.point_rule_definition_id;
  with reward_rows as (
    select 'badge'::text reward_type,version.id version_id,version.title,version.description,
      exists(select 1 from engagement.badge_awards award where award.entrepreneur_id=v_entrepreneur_id and award.badge_version_id=version.id and award.revoked_at is null) earned
    from engagement.badge_versions version join engagement.badge_definitions definition on definition.id=version.badge_definition_id
    where definition.owner_organization_id=any(v_organizations) and version.status='published' and version.published_at is not null
    union all
    select 'certificate'::text,version.id,definition.name,'Certificado de conclusão da jornada'::text,
      exists(select 1 from engagement.certificate_issuances issuance where issuance.entrepreneur_id=v_entrepreneur_id and issuance.certificate_version_id=version.id and issuance.status='active' and issuance.revoked_at is null)
    from engagement.certificate_versions version join engagement.certificate_definitions definition on definition.id=version.certificate_definition_id
    where definition.owner_organization_id=any(v_organizations) and version.status='published' and version.published_at is not null
      and exists(select 1 from orchestration.enrollments enrollment where enrollment.entrepreneur_id=v_entrepreneur_id and enrollment.journey_version_id=version.journey_version_id)
  ) select coalesce(jsonb_agg(jsonb_build_object('type',reward_type,'version_id',version_id,'title',title,'description',description,'earned',earned) order by earned desc,reward_type,title),'[]'::jsonb) into v_rewards from reward_rows;
  select jsonb_build_object('assignment_id',assignment.id,'name',definition.name,'description',definition.description,'classification_status',assignment.classification_status,'probability',assignment.probability,'assigned_at',assignment.assigned_at)
  into v_archetype from diagnostics.archetype_assignments assignment
  left join diagnostics.archetype_versions version on version.id=assignment.primary_archetype_version_id
  left join diagnostics.archetype_definitions definition on definition.id=version.archetype_definition_id
  where assignment.entrepreneur_id=v_entrepreneur_id order by assignment.assigned_at desc limit 1;
  return jsonb_build_object('entrepreneur_id',v_entrepreneur_id,'preferred_name',v_preferred_name,'email',v_email,
    'announcements',coalesce(v_announcements,'[]'::jsonb),'ranking',coalesce(v_ranking,'[]'::jsonb),'own_rank',v_own_rank,
    'point_history',coalesce(v_point_history,'[]'::jsonb),'rewards',coalesce(v_rewards,'[]'::jsonb),'archetype',v_archetype);
end;
$function$;


-- Responsive CMS media for every participant header.
create or replace function public.get_interface_content_image_download(
  p_actor_user_account_id uuid,
  p_content_key text,
  p_variant text default 'desktop',
  p_include_draft boolean default false
) returns jsonb
language plpgsql stable security definer set search_path to 'pg_catalog'
as $function$
declare
  v_entry experience.interface_content%rowtype;
  v_value jsonb;
  v_file_id uuid;
  v_file core.file_objects%rowtype;
  v_variant text:=lower(btrim(coalesce(p_variant,'desktop')));
begin
  if v_variant not in ('desktop','mobile') then raise exception 'INTERFACE_IMAGE_VARIANT_INVALID' using errcode='22023'; end if;
  select * into v_entry from experience.interface_content
  where content_key=lower(btrim(p_content_key)) and locale='pt-BR' and is_active
  order by updated_at desc limit 1;
  if not found then raise exception 'INTERFACE_CONTENT_NOT_FOUND' using errcode='P0002'; end if;
  if p_include_draft then
    if not app_private.e14_actor_has_permission(p_actor_user_account_id,v_entry.organization_id,'journey.definition.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
    v_value:=v_entry.default_value||coalesce(v_entry.published_value,'{}'::jsonb)||coalesce(v_entry.draft_value,'{}'::jsonb);
  else
    if not exists(select 1 from iam.user_accounts account where account.id=p_actor_user_account_id and account.status='active') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
    v_value:=v_entry.default_value||coalesce(v_entry.published_value,'{}'::jsonb);
  end if;
  v_file_id:=case when v_variant='mobile'
    then coalesce(nullif(v_value->>'mobile_image_file_object_id','')::uuid,nullif(v_value->>'image_file_object_id','')::uuid)
    else nullif(v_value->>'image_file_object_id','')::uuid end;
  if v_file_id is null then raise exception 'INTERFACE_IMAGE_NOT_FOUND' using errcode='P0002'; end if;
  select * into v_file from core.file_objects where id=v_file_id and owner_organization_id=v_entry.organization_id and security_status='clean' and deleted_at is null;
  if not found then raise exception 'INTERFACE_IMAGE_NOT_AVAILABLE' using errcode='P0002'; end if;
  return jsonb_build_object('bucket',v_file.bucket,'object_key',v_file.object_key,'content_type',v_file.content_type,'file_object_id',v_file.id);
end;
$function$;

with organization as (
  select id from iam.organizations where slug='estimulo' and status='active' limit 1
), pages(page_key,route_pattern,title,description) as (
  values
    ('overview','/empreendedor','Início','Acompanhe seu progresso e continue aprendendo.'),
    ('jornadas','/empreendedor/jornadas/*','Jornadas','Escolha e acompanhe suas jornadas.'),
    ('biblioteca','/empreendedor/biblioteca/*','Biblioteca','Encontre conteúdos para aplicar no seu negócio.'),
    ('recompensas','/empreendedor/recompensas','Recompensas','Entenda seus pontos e reconhecimentos.'),
    ('conquistas','/empreendedor/conquistas','Conquistas','Consulte selos e certificados.'),
    ('b2b','/empreendedor/b2b/*','Conteúdos exclusivos','Acesse conteúdos liberados para você.'),
    ('perfil','/empreendedor/perfil/*','Perfil','Diagnóstico, informações e entregas em um só lugar.'),
    ('resultado','/empreendedor/resultado','Resultado','Acompanhe seu desenvolvimento.')
), entries as (
  select organization.id organization_id,'participant.page.'||pages.page_key||'.header.eyebrow' content_key,pages.page_key page,'Contexto do header' element_name,'text' element_type,pages.route_pattern,jsonb_build_object('text','Sua experiência','visible',true) value from organization cross join pages
  union all select organization.id,'participant.page.'||pages.page_key||'.header.title',pages.page_key,'Título do header','text',pages.route_pattern,jsonb_build_object('text',pages.title,'visible',true) from organization cross join pages
  union all select organization.id,'participant.page.'||pages.page_key||'.header.description',pages.page_key,'Subtítulo do header','textarea',pages.route_pattern,jsonb_build_object('text',pages.description,'visible',true) from organization cross join pages
  union all select organization.id,'participant.page.'||pages.page_key||'.header.media',pages.page_key,'Imagem responsiva do header','image',pages.route_pattern,jsonb_build_object('visible',false,'image_url','','mobile_image_url','','image_file_object_id',null,'mobile_image_file_object_id',null,'alt','','image_position','center','overlay_opacity',0.48,'layout_variant','cover') from organization cross join pages
)
insert into experience.interface_content(
  organization_id,content_key,locale,area,page,element_name,element_type,description,route_pattern,placement,group_name,editor_schema,can_delete,default_value,published_value,is_active,created_at,updated_at
)
select organization_id,content_key,'pt-BR','participant',page,element_name,element_type,'Conteúdo editável do header da interface do participante.',route_pattern,'header','Headers das páginas',jsonb_build_object('responsive_media',element_type='image'),false,value,value,true,now(),now()
from entries
on conflict(organization_id,content_key,locale) do update set
  route_pattern=excluded.route_pattern,placement='header',group_name='Headers das páginas',editor_schema=excluded.editor_schema,is_active=true,updated_at=now();

-- Ordered, admin-configurable home badge highlights.
create table if not exists engagement.home_badge_highlight_settings(
  organization_id uuid primary key references iam.organizations(id),
  max_items integer not null default 3 check(max_items between 1 and 12),
  updated_by uuid references iam.user_accounts(id),
  updated_at timestamptz not null default now()
);
create table if not exists engagement.home_badge_highlights(
  organization_id uuid not null references iam.organizations(id),
  badge_version_id uuid not null references engagement.badge_versions(id),
  position integer not null check(position between 1 and 99),
  created_at timestamptz not null default now(),
  primary key(organization_id,badge_version_id),
  unique(organization_id,position)
);
alter table engagement.home_badge_highlight_settings enable row level security;
alter table engagement.home_badge_highlights enable row level security;
revoke all on engagement.home_badge_highlight_settings,engagement.home_badge_highlights from public,anon,authenticated;
grant select,insert,update,delete on engagement.home_badge_highlight_settings,engagement.home_badge_highlights to service_role;

create or replace function public.get_admin_home_badge_highlights(p_actor_user_account_id uuid,p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return jsonb_build_object(
    'organization_id',p_organization_id,
    'max_items',coalesce((select max_items from engagement.home_badge_highlight_settings where organization_id=p_organization_id),3),
    'badges',coalesce((select jsonb_agg(jsonb_build_object(
      'badge_version_id',version.id,'title',version.title,'description',version.description,
      'selected',highlight.badge_version_id is not null,'position',highlight.position
    ) order by highlight.position nulls last,version.title)
    from engagement.badge_versions version
    join engagement.badge_definitions definition on definition.id=version.badge_definition_id
    left join engagement.home_badge_highlights highlight on highlight.organization_id=p_organization_id and highlight.badge_version_id=version.id
    where definition.owner_organization_id=p_organization_id and version.status='published'),'[]'::jsonb)
  );
end;$function$;

create or replace function public.save_admin_home_badge_highlights(
  p_actor_user_account_id uuid,p_organization_id uuid,p_badge_version_ids uuid[],p_max_items integer,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare v_ids uuid[]:=coalesce(p_badge_version_ids,'{}'::uuid[]); v_max integer:=greatest(1,least(12,coalesce(p_max_items,3))); v_id uuid; v_position integer:=0;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if cardinality(v_ids)<>cardinality(array(select distinct item from unnest(v_ids) item)) then raise exception 'DUPLICATE_BADGE_HIGHLIGHT' using errcode='22023'; end if;
  if exists(select 1 from unnest(v_ids) item where not exists(
    select 1 from engagement.badge_versions version join engagement.badge_definitions definition on definition.id=version.badge_definition_id
    where version.id=item and definition.owner_organization_id=p_organization_id and version.status='published'
  )) then raise exception 'BADGE_HIGHLIGHT_NOT_AVAILABLE' using errcode='22023'; end if;
  insert into engagement.home_badge_highlight_settings(organization_id,max_items,updated_by,updated_at)
  values(p_organization_id,v_max,p_actor_user_account_id,now())
  on conflict(organization_id) do update set max_items=excluded.max_items,updated_by=excluded.updated_by,updated_at=now();
  delete from engagement.home_badge_highlights where organization_id=p_organization_id;
  foreach v_id in array v_ids loop
    v_position:=v_position+1;
    insert into engagement.home_badge_highlights(organization_id,badge_version_id,position) values(p_organization_id,v_id,v_position);
  end loop;
  return jsonb_build_object('saved_count',v_position,'max_items',v_max,'replayed',false);
end;$function$;

create or replace function public.get_participant_featured_badges(p_actor_user_account_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
declare v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id); v_orgs uuid[]; v_max integer;
begin
  if v_entrepreneur_id is null then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;
  select array_agg(distinct organization_id) into v_orgs from (
    select definition.owner_organization_id organization_id from orchestration.enrollments enrollment
      join catalog.journey_versions version on version.id=enrollment.journey_version_id
      join catalog.journey_definitions definition on definition.id=version.journey_definition_id
      where enrollment.entrepreneur_id=v_entrepreneur_id and enrollment.status in ('assigned','accepted','active','completed')
    union select id from iam.organizations where slug='estimulo' and status='active'
  ) organizations;
  select coalesce(max(settings.max_items),3) into v_max from engagement.home_badge_highlight_settings settings where settings.organization_id=any(coalesce(v_orgs,'{}'::uuid[]));
  return jsonb_build_object('max_items',v_max,'badges',coalesce((
    select jsonb_agg(item order by (item->>'position')::integer) from (
      select jsonb_build_object('badge_version_id',version.id,'title',version.title,'description',version.description,'position',highlight.position,
        'earned',exists(select 1 from engagement.badge_awards award where award.entrepreneur_id=v_entrepreneur_id and award.badge_version_id=version.id and award.revoked_at is null)) item
      from engagement.home_badge_highlights highlight
      join engagement.badge_versions version on version.id=highlight.badge_version_id and version.status='published'
      where highlight.organization_id=any(coalesce(v_orgs,'{}'::uuid[]))
      order by highlight.position limit v_max
    ) rows
  ),'[]'::jsonb));
end;$function$;

-- New participants always receive an Estímulo membership and therefore appear in administration.
create or replace function app_private.ensure_estimulo_membership_for_entrepreneur()
returns trigger language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare v_organization_id uuid; v_membership_id uuid;
begin
  if new.status<>'active' then return new; end if;
  select id into v_organization_id from iam.organizations where slug='estimulo' and status='active' limit 1;
  if v_organization_id is null then return new; end if;
  select membership.id into v_membership_id
  from iam.organization_memberships membership
  where membership.organization_id=v_organization_id and membership.user_account_id=new.user_account_id
  order by (membership.status='active' and membership.valid_from<=now() and (membership.valid_until is null or membership.valid_until>now())) desc,membership.valid_from desc
  limit 1 for update;
  if v_membership_id is null then
    insert into iam.organization_memberships(id,organization_id,user_account_id,status,valid_from,valid_until,created_at)
    values(app_private.e14_deterministic_uuid('estimulo-participant-membership|'||new.user_account_id::text),v_organization_id,new.user_account_id,'active',now(),null,now());
  else
    update iam.organization_memberships set status='active',valid_until=null where id=v_membership_id;
  end if;
  return new;
end;$function$;
drop trigger if exists trg_ensure_estimulo_membership_for_entrepreneur on core.entrepreneurs;
create trigger trg_ensure_estimulo_membership_for_entrepreneur after insert or update on core.entrepreneurs for each row execute function app_private.ensure_estimulo_membership_for_entrepreneur();
with organization as (
  select id from iam.organizations where slug='estimulo' and status='active' limit 1
), ranked_memberships as (
  select membership.id,row_number() over (partition by membership.organization_id,membership.user_account_id order by
    (membership.status='active' and membership.valid_from<=now() and (membership.valid_until is null or membership.valid_until>now())) desc,
    membership.valid_from desc,membership.created_at desc,membership.id
  ) membership_rank
  from iam.organization_memberships membership
  join organization on organization.id=membership.organization_id
  join core.entrepreneurs entrepreneur on entrepreneur.user_account_id=membership.user_account_id and entrepreneur.status='active'
)
update iam.organization_memberships membership set status='active',valid_until=null
from ranked_memberships ranked where ranked.id=membership.id and ranked.membership_rank=1;
with organization as (
  select id from iam.organizations where slug='estimulo' and status='active' limit 1
)
insert into iam.organization_memberships(id,organization_id,user_account_id,status,valid_from,valid_until,created_at)
select app_private.e14_deterministic_uuid('estimulo-participant-membership|'||entrepreneur.user_account_id::text),organization.id,entrepreneur.user_account_id,'active',now(),null,now()
from core.entrepreneurs entrepreneur cross join organization
where entrepreneur.status='active' and not exists(
  select 1 from iam.organization_memberships membership where membership.organization_id=organization.id and membership.user_account_id=entrepreneur.user_account_id
);

-- Keep live journeys complete whenever an administrator adds or edits lessons.
create or replace function app_private.sync_live_path_step_instances()
returns trigger language plpgsql security definer set search_path to 'pg_catalog' as $function$
begin
  insert into orchestration.step_instances(id,path_assignment_id,path_step_id,activity_version_id,status,available_at,aggregate_version,created_at,updated_at)
  select app_private.e14_deterministic_uuid('step-instance|'||assignment.id::text||'|'||new.id::text),assignment.id,new.id,new.activity_version_id,
    case when not exists(
      select 1 from orchestration.path_steps previous_step
      left join orchestration.step_instances previous_instance on previous_instance.path_assignment_id=assignment.id and previous_instance.path_step_id=previous_step.id
      where previous_step.path_template_id=new.path_template_id and previous_step.is_required
        and (previous_step.position_hint,previous_step.id)<(new.position_hint,new.id)
        and coalesce(previous_instance.status,'locked')<>'completed'
    ) then 'available' else 'locked' end,
    case when not exists(
      select 1 from orchestration.path_steps previous_step
      left join orchestration.step_instances previous_instance on previous_instance.path_assignment_id=assignment.id and previous_instance.path_step_id=previous_step.id
      where previous_step.path_template_id=new.path_template_id and previous_step.is_required
        and (previous_step.position_hint,previous_step.id)<(new.position_hint,new.id)
        and coalesce(previous_instance.status,'locked')<>'completed'
    ) then now() else null end,0,now(),now()
  from orchestration.path_assignments assignment
  join orchestration.journey_instances journey on journey.id=assignment.journey_instance_id
  where assignment.path_template_id=new.path_template_id and assignment.status='active'
    and assignment.valid_from<=now() and (assignment.valid_until is null or assignment.valid_until>now())
    and journey.status in ('available','in_progress')
  on conflict(path_assignment_id,path_step_id) do nothing;
  update orchestration.step_instances instance set activity_version_id=new.activity_version_id,updated_at=now()
  where instance.path_step_id=new.id and instance.status in ('locked','available') and instance.started_at is null;
  update orchestration.progress_projections projection set
    total_required_steps=greatest(1,(select count(*) from orchestration.path_steps step where step.path_template_id=assignment.path_template_id and step.is_required)),
    projection_version=projection.projection_version+1,updated_at=now()
  from orchestration.path_assignments assignment
  where assignment.path_template_id=new.path_template_id and assignment.journey_instance_id=projection.journey_instance_id and assignment.status='active';
  return new;
end;$function$;
drop trigger if exists trg_sync_live_path_step_instances on orchestration.path_steps;
create trigger trg_sync_live_path_step_instances after insert or update of activity_version_id,metadata,path_template_id,position_hint,is_required on orchestration.path_steps for each row execute function app_private.sync_live_path_step_instances();
insert into orchestration.step_instances(id,path_assignment_id,path_step_id,activity_version_id,status,available_at,aggregate_version,created_at,updated_at)
select app_private.e14_deterministic_uuid('step-instance|'||assignment.id::text||'|'||step.id::text),assignment.id,step.id,step.activity_version_id,
  case when not exists(
    select 1 from orchestration.path_steps previous_step
    left join orchestration.step_instances previous_instance on previous_instance.path_assignment_id=assignment.id and previous_instance.path_step_id=previous_step.id
    where previous_step.path_template_id=step.path_template_id and previous_step.is_required
      and (previous_step.position_hint,previous_step.id)<(step.position_hint,step.id)
      and coalesce(previous_instance.status,'locked')<>'completed'
  ) then 'available' else 'locked' end,
  case when not exists(
    select 1 from orchestration.path_steps previous_step
    left join orchestration.step_instances previous_instance on previous_instance.path_assignment_id=assignment.id and previous_instance.path_step_id=previous_step.id
    where previous_step.path_template_id=step.path_template_id and previous_step.is_required
      and (previous_step.position_hint,previous_step.id)<(step.position_hint,step.id)
      and coalesce(previous_instance.status,'locked')<>'completed'
  ) then now() else null end,0,now(),now()
from orchestration.path_assignments assignment
join orchestration.journey_instances journey on journey.id=assignment.journey_instance_id
join orchestration.path_steps step on step.path_template_id=assignment.path_template_id
where assignment.status='active' and assignment.valid_from<=now() and (assignment.valid_until is null or assignment.valid_until>now()) and journey.status in ('available','in_progress')
on conflict(path_assignment_id,path_step_id) do nothing;
update orchestration.progress_projections projection set
  total_required_steps=greatest(1,counts.required_steps),projection_version=projection.projection_version+1,updated_at=now()
from (
  select assignment.journey_instance_id,count(*) filter(where step.is_required)::integer required_steps
  from orchestration.path_assignments assignment join orchestration.path_steps step on step.path_template_id=assignment.path_template_id
  where assignment.status='active' group by assignment.journey_instance_id
) counts where counts.journey_instance_id=projection.journey_instance_id and projection.total_required_steps is distinct from greatest(1,counts.required_steps);

-- Lesson thumbs are private, role-aware assets.
create or replace function public.get_admin_lesson_thumbnail_download(p_actor_user_account_id uuid,p_path_step_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
declare v_file_id uuid; v_org uuid; v_file core.file_objects%rowtype;
begin
  select nullif(step.metadata->>'continue_thumbnail_file_object_id','')::uuid,definition.owner_organization_id into v_file_id,v_org
  from orchestration.path_steps step join orchestration.path_templates path on path.id=step.path_template_id
  join catalog.journey_versions version on version.id=path.journey_version_id join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  where step.id=p_path_step_id;
  if v_file_id is null then raise exception 'LESSON_THUMBNAIL_NOT_FOUND' using errcode='P0002'; end if;
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,v_org,'journey.definition.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into v_file from core.file_objects where id=v_file_id and owner_organization_id=v_org and security_status='clean' and deleted_at is null;
  if not found then raise exception 'LESSON_THUMBNAIL_NOT_AVAILABLE' using errcode='P0002'; end if;
  return jsonb_build_object('bucket',v_file.bucket,'object_key',v_file.object_key,'content_type',v_file.content_type);
end;$function$;
create or replace function public.get_participant_lesson_thumbnail_download(p_actor_user_account_id uuid,p_step_instance_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
declare v_file_id uuid; v_org uuid; v_file core.file_objects%rowtype; v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
begin
  select nullif(step.metadata->>'continue_thumbnail_file_object_id','')::uuid,definition.owner_organization_id into v_file_id,v_org
  from orchestration.step_instances instance join orchestration.path_steps step on step.id=instance.path_step_id
  join orchestration.path_assignments assignment on assignment.id=instance.path_assignment_id
  join orchestration.journey_instances journey on journey.id=assignment.journey_instance_id
  join orchestration.enrollments enrollment on enrollment.id=journey.enrollment_id
  join catalog.journey_versions version on version.id=enrollment.journey_version_id join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  where instance.id=p_step_instance_id and enrollment.entrepreneur_id=v_entrepreneur_id;
  if v_file_id is null then raise exception 'LESSON_THUMBNAIL_NOT_FOUND' using errcode='P0002'; end if;
  select * into v_file from core.file_objects where id=v_file_id and owner_organization_id=v_org and security_status='clean' and deleted_at is null;
  if not found then raise exception 'LESSON_THUMBNAIL_NOT_AVAILABLE' using errcode='P0002'; end if;
  return jsonb_build_object('bucket',v_file.bucket,'object_key',v_file.object_key,'content_type',v_file.content_type);
end;$function$;

-- Unified certificate issuer identity and automatic numbering.
create sequence if not exists engagement.certificate_number_sequence;
revoke all on sequence engagement.certificate_number_sequence from public,anon,authenticated;
create table if not exists engagement.certificate_issuers(
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references iam.organizations(id),
  name text not null,
  cnpj text,
  representative_name text,
  representative_role text,
  logo_file_object_id uuid references core.file_objects(id),
  signature_file_object_id uuid references core.file_objects(id),
  primary_color text not null default '#13115B',
  secondary_color text not null default '#54D68C',
  status text not null default 'active' check(status in ('active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_organization_id,name)
);
alter table engagement.certificate_issuers enable row level security;
revoke all on engagement.certificate_issuers from public,anon,authenticated;
grant select,insert,update,delete on engagement.certificate_issuers to service_role;
alter table engagement.certificate_versions add column if not exists issuer_id uuid references engagement.certificate_issuers(id);
alter table engagement.certificate_issuances add column if not exists certificate_number text;
create unique index if not exists certificate_issuances_number_uq on engagement.certificate_issuances(certificate_number) where certificate_number is not null;
create or replace function app_private.assign_certificate_number() returns trigger language plpgsql security definer set search_path to 'pg_catalog' as $function$
begin
  if new.certificate_number is null then new.certificate_number:='EST-'||to_char(coalesce(new.issued_at,now()),'YYYY')||'-'||lpad(nextval('engagement.certificate_number_sequence')::text,8,'0'); end if;
  return new;
end;$function$;
drop trigger if exists trg_assign_certificate_number on engagement.certificate_issuances;
create trigger trg_assign_certificate_number before insert on engagement.certificate_issuances for each row execute function app_private.assign_certificate_number();
update engagement.certificate_issuances set certificate_number='EST-'||to_char(issued_at,'YYYY')||'-'||lpad(nextval('engagement.certificate_number_sequence')::text,8,'0') where certificate_number is null;

create or replace function app_private.default_certificate_version_issuer()
returns trigger language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare v_organization_id uuid; v_issuer_id uuid;
begin
  if new.issuer_id is not null then return new; end if;
  select definition.owner_organization_id into v_organization_id from engagement.certificate_definitions definition where definition.id=new.certificate_definition_id;
  select issuer.id into v_issuer_id from engagement.certificate_issuers issuer
  where issuer.owner_organization_id=v_organization_id and issuer.status='active' order by issuer.updated_at desc limit 1;
  new.issuer_id:=v_issuer_id;
  return new;
end;$function$;
drop trigger if exists trg_default_certificate_version_issuer on engagement.certificate_versions;
create trigger trg_default_certificate_version_issuer before insert or update of certificate_definition_id,issuer_id on engagement.certificate_versions for each row execute function app_private.default_certificate_version_issuer();

create or replace function public.get_admin_certificate_issuer(p_actor_user_account_id uuid,p_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return coalesce((select to_jsonb(issuer) from engagement.certificate_issuers issuer where issuer.owner_organization_id=p_organization_id and issuer.status='active' order by issuer.updated_at desc limit 1),jsonb_build_object('owner_organization_id',p_organization_id,'name','Estímulo','primary_color','#13115B','secondary_color','#54D68C'));
end;$function$;
create or replace function public.save_admin_certificate_issuer(
  p_actor_user_account_id uuid,p_organization_id uuid,p_name text,p_cnpj text,p_representative_name text,p_representative_role text,
  p_logo_file_object_id uuid,p_signature_file_object_id uuid,p_primary_color text,p_secondary_color text,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare v_id uuid;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if length(btrim(coalesce(p_name,'')))<2 then raise exception 'CERTIFICATE_ISSUER_NAME_REQUIRED' using errcode='22023'; end if;
  if p_logo_file_object_id is not null and not exists(select 1 from core.file_objects where id=p_logo_file_object_id and owner_organization_id=p_organization_id and security_status='clean' and deleted_at is null) then raise exception 'CERTIFICATE_ISSUER_LOGO_INVALID' using errcode='22023'; end if;
  if p_signature_file_object_id is not null and not exists(select 1 from core.file_objects where id=p_signature_file_object_id and owner_organization_id=p_organization_id and security_status='clean' and deleted_at is null) then raise exception 'CERTIFICATE_ISSUER_SIGNATURE_INVALID' using errcode='22023'; end if;
  select id into v_id from engagement.certificate_issuers where owner_organization_id=p_organization_id and status='active' order by updated_at desc limit 1 for update;
  if v_id is null then
    insert into engagement.certificate_issuers(owner_organization_id,name,cnpj,representative_name,representative_role,logo_file_object_id,signature_file_object_id,primary_color,secondary_color)
    values(p_organization_id,btrim(p_name),nullif(btrim(p_cnpj),''),nullif(btrim(p_representative_name),''),nullif(btrim(p_representative_role),''),p_logo_file_object_id,p_signature_file_object_id,coalesce(nullif(p_primary_color,''),'#13115B'),coalesce(nullif(p_secondary_color,''),'#54D68C')) returning id into v_id;
  else
    update engagement.certificate_issuers set name=btrim(p_name),cnpj=nullif(btrim(p_cnpj),''),representative_name=nullif(btrim(p_representative_name),''),representative_role=nullif(btrim(p_representative_role),''),logo_file_object_id=p_logo_file_object_id,signature_file_object_id=p_signature_file_object_id,primary_color=coalesce(nullif(p_primary_color,''),'#13115B'),secondary_color=coalesce(nullif(p_secondary_color,''),'#54D68C'),updated_at=now() where id=v_id;
  end if;
  update engagement.certificate_versions version set issuer_id=v_id from engagement.certificate_definitions definition where definition.id=version.certificate_definition_id and definition.owner_organization_id=p_organization_id and version.issuer_id is null;
  return jsonb_build_object('issuer_id',v_id,'replayed',false);
end;$function$;

create or replace function public.get_certificate_render_payload(p_actor_user_account_id uuid,p_issuance_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
declare v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id); v_result jsonb;
begin
  select jsonb_build_object(
    'issuance_id',ci.id,'display_name',ci.display_name_snapshot,'journey_title',jv.title,'certificate_name',cd.name,
    'verification_code',ci.verification_code,'certificate_number',ci.certificate_number,'issued_at',ci.issued_at,'expires_at',ci.expires_at,
    'template_layout',cv.template_layout,
    'issuer',case when issuer.id is null then null else jsonb_build_object(
      'name',issuer.name,'cnpj',issuer.cnpj,'representative_name',issuer.representative_name,'representative_role',issuer.representative_role,
      'primary_color',issuer.primary_color,'secondary_color',issuer.secondary_color,
      'logo',case when issuer_logo.id is null then null else jsonb_build_object('bucket',issuer_logo.bucket,'object_key',issuer_logo.object_key,'content_type',issuer_logo.content_type,'filename',issuer_logo.original_filename) end,
      'signature',case when issuer_signature.id is null then null else jsonb_build_object('bucket',issuer_signature.bucket,'object_key',issuer_signature.object_key,'content_type',issuer_signature.content_type,'filename',issuer_signature.original_filename) end
    ) end,
    'template',case when fo.id is null then null else jsonb_build_object('bucket',fo.bucket,'object_key',fo.object_key,'content_type',fo.content_type,'filename',fo.original_filename) end,
    'template_scope',resolved.scope_type
  ) into v_result
  from engagement.certificate_issuances ci
  join engagement.certificate_versions cv on cv.id=ci.certificate_version_id
  join engagement.certificate_definitions cd on cd.id=cv.certificate_definition_id
  join catalog.journey_versions jv on jv.id=cv.journey_version_id
  join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
  left join engagement.certificate_issuers issuer on issuer.id=cv.issuer_id and issuer.status='active'
  left join core.file_objects issuer_logo on issuer_logo.id=issuer.logo_file_object_id and issuer_logo.security_status='clean' and issuer_logo.deleted_at is null
  left join core.file_objects issuer_signature on issuer_signature.id=issuer.signature_file_object_id and issuer_signature.security_status='clean' and issuer_signature.deleted_at is null
  left join lateral (
    select choice.file_object_id,choice.scope_type from (
      select asset.file_object_id,assignment.scope_type,case assignment.scope_type when 'journey' then 1 when 'program' then 2 when 'global' then 3 else 9 end precedence
      from engagement.certificate_template_assignments assignment join engagement.certificate_template_assets asset on asset.id=assignment.template_asset_id and asset.status='active'
      where assignment.owner_organization_id=jd.owner_organization_id and assignment.active and (assignment.starts_at is null or assignment.starts_at<=now()) and (assignment.ends_at is null or assignment.ends_at>now())
        and ((assignment.scope_type='journey' and assignment.scope_id=jd.id) or (assignment.scope_type='program' and assignment.scope_id=jd.program_id) or (assignment.scope_type='global' and assignment.scope_id is null))
      union all select cv.template_file_object_id,'certificate_version'::text,4 where cv.template_file_object_id is not null
    ) choice order by choice.precedence limit 1
  ) resolved on true
  left join core.file_objects fo on fo.id=resolved.file_object_id and fo.security_status='clean' and fo.deleted_at is null
  where ci.id=p_issuance_id and ci.entrepreneur_id=v_entrepreneur_id and ci.status='active' and ci.revoked_at is null;
  if v_result is null then raise exception 'CERTIFICATE_ISSUANCE_NOT_FOUND' using errcode='P0002'; end if;
  return v_result;
end;$function$;


create or replace function public.list_participant_credentials(p_actor_user_account_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
declare v_entrepreneur_id uuid:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id); v_badges jsonb; v_certificates jsonb;
begin
  if v_entrepreneur_id is null then return jsonb_build_object('entrepreneur_id',null,'badges','[]'::jsonb,'certificates','[]'::jsonb); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'award_id',award.id,'journey_instance_id',award.journey_instance_id,'badge_version_id',award.badge_version_id,
    'title',badge_version.title,'description',badge_version.description,'journey_title',coalesce(nullif(definition.name,''),journey_version.title),
    'awarded_at',award.awarded_at,'revoked_at',award.revoked_at,'revocation_reason',award.revocation_reason,
    'status',case when award.revoked_at is null then 'active' else 'revoked' end
  ) order by award.awarded_at desc),'[]'::jsonb) into v_badges
  from engagement.badge_awards award join engagement.badge_versions badge_version on badge_version.id=award.badge_version_id
  join orchestration.journey_instances instance on instance.id=award.journey_instance_id join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions journey_version on journey_version.id=enrollment.journey_version_id join catalog.journey_definitions definition on definition.id=journey_version.journey_definition_id
  where award.entrepreneur_id=v_entrepreneur_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'issuance_id',issuance.id,'journey_instance_id',issuance.journey_instance_id,'certificate_version_id',issuance.certificate_version_id,
    'certificate_name',certificate_definition.name,'journey_title',coalesce(nullif(definition.name,''),journey_version.title),
    'verification_code',issuance.verification_code,'certificate_number',issuance.certificate_number,'display_name',issuance.display_name_snapshot,
    'issuer_name',issuer.name,'issuer_cnpj',issuer.cnpj,'status',issuance.status,'issued_at',issuance.issued_at,'expires_at',issuance.expires_at,
    'revoked_at',issuance.revoked_at,'revocation_reason',issuance.revocation_reason,
    'valid',issuance.status='active' and issuance.revoked_at is null and (issuance.expires_at is null or issuance.expires_at>now())
  ) order by issuance.issued_at desc),'[]'::jsonb) into v_certificates
  from engagement.certificate_issuances issuance join engagement.certificate_versions certificate_version on certificate_version.id=issuance.certificate_version_id
  join engagement.certificate_definitions certificate_definition on certificate_definition.id=certificate_version.certificate_definition_id
  left join engagement.certificate_issuers issuer on issuer.id=certificate_version.issuer_id
  join orchestration.journey_instances instance on instance.id=issuance.journey_instance_id join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions journey_version on journey_version.id=enrollment.journey_version_id join catalog.journey_definitions definition on definition.id=journey_version.journey_definition_id
  where issuance.entrepreneur_id=v_entrepreneur_id;
  return jsonb_build_object('entrepreneur_id',v_entrepreneur_id,'badges',v_badges,'certificates',v_certificates);
end;$function$;

create or replace function public.verify_certificate(p_verification_code text)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
declare v_result jsonb; v_code text:=upper(btrim(coalesce(p_verification_code,'')));
begin
  if v_code !~ '^EST-[A-F0-9]{20}$' then return jsonb_build_object('valid',false,'reason','invalid_code'); end if;
  select jsonb_build_object(
    'valid',issuance.status='active' and issuance.revoked_at is null and (issuance.expires_at is null or issuance.expires_at>now()),
    'reason',case when issuance.revoked_at is not null or issuance.status<>'active' then 'revoked' when issuance.expires_at is not null and issuance.expires_at<=now() then 'expired' else 'valid' end,
    'verification_code',issuance.verification_code,'certificate_number',issuance.certificate_number,'certificate_name',definition.name,
    'journey_title',journey.title,'display_name',issuance.display_name_snapshot,'issued_at',issuance.issued_at,'expires_at',issuance.expires_at,
    'issuer_name',issuer.name,'issuer_cnpj',issuer.cnpj,'representative_name',issuer.representative_name,'representative_role',issuer.representative_role
  ) into v_result
  from engagement.certificate_issuances issuance join engagement.certificate_versions version on version.id=issuance.certificate_version_id
  join engagement.certificate_definitions definition on definition.id=version.certificate_definition_id join catalog.journey_versions journey on journey.id=version.journey_version_id
  left join engagement.certificate_issuers issuer on issuer.id=version.issuer_id
  where issuance.verification_code=v_code;
  return coalesce(v_result,jsonb_build_object('valid',false,'reason','not_found'));
end;$function$;

revoke all on function public.get_announcement_banner_download(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.save_operator_announcement(uuid,uuid,uuid,bigint,text,text,text,text,text,integer,timestamptz,timestamptz,uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.list_operator_announcements(uuid,uuid) from public,anon,authenticated;
revoke all on function public.get_participant_engagement_hub(uuid) from public,anon,authenticated;
revoke all on function public.get_interface_content_image_download(uuid,text,text,boolean) from public,anon,authenticated;
revoke all on function public.get_admin_home_badge_highlights(uuid,uuid) from public,anon,authenticated;
revoke all on function public.save_admin_home_badge_highlights(uuid,uuid,uuid[],integer,text) from public,anon,authenticated;
revoke all on function public.get_participant_featured_badges(uuid) from public,anon,authenticated;
revoke all on function public.get_admin_lesson_thumbnail_download(uuid,uuid) from public,anon,authenticated;
revoke all on function public.get_participant_lesson_thumbnail_download(uuid,uuid) from public,anon,authenticated;
revoke all on function public.get_admin_certificate_issuer(uuid,uuid) from public,anon,authenticated;
revoke all on function public.save_admin_certificate_issuer(uuid,uuid,text,text,text,text,uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.get_certificate_render_payload(uuid,uuid) from public,anon,authenticated;
revoke all on function public.list_participant_credentials(uuid) from public,anon,authenticated;
revoke all on function public.verify_certificate(text) from public,anon,authenticated;
grant execute on function public.get_announcement_banner_download(uuid,uuid,text) to service_role;
grant execute on function public.save_operator_announcement(uuid,uuid,uuid,bigint,text,text,text,text,text,integer,timestamptz,timestamptz,uuid,uuid,text,text,text) to service_role;
grant execute on function public.list_operator_announcements(uuid,uuid) to service_role;
grant execute on function public.get_participant_engagement_hub(uuid) to service_role;
grant execute on function public.get_interface_content_image_download(uuid,text,text,boolean) to service_role;
grant execute on function public.get_admin_home_badge_highlights(uuid,uuid) to service_role;
grant execute on function public.save_admin_home_badge_highlights(uuid,uuid,uuid[],integer,text) to service_role;
grant execute on function public.get_participant_featured_badges(uuid) to service_role;
grant execute on function public.get_admin_lesson_thumbnail_download(uuid,uuid) to service_role;
grant execute on function public.get_participant_lesson_thumbnail_download(uuid,uuid) to service_role;
grant execute on function public.get_admin_certificate_issuer(uuid,uuid) to service_role;
grant execute on function public.save_admin_certificate_issuer(uuid,uuid,text,text,text,text,uuid,uuid,text,text,text) to service_role;
grant execute on function public.get_certificate_render_payload(uuid,uuid) to service_role;
grant execute on function public.list_participant_credentials(uuid) to service_role,app_worker;
grant execute on function public.verify_certificate(text) to anon,authenticated,service_role,app_worker;
grant usage,select on sequence engagement.certificate_number_sequence to service_role,app_worker;

commit;
