import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/entrar/actions";

export function AppShell({ area, email, children }: { area: "empreendedor" | "admin"; email: string; children: ReactNode }) {
  const links = area === "admin"
    ? [{ href: "/admin", label: "Operação" }]
    : [
        { href: "/empreendedor", label: "Minhas jornadas" },
        { href: "/empreendedor/credenciais", label: "Credenciais" }
      ];

  return (
    <div className="app-frame">
      <header className="app-header no-print">
        <Link className="brand" href={area === "admin" ? "/admin" : "/empreendedor"} aria-label="Plataforma Estímulo — início">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span><strong>Estímulo</strong><small>Desenvolvimento do empreendedor</small></span>
        </Link>
        <nav aria-label="Navegação principal">
          {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <div className="session-summary">
          <span>{email}</span>
          <form action={signOutAction}><button className="button button--ghost" type="submit">Sair</button></form>
        </div>
      </header>
      <main className="page-container">{children}</main>
    </div>
  );
}
