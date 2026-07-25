"use client";

import { useState } from "react";
import { BookOpen, Compass, FileUp, Home, Menu, Trophy, User, X } from "lucide-react";
import { signOutAction } from "@/app/entrar/actions";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { Button } from "@/components/ui/button";
import { NavItem } from "@/components/ui/nav-item";

const links = [
  { href: "/empreendedor", label: "Início", icon: Home, exact: true },
  { href: "/empreendedor/jornadas", label: "Jornadas", icon: Compass },
  { href: "/capacitacao/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/empreendedor/entregas", label: "Entregas", icon: FileUp },
  { href: "/empreendedor/engajamento", label: "Pontuação", icon: Trophy },
  { href: "/empreendedor/perfil", label: "Perfil", icon: User },
];

export function ParticipantShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = links.map((link) => {
    const Icon = link.icon;
    return <NavItem key={link.href} href={link.href} exact={link.exact} variant="top" icon={<Icon size={17} aria-hidden="true" />}>{link.label}</NavItem>;
  });

  return (
    <div className="participant-stage min-h-screen bg-background">
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
      <header className="no-print sticky top-0 z-40 border-b border-primary-active bg-primary text-white shadow-sm">
        <div className="mx-auto flex min-h-18 w-full max-w-[1400px] items-center gap-4 px-5 lg:px-9">
          <div className="brand-logo-capsule shrink-0"><EstimuloBrand href="/empreendedor" compact /></div>
          <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex" aria-label="Navegação principal">{nav}</nav>
          <div className="ml-auto hidden items-center gap-3 xl:flex"><span className="max-w-44 truncate text-xs text-white/70" title={email}>{email}</span><form action={signOutAction}><Button variant="ghost" size="sm" type="submit" className="!text-white hover:!bg-white/10">Sair</Button></form></div>
          <button type="button" className="ml-auto grid size-11 place-items-center rounded-xl text-white hover:bg-white/10 xl:hidden" aria-expanded={mobileOpen} aria-controls="participant-mobile-nav" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {mobileOpen ? <div id="participant-mobile-nav" className="border-t border-white/15 px-4 pb-4 xl:hidden"><nav className="grid gap-1 pt-3 sm:grid-cols-2">{nav}</nav><div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3"><span className="truncate text-xs text-white/70">{email}</span><form action={signOutAction}><Button variant="ghost" size="sm" type="submit" className="!text-white hover:!bg-white/10">Sair</Button></form></div></div> : null}
      </header>
      <main id="conteudo-principal" className="mx-auto w-full max-w-[1400px]" tabIndex={-1}>{children}</main>
    </div>
  );
}