begin;

-- Every active platform account must be visible to administrators, even before an
-- organization membership has been reconciled. Role mutations remain limited to
-- rows with a real membership id.
create or replace function public.list_organization_role_management(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
  v_memberships jsonb;
  v_roles jsonb;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,p_organization_id,'iam.memberships.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'membership_id',directory.membership_id,
    'user_account_id',directory.user_account_id,
    'email',directory.email_normalized,
    'account_status',directory.account_status,
    'membership_status',coalesce(directory.membership_status,'unlinked'),
    'valid_from',directory.valid_from,
    'valid_until',directory.valid_until,
    'roles',coalesce((
      select jsonb_agg(jsonb_build_object(
        'role_id',role_definition.id,
        'role_code',role_definition.code,
        'role_name',role_definition.name,
        'scope',membership_role.scope,
        'valid_from',membership_role.valid_from,
        'valid_until',membership_role.valid_until,
        'active',membership_role.valid_from<=now() and (membership_role.valid_until is null or membership_role.valid_until>now())
      ) order by role_definition.name,membership_role.valid_from desc)
      from iam.membership_roles membership_role
      join iam.role_definitions role_definition on role_definition.id=membership_role.role_id
      where membership_role.membership_id=directory.membership_id
    ),'[]'::jsonb)
  ) order by directory.email_normalized),'[]'::jsonb)
  into v_memberships
  from (
    select
      account.id user_account_id,
      account.email_normalized,
      account.status account_status,
      membership.id membership_id,
      membership.status membership_status,
      membership.valid_from,
      membership.valid_until
    from iam.user_accounts account
    left join lateral (
      select candidate.*
      from iam.organization_memberships candidate
      where candidate.organization_id=p_organization_id
        and candidate.user_account_id=account.id
      order by
        (candidate.status='active' and candidate.valid_from<=now() and (candidate.valid_until is null or candidate.valid_until>now())) desc,
        candidate.valid_from desc,
        candidate.created_at desc,
        candidate.id
      limit 1
    ) membership on true
    where account.status='active'
      and (
        membership.id is not null
        or exists (
          select 1
          from core.entrepreneurs entrepreneur
          where entrepreneur.user_account_id=account.id
            and entrepreneur.status='active'
            and (
              exists (select 1 from iam.organizations organization where organization.id=p_organization_id and organization.slug='estimulo')
              or exists (
                select 1
                from orchestration.enrollments enrollment
                join catalog.journey_versions journey_version on journey_version.id=enrollment.journey_version_id
                join catalog.journey_definitions journey_definition on journey_definition.id=journey_version.journey_definition_id
                where enrollment.entrepreneur_id=entrepreneur.id
                  and journey_definition.owner_organization_id=p_organization_id
              )
            )
        )
      )
  ) directory;

  select coalesce(jsonb_agg(jsonb_build_object(
    'role_id',role_definition.id,
    'code',role_definition.code,
    'name',role_definition.name,
    'description',role_definition.description,
    'status',role_definition.status,
    'permissions',coalesce((
      select jsonb_agg(permission_definition.code order by permission_definition.code)
      from iam.role_permissions role_permission
      join iam.permission_definitions permission_definition on permission_definition.id=role_permission.permission_id
      where role_permission.role_id=role_definition.id
    ),'[]'::jsonb)
  ) order by role_definition.name),'[]'::jsonb)
  into v_roles
  from iam.role_definitions role_definition
  where role_definition.organization_id=p_organization_id;

  return jsonb_build_object(
    'organization_id',p_organization_id,
    'memberships',v_memberships,
    'roles',v_roles
  );
end;
$function$;

