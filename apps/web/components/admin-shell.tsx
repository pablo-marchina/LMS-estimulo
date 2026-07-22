"use client";

import { useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  Menu,
  Plug,
  Trophy,
  Users,
  X
} from "lucide-react";
import { signOutAction } from "@/app/entrar/actions";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { NavItem } from "@/components/ui/nav-item";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Operação", icon: LayoutDashboard },
  { href: "/admin/produto", label: "Produto", icon: BookOpen },
  { href: "/admin/diagnostico", label: "Diagnóstico", icon: ClipboardList },
  { href: "/admin/gamificacao", label: "Gamificação", icon: Trophy },
  { href: "/admin/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/engajamento", label: "Anúncios", icon: Megaphone },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/admin/maturidade", label: "Maturidade", icon: Award },
  { href: "/admin/integracoes", label: "Integrações", icon: Plug }
];

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="grid gap-1" aria-label="Navegação administrativa">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavItem key={link.href} href={link.href} variant="dark" exact={link.href === "/admin"} icon={<Icon size={18} aria-hidden="true" />}>
            {link.label}
          </NavItem>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[272px_1fr]">
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <aside className="hidden bg-primary text-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col gap-6 p-5">
          <EstimuloBrand href="/admin" compact invert />
          <p className="rounded-md bg-white/10 px-3 py-2 text-xs font-semibold text-white/75">Área de operação</p>
          {nav}
          <div className="mt-auto grid gap-2 border-t border-white/15 pt-4">
            <span className="truncate text-xs text-white/70" title={email}>
              {email}
            </span>
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit" className="w-full !text-white hover:!bg-white/10">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
          <EstimuloBrand href="/admin" compact />
          <button
            type="button"
            className="ml-auto grid size-10 place-items-center rounded-lg text-ink hover:bg-primary-soft"
            aria-expanded={mobileOpen}
            aria-controls="admin-mobile-nav"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
        {mobileOpen ? (
          <div id="admin-mobile-nav" className="border-b border-border bg-primary p-4 text-white lg:hidden">
            {nav}
          </div>
        ) : null}
        <main id="conteudo-principal" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
