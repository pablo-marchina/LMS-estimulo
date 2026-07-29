-- Version the interface CMS that previously existed only in the remote database.
-- The migration is idempotent so it can reconcile the current Supabase project
-- and reproduce the same schema from an empty PostgreSQL database.

create schema if not exists experience authorization postgres;
revoke all on schema experience from public, anon, authenticated;

do $migration$
begin
  if not exists (select 1 from iam.organizations where slug='estimulo' and status='active') then
    raise exception 'ESTIMULO_ORGANIZATION_REQUIRED' using errcode='P0002';
  end if;
end;
$migration$;

create table if not exists experience.interface_content (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references iam.organizations(id),
  content_key text not null,
  locale text not null default 'pt-BR',
  area text not null,
  page text not null,
  element_name text not null,
  element_type text not null,
  description text not null,
  default_value jsonb not null default '{}'::jsonb,
  draft_value jsonb,
  published_value jsonb,
  is_active boolean not null default true,
  updated_by uuid references iam.user_accounts(id),
  published_by uuid references iam.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint uq_experience_interface_content unique(organization_id,content_key,locale),
  constraint ck_experience_interface_content_key check(content_key ~ '^[a-z][a-z0-9_.-]{2,159}$'),
  constraint ck_experience_interface_content_locale check(locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  constraint ck_experience_interface_content_area check(area in ('shared','public','participant','admin')),
  constraint ck_experience_interface_content_type check(element_type in ('text','navigation','element')),
  constraint ck_experience_interface_default_object check(jsonb_typeof(default_value)='object'),
  constraint ck_experience_interface_draft_object check(draft_value is null or jsonb_typeof(draft_value)='object'),
  constraint ck_experience_interface_published_object check(published_value is null or jsonb_typeof(published_value)='object')
);

create index if not exists ix_experience_interface_content_lookup
  on experience.interface_content(organization_id,locale,area,page)
  where is_active;

alter table experience.interface_content enable row level security;
revoke all on experience.interface_content from public,anon,authenticated;
grant select,insert,update on experience.interface_content to service_role;

insert into iam.permission_definitions(code,resource_type,action,description)
values('interface.content.manage','interface_content','manage','Manage versioned interface text, visibility and navigation order.')
on conflict(code) do update set
  resource_type=excluded.resource_type,
  action=excluded.action,
  description=excluded.description;

insert into iam.role_permissions(role_id,permission_id)
select distinct rp.role_id,new_permission.id
from iam.role_permissions rp
join iam.permission_definitions source_permission on source_permission.id=rp.permission_id
cross join iam.permission_definitions new_permission
where source_permission.code='journey.definition.manage'
  and new_permission.code='interface.content.manage'
on conflict(role_id,permission_id) do nothing;

with organization as (
  select id from iam.organizations where slug='estimulo' and status='active'
), seed(content_key,area,page,element_name,element_type,description,default_value) as (
  values
  ('shared.skip_to_content','shared','shell','Pular para o conteúdo','text','Link de acessibilidade que leva direto ao conteúdo.',jsonb_build_object('text','Pular para o conteúdo','visible',true)),
  ('shared.sign_out','shared','shell','Sair','text','Texto do botão que encerra a sessão.',jsonb_build_object('text','Sair','visible',true)),
  ('admin.nav.overview','admin','navigation','Visão geral','navigation','Item administrativo para a visão geral.',jsonb_build_object('text','Visão geral','visible',true,'order',10)),
  ('admin.nav.experience','admin','navigation','Interface','navigation','Item administrativo para o CMS da experiência.',jsonb_build_object('text','Interface','visible',true,'order',20)),
  ('admin.nav.journeys','admin','navigation','Jornadas','navigation','Item administrativo para jornadas.',jsonb_build_object('text','Jornadas','visible',true,'order',30)),
  ('admin.nav.diagnostics','admin','navigation','Diagnósticos','navigation','Item administrativo para diagnósticos.',jsonb_build_object('text','Diagnósticos','visible',true,'order',40)),
  ('admin.nav.library','admin','navigation','Biblioteca','navigation','Item administrativo para a biblioteca.',jsonb_build_object('text','Biblioteca','visible',true,'order',50)),
  ('admin.nav.points','admin','navigation','Pontuação','navigation','Item administrativo para pontuação.',jsonb_build_object('text','Pontuação','visible',true,'order',60)),
  ('admin.nav.users','admin','navigation','Usuários','navigation','Item administrativo para usuários.',jsonb_build_object('text','Usuários','visible',true,'order',70)),
  ('admin.nav.announcements','admin','navigation','Anúncios','navigation','Item administrativo para anúncios.',jsonb_build_object('text','Anúncios','visible',true,'order',80)),
  ('admin.nav.operation','admin','navigation','Operação','navigation','Item administrativo para operação.',jsonb_build_object('text','Operação','visible',true,'order',90)),
  ('admin.nav.reports','admin','navigation','Relatórios','navigation','Item administrativo para relatórios.',jsonb_build_object('text','Relatórios','visible',true,'order',100)),
  ('admin.nav.maturity','admin','navigation','Maturidade','navigation','Item administrativo para maturidade.',jsonb_build_object('text','Maturidade','visible',true,'order',110)),
  ('participant.nav.home','participant','navigation','Início','navigation','Item de navegação para a página inicial.',jsonb_build_object('text','Início','visible',true,'order',10)),
  ('participant.nav.journeys','participant','navigation','Jornadas','navigation','Item de navegação para as jornadas.',jsonb_build_object('text','Jornadas','visible',true,'order',20)),
  ('participant.nav.library','participant','navigation','Biblioteca','navigation','Item de navegação para a biblioteca.',jsonb_build_object('text','Biblioteca','visible',true,'order',30)),
  ('participant.nav.submissions','participant','navigation','Entregas','navigation','Item de navegação para as entregas.',jsonb_build_object('text','Entregas','visible',true,'order',40)),
  ('participant.nav.points','participant','navigation','Pontuação','navigation','Item de navegação para pontos.',jsonb_build_object('text','Pontuação','visible',true,'order',50)),
  ('participant.nav.achievements','participant','navigation','Conquistas','navigation','Item de navegação para conquistas.',jsonb_build_object('text','Conquistas','visible',true,'order',60)),
  ('participant.nav.profile','participant','navigation','Perfil','navigation','Item de navegação para o perfil.',jsonb_build_object('text','Perfil','visible',true,'order',70)),
  ('participant.journey.back','participant','journey','Voltar ao início','text','Texto do botão de retorno.',jsonb_build_object('text','Voltar ao início','visible',true)),
  ('participant.journey.eyebrow','participant','journey','Sua jornada','text','Texto curto acima do título da jornada.',jsonb_build_object('text','Sua jornada','visible',true)),
  ('participant.journey.progress_title','participant','journey','Seu progresso','text','Título do resumo de progresso.',jsonb_build_object('text','Seu progresso','visible',true)),
  ('participant.journey.progress_summary','participant','journey','Resumo do progresso','text','Aceita {completed} e {total}.',jsonb_build_object('text','{completed} de {total} atividades concluídas','visible',true)),
  ('participant.journey.tracks_title','participant','journey','Escolha uma trilha','text','Título da lista de trilhas.',jsonb_build_object('text','Escolha uma trilha','visible',true)),
  ('participant.journey.tracks_help','participant','journey','Ajuda das trilhas','text','Explica como abrir uma trilha.',jsonb_build_object('text','Abra uma trilha para ver as atividades.','visible',true)),
  ('participant.journey.optional','participant','journey','Opcional','text','Rótulo de trilha opcional.',jsonb_build_object('text','Opcional','visible',true)),
  ('participant.journey.view_activities','participant','journey','Ver atividades','text','Ação mostrada no resumo da trilha.',jsonb_build_object('text','Ver atividades','visible',true)),
  ('participant.journey.completed','participant','journey','Concluída','text','Estado de uma atividade concluída.',jsonb_build_object('text','Concluída','visible',true)),
  ('participant.journey.available','participant','journey','Disponível','text','Estado de uma atividade disponível.',jsonb_build_object('text','Disponível','visible',true)),
  ('participant.journey.action_review','participant','journey','Rever atividade','text','Botão para rever uma atividade concluída.',jsonb_build_object('text','Rever atividade','visible',true)),
  ('participant.journey.action_start','participant','journey','Começar atividade','text','Botão para iniciar uma atividade.',jsonb_build_object('text','Começar atividade','visible',true)),
  ('participant.journey.action_continue','participant','journey','Continuar atividade','text','Botão para continuar uma atividade.',jsonb_build_object('text','Continuar atividade','visible',true)),
  ('participant.journey.empty_title','participant','journey','Atividades em preparação','text','Título exibido quando não há trilhas publicadas.',jsonb_build_object('text','Atividades em preparação','visible',true)),
  ('participant.journey.empty_body','participant','journey','Mensagem de preparação','text','Mensagem exibida quando não há trilhas publicadas.',jsonb_build_object('text','A equipe ainda está organizando os conteúdos desta jornada.','visible',true))
)
insert into experience.interface_content(
  organization_id,content_key,locale,area,page,element_name,element_type,description,
  default_value,published_value,is_active
)
select organization.id,seed.content_key,'pt-BR',seed.area,seed.page,seed.element_name,
       seed.element_type,seed.description,seed.default_value,seed.default_value,true
from organization cross join seed
on conflict(organization_id,content_key,locale) do update set
  area=excluded.area,
  page=excluded.page,
  element_name=excluded.element_name,
  element_type=excluded.element_type,
  description=excluded.description,
  default_value=excluded.default_value,
  published_value=coalesce(experience.interface_content.published_value,excluded.published_value),
  is_active=true,
  updated_at=now();

do $migration$
declare
  v_event_name text;
  v_schema jsonb;
begin
  foreach v_event_name in array array[
    'experience.interface_content.saved',
    'experience.interface_content.published'
  ] loop
    v_schema:=jsonb_build_object(
      '$schema','https://json-schema.org/draft/2020-12/schema',
      'title',v_event_name,
      'type','object',
      'additionalProperties',true
    );
    insert into eventing.event_schemas(
      id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
    ) values(
      gen_random_uuid(),v_event_name,1,
      'urn:estimulo:event:'||v_event_name||':1',v_schema,
      app_private.e14_request_hash(v_schema),'published',now()
    ) on conflict(event_name,event_version) do nothing;
  end loop;
end;
$migration$;

create or replace function public.get_published_interface_content(
  p_organization_slug text,
  p_locale text
)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
  select coalesce(jsonb_object_agg(
    entry.content_key,
    entry.default_value||coalesce(entry.published_value,'{}'::jsonb)
    order by entry.content_key
  ),'{}'::jsonb)
  from experience.interface_content entry
  join iam.organizations organization on organization.id=entry.organization_id
  where organization.slug=lower(btrim(p_organization_slug))
    and organization.status='active'
    and entry.locale=coalesce(nullif(btrim(p_locale),''),'pt-BR')
    and entry.is_active;
$function$;

revoke all on function public.get_published_interface_content(text,text) from public;
grant execute on function public.get_published_interface_content(text,text) to anon,authenticated,service_role;

create or replace function public.get_admin_interface_content(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_locale text
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'interface.content.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  return jsonb_build_object(
    'organization_id',p_organization_id,
    'locale',coalesce(nullif(btrim(p_locale),''),'pt-BR'),
    'entries',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',entry.id,'content_key',entry.content_key,'area',entry.area,'page',entry.page,
        'element_name',entry.element_name,'element_type',entry.element_type,
        'description',entry.description,'default_value',entry.default_value,
        'draft_value',entry.draft_value,'published_value',entry.published_value,
        'has_pending_changes',entry.draft_value is not null,
        'updated_at',entry.updated_at,'published_at',entry.published_at
      ) order by entry.area,entry.page,entry.content_key)
      from experience.interface_content entry
      where entry.organization_id=p_organization_id
        and entry.locale=coalesce(nullif(btrim(p_locale),''),'pt-BR')
        and entry.is_active
    ),'[]'::jsonb)
  );
