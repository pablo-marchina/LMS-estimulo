"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, BookOpen, Building2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Gauge, Gift, LayoutDashboard, LogOut, Megaphone, Menu, Settings, SlidersHorizontal, Tags, Trophy, Users, X } from "lucide-react";
import { signOutAction } from "@/app/entrar/actions";
import { AdminProgramManager } from "@/components/admin-program-manager";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { useInterfaceContent } from "@/components/interface-content-provider";
import { InterfacePreviewBridge } from "@/components/interface-preview-bridge";
import { InterfaceSlot } from "@/components/interface-slot";
import { Button } from "@/components/ui/button";
import { NavItem } from "@/components/ui/nav-item";
import { interfaceHref, interfaceOrder, interfaceText, interfaceVisible } from "@/lib/interface-content/contracts";

type ShellLink = { href: string; label: string; contentKey: string; icon: LucideIcon; exact?: boolean; order: number };

const navigationDefinitions: ShellLink[] = [
  { href: "/admin", label: "Visão geral", contentKey: "admin.nav.overview", icon: Gauge, exact: true, order: 10 },
  { href: "/admin/experiencia", label: "Interface", contentKey: "admin.nav.experience", icon: SlidersHorizontal, order: 20 },
  { href: "/admin/produto", label: "Jornadas", contentKey: "admin.nav.journeys", icon: BookOpen, order: 30 },
  { href: "/admin/biblioteca", label: "Biblioteca", contentKey: "admin.nav.library", icon: BookOpen, order: 40 },
  { href: "/admin/usuarios", label: "Usuários", contentKey: "admin.nav.users", icon: Users, order: 50 },
  { href: "/admin/operacao", label: "Operação", contentKey: "admin.nav.operation", icon: LayoutDashboard, order: 60 },
  { href: "/admin/relatorios", label: "Relatórios", contentKey: "admin.nav.reports", icon: BarChart3, order: 70 },
  { href: "/admin/diagnostico", label: "Diagnósticos", contentKey: "admin.nav.diagnostics", icon: ClipboardList, order: 80 },
  { href: "/admin/gamificacao", label: "Pontuação", contentKey: "admin.nav.points", icon: Trophy, order: 90 },
  { href: "/admin/engajamento", label: "Anúncios", contentKey: "admin.nav.announcements", icon: Megaphone, order: 100 },
];

