"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useInterfaceContent } from "@/components/interface-content-provider";
import { interfaceText, interfaceVisible, pageHeaderCmsPrefix } from "@/lib/interface-content/contracts";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  tone = "light",
  className,
  cmsKey,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: "light" | "dark";
  className?: string;
  cmsKey?: string;
}) {
  const pathname = usePathname();
  const content = useInterfaceContent();
  const prefix = cmsKey ?? pageHeaderCmsPrefix(pathname);
  const dark = tone === "dark";
  const participant = pathname === "/empreendedor" || pathname.startsWith("/empreendedor/");
  const resolvedEyebrow = eyebrow ? interfaceText(content, `${prefix}.eyebrow`, eyebrow) : "";
  const resolvedTitle = typeof title === "string" ? interfaceText(content, `${prefix}.title`, title) : title;
  const resolvedDescription = typeof description === "string" ? interfaceText(content, `${prefix}.description`, description) : description;

  return (
    <header className={cn(
      "flex flex-col rounded-xl sm:flex-row sm:items-end sm:justify-between",
      participant ? "mb-4 gap-3 p-5 sm:p-6" : "mb-8 gap-4 p-6 sm:p-8",
      dark ? "brand-hero text-white" : "brand-page-header border border-border",
      className,
    )}>
      <div className="relative z-10 max-w-2xl">
        {resolvedEyebrow && interfaceVisible(content, `${prefix}.eyebrow`) ? <p data-interface-content-key={`${prefix}.eyebrow`} className={cn("mb-2 text-xs font-bold uppercase tracking-[.14em]", dark ? "text-brand-cyan" : "text-primary")}>{resolvedEyebrow}</p> : null}
        {interfaceVisible(content, `${prefix}.title`) ? <h1 data-interface-content-key={`${prefix}.title`} className={cn("display-font text-2xl sm:text-3xl", dark ? "text-white" : "text-ink")}>{resolvedTitle}</h1> : null}
        {resolvedDescription && interfaceVisible(content, `${prefix}.description`) ? <p data-interface-content-key={`${prefix}.description`} className={cn("mt-2 text-sm leading-6 sm:text-base", dark ? "text-white/85" : "text-muted")}>{resolvedDescription}</p> : null}
      </div>
      {actions ? <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
