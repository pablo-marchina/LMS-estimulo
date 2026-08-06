export type InterfaceRouteArea = "admin" | "participant" | "public";

export type InterfaceRouteDefinition = {
  route: string;
  label: string;
  area: InterfaceRouteArea;
  description: string;
  previewable: boolean;
  kind?: "page" | "redirect" | "dynamic" | "self";
  canonicalRoute?: string;
  specifications: string[];
};

const commonSpecifications = [
  "Prévia em modo somente leitura",
  "Textos, visibilidade e ordem por elemento",
  "Rascunho separado da versão publicada",
];

function page(
  area: InterfaceRouteArea,
  route: string,
  label: string,
  description: string,
  specifications: string[] = [],
): InterfaceRouteDefinition {
  return {
    area,
    route,
    label,
    description,
    previewable: true,
    kind: "page",
    specifications: [...commonSpecifications, ...specifications],
  };
}

function redirect(
  area: InterfaceRouteArea,
  route: string,
  label: string,
  canonicalRoute: string,
  description: string,
): InterfaceRouteDefinition {
  return {
    area,
    route,
    label,
    description,
    previewable: true,
    kind: "redirect",
    canonicalRoute,
    specifications: [...commonSpecifications, `Redireciona para ${canonicalRoute}`],
  };
}

function dynamic(
  area: InterfaceRouteArea,
  route: string,
  label: string,
  description: string,
): InterfaceRouteDefinition {
  return {
    area,
    route,
    label,
    description,
    previewable: false,
    kind: "dynamic",
    specifications: [
      "Exige um registro real para gerar a URL de prévia",
      "Elementos globais e padrões com /* continuam configuráveis",
      "A publicação mantém a rota dinâmica protegida",
    ],
  };
}

