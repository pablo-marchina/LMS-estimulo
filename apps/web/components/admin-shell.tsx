"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileImage,
  FileUp,
  Gauge,
  Gift,
  LayoutDashboard,
  Megaphone,
  Menu,
  Settings,
  SlidersHorizontal,
  Tags,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { signOutAction } from "@/app/entrar/actions";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { useInterfaceContent } from "@/components/interface-content-provider";
import { InterfacePreviewBridge } from "@/components/interface-preview-bridge";
import { InterfaceSlot } from "@/components/interface-slot";
import { Button } from "@/components/ui/button";
import { NavItem } from "@/components/ui/nav-item";
import { interfaceHref, interfaceOrder, interfaceText, interfaceVisible } from "@/lib/interface-content/contracts";

type ShellLink = {
  href: string;
  label: string;
  contentKey: string;
  icon: LucideIcon;
  exact?: boolean;
  order: number;
};

const navigationDefinitions: ShellLink[] = [
  { href: "/admin", label: "Visão geral", contentKey: "admin.nav.overview", icon: Gauge, exact: true, order: 10 },
  { href: "/admin/experiencia", label: "Interface", contentKey: "admin.nav.experience", icon: SlidersHorizontal, order: 20 },
  { href: "/admin/produto", label: "Jornadas", contentKey: "admin.nav.journeys", icon: BookOpen, order: 30 },
  { href: "/admin/biblioteca", label: "Biblioteca", contentKey: "admin.nav.library", icon: BookOpen, order: 40 },
  { href: "/admin/usuarios", label: "Usuários", contentKey: "admin.nav.users", icon: Users, order: 50 },
  { href: "/admin/operacao", label: "Operação", contentKey: "admin.nav.operation", icon: LayoutDashboard, order: 60 },
  { href: "/admin/relatorios", label: "Relatórios", contentKey: "admin.nav.reports", icon: BarChart3, order: 70 },
  { href: "/admin/diagnostico", label: "Diagnóstico principal", contentKey: "admin.nav.diagnostics", icon: ClipboardList, order: 80 },
  { href: "/admin/gamificacao", label: "Pontuação", contentKey: "admin.nav.points", icon: Trophy, order: 90 },
  { href: "/admin/engajamento", label: "Anúncios", contentKey: "admin.nav.announcements", icon: Megaphone, order: 100 },
];