-- Complete the editable page-header registry and give every header a responsive
-- media specification. A compact layout is the safe default when no artwork is set.
with pages(area,page,route_pattern,prefix,eyebrow,title,description) as (
  values
    ('admin','overview','/admin','admin.page.overview.header','Estímulo','Visão geral','Veja primeiro o que exige atenção e acesse as áreas mais usadas.'),
    ('admin','b2b','/admin/b2b','admin.page.b2b.header','Conteúdo exclusivo','B2B','Crie uma página, escolha quem pode acessar e publique.'),
    ('admin','biblioteca','/admin/biblioteca','admin.page.biblioteca.header','Conteúdo','Biblioteca','Cadastre um material e reutilize-o em diferentes aulas.'),
    ('admin','biblioteca_entregas','/admin/biblioteca/entregas','admin.page.biblioteca.entregas.header','Biblioteca','Atividades com entrega','Configure o que será enviado, os formatos aceitos e os critérios de correção.'),
    ('admin','campanhas','/admin/campanhas','admin.page.campanhas.header','Divulgação','Campanhas e UTM','Crie um link, escolha o destino e acompanhe os acessos.'),
    ('admin','comportamento','/admin/comportamento','admin.page.comportamento.header','Análise','Comportamento','Defina como as interações se transformam em score.'),
    ('admin','configuracoes','/admin/configuracoes','admin.page.configuracoes.header','Ajustes gerais','Mais configurações','Atualize contatos, documentos legais e temas da plataforma.'),
    ('admin','diagnostico','/admin/diagnostico','admin.page.diagnostico.header','Personalização','Diagnósticos','Configure o diagnóstico principal e os diagnósticos opcionais.'),
    ('admin','engajamento','/admin/engajamento','admin.page.engajamento.header','Comunicação','Anúncios','Gerencie o carrossel da página inicial.'),
    ('admin','experiencia','/admin/experiencia','admin.page.experiencia.header','Experiência','Interface da plataforma','Configure, visualize e publique a interface sem alterar código.'),
    ('admin','gamificacao','/admin/gamificacao','admin.page.gamificacao.header','Reconhecimento','Pontos, selos e certificados','Configure como a plataforma reconhece o progresso.'),
    ('admin','operacao','/admin/operacao','admin.page.operacao.header','Operação','Acompanhamento','Consulte o que está acontecendo e intervenha quando necessário.'),
    ('admin','produto','/admin/produto','admin.page.produto.header','Jornadas','Jornadas e aulas','Crie, organize e publique a experiência de aprendizagem.'),
    ('admin','recompensas','/admin/recompensas','admin.page.recompensas.header','Engajamento','Recompensas','Crie benefícios e acompanhe cada pedido de resgate.'),
    ('admin','relatorios','/admin/relatorios','admin.page.relatorios.header','Resultados','Relatórios','Acompanhe os indicadores principais e abra detalhes quando necessário.'),
    ('admin','usuarios','/admin/usuarios','admin.page.usuarios.header','Equipe','Usuários e acessos','Consulte contas, vínculos, papéis e validade.'),
    ('participant','overview','/empreendedor','participant.page.overview.header','Olá!','Vamos fazer seu negócio crescer?','Escolha um conteúdo, aprenda no seu ritmo e coloque em prática.'),
    ('participant','b2b','/empreendedor/b2b','participant.page.b2b.header','Conteúdo exclusivo','B2B','Páginas e materiais liberados especificamente para a sua conta.'),
    ('participant','biblioteca','/empreendedor/biblioteca','participant.page.biblioteca.header','Conteúdo complementar','Biblioteca','Encontre materiais por assunto, formato ou momento de aprendizagem.'),
    ('participant','conquistas','/empreendedor/conquistas','participant.page.conquistas.header','Seu reconhecimento','Conquistas e certificados','Veja os selos e certificados que você conquistou.'),
    ('participant','diagnostico','/empreendedor/diagnostico','participant.page.diagnostico.header','Perfil empreendedor','Diagnóstico','Responda às perguntas e acompanhe seu resultado.'),
    ('participant','jornadas','/empreendedor/jornadas','participant.page.jornadas.header','Capacitação','Jornadas para aprender, aplicar e evoluir','Escolha uma jornada e avance no seu ritmo.'),
    ('participant','perfil','/empreendedor/perfil','participant.page.perfil.header','Minha conta','Perfil','Consulte seu diagnóstico, atualize suas informações e acompanhe suas entregas.'),
    ('participant','resultado','/empreendedor/resultado','participant.page.resultado.header','Resultado da jornada','Resultado','Acompanhe o que foi registrado durante sua experiência de aprendizagem.'),
    ('public','ajuda','/ajuda','public.page.ajuda.header','Suporte','Como podemos ajudar?','Encontre o próximo passo para os problemas mais comuns.'),
    ('public','biblioteca','/capacitacao/biblioteca','public.page.capacitacao.biblioteca.header','Conteúdo','Biblioteca de capacitação','Explore os materiais públicos disponíveis.'),
    ('public','privacidade','/privacidade','public.page.privacidade.header','Transparência','Política de privacidade','Entenda como seus dados são tratados.'),
    ('public','termos','/termos','public.page.termos.header','Transparência','Termos de uso','Consulte as regras de uso da plataforma.')
), fields(suffix,element_name,element_type,description_key) as (
  values
    ('eyebrow','Texto superior','text','Texto curto acima do título.'),
    ('title','Título da página','text','Título principal exibido nesta página.'),
    ('description','Descrição da página','textarea','Texto explicativo exibido abaixo do título.')
), expanded as (
  select
    pages.area,pages.page,pages.route_pattern,pages.prefix||'.'||fields.suffix content_key,
    fields.element_name,fields.element_type,fields.description_key,
    case fields.suffix when 'eyebrow' then pages.eyebrow when 'title' then pages.title else pages.description end text_value
  from pages cross join fields
)
insert into experience.interface_content(
  organization_id,content_key,locale,area,page,element_name,element_type,description,
  route_pattern,placement,group_name,editor_schema,can_delete,default_value,published_value,is_active,created_at,updated_at
)
select
  organization.id,expanded.content_key,'pt-BR',expanded.area,expanded.page,expanded.element_name,
  expanded.element_type,expanded.description_key,expanded.route_pattern,'header','Cabeçalho da página','{}'::jsonb,
  false,jsonb_build_object('text',expanded.text_value,'visible',true,'order',1),
  jsonb_build_object('text',expanded.text_value,'visible',true,'order',1),true,now(),now()
