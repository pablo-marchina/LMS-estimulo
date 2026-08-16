"use client";

import Link from "next/link";
import { Award, ClipboardList, FileCheck2, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/empreendedor/perfil/diagnostico", label: "Diagnóstico", icon: ClipboardList },
  { href: "/empreendedor/perfil", label: "Informações", icon: UserRound, exact: true },
  { href: "/empreendedor/perfil/entregas", label: "Entregas", icon: FileCheck2 },
  { href: "/empreendedor/perfil/conquistas", label: "Conquistas", icon: Award },
];

export function ParticipantProfileTabs() {
  const pathname = usePathname();
  return <nav aria-label="Seções do perfil" className="mb-8 flex gap-1 overflow-x-auto border-b border-slate-200">
    {tabs.map((tab) => {
      const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
      const Icon = tab.icon;
      return <Link
        key={tab.href}
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "inline-flex min-h-11 min-w-fit items-center justify-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
          active ? "border-primary text-primary" : "border-transparent text-muted hover:text-primary",
        )}
      ><Icon size={16} strokeWidth={1.9} aria-hidden="true" />{tab.label}</Link>;
    })}
  </nav>;
}
