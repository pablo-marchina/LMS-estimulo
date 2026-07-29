with pages(area,page,route_pattern,prefix,eyebrow,title,description) as (
  values
  ('admin','overview','/admin','admin.page.overview.header','Administração','Visão geral','Acompanhe os principais números e acesse rapidamente as áreas de gestão.'),
  ('admin','experiencia','/admin/experiencia','admin.page.experiencia.header','Experiência','Interface e textos','Edite menus, títulos, botões, imagens e blocos de conteúdo sem alterar o código.'),
  ('admin','produto','/admin/produto','admin.page.produto.header','Jornadas','Jornadas e aulas','Crie, organize e publique a experiência de aprendizagem.'),
  ('admin','biblioteca','/admin/biblioteca','admin.page.biblioteca.header','Conteúdo','Biblioteca','Organize os materiais reutilizáveis usados nas jornadas.'),
  ('admin','usuarios','/admin/usuarios','admin.page.usuarios.header','Acesso','Usuários','Consulte participantes e permissões administrativas.'),
  ('admin','operacao','/admin/operacao','admin.page.operacao.header','Operação','Operação','Acompanhe tarefas e situações que exigem atenção.'),
  ('admin','relatorios','/admin/relatorios','admin.page.relatorios.header','Dados','Relatórios','Acompanhe participação, progresso e conclusão.'),
  ('admin','diagnostico','/admin/diagnostico','admin.page.diagnostico.header','Configuração','Diagnósticos','Gerencie perguntas e resultados dos diagnósticos.'),
  ('admin','gamificacao','/admin/gamificacao','admin.page.gamificacao.header','Engajamento','Pontuação','Configure regras e acompanhe o uso de pontos.'),
  ('admin','engajamento','/admin/engajamento','admin.page.engajamento.header','Comunicação','Anúncios','Publique mensagens para os participantes.'),
  ('admin','maturidade','/admin/maturidade','admin.page.maturidade.header','Negócios','Maturidade','Acompanhe a evolução dos negócios participantes.'),
  ('participant','overview','/empreendedor','participant.page.overview.header','Estímulo','Olá!','Continue sua jornada e acompanhe seu progresso.'),
  ('participant','jornadas','/empreendedor/jornadas','participant.page.jornadas.header','Aprendizado','Jornadas','Escolha uma jornada para continuar aprendendo.'),
  ('participant','biblioteca','/empreendedor/biblioteca','participant.page.biblioteca.header','Conteúdo','Biblioteca','Encontre materiais para apoiar o seu negócio.'),
  ('participant','entregas','/empreendedor/entregas','participant.page.entregas.header','Atividades','Entregas','Acompanhe os arquivos e evidências enviados.'),
  ('participant','engajamento','/empreendedor/engajamento','participant.page.engajamento.header','Participação','Pontuação','Veja seus pontos e atividades recentes.'),
  ('participant','conquistas','/empreendedor/conquistas','participant.page.conquistas.header','Progresso','Conquistas','Veja os selos e certificados que você conquistou.'),
  ('participant','perfil','/empreendedor/perfil','participant.page.perfil.header','Conta','Perfil','Confira e atualize seus dados.')
), fields(suffix,element_name,element_type,description_key) as (
  values
  ('eyebrow','Texto superior','text','Texto curto acima do título.'),
  ('title','Título da página','text','Título principal exibido nesta página.'),
  ('description','Descrição da página','textarea','Texto explicativo exibido abaixo do título.')
), expanded as (
  select
    pages.area,pages.page,pages.route_pattern,pages.prefix||'.'||fields.suffix as content_key,
    fields.element_name,fields.element_type,fields.description_key,
    case fields.suffix when 'eyebrow' then pages.eyebrow when 'title' then pages.title else pages.description end as text_value
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
from expanded join iam.organizations organization on organization.slug='estimulo'
on conflict(organization_id,content_key,locale) do update set
  area=excluded.area,page=excluded.page,element_name=excluded.element_name,element_type=excluded.element_type,
  description=excluded.description,route_pattern=excluded.route_pattern,placement=excluded.placement,
  group_name=excluded.group_name,editor_schema=excluded.editor_schema,can_delete=false,
  default_value=excluded.default_value,is_active=true,updated_at=now();