const settingsDefinitions: ShellLink[] = [
  { href: "/admin/configuracoes", label: "Configurações gerais", contentKey: "admin.nav.settings", icon: Settings, order: 110 },
  { href: "/admin/comportamento", label: "Comportamento", contentKey: "admin.nav.behavior", icon: Activity, order: 112 },
  { href: "/admin/recompensas", label: "Recompensas", contentKey: "admin.nav.rewards", icon: Gift, order: 115 },
  { href: "/admin/campanhas", label: "Campanhas e UTM", contentKey: "admin.nav.campaigns", icon: Tags, order: 116 },
  { href: "/admin/b2b", label: "B2B", contentKey: "admin.nav.b2b", icon: Building2, order: 117 },
];

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(() => settingsDefinitions.some((item) => pathname.startsWith(item.href)));
  const content = useInterfaceContent();
  const skipLabel = interfaceText(content, "shared.skip_to_content", "Pular para o conteúdo");
  const signOutLabel = interfaceText(content, "shared.sign_out", "Sair");

  const prepareLinks = (definitions: ShellLink[]) => definitions
    .filter((link) => interfaceVisible(content, link.contentKey))
    .sort((a, b) => interfaceOrder(content, a.contentKey, a.order) - interfaceOrder(content, b.contentKey, b.order))
    .map((link) => ({ ...link, href: interfaceHref(content, link.contentKey, link.href), label: interfaceText(content, link.contentKey, link.label) }));

  const links = prepareLinks(navigationDefinitions);
  const settingsLinks = prepareLinks(settingsDefinitions);

  const renderLink = (link: ShellLink, nested = false) => {
    const Icon = link.icon;
    const iconSize = collapsed ? 21 : nested ? 17 : 19;
    return <NavItem key={link.contentKey} href={link.href} variant="dark" exact={link.exact} icon={<Icon size={iconSize} strokeWidth={2.1} aria-hidden="true" />} interfaceContentKey={link.contentKey} className={`${collapsed ? "justify-center px-2" : ""} ${nested ? "min-h-9 rounded-lg pl-3.5 text-[12px]" : "min-h-10 text-[13px]"} gap-2.5 px-2.5 py-1.5 font-semibold`}><span className={collapsed ? "sr-only" : "truncate"}>{link.label}</span></NavItem>;
  };

  const settingsButton = <button type="button" onClick={() => { if (collapsed) setCollapsed(false); setSettingsOpen((open) => !open); }} className={`flex min-h-10 w-full items-center rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-white/85 transition hover:bg-white/10 hover:text-white ${collapsed ? "justify-center px-2" : "gap-2.5"}`} aria-expanded={settingsOpen} aria-controls="admin-settings-links" title={collapsed ? "Mais configurações" : undefined}><Settings size={collapsed ? 21 : 19} strokeWidth={2.1} aria-hidden="true" /><span className={collapsed ? "sr-only" : "flex-1 truncate text-left"}>Mais configurações</span>{!collapsed ? <ChevronDown size={16} className={`shrink-0 transition-transform ${settingsOpen ? "rotate-180" : ""}`} aria-hidden="true" /> : null}</button>;

  return <div className="min-h-screen bg-background lg:grid" style={{ gridTemplateColumns: collapsed ? "68px minmax(0,1fr)" : "232px minmax(0,1fr)" }}>
    <InterfacePreviewBridge />
    <a className="skip-link" href="#conteudo-principal" data-interface-content-key="shared.skip_to_content">{skipLabel}</a>
    <aside className="no-print sticky top-0 hidden h-screen flex-col overflow-hidden border-r border-primary-active bg-primary text-white shadow-sm lg:flex">
      <div className={`flex min-h-14 items-center border-b border-white/15 ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}><div className={collapsed ? "scale-75" : "scale-90 origin-left"}><EstimuloBrand href="/admin" compact /></div>{!collapsed ? <span className="rounded-full border border-white/25 px-2 py-0.5 text-[10px] font-semibold text-white/85">Admin</span> : null}</div>
      <nav className={`grid min-h-0 flex-1 content-start gap-0.5 overflow-x-hidden ${settingsOpen ? "overflow-y-auto" : "overflow-y-hidden"} overscroll-contain p-2`} aria-label="Navegação administrativa">
        {links.map((link) => renderLink(link))}
        <div className="mt-1 border-t border-white/10 pt-1.5">
          {settingsButton}
          {settingsOpen && !collapsed ? <div id="admin-settings-links" className="mt-1 grid gap-0.5 rounded-xl bg-white/5 p-1.5">{settingsLinks.map((link) => renderLink(link, true))}</div> : null}
        </div>
      </nav>
      <div className="border-t border-white/15 p-2">
        {!collapsed ? <p className="mb-1 truncate px-2 text-[10px] text-white/65" title={email}>{email}</p> : null}
        <div className={`grid ${collapsed ? "gap-1" : "grid-cols-2 gap-1"}`}><form action={signOutAction}><Button variant="ghost" size="sm" type="submit" className="min-h-8 w-full gap-1.5 px-2 text-xs !text-white hover:!bg-white/10"><LogOut size={16} aria-hidden="true" /><span className={collapsed ? "sr-only" : ""}>{signOutLabel}</span></Button></form><button type="button" onClick={() => setCollapsed((value) => !value)} className="flex min-h-8 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-white/70 hover:bg-white/10 hover:text-white" aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>{collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={16} /> Recolher</>}</button></div>
      </div>
    </aside>
    <div className="min-w-0">
      <header className="no-print sticky top-0 z-50 flex min-h-14 items-center border-b border-primary-active bg-primary px-4 text-white shadow-sm lg:hidden"><div className="brand-logo-capsule scale-90 origin-left"><EstimuloBrand href="/admin" compact /></div><button type="button" className="ml-auto grid size-9 place-items-center rounded-lg hover:bg-white/10" aria-expanded={mobileOpen} aria-controls="admin-mobile-nav" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>{mobileOpen ? <div id="admin-mobile-nav" className="absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-white/15 bg-primary p-3 shadow-xl"><nav className="grid gap-0.5">{links.map((link) => renderLink(link))}<div className="mt-1 border-t border-white/10 pt-1.5">{settingsButton}{settingsOpen ? <div className="mt-1 grid gap-0.5 rounded-xl bg-white/5 p-1.5">{settingsLinks.map((link) => renderLink(link, true))}</div> : null}</div></nav><div className="mt-2 border-t border-white/15 pt-2"><p className="mb-1 truncate text-xs text-white/65">{email}</p><form action={signOutAction}><Button variant="ghost" size="sm" type="submit" className="w-full !text-white hover:!bg-white/10">{signOutLabel}</Button></form></div></div> : null}</header>
      <InterfaceSlot area="admin" placement="before_content" />
      <main id="conteudo-principal" className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-7" tabIndex={-1}>
        {children}
        {pathname === "/admin/produto" ? <AdminProgramManager /> : null}
      </main>
      <InterfaceSlot area="admin" placement="after_content" />
      <InterfaceSlot area="admin" placement="footer" />
    </div>
  </div>;
}
