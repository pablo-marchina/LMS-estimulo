import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/entrar/actions";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { IdempotentSubmitBoundary } from "@/components/idempotent-submit-guard";

export function AppShell({ area, email, children }: { area: "empreendedor" | "admin"; email: string; children: ReactNode }) {
  const links = area === "admin"
    ? [
        { href: "/admin", label: "Operação" },
        { href: "/admin/biblioteca", label: "Biblioteca" },
        { href: "/admin/usuarios", label: "Usuários" },
        { href: "/admin/maturidade", label: "Maturidade" },
        { href: "/admin/engajamento", label: "Engajamento" },
        { href: "/admin/integracoes", label: "Integrações" }
      ]
    : [
        { href: "/empreendedor", label: "Painel" },
        { href: "/capacitacao/biblioteca", label: "Biblioteca" },
        { href: "/empreendedor/credenciais", label: "Credenciais" },
        { href: "/empreendedor/perfil", label: "Perfil" }
      ];
  const areaLabel = area === "admin" ? "Área de operação" : "Área do empreendedor";

  return (
    <IdempotentSubmitBoundary>
      <div className="app-frame" data-area={area}>
        <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
        <header className="app-header no-print">
          <div className="app-header__inner">
            <div className="app-brand-cluster">
              <EstimuloBrand href={area === "admin" ? "/admin" : "/empreendedor"} compact />
              <span className="app-area-label">{areaLabel}</span>
            </div>
            <nav className="app-nav" aria-label="Navegação principal">
              {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
            </nav>
            <div className="session-summary">
              <span className="session-email" title={email}>{email}</span>
              <form action={signOutAction}><button className="button button--ghost" type="submit">Sair</button></form>
            </div>
          </div>
        </header>
        <main id="conteudo-principal" className="page-container" tabIndex={-1}>{children}</main>
      </div>
    </IdempotentSubmitBoundary>
  );
}
