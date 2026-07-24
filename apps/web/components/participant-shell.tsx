"use client";

import { useState } from "react";
import { Award, BookOpen, ClipboardList, Home, Menu, Trophy, User, X } from "lucide-react";
import { signOutAction } from "@/app/entrar/actions";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { NavItem } from "@/components/ui/nav-item";
import { Button } from "@/components/ui/button";

// "menu em cima" is an explicit product requirement (premissas) and the
// browser-e2e harness clicks nav links by exact text ("Perfil", "Biblioteca") —
// this stays a top nav, not the sidebar the prototype used for its student shell.
const links = [
  { href: "/empreendedor", label: "Painel", icon: Home, exact: true },
  { href: "/capacitacao/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/empreendedor/pontuacao", label: "Pontuação", icon: Trophy },
  { href: "/empreendedor/conquistas", label: "Conquistas", icon: Award },
  { href: "/empreendedor/entregas", label: "Entregas", icon: ClipboardList },
  { href: "/empreendedor/perfil", label: "Perfil", icon: User }
];

export function ParticipantShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <header className="no-print sticky top-0 z-40 bg-secondary">
        <div className="mx-auto flex h-18 w-full max-w-[1400px] items-center gap-4 px-5 lg:px-9">
          <EstimuloBrand href="/empreendedor" compact invert />
          <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Navegação principal">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavItem
                  key={link.href}
                  href={link.href}
                  exact={link.exact}
                  variant="dark"
                  icon={<Icon size={17} aria-hidden="true" />}
                  className="px-3 text-[13px]"
                >
                  {link.label}
                </NavItem>
              );
            })}
          </nav>
          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <span className="max-w-40 truncate text-sm text-white/60" title={email}>
              {email}
            </span>
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit" className="!text-white/70 hover:!bg-white/10 hover:!text-white">
                Sair
              </Button>
            </form>
          </div>
          <button
            type="button"
            className="focus-ring ml-auto grid size-11 place-items-center rounded-xl text-white/80 hover:bg-white/10 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="participant-mobile-nav"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileOpen ? (
          <nav id="participant-mobile-nav" className="border-t border-white/10 px-4 pb-4 lg:hidden" aria-label="Navegação principal (mobile)">
            <div className="grid gap-1 pt-3">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavItem key={link.href} href={link.href} exact={link.exact} variant="dark" icon={<Icon size={18} aria-hidden="true" />}>
                    {link.label}
                  </NavItem>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="truncate text-sm text-white/60" title={email}>
                {email}
              </span>
              <form action={signOutAction}>
                <Button variant="ghost" size="sm" type="submit" className="!text-white/70 hover:!bg-white/10 hover:!text-white">
                  Sair
                </Button>
              </form>
            </div>
          </nav>
        ) : null}
      </header>
      <main id="conteudo-principal" className="mx-auto w-full max-w-[1400px]" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
