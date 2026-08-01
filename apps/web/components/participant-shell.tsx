"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Award, BookOpen, Building2, Compass, FileUp, Gift, Home, LogOut, Menu, Trophy, User, X } from "lucide-react";
import { signOutAction } from "@/app/entrar/actions";
import { BehaviorEventTracker } from "@/components/behavior-event-tracker";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { useInterfaceContent } from "@/components/interface-content-provider";
import { InterfacePreviewBridge } from "@/components/interface-preview-bridge";
import { InterfacePreviewGuard } from "@/components/interface-preview-guard";
import { InterfaceSlot } from "@/components/interface-slot";
import { Button } from "@/components/ui/button";
import { NavItem } from "@/components/ui/nav-item";
import { interfaceHref, interfaceOrder, interfaceText, interfaceVisible } from "@/lib/interface-content/contracts";

const linkDefinitions = [
  { href: "/empreendedor", label: "Início", contentKey: "participant.nav.home", icon: Home, exact: true, order: 10 },
  { href: "/empreendedor/jornadas", label: "Jornadas", contentKey: "participant.nav.journeys", icon: Compass, order: 20 },
  { href: "/empreendedor/biblioteca", label: "Biblioteca", contentKey: "participant.nav.library", icon: BookOpen, order: 30 },
  { href: "/empreendedor/entregas", label: "Entregas", contentKey: "participant.nav.submissions", icon: FileUp, order: 40 },
  { href: "/empreendedor/engajamento", label: "Pontuação", contentKey: "participant.nav.points", icon: Trophy, order: 50 },
  { href: "/empreendedor/recompensas", label: "Recompensas", contentKey: "participant.nav.rewards", icon: Gift, order: 55 },
  { href: "/empreendedor/conquistas", label: "Conquistas", contentKey: "participant.nav.achievements", icon: Award, order: 60 },
  { href: "/empreendedor/b2b", label: "B2B", contentKey: "participant.nav.b2b", icon: Building2, order: 65 },
  { href: "/empreendedor/perfil", label: "Perfil", contentKey: "participant.nav.profile", icon: User, order: 70 },
];

export function ParticipantShell({ email, children, hasB2BAccess = false }: { email: string; children: React.ReactNode; hasB2BAccess?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const content = useInterfaceContent();
  const skipLabel = interfaceText(content, "shared.skip_to_content", "Pular para o conteúdo");
  const signOutLabel = interfaceText(content, "shared.sign_out", "Sair");
  const wideLesson = pathname.startsWith("/empreendedor/atividade/");
  const preview = searchParams.get("interface_preview") === "1";
  const links = linkDefinitions
    .filter((link) => link.contentKey === "participant.nav.home" || interfaceVisible(content, link.contentKey))
    .filter((link) => link.contentKey !== "participant.nav.b2b" || hasB2BAccess)
    .sort((a, b) => interfaceOrder(content, a.contentKey, a.order) - interfaceOrder(content, b.contentKey, b.order))
    .map((link) => ({ ...link, href: interfaceHref(content, link.contentKey, link.href), label: interfaceText(content, link.contentKey, link.label) }));

  const desktopNav = links.map((link) => {
    const Icon = link.icon;
    return <NavItem key={link.contentKey} href={link.href} exact={link.exact} variant="top" icon={<Icon size={21} strokeWidth={2.1} aria-hidden="true" />} interfaceContentKey={link.contentKey} className="min-h-12 min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden px-1 py-1 text-[10px] font-semibold leading-none xl:text-[11px]"><span className="max-w-full truncate whitespace-nowrap">{link.label}</span></NavItem>;
  });

  const mobileNav = links.map((link) => {
    const Icon = link.icon;
    return <NavItem key={link.contentKey} href={link.href} exact={link.exact} variant="top" icon={<Icon size={20} strokeWidth={2.1} aria-hidden="true" />} interfaceContentKey={link.contentKey} className="min-h-11 gap-3 text-sm">{link.label}</NavItem>;
  });

  return <div className="participant-stage min-h-screen bg-background" data-wide-lesson={wideLesson ? "true" : "false"}>
    <InterfacePreviewGuard />
    {!preview ? <BehaviorEventTracker /> : null}
    <InterfacePreviewBridge />
    {wideLesson ? <style>{`
      [data-wide-lesson="true"] #conteudo-principal > div {
        max-width: none !important;
      }
      [data-wide-lesson="true"] #conteudo-principal > div > .grid.items-start.gap-5 {
        grid-template-columns: minmax(0, 1fr) !important;
      }
      [data-wide-lesson="true"] #conteudo-principal > div > .grid.items-start.gap-5 > aside {
        position: static !important;
        order: -1;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      @media (max-width: 900px) {
        [data-wide-lesson="true"] #conteudo-principal > div > .grid.items-start.gap-5 > aside {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `}</style> : null}
    <a className="skip-link" href="#conteudo-principal" data-interface-content-key="shared.skip_to_content">{skipLabel}</a>
    <header className="no-print sticky top-0 z-40 border-b border-primary-active bg-primary text-white shadow-sm">
      <div className="mx-auto flex min-h-16 w-full max-w-[1500px] items-center gap-2 px-3 lg:px-4">
        <div className="brand-logo-capsule shrink-0 scale-[.82] origin-left xl:scale-90"><EstimuloBrand href="/empreendedor" compact /></div>
        <nav className="hidden min-w-0 flex-1 items-stretch gap-0.5 lg:flex" aria-label="Navegação principal">{desktopNav}</nav>
        <form action={signOutAction} data-interface-content-key="shared.sign_out" className="hidden shrink-0 lg:block">
          <Button variant="ghost" size="sm" type="submit" className="size-10 px-0 !text-white hover:!bg-white/10" aria-label={signOutLabel} title={`${signOutLabel} · ${email}`}><LogOut size={20} strokeWidth={2.1} aria-hidden="true" /></Button>
        </form>
        <button type="button" className="ml-auto grid size-10 place-items-center rounded-lg text-white hover:bg-white/10 lg:hidden" aria-expanded={mobileOpen} aria-controls="participant-mobile-nav" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      {mobileOpen ? <div id="participant-mobile-nav" className="border-t border-white/15 px-4 pb-4 lg:hidden"><nav className="grid gap-1 pt-3 sm:grid-cols-2">{mobileNav}</nav><div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3"><span className="truncate text-xs text-white/70">{email}</span><form action={signOutAction} data-interface-content-key="shared.sign_out"><Button variant="ghost" size="sm" type="submit" className="!text-white hover:!bg-white/10">{signOutLabel}</Button></form></div></div> : null}
    </header>
    <InterfaceSlot area="participant" placement="before_content" />
    <main
      id="conteudo-principal"
      className={wideLesson ? "w-full min-w-0 max-w-none [&>div]:max-w-none" : "mx-auto w-full max-w-[1400px]"}
      tabIndex={-1}
    >
      {children}
    </main>
    <InterfaceSlot area="participant" placement="after_content" />
    <InterfaceSlot area="participant" placement="footer" />
  </div>;
}