const settingsDefinitions: ShellLink[] = [
  { href: "/admin/configuracoes", label: "Configurações gerais", contentKey: "admin.nav.settings", icon: Settings, order: 110 },
  { href: "/admin/entregas", label: "Entregas", contentKey: "admin.nav.deliveries", icon: FileUp, order: 111 },
  { href: "/admin/comportamento", label: "Comportamento", contentKey: "admin.nav.behavior", icon: Activity, order: 112 },
  { href: "/admin/diagnosticos-opcionais", label: "Diagnósticos opcionais", contentKey: "admin.nav.optional_diagnostics", icon: Tags, order: 113 },
  { href: "/admin/certificados", label: "Templates de certificados", contentKey: "admin.nav.certificate_templates", icon: FileImage, order: 114 },
  { href: "/admin/recompensas", label: "Recompensas", contentKey: "admin.nav.rewards", icon: Gift, order: 115 },
  { href: "/admin/campanhas", label: "Campanhas e UTM", contentKey: "admin.nav.campaigns", icon: Tags, order: 116 },
  { href: "/admin/b2b", label: "B2B", contentKey: "admin.nav.b2b", icon: Building2, order: 117 },
];

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const content = useInterfaceContent();
  const skipLabel = interfaceText(content, "shared.skip_to_content", "Pular para o conteúdo");
  const signOutLabel = interfaceText(content, "shared.sign_out", "Sair");

  const prepareLinks = (definitions: ShellLink[]) => definitions
    .filter((link) => interfaceVisible(content, link.contentKey))
    .sort((a, b) => interfaceOrder(content, a.contentKey, a.order) - interfaceOrder(content, b.contentKey, b.order))
    .map((link) => ({
      ...link,
      href: interfaceHref(content, link.contentKey, link.href),
      label: interfaceText(content, link.contentKey, link.label),
    }));

  const links = prepareLinks(navigationDefinitions);
  const settingsLinks = prepareLinks(settingsDefinitions);

  const renderLink = (link: ShellLink, nested = false) => {
    const Icon = link.icon;
    return (
      <NavItem
        key={link.contentKey}
        href={link.href}
        variant="dark"
        exact={link.exact}
        icon={<Icon size={nested ? 16 : 18} aria-hidden="true" />}
        interfaceContentKey={link.contentKey}
        className={`${collapsed ? "justify-center px-2" : ""} ${nested && !collapsed ? "ml-3 border-l border-white/15 pl-4 text-sm" : ""}`}
      >
        <span className={collapsed ? "sr-only" : ""}>{link.label}</span>
      </NavItem>
    );
  };

  const settingsButton = (
    <button
      type="button"
      onClick={() => {
        if (collapsed) setCollapsed(false);
        setSettingsOpen((open) => !open);
      }}
      className={`flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white ${collapsed ? "justify-center px-2" : "gap-3"}`}
      aria-expanded={settingsOpen}
      aria-controls="admin-settings-links"
      title={collapsed ? "Mais configurações" : undefined}
    >
      <Settings size={18} aria-hidden="true" />
      <span className={collapsed ? "sr-only" : "flex-1 text-left"}>Mais configurações</span>
      {!collapsed ? <ChevronDown size={16} className={`transition-transform ${settingsOpen ? "rotate-180" : ""}`} aria-hidden="true" /> : null}
    </button>
  );

  return (
    <div className="min-h-screen bg-background lg:grid" style={{ gridTemplateColumns: collapsed ? "76px minmax(0,1fr)" : "248px minmax(0,1fr)" }}>
      <InterfacePreviewBridge />
      <a className="skip-link" href="#conteudo-principal" data-interface-content-key="shared.skip_to_content">{skipLabel}</a>
      <aside className="no-print sticky top-0 hidden h-screen flex-col border-r border-primary-active bg-primary text-white shadow-sm lg:flex">
        <div className={`flex min-h-17 items-center border-b border-white/15 ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          <div className={collapsed ? "scale-90" : ""}><EstimuloBrand href="/admin" compact /></div>
          {!collapsed ? <span className="rounded-full border border-white/25 px-2.5 py-1 text-[11px] font-semibold text-white/85">Admin</span> : null}
        </div>
        <nav className="grid flex-1 content-start gap-1 overflow-y-auto p-3" aria-label="Navegação administrativa">
          {links.map((link) => renderLink(link))}
          <div className="mt-1 border-t border-white/10 pt-2">
            {settingsButton}
            {settingsOpen ? <div id="admin-settings-links" className="mt-1 grid gap-1">{settingsLinks.map((link) => renderLink(link, true))}</div> : null}
          </div>
        </nav>
        <div className="border-t border-white/15 p-3">
          {!collapsed ? <p className="mb-2 truncate px-2 text-xs text-white/65" title={email}>{email}</p> : null}
          <form action={signOutAction}><Button variant="ghost" size="sm" type="submit" className={`w-full !text-white hover:!bg-white/10 ${collapsed ? "px-2" : ""}`}>{signOutLabel}</Button></form>
          <button type="button" onClick={() => setCollapsed((value) => !value)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/10 hover:text-white" aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>
            {collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /> Recolher menu</>}
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-50 flex min-h-16 items-center border-b border-primary-active bg-primary px-4 text-white shadow-sm lg:hidden">
          <div className="brand-logo-capsule"><EstimuloBrand href="/admin" compact /></div>
          <button type="button" className="ml-auto grid size-10 place-items-center rounded-lg hover:bg-white/10" aria-expanded={mobileOpen} aria-controls="admin-mobile-nav" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
          {mobileOpen ? (
            <div id="admin-mobile-nav" className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/15 bg-primary p-4 shadow-xl">
              <nav className="grid gap-1">
                {links.map((link) => renderLink(link))}
                <div className="mt-1 border-t border-white/10 pt-2">
                  {settingsButton}
                  {settingsOpen ? <div className="mt-1 grid gap-1">{settingsLinks.map((link) => renderLink(link, true))}</div> : null}
                </div>
              </nav>
              <div className="mt-3 border-t border-white/15 pt-3">
                <p className="mb-2 truncate text-xs text-white/65">{email}</p>
                <form action={signOutAction}><Button variant="ghost" size="sm" type="submit" className="w-full !text-white hover:!bg-white/10">{signOutLabel}</Button></form>
              </div>
            </div>
          ) : null}
        </header>
        <InterfaceSlot area="admin" placement="before_content" />
        <main id="conteudo-principal" className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 sm:py-9" tabIndex={-1}>{children}</main>
        <InterfaceSlot area="admin" placement="after_content" />
        <InterfaceSlot area="admin" placement="footer" />
      </div>
    </div>
  );
}
