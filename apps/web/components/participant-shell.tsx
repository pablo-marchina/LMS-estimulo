"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { preconnect, prefetchDNS } from "react-dom";
import { BookOpen, Building2, ChevronDown, Compass, Gift, Home, LogOut, User } from "lucide-react";
import { signOutAction } from "@/app/entrar/actions";
import { BehaviorEventTracker } from "@/components/behavior-event-tracker";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { useInterfaceContent } from "@/components/interface-content-provider";
import { InterfacePreviewBridge } from "@/components/interface-preview-bridge";
import { InterfacePreviewGuard } from "@/components/interface-preview-guard";
import { InterfaceSlot } from "@/components/interface-slot";
import styles from "@/components/participant-density.module.css";
import { Button } from "@/components/ui/button";
import { NavItem } from "@/components/ui/nav-item";
import { interfaceHref, interfaceOrder, interfaceText, interfaceVisible } from "@/lib/interface-content/contracts";

const linkDefinitions = [
  { href: "/empreendedor", label: "Início", contentKey: "participant.nav.home", icon: Home, exact: true, order: 10 },
  { href: "/empreendedor/jornadas", label: "Jornadas", contentKey: "participant.nav.journeys", icon: Compass, order: 20 },
  { href: "/empreendedor/biblioteca", label: "Biblioteca", contentKey: "participant.nav.library", icon: BookOpen, order: 30 },
  { href: "/empreendedor/recompensas", label: "Recompensas", contentKey: "participant.nav.rewards", icon: Gift, order: 55 },
  { href: "/empreendedor/b2b", label: "B2B", contentKey: "participant.nav.b2b", icon: Building2, order: 65 },
];

function warmVideoProviders() {
  preconnect("https://drive.google.com");
  preconnect("https://drive.usercontent.google.com");
  preconnect("https://www.youtube.com");
  preconnect("https://www.youtube-nocookie.com");
  preconnect("https://player.vimeo.com");
  prefetchDNS("https://i.ytimg.com");
}

function UserMenu({ email, signOutLabel }: { email: string; signOutLabel: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = email.split("@")[0]?.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "EU";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Minha conta"
        className="flex min-h-10 items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">{initials}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-md">
          <div className="px-2.5 py-2">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Minha conta</p>
            <p className="mt-1 truncate text-sm font-medium text-ink">{email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <a href="/empreendedor/perfil" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-ink hover:bg-primary-soft hover:text-primary">
            <User size={16} aria-hidden="true" /> Meu perfil
          </a>
          <form action={signOutAction} data-interface-content-key="shared.sign_out">
            <Button variant="ghost" size="sm" type="submit" role="menuitem" className="mt-0.5 w-full justify-start gap-2.5 px-2.5 !text-muted hover:!bg-surface-muted hover:!text-ink">
              <LogOut size={16} aria-hidden="true" /> {signOutLabel}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function ParticipantShell({
  email,
  children,
  hasB2BAccess = false,
  hasLibraryContent = false,
}: {
  email: string;
  children: React.ReactNode;
  hasB2BAccess?: boolean;
  hasLibraryContent?: boolean;
}) {
  warmVideoProviders();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const content = useInterfaceContent();
  const skipLabel = interfaceText(content, "shared.skip_to_content", "Pular para o conteúdo");
  const signOutLabel = interfaceText(content, "shared.sign_out", "Sair");
  const wideLesson = pathname.startsWith("/empreendedor/atividade/");
  const preview = searchParams.get("interface_preview") === "1";

  useEffect(() => {
    if (!wideLesson) return;
    const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, wideLesson]);

  const links = linkDefinitions
    .filter((link) => link.contentKey === "participant.nav.home" || interfaceVisible(content, link.contentKey))
    .filter((link) => link.contentKey !== "participant.nav.library" || hasLibraryContent)
    .filter((link) => link.contentKey !== "participant.nav.b2b" || hasB2BAccess)
    .sort((a, b) => interfaceOrder(content, a.contentKey, a.order) - interfaceOrder(content, b.contentKey, b.order))
    .map((link) => ({ ...link, href: interfaceHref(content, link.contentKey, link.href), label: interfaceText(content, link.contentKey, link.label) }));

  const navigation = links.map((link) => {
    const Icon = link.icon;
    return (
      <NavItem
        key={link.contentKey}
        href={link.href}
        exact={link.exact}
        variant="top"
        icon={<Icon size={16} strokeWidth={1.9} aria-hidden="true" />}
        interfaceContentKey={link.contentKey}
        className="min-h-10 shrink-0 gap-2 px-3 py-2 text-sm font-medium"
      >
        <span className="whitespace-nowrap">{link.label}</span>
      </NavItem>
    );
  });

  return (
    <div
      className={`participant-stage min-h-screen ${styles.density}`}
      style={{ backgroundColor: "#fbfaf7", backgroundImage: "none" }}
      data-wide-lesson={wideLesson ? "true" : "false"}
    >
      <InterfacePreviewGuard />
      {!preview ? <BehaviorEventTracker /> : null}
      <InterfacePreviewBridge />
      <a className="skip-link" href="#conteudo-principal" data-interface-content-key="shared.skip_to_content">{skipLabel}</a>
      <header className="no-print sticky top-0 z-40 border-b border-border bg-white/95 text-ink backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-4 px-4 sm:px-6">
          <EstimuloBrand href="/empreendedor" compact />
          <nav className="mx-auto hidden min-w-0 items-center gap-1 md:flex" aria-label="Navegação principal">{navigation}</nav>
          <div className="ml-auto md:ml-0"><UserMenu email={email} signOutLabel={signOutLabel} /></div>
        </div>
        <div className="border-t border-border/70 md:hidden">
          <nav className="mx-auto flex max-w-[1200px] items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6" aria-label="Navegação principal">{navigation}</nav>
        </div>
      </header>
      <InterfaceSlot area="participant" placement="before_content" />
      <main
        id="conteudo-principal"
        className={`${wideLesson ? "w-full min-w-0" : "mx-auto w-full max-w-[1200px]"}`}
        tabIndex={-1}
      >
        {children}
      </main>
      <InterfaceSlot area="participant" placement="after_content" />
      <InterfaceSlot area="participant" placement="footer" />
    </div>
  );
}
