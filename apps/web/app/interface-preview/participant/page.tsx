import { redirect } from "next/navigation";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  FileUp,
  Gift,
  Home,
  Trophy,
  User,
} from "lucide-react";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { InterfacePreviewBridge } from "@/components/interface-preview-bridge";
import { InterfacePreviewGuard } from "@/components/interface-preview-guard";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";

const navItems = [
  ["participant.nav.home", "Início", Home],
  ["participant.nav.journeys", "Jornadas", Compass],
  ["participant.nav.library", "Biblioteca", BookOpen],
  ["participant.nav.submissions", "Entregas", FileUp],
  ["participant.nav.points", "Pontuação", Trophy],
  ["participant.nav.rewards", "Recompensas", Gift],
  ["participant.nav.achievements", "Conquistas", Award],
  ["participant.nav.profile", "Perfil", User],
] as const;

const supportedRoutes = new Set([
  "/empreendedor",
  "/empreendedor/jornadas",
  "/empreendedor/biblioteca",
  "/empreendedor/entregas",
  "/empreendedor/engajamento",
  "/empreendedor/recompensas",
  "/empreendedor/conquistas",
  "/empreendedor/perfil",
  "/empreendedor/diagnostico",
  "/empreendedor/resultado",
]);

function pageContent(route: string) {
  if (route === "/empreendedor/jornadas") {
    return { eyebrowKey: "participant.page.jornadas.header.eyebrow", eyebrow: "Aprendizado", titleKey: "participant.page.jornadas.header.title", title: "Jornadas", descriptionKey: "participant.page.jornadas.header.description", description: "Escolha uma jornada para continuar aprendendo.", cards: ["Gestão para crescer", "Negócio em Movimento", "IA aplicada ao negócio"] };
  }
  if (route === "/empreendedor/biblioteca") {
    return { eyebrowKey: "participant.page.biblioteca.header.eyebrow", eyebrow: "Conteúdo", titleKey: "participant.page.biblioteca.header.title", title: "Biblioteca", descriptionKey: "participant.page.biblioteca.header.description", description: "Encontre materiais para apoiar o seu negócio.", cards: ["Organização financeira", "Marketing prático", "Ferramentas de gestão"] };
  }
  if (route === "/empreendedor/entregas") {
    return { eyebrowKey: "participant.page.entregas.header.eyebrow", eyebrow: "Atividades", titleKey: "participant.page.entregas.header.title", title: "Entregas", descriptionKey: "participant.page.entregas.header.description", description: "Acompanhe os arquivos e evidências enviados.", cards: ["Plano de ação", "Diagnóstico do negócio", "Prática de marketing"] };
  }
  if (route === "/empreendedor/engajamento") {
    return { eyebrowKey: "participant.page.engajamento.header.eyebrow", eyebrow: "Participação", titleKey: "participant.page.engajamento.header.title", title: "Pontuação", descriptionKey: "participant.page.engajamento.header.description", description: "Veja seus pontos e atividades recentes.", cards: ["Pontos disponíveis", "Atividades recentes", "Próximas conquistas"] };
  }
  if (route === "/empreendedor/conquistas") {
    return { eyebrowKey: "participant.page.conquistas.header.eyebrow", eyebrow: "Progresso", titleKey: "participant.page.conquistas.header.title", title: "Conquistas", descriptionKey: "participant.page.conquistas.header.description", description: "Veja os selos e certificados que você conquistou.", cards: ["Primeiros passos", "Gestão em prática", "Aprendizado contínuo"] };
  }
  if (route === "/empreendedor/perfil") {
    return { eyebrowKey: "participant.page.perfil.header.eyebrow", eyebrow: "Conta", titleKey: "participant.page.perfil.header.title", title: "Perfil", descriptionKey: "participant.page.perfil.header.description", description: "Confira e atualize seus dados.", cards: ["Dados pessoais", "Informações do negócio", "Preferências"] };
  }
  if (route === "/empreendedor/diagnostico") {
    return { eyebrowKey: "participant.diagnostic.eyebrow", eyebrow: "Diagnóstico", titleKey: "participant.diagnostic.title", title: "Conte um pouco sobre o seu negócio", descriptionKey: "participant.diagnostic.description", description: "Suas respostas ajudam a recomendar os conteúdos mais adequados.", cards: ["Organização", "Vendas", "Planejamento"] };
  }
  if (route === "/empreendedor/resultado") {
    return { eyebrowKey: "participant.result.eyebrow", eyebrow: "Resultado", titleKey: "participant.result.title", title: "Fortalecendo a base", descriptionKey: "participant.result.description", description: "Seu próximo passo é organizar a casa e ganhar previsibilidade.", cards: ["Gestão 72%", "Planejamento 64%", "Vendas 58%"] };
  }
  if (route === "/empreendedor/recompensas") {
    return { eyebrowKey: "participant.rewards.eyebrow", eyebrow: "Benefícios", titleKey: "participant.rewards.title", title: "Recompensas", descriptionKey: "participant.rewards.description", description: "Use seus pontos em benefícios disponíveis.", cards: ["Mentoria", "Experiência exclusiva", "Material de apoio"] };
  }
  return { eyebrowKey: "participant.page.overview.header.eyebrow", eyebrow: "Estímulo", titleKey: "participant.page.overview.header.title", title: "Olá!", descriptionKey: "participant.page.overview.header.description", description: "Continue sua jornada e acompanhe seu progresso.", cards: ["Continue aprendendo", "Recomendado para você", "Suas conquistas"] };
}

