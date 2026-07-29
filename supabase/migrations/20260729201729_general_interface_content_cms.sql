create schema if not exists experience;

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
  constraint ck_experience_interface_content_area check(area=any(array['shared','public','participant','admin'])),
  constraint ck_experience_interface_content_type check(element_type=any(array['text','navigation','element'])),
  constraint ck_experience_interface_default_object check(jsonb_typeof(default_value)='object'),
  constraint ck_experience_interface_draft_object check(draft_value is null or jsonb_typeof(draft_value)='object'),
  constraint ck_experience_interface_published_object check(published_value is null or jsonb_typeof(published_value)='object')
);

alter table experience.interface_content enable row level security;
revoke all on experience.interface_content from public,anon,authenticated;
grant select,insert,update on experience.interface_content to service_role;
create index if not exists ix_experience_interface_content_workspace on experience.interface_content(organization_id,locale,area,page) where is_active;

with seed(content_key,area,page,element_name,element_type,description,default_value) as (
  values
  ('shared.sign_out','shared','shell','Sair','text','Texto do botão que encerra a sessão.','{"text":"Sair","visible":true}'::jsonb),
  ('shared.skip_to_content','shared','shell','Pular para o conteúdo','text','Link de acessibilidade que leva direto ao conteúdo.','{"text":"Pular para o conteúdo","visible":true}'::jsonb),
  ('admin.nav.overview','admin','navigation','Visão geral','navigation','Item administrativo para a visão geral.','{"text":"Visão geral","order":10,"visible":true}'::jsonb),
  ('admin.nav.experience','admin','navigation','Interface','navigation','Item administrativo para o CMS da experiência.','{"text":"Interface","order":20,"visible":true}'::jsonb),
  ('admin.nav.journeys','admin','navigation','Jornadas','navigation','Item administrativo para jornadas.','{"text":"Jornadas","order":30,"visible":true}'::jsonb),
  ('admin.nav.diagnostics','admin','navigation','Diagnósticos','navigation','Item administrativo para diagnósticos.','{"text":"Diagnósticos","order":40,"visible":true}'::jsonb),
  ('admin.nav.library','admin','navigation','Biblioteca','navigation','Item administrativo para a biblioteca.','{"text":"Biblioteca","order":50,"visible":true}'::jsonb),
  ('admin.nav.points','admin','navigation','Pontuação','navigation','Item administrativo para pontuação.','{"text":"Pontuação","order":60,"visible":true}'::jsonb),
  ('admin.nav.users','admin','navigation','Usuários','navigation','Item administrativo para usuários.','{"text":"Usuários","order":70,"visible":true}'::jsonb),
  ('admin.nav.announcements','admin','navigation','Anúncios','navigation','Item administrativo para anúncios.','{"text":"Anúncios","order":80,"visible":true}'::jsonb),
  ('admin.nav.operation','admin','navigation','Operação','navigation','Item administrativo para operação.','{"text":"Operação","order":90,"visible":true}'::jsonb),
  ('admin.nav.reports','admin','navigation','Relatórios','navigation','Item administrativo para relatórios.','{"text":"Relatórios","order":100,"visible":true}'::jsonb),
  ('admin.nav.maturity','admin','navigation','Maturidade','navigation','Item administrativo para maturidade.','{"text":"Maturidade","order":110,"visible":true}'::jsonb),
  ('participant.nav.home','participant','navigation','Início','navigation','Item de navegação para a página inicial.','{"text":"Início","order":10,"visible":true}'::jsonb),
  ('participant.nav.journeys','participant','navigation','Jornadas','navigation','Item de navegação para as jornadas.','{"text":"Jornadas","order":20,"visible":true}'::jsonb),
  ('participant.nav.library','participant','navigation','Biblioteca','navigation','Item de navegação para a biblioteca.','{"text":"Biblioteca","order":30,"visible":true}'::jsonb),
  ('participant.nav.submissions','participant','navigation','Entregas','navigation','Item de navegação para as entregas.','{"text":"Entregas","order":40,"visible":true}'::jsonb),
  ('participant.nav.points','participant','navigation','Pontuação','navigation','Item de navegação para pontos.','{"text":"Pontuação","order":50,"visible":true}'::jsonb),
  ('participant.nav.achievements','participant','navigation','Conquistas','navigation','Item de navegação para conquistas.','{"text":"Conquistas","order":60,"visible":true}'::jsonb),
  ('participant.nav.profile','participant','navigation','Perfil','navigation','Item de navegação para o perfil.','{"text":"Perfil","order":70,"visible":true}'::jsonb),
  ('participant.journey.back','participant','journey','Voltar ao início','text','Texto do botão de retorno.','{"text":"Voltar ao início","visible":true}'::jsonb),
  ('participant.journey.eyebrow','participant','journey','Sua jornada','text','Texto curto acima do título da jornada.','{"text":"Sua jornada","visible":true}'::jsonb),
  ('participant.journey.progress_title','participant','journey','Seu progresso','text','Título do resumo de progresso.','{"text":"Seu progresso","visible":true}'::jsonb),
  ('participant.journey.progress_summary','participant','journey','Resumo do progresso','text','Aceita {completed} e {total}.','{"text":"{completed} de {total} atividades concluídas","visible":true}'::jsonb),
  ('participant.journey.tracks_title','participant','journey','Escolha uma trilha','text','Título da lista de trilhas.','{"text":"Escolha uma trilha","visible":true}'::jsonb),
  ('participant.journey.tracks_help','participant','journey','Ajuda das trilhas','text','Explica como abrir uma trilha.','{"text":"Abra uma trilha para ver as atividades.","visible":true}'::jsonb),
  ('participant.journey.optional','participant','journey','Opcional','text','Rótulo de trilha opcional.','{"text":"Opcional","visible":true}'::jsonb),
  ('participant.journey.view_activities','participant','journey','Ver atividades','text','Ação mostrada no resumo da trilha.','{"text":"Ver atividades","visible":true}'::jsonb),
  ('participant.journey.completed','participant','journey','Concluída','text','Estado de uma atividade concluída.','{"text":"Concluída","visible":true}'::jsonb),
  ('participant.journey.available','participant','journey','Disponível','text','Estado de uma atividade disponível.','{"text":"Disponível","visible":true}'::jsonb),
  ('participant.journey.action_start','participant','journey','Começar atividade','text','Botão para iniciar uma atividade.','{"text":"Começar atividade","visible":true}'::jsonb),
  ('participant.journey.action_continue','participant','journey','Continuar atividade','text','Botão para continuar uma atividade.','{"text":"Continuar atividade","visible":true}'::jsonb),
  ('participant.journey.action_review','participant','journey','Rever atividade','text','Botão para rever uma atividade concluída.','{"text":"Rever atividade","visible":true}'::jsonb),
  ('participant.journey.empty_title','participant','journey','Atividades em preparação','text','Título exibido quando não há trilhas publicadas.','{"text":"Atividades em preparação","visible":true}'::jsonb),
  ('participant.journey.empty_body','participant','journey','Mensagem de preparação','text','Mensagem exibida quando não há trilhas publicadas.','{"text":"A equipe ainda está organizando os conteúdos desta jornada.","visible":true}'::jsonb)
)
insert into experience.interface_content(organization_id,content_key,locale,area,page,element_name,element_type,description,default_value,published_value)
select organization.id,seed.content_key,'pt-BR',seed.area,seed.page,seed.element_name,seed.element_type,seed.description,seed.default_value,seed.default_value
from seed join iam.organizations organization on organization.slug='estimulo'
on conflict(organization_id,content_key,locale) do nothing;