export const interfaceRouteCatalog: InterfaceRouteDefinition[] = [
  page("admin", "/admin", "Administrador — Visão geral", "Resumo operacional e atalhos administrativos."),
  page("admin", "/admin/b2b", "Administrador — B2B", "Páginas e públicos exclusivos."),
  page("admin", "/admin/biblioteca", "Administrador — Biblioteca", "Conteúdos reutilizáveis e arquivos."),
  page("admin", "/admin/biblioteca/entregas", "Administrador — Atividades com entrega", "Requisitos, formatos e critérios de correção."),
  page("admin", "/admin/campanhas", "Administrador — Campanhas e UTM", "Links de divulgação e rastreamento."),
  redirect("admin", "/admin/certificados", "Administrador — Certificados", "/admin/gamificacao?tipo=certificados", "Atalho legado para certificados."),
  page("admin", "/admin/comportamento", "Administrador — Comportamento", "Configuração e leitura do score comportamental."),
  page("admin", "/admin/configuracoes", "Administrador — Configurações gerais", "Contatos, documentos e temas."),
  page("admin", "/admin/diagnostico", "Administrador — Diagnósticos", "Diagnóstico principal e diagnósticos opcionais."),
  redirect("admin", "/admin/diagnosticos-opcionais", "Administrador — Diagnósticos opcionais", "/admin/diagnostico?tipo=opcionais", "Atalho legado para diagnósticos opcionais."),
  page("admin", "/admin/engajamento", "Administrador — Anúncios", "Carrossel e comunicação com participantes.", ["Artes desktop e mobile com especificações próprias"]),
  {
    area: "admin",
    route: "/admin/experiencia",
    label: "Administrador — Interface",
    description: "Central atual de configuração da interface.",
    previewable: false,
    kind: "self",
    specifications: ["A auto-prévia é bloqueada para evitar recursão", "Todos os demais elementos desta rota permanecem catalogados"],
  },
  page("admin", "/admin/gamificacao", "Administrador — Pontos, selos e certificados", "Regras de pontuação e reconhecimento."),
  redirect("admin", "/admin/integracoes", "Administrador — Integrações", "/admin", "Atalho reservado para integrações."),
  page("admin", "/admin/operacao", "Administrador — Operação", "Entregas, revisões e intervenções."),
  page("admin", "/admin/produto", "Administrador — Jornadas e aulas", "Criação, organização e publicação do aprendizado."),
  page("admin", "/admin/recompensas", "Administrador — Recompensas", "Catálogo, resgates e regras de benefício."),
  page("admin", "/admin/relatorios", "Administrador — Relatórios", "Indicadores de participação e progresso."),
  page("admin", "/admin/usuarios", "Administrador — Usuários e acessos", "Diretório de contas, vínculos e papéis."),

  page("participant", "/empreendedor", "Participante — Início", "Resumo, próxima ação e reconhecimentos."),
  page("participant", "/empreendedor/b2b", "Participante — B2B", "Conteúdo exclusivo liberado para a conta."),
  page("participant", "/empreendedor/biblioteca", "Participante — Biblioteca", "Busca e consumo de materiais."),
  page("participant", "/empreendedor/conquistas", "Participante — Conquistas", "Selos e certificados conquistados."),
  redirect("participant", "/empreendedor/credenciais", "Participante — Credenciais", "/empreendedor/conquistas#certificados-estimulo", "Atalho legado para certificados."),
  page("participant", "/empreendedor/diagnostico", "Participante — Diagnóstico", "Diagnóstico principal e seu progresso."),
  redirect("participant", "/empreendedor/engajamento", "Participante — Pontuação", "/empreendedor/recompensas?tab=como-conseguir-pontos", "Atalho para as regras de pontuação."),
  redirect("participant", "/empreendedor/entregas", "Participante — Entregas", "/empreendedor/perfil/entregas", "Atalho para o histórico de entregas."),
  page("participant", "/empreendedor/jornadas", "Participante — Jornadas", "Catálogo e entrada em jornadas."),
  page("participant", "/empreendedor/perfil", "Participante — Perfil", "Dados, diagnósticos e entregas."),
  page("participant", "/empreendedor/perfil/diagnostico", "Participante — Diagnóstico do perfil", "Questionário de perfil empreendedor."),
  page("participant", "/empreendedor/perfil/entregas", "Participante — Entregas do perfil", "Histórico e status de entregas."),
  page("participant", "/empreendedor/recompensas", "Participante — Recompensas", "Saldo, catálogo, histórico e ranking."),
  page("participant", "/empreendedor/resultado", "Participante — Resultado", "Resultado consolidado da jornada."),
  dynamic("participant", "/empreendedor/atividade/[stepInstanceId]", "Participante — Aula", "Player de uma aula específica."),
  dynamic("participant", "/empreendedor/b2b/[slug]", "Participante — Página B2B", "Página exclusiva identificada por slug."),
  dynamic("participant", "/empreendedor/biblioteca/[slug]", "Participante — Conteúdo da biblioteca", "Detalhe de um material específico."),
  dynamic("participant", "/empreendedor/jornada/[journeyInstanceId]", "Participante — Jornada em andamento", "Visão de uma instância de jornada."),
  dynamic("participant", "/empreendedor/perfil/diagnosticos/[availabilityId]", "Participante — Diagnóstico opcional", "Diagnóstico opcional específico."),

  page("public", "/", "Público — Página inicial", "Apresentação pública da plataforma."),
  page("public", "/ajuda", "Público — Ajuda", "Orientações e canais de suporte."),
  page("public", "/cadastro", "Público — Cadastro", "Início do cadastro de participante."),
  page("public", "/cadastro/concluir", "Público — Conclusão do cadastro", "Dados necessários para concluir o cadastro."),
  page("public", "/auth/confirm", "Público — Confirmar cadastro", "Confirmação de e-mail e reenvio seguro."),
  redirect("public", "/confirm", "Público — Confirmação", "/auth/confirm", "Atalho compatível para confirmação de cadastro."),
  page("public", "/capacitacao/biblioteca", "Público — Biblioteca de capacitação", "Visualização pública da biblioteca."),
  page("public", "/entrar", "Público — Entrada do participante", "Autenticação de participantes."),
  page("public", "/entrar/administracao", "Público — Entrada administrativa", "Autenticação Google da equipe."),
  page("public", "/privacidade", "Público — Privacidade", "Política de privacidade."),
  page("public", "/recuperar-senha", "Público — Recuperar senha", "Solicitação de recuperação de acesso."),
  page("public", "/redefinir-senha", "Público — Redefinir senha", "Definição de uma nova senha."),
  page("public", "/termos", "Público — Termos", "Termos de uso da plataforma."),
  dynamic("public", "/capacitacao/biblioteca/[slug]", "Público — Material de capacitação", "Detalhe público de um material."),
  dynamic("public", "/credenciais/[verificationCode]", "Público — Validar credencial", "Validação pública de certificado."),
];

export function interfaceRouteDefinition(route: string) {
  const pathname = route.split(/[?#]/u, 1)[0] || "/";
  return interfaceRouteCatalog.find((item) => item.route === pathname) ?? null;
}
