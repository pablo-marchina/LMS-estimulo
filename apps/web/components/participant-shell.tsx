"use client";

import { useState } from "react";
import { BookOpen, Compass, FileUp, Home, Menu, Trophy, User, X } from "lucide-react";
import { signOutAction } from "@/app/entrar/actions";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { NavItem } from "@/components/ui/nav-item";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/empreendedor", label: "Início", icon: Home, exact: true },
  { href: "/empreendedor/jornadas", label: "Jornadas", icon: Compass },
  { href: "/capacitacao/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/empreendedor/entregas", label: "Entregas", icon: FileUp },
  { href: "/empreendedor/conquistas", label: "Conquistas", icon: Trophy },
  { href: "/empreendedor/perfil", label: "Perfil", icon: User },
];

export function ParticipantShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="participant-stage min-h-screen bg-background">
      <span className="participant-stage-orb participant-stage-orb-cyan" aria-hidden="true" />
      <span className="participant-stage-orb participant-stage-orb-magenta" aria-hidden="true" />
      <span className="participant-stage-orb participant-stage-orb-green" aria-hidden="true" />
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
      <header className="no-print brand-app-header sticky top-0 z-40 overflow-hidden text-white shadow-md">
        <div className="brand-app-header-glow" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-20 w-full max-w-[1400px] items-center gap-4 px-5 lg:px-9">
          <div className="brand-logo-capsule shrink-0">
            <EstimuloBrand href="/empreendedor" compact />
          </div>
          <nav className="hidden flex-1 items-center gap-1 xl:flex" aria-label="Navegação principal">
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
          <div className="ml-auto hidden items-center gap-3 xl:flex">
            <span className="max-w-40 truncate text-sm text-white/75" title={email}>{email}</span>
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit" className="!text-white/85 hover:!bg-white/10 hover:!text-white">Sair</Button>
            </form>
          </div>
          <button
            type="button"
            className="focus-ring ml-auto grid size-11 place-items-center rounded-xl text-white/90 hover:bg-white/10 xl:hidden"
            aria-expanded={mobileOpen}
            aria-controls="participant-mobile-nav"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileOpen ? (
          <nav id="participant-mobile-nav" className="relative border-t border-white/10 px-4 pb-4 xl:hidden" aria-label="Navegação principal (mobile)">
            <div className="grid gap-1 pt-3 sm:grid-cols-2">
              {links.map((link) => {
                const Icon = link.icon;
                return <NavItem key={link.href} href={link.href} exact={link.exact} variant="dark" icon={<Icon size={18} aria-hidden="true" />}>{link.label}</NavItem>;
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="truncate text-sm text-white/70" title={email}>{email}</span>
              <form action={signOutAction}><Button variant="ghost" size="sm" type="submit" className="!text-white/80 hover:!bg-white/10 hover:!text-white">Sair</Button></form>
            </div>
          </nav>
        ) : null}
      </header>
      <main id="conteudo-principal" className="relative z-10 mx-auto w-full max-w-[1400px]" tabIndex={-1}>{children}</main>
    </div>
  );
}