end;
$function$;

revoke all on function public.get_admin_interface_content(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.get_admin_interface_content(uuid,uuid,text) to service_role;

create or replace function public.save_admin_interface_content(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_entries jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'entries',p_entries));
  v_event_id uuid:=app_private.e14_command_event_id('save_admin_interface_content',p_actor_user_account_id,p_organization_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_entry jsonb;
  v_value jsonb;
  v_count integer:=0;
  v_aggregate_version bigint;
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'interface.content.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries)=0 or jsonb_array_length(p_entries)>500 then
    raise exception 'INTERFACE_ENTRIES_INVALID' using errcode='22023';
  end if;
  if exists(
    select 1 from jsonb_array_elements(p_entries) item
    group by btrim(item->>'content_key'),coalesce(nullif(btrim(item->>'locale'),''),'pt-BR')
    having count(*)>1
  ) then
    raise exception 'INTERFACE_ENTRIES_DUPLICATED' using errcode='22023';
  end if;
  select payload->>'request_hash',payload->'result'
    into v_existing_hash,v_existing_result
  from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505';
    end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;
  for v_entry in select value from jsonb_array_elements(p_entries) loop
    v_value:=v_entry->'value';
    if jsonb_typeof(v_value)<>'object'
       or (v_value?'text' and (jsonb_typeof(v_value->'text')<>'string' or length(v_value->>'text')>2000))
       or (v_value?'visible' and jsonb_typeof(v_value->'visible')<>'boolean')
       or (v_value?'order' and (jsonb_typeof(v_value->'order')<>'number' or (v_value->>'order')::numeric<0 or (v_value->>'order')::numeric>10000)) then
      raise exception 'INTERFACE_VALUE_INVALID' using errcode='22023';
    end if;
    update experience.interface_content
      set draft_value=v_value,updated_by=p_actor_user_account_id,updated_at=now()
    where organization_id=p_organization_id
      and content_key=btrim(v_entry->>'content_key')
      and locale=coalesce(nullif(btrim(v_entry->>'locale'),''),'pt-BR')
      and is_active;
    if not found then
      raise exception 'INTERFACE_CONTENT_NOT_FOUND:%',v_entry->>'content_key' using errcode='P0002';
    end if;
    v_count:=v_count+1;
  end loop;
  v_result:=jsonb_build_object('saved_count',v_count,'organization_id',p_organization_id);
  perform app_private.e14_lock_scope('interface-content|'||p_organization_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events where aggregate_type='interface_content' and aggregate_id=p_organization_id;
  perform app_private.e14_append_event(
    v_event_id,'experience.interface_content.saved','organization',p_organization_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'interface_content',p_organization_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.save_admin_interface_content(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_admin_interface_content(uuid,uuid,jsonb,text) to service_role;

create or replace function public.publish_admin_interface_content(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_content_keys text[],
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'content_keys',p_content_keys));
  v_event_id uuid:=app_private.e14_command_event_id('publish_admin_interface_content',p_actor_user_account_id,p_organization_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_count integer:=0;
  v_aggregate_version bigint;
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'interface.content.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if p_content_keys is not null and (cardinality(p_content_keys)=0 or cardinality(p_content_keys)>500) then
    raise exception 'INTERFACE_CONTENT_KEYS_INVALID' using errcode='22023';
  end if;
  select payload->>'request_hash',payload->'result'
    into v_existing_hash,v_existing_result
  from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505';
    end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;
  update experience.interface_content
    set published_value=draft_value,draft_value=null,published_by=p_actor_user_account_id,
        published_at=now(),updated_at=now()
  where organization_id=p_organization_id
    and draft_value is not null
    and (p_content_keys is null or content_key=any(p_content_keys));
  get diagnostics v_count=row_count;
  v_result:=jsonb_build_object('published_count',v_count,'organization_id',p_organization_id);
  perform app_private.e14_lock_scope('interface-content|'||p_organization_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events where aggregate_type='interface_content' and aggregate_id=p_organization_id;
  perform app_private.e14_append_event(
    v_event_id,'experience.interface_content.published','organization',p_organization_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'interface_content',p_organization_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.publish_admin_interface_content(uuid,uuid,text[],text) from public,anon,authenticated;
grant execute on function public.publish_admin_interface_content(uuid,uuid,text[],text) to service_role;

do $verification$
begin
  if not exists(select 1 from iam.permission_definitions where code='interface.content.manage') then
    raise exception 'INTERFACE_PERMISSION_NOT_VERSIONED';
  end if;
  if not exists(select 1 from experience.interface_content where content_key='shared.skip_to_content') then
    raise exception 'INTERFACE_CONTENT_SEED_MISSING';
  end if;
  if has_table_privilege('anon','experience.interface_content','SELECT')
     or has_table_privilege('authenticated','experience.interface_content','SELECT') then
    raise exception 'INTERFACE_TABLE_EXPOSED';
  end if;
end;
$verification$;