export default async function ParticipantInterfacePreview({ searchParams }: { searchParams: Promise<{ route?: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !isEstimuloAdministrativeEmail(auth.email)) redirect("/entrar/administracao?erro=acesso_nao_autorizado");
  const query = await searchParams;
  const requestedRoute = query.route?.startsWith("/") ? query.route : "/empreendedor";
  const route = supportedRoutes.has(requestedRoute) ? requestedRoute : "/empreendedor";
  const content = pageContent(route);

  return <div className="min-h-screen bg-background">
    <InterfacePreviewGuard />
    <InterfacePreviewBridge />
    <header className="border-b border-primary-active bg-primary text-white shadow-sm"><div className="mx-auto flex min-h-16 w-full max-w-[1500px] items-center gap-3 px-4"><EstimuloBrand compact /><nav className="ml-auto hidden items-stretch gap-1 lg:flex" aria-label="Navegação do participante em prévia">{navItems.map(([contentKey, label, Icon]) => <button key={contentKey} type="button" data-interface-content-key={contentKey} className="flex min-w-20 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold text-white/85 hover:bg-white/10"><Icon size={18} />{label}</button>)}</nav></div></header>
    <main className="mx-auto grid w-full max-w-[1400px] gap-7 px-5 py-8 lg:px-9 lg:py-10">
      <header className="grid gap-2"><p data-interface-content-key={content.eyebrowKey} className="text-sm font-bold uppercase tracking-[.14em] text-primary">{content.eyebrow}</p><h1 data-interface-content-key={content.titleKey} className="text-4xl font-black text-secondary">{content.title}</h1><p data-interface-content-key={content.descriptionKey} className="max-w-3xl text-base leading-7 text-muted">{content.description}</p></header>
      <section className="grid gap-4 md:grid-cols-3">{content.cards.map((card, index) => <article key={card} className="rounded-2xl border border-border bg-white p-5 shadow-sm"><span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">{index === 0 ? <Compass size={20} /> : index === 1 ? <BookOpen size={20} /> : <Award size={20} />}</span><h2 className="mt-5 text-lg font-black text-secondary">{card}</h2><p className="mt-2 text-sm leading-6 text-muted">Conteúdo demonstrativo para revisar a estrutura e os textos desta tela.</p><button type="button" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"><CheckCircle2 size={16} /> Ver detalhes</button></article>)}</section>
    </main>
  </div>;
}
