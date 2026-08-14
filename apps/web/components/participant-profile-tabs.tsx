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
  return <nav aria-label="Seções do perfil" className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-border bg-white p-2 shadow-sm">
    {tabs.map((tab) => {
      const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
      const Icon = tab.icon;
      return <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={cn("inline-flex min-h-11 min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition", active ? "bg-primary text-white shadow-sm" : "text-secondary hover:bg-primary-soft hover:text-primary")}><Icon size={17} aria-hidden="true" />{tab.label}</Link>;
    })}
  </nav>;
}