from expanded
join iam.organizations organization on organization.slug='estimulo'
on conflict(organization_id,content_key,locale) do update set
  area=excluded.area,page=excluded.page,element_name=excluded.element_name,element_type=excluded.element_type,
  description=excluded.description,route_pattern=excluded.route_pattern,placement=excluded.placement,
  group_name=excluded.group_name,editor_schema=excluded.editor_schema,can_delete=false,
  default_value=excluded.default_value,is_active=true,updated_at=now();

with pages(area,page,route_pattern,prefix) as (
  values
    ('admin','overview','/admin','admin.page.overview.header'),
    ('admin','b2b','/admin/b2b','admin.page.b2b.header'),
    ('admin','biblioteca','/admin/biblioteca','admin.page.biblioteca.header'),
    ('admin','biblioteca_entregas','/admin/biblioteca/entregas','admin.page.biblioteca.entregas.header'),
    ('admin','campanhas','/admin/campanhas','admin.page.campanhas.header'),
    ('admin','comportamento','/admin/comportamento','admin.page.comportamento.header'),
    ('admin','configuracoes','/admin/configuracoes','admin.page.configuracoes.header'),
    ('admin','diagnostico','/admin/diagnostico','admin.page.diagnostico.header'),
    ('admin','engajamento','/admin/engajamento','admin.page.engajamento.header'),
    ('admin','experiencia','/admin/experiencia','admin.page.experiencia.header'),
    ('admin','gamificacao','/admin/gamificacao','admin.page.gamificacao.header'),
    ('admin','operacao','/admin/operacao','admin.page.operacao.header'),
    ('admin','produto','/admin/produto','admin.page.produto.header'),
    ('admin','recompensas','/admin/recompensas','admin.page.recompensas.header'),
    ('admin','relatorios','/admin/relatorios','admin.page.relatorios.header'),
    ('admin','usuarios','/admin/usuarios','admin.page.usuarios.header'),
    ('participant','overview','/empreendedor','participant.page.overview.header'),
    ('participant','b2b','/empreendedor/b2b','participant.page.b2b.header'),
    ('participant','biblioteca','/empreendedor/biblioteca','participant.page.biblioteca.header'),
    ('participant','conquistas','/empreendedor/conquistas','participant.page.conquistas.header'),
    ('participant','diagnostico','/empreendedor/diagnostico','participant.page.diagnostico.header'),
    ('participant','jornadas','/empreendedor/jornadas','participant.page.jornadas.header'),
    ('participant','perfil','/empreendedor/perfil','participant.page.perfil.header'),
    ('participant','resultado','/empreendedor/resultado','participant.page.resultado.header'),
    ('public','ajuda','/ajuda','public.page.ajuda.header'),
    ('public','biblioteca','/capacitacao/biblioteca','public.page.capacitacao.biblioteca.header'),
    ('public','privacidade','/privacidade','public.page.privacidade.header'),
    ('public','termos','/termos','public.page.termos.header')
)
insert into experience.interface_content(
  organization_id,content_key,locale,area,page,element_name,element_type,description,
  route_pattern,placement,group_name,editor_schema,can_delete,default_value,published_value,is_active,created_at,updated_at
)
select
  organization.id,pages.prefix||'.media','pt-BR',pages.area,pages.page,'Imagem e densidade do cabeçalho','image',
  'Arte responsiva e densidade vertical do cabeçalho.',pages.route_pattern,'header','Cabeçalho da página',
  jsonb_build_object(
    'responsive_media',true,'desktop_dimensions','1920 × 640 px','desktop_aspect_ratio','3:1','desktop_min_width',1200,
    'mobile_dimensions','800 × 600 px','mobile_aspect_ratio','4:3','mobile_min_width',640,'max_size_mb',4
  ),false,
  jsonb_build_object(
    'visible',false,'image_url','','mobile_image_url','','alt','','image_position','center',
    'overlay_opacity',0.48,'layout_variant','compact','order',0
  ),
  jsonb_build_object(
    'visible',false,'image_url','','mobile_image_url','','alt','','image_position','center',
    'overlay_opacity',0.48,'layout_variant','compact','order',0
  ),true,now(),now()
from pages
join iam.organizations organization on organization.slug='estimulo'
on conflict(organization_id,content_key,locale) do update set
  area=excluded.area,page=excluded.page,element_name=excluded.element_name,element_type=excluded.element_type,
  description=excluded.description,route_pattern=excluded.route_pattern,placement=excluded.placement,
  group_name=excluded.group_name,editor_schema=excluded.editor_schema,can_delete=false,
  default_value=excluded.default_value,is_active=true,updated_at=now();

revoke all on function public.list_organization_role_management(uuid,uuid) from public,anon,authenticated;
grant execute on function public.list_organization_role_management(uuid,uuid) to postgres,service_role,app_worker;

commit;
