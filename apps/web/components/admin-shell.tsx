"use client";

import { useState } from "react";
import { Award, BarChart3, BookOpen, ClipboardList, Gauge, LayoutDashboard, Megaphone, Menu, Plug, Trophy, Users, X } from "lucide-react";
import { signOutAction } from "@/app/entrar/actions";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { Button } from "@/components/ui/button";
import { NavItem } from "@/components/ui/nav-item";

const links = [
  { href: "/admin", label: "Visão geral", icon: Gauge, exact: true },
  { href: "/admin/produto", label: "Jornadas", icon: BookOpen },
  { href: "/admin/diagnostico", label: "Diagnósticos", icon: ClipboardList },
  { href: "/admin/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/admin/gamificacao", label: "Pontuação", icon: Trophy },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/engajamento", label: "Anúncios", icon: Megaphone },
  { href: "/admin/operacao", label: "Operação", icon: LayoutDashboard },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/admin/maturidade", label: "Maturidade", icon: Award },
  { href: "/admin/integracoes", label: "Integrações", icon: Plug },
];

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = links.map((link) => {
    const Icon = link.icon;
    return <NavItem key={link.href} href={link.href} variant="top" exact={link.exact} icon={<Icon size={16} aria-hidden="true" />} className="shrink-0">{link.label}</NavItem>;
  });

  return (
    <div className="min-h-screen bg-background">
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
      <header className="no-print sticky top-0 z-50 border-b border-primary-active bg-primary text-white shadow-sm">
        <div className="mx-auto flex min-h-17 max-w-[1500px] items-center gap-4 px-4 sm:px-6">
          <div className="brand-logo-capsule shrink-0"><EstimuloBrand href="/admin" compact /></div>
          <span className="hidden rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white/85 sm:inline">Administração</span>
          <div className="ml-auto hidden items-center gap-3 lg:flex"><span className="max-w-48 truncate text-xs text-white/70" title={email}>{email}</span><form action={signOutAction}><Button variant="ghost" size="sm" type="submit" className="!text-white hover:!bg-white/10">Sair</Button></form></div>
          <button type="button" className="ml-auto grid size-10 place-items-center rounded-lg hover:bg-white/10 lg:hidden" aria-expanded={mobileOpen} aria-controls="admin-mobile-nav" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        <div className="hidden border-t border-white/15 lg:block"><nav className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 py-2 sm:px-6" aria-label="Navegação administrativa">{nav}</nav></div>
        {mobileOpen ? <div id="admin-mobile-nav" className="border-t border-white/15 p-4 lg:hidden"><nav className="grid gap-1 sm:grid-cols-2">{nav}</nav><div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3"><span className="truncate text-xs text-white/70">{email}</span><form action={signOutAction}><Button variant="ghost" size="sm" type="submit" className="!text-white hover:!bg-white/10">Sair</Button></form></div></div> : null}
      </header>
      <main id="conteudo-principal" className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 sm:py-9" tabIndex={-1}>{children}</main>
    </div>
  );
}