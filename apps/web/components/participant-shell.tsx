"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { signOutAction } from "@/app/entrar/actions";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { NavItem } from "@/components/ui/nav-item";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/empreendedor", label: "Painel" },
  { href: "/capacitacao/biblioteca", label: "Biblioteca" },
  { href: "/empreendedor/credenciais", label: "Credenciais" },
  { href: "/empreendedor/perfil", label: "Perfil" }
];

export function ParticipantShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <header className="no-print sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-18 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
          <EstimuloBrand href="/empreendedor" compact />
          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Navegação principal">
            {links.map((link) => (
              <NavItem key={link.href} href={link.href} exact={link.href === "/empreendedor"}>
                {link.label}
              </NavItem>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-3 md:flex">
            <span className="max-w-40 truncate text-sm text-muted" title={email}>
              {email}
            </span>
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sair
              </Button>
            </form>
          </div>
          <button
            type="button"
            className="ml-auto grid size-10 place-items-center rounded-lg text-ink hover:bg-primary-soft md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="participant-mobile-nav"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileOpen ? (
          <nav id="participant-mobile-nav" className="border-t border-border px-4 pb-4 md:hidden" aria-label="Navegação principal (mobile)">
            <div className="grid gap-1 pt-3">
              {links.map((link) => (
                <NavItem key={link.href} href={link.href} exact={link.href === "/empreendedor"}>
                  {link.label}
                </NavItem>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="truncate text-sm text-muted" title={email}>
                {email}
              </span>
              <form action={signOutAction}>
                <Button variant="ghost" size="sm" type="submit">
                  Sair
                </Button>
              </form>
            </div>
          </nav>
        ) : null}
      </header>
      <main id="conteudo-principal" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