create or replace function public.get_admin_interface_content(p_actor_user_account_id uuid,p_organization_id uuid,p_locale text)
returns jsonb language plpgsql stable security definer set search_path to 'pg_catalog' as $function$
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return jsonb_build_object('organization_id',p_organization_id,'locale',coalesce(nullif(btrim(p_locale),''),'pt-BR'),'entries',coalesce((select jsonb_agg(jsonb_build_object('id',entry.id,'content_key',entry.content_key,'area',entry.area,'page',entry.page,'element_name',entry.element_name,'element_type',entry.element_type,'description',entry.description,'default_value',entry.default_value,'draft_value',entry.draft_value,'published_value',entry.published_value,'has_pending_changes',entry.draft_value is not null,'updated_at',entry.updated_at,'published_at',entry.published_at) order by entry.area,entry.page,entry.content_key) from experience.interface_content entry where entry.organization_id=p_organization_id and entry.locale=coalesce(nullif(btrim(p_locale),''),'pt-BR') and entry.is_active),'[]'::jsonb));
end;$function$;

create or replace function public.get_published_interface_content(p_organization_slug text,p_locale text)
returns jsonb language sql stable security definer set search_path to 'pg_catalog' as $function$
  select coalesce(jsonb_object_agg(entry.content_key,entry.default_value||coalesce(entry.published_value,'{}'::jsonb) order by entry.content_key),'{}'::jsonb)
  from experience.interface_content entry join iam.organizations organization on organization.id=entry.organization_id
  where organization.slug=lower(btrim(p_organization_slug)) and organization.status='active' and entry.locale=coalesce(nullif(btrim(p_locale),''),'pt-BR') and entry.is_active;
$function$;

