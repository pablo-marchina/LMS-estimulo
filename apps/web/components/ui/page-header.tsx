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
  const mediaKey = `${prefix}.media`;
  const media = content[mediaKey];
  const desktopMediaId = typeof media?.image_file_object_id === "string" ? media.image_file_object_id : "";
  const mobileMediaId = typeof media?.mobile_image_file_object_id === "string" ? media.mobile_image_file_object_id : desktopMediaId;
  const hasMedia = Boolean(desktopMediaId && interfaceVisible(content, mediaKey, false));
  const dark = tone === "dark" || hasMedia;
  const participant = pathname === "/empreendedor" || pathname.startsWith("/empreendedor/");
  const resolvedEyebrow = eyebrow ? interfaceText(content, `${prefix}.eyebrow`, eyebrow) : "";
  const resolvedTitle = typeof title === "string" ? interfaceText(content, `${prefix}.title`, title) : title;
  const resolvedDescription = typeof description === "string" ? interfaceText(content, `${prefix}.description`, description) : description;
  const imagePosition = media?.image_position === "top" || media?.image_position === "bottom" ? media.image_position : "center";

  return (
    <header className={cn(
      "relative flex flex-col overflow-hidden rounded-xl sm:flex-row sm:items-end sm:justify-between",
      participant ? "mb-4 min-h-40 gap-3 p-5 sm:min-h-48 sm:p-6" : "mb-8 gap-4 p-6 sm:p-8",
      dark ? "brand-hero text-white" : "brand-page-header border border-border",
      className,
    )}>
      {hasMedia ? (
        <>
          <picture className="absolute inset-0">
            <source media="(max-width: 767px)" srcSet={`/api/interface-media/${mobileMediaId}`} />
            <img
              src={`/api/interface-media/${desktopMediaId}`}
              alt={typeof media?.alt === "string" ? media.alt : ""}
              className="size-full object-cover"
              style={{ objectPosition: imagePosition }}
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/15" aria-hidden="true" />
        </>
      ) : null}

      <div className="relative z-10 max-w-2xl">
        {resolvedEyebrow && interfaceVisible(content, `${prefix}.eyebrow`) ? <p data-interface-content-key={`${prefix}.eyebrow`} className={cn("mb-2 text-xs font-bold uppercase tracking-[.14em]", dark ? "text-brand-cyan" : "text-primary")}>{resolvedEyebrow}</p> : null}
        {interfaceVisible(content, `${prefix}.title`) ? <h1 data-interface-content-key={`${prefix}.title`} className={cn("display-font text-2xl sm:text-3xl", dark ? "text-white" : "text-ink")}>{resolvedTitle}</h1> : null}
        {resolvedDescription && interfaceVisible(content, `${prefix}.description`) ? <p data-interface-content-key={`${prefix}.description`} className={cn("mt-2 text-sm leading-6 sm:text-base", dark ? "text-white/90" : "text-muted")}>{resolvedDescription}</p> : null}
      </div>
      {actions ? <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