create or replace function public.save_admin_interface_content(p_actor_user_account_id uuid,p_organization_id uuid,p_entries jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);v_request_hash text:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'entries',p_entries));v_event_id uuid:=app_private.e14_command_event_id('save_admin_interface_content',p_actor_user_account_id,p_organization_id,v_key);v_existing_hash text;v_existing_result jsonb;v_entry jsonb;v_count integer:=0;v_aggregate_version bigint;v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if jsonb_typeof(p_entries)<>'array' then raise exception 'INTERFACE_ENTRIES_INVALID' using errcode='22023'; end if;
  select payload->>'request_hash',payload->'result' into v_existing_hash,v_existing_result from eventing.events where event_id=v_event_id;
  if found then if v_existing_hash is distinct from v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);end if;
  for v_entry in select value from jsonb_array_elements(p_entries) loop
    if jsonb_typeof(v_entry->'value')<>'object' then raise exception 'INTERFACE_VALUE_INVALID' using errcode='22023'; end if;
    update experience.interface_content set draft_value=v_entry->'value',updated_by=p_actor_user_account_id,updated_at=now() where organization_id=p_organization_id and content_key=btrim(v_entry->>'content_key') and locale=coalesce(nullif(btrim(v_entry->>'locale'),''),'pt-BR') and is_active;
    if not found then raise exception 'INTERFACE_CONTENT_NOT_FOUND:%',v_entry->>'content_key' using errcode='P0002'; end if;v_count:=v_count+1;
  end loop;
  v_result:=jsonb_build_object('saved_count',v_count,'organization_id',p_organization_id);perform app_private.e14_lock_scope('interface-content|'||p_organization_id::text);select coalesce(max(aggregate_version),0)+1 into v_aggregate_version from eventing.events where aggregate_type='interface_content' and aggregate_id=p_organization_id;perform app_private.e14_append_event(v_event_id,'experience.interface_content.saved','organization',p_organization_id,'user_account',p_actor_user_account_id,p_organization_id,null,'interface_content',p_organization_id,v_aggregate_version,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result));return v_result||jsonb_build_object('replayed',false);
end;$function$;

create or replace function public.publish_admin_interface_content(p_actor_user_account_id uuid,p_organization_id uuid,p_content_keys text[],p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog' as $function$
declare v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);v_request_hash text:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'content_keys',p_content_keys));v_event_id uuid:=app_private.e14_command_event_id('publish_admin_interface_content',p_actor_user_account_id,p_organization_id,v_key);v_existing_hash text;v_existing_result jsonb;v_count integer:=0;v_aggregate_version bigint;v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select payload->>'request_hash',payload->'result' into v_existing_hash,v_existing_result from eventing.events where event_id=v_event_id;
  if found then if v_existing_hash is distinct from v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);end if;
  update experience.interface_content set published_value=draft_value,draft_value=null,published_by=p_actor_user_account_id,published_at=now(),updated_at=now() where organization_id=p_organization_id and draft_value is not null and (p_content_keys is null or content_key=any(p_content_keys));get diagnostics v_count=row_count;
  v_result:=jsonb_build_object('published_count',v_count,'organization_id',p_organization_id);perform app_private.e14_lock_scope('interface-content|'||p_organization_id::text);select coalesce(max(aggregate_version),0)+1 into v_aggregate_version from eventing.events where aggregate_type='interface_content' and aggregate_id=p_organization_id;perform app_private.e14_append_event(v_event_id,'experience.interface_content.published','organization',p_organization_id,'user_account',p_actor_user_account_id,p_organization_id,null,'interface_content',p_organization_id,v_aggregate_version,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'result',v_result));return v_result||jsonb_build_object('replayed',false);
end;$function$;

with names(event_name) as (values('experience.interface_content.saved'::text),('experience.interface_content.published'::text)),docs as (select event_name,jsonb_build_object('$schema','https://json-schema.org/draft/2020-12/schema','title',event_name,'type','object','additionalProperties',true) schema_document from names)
insert into eventing.event_schemas(id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at)
select gen_random_uuid(),event_name,1,'urn:estimulo:event:'||event_name||':1',schema_document,app_private.e14_request_hash(schema_document),'published',now() from docs on conflict(event_name,event_version) do nothing;

revoke all on function public.get_admin_interface_content(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.save_admin_interface_content(uuid,uuid,jsonb,text) from public,anon,authenticated;
revoke all on function public.publish_admin_interface_content(uuid,uuid,text[],text) from public,anon,authenticated;
grant execute on function public.get_admin_interface_content(uuid,uuid,text) to service_role;
grant execute on function public.save_admin_interface_content(uuid,uuid,jsonb,text) to service_role;
grant execute on function public.publish_admin_interface_content(uuid,uuid,text[],text) to service_role;
grant execute on function public.get_published_interface_content(text,text) to anon,authenticated,service_role;
