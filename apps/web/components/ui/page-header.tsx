"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useInterfaceContent } from "@/components/interface-content-provider";
import { interfaceText, interfaceVisible, pageHeaderCmsPrefix } from "@/lib/interface-content/contracts";
import { cn } from "@/lib/utils";

function safeMediaUrl(value: unknown) {
  return typeof value === "string" && (value.startsWith("/") || value.startsWith("https://")) ? value : null;
}

function interpolateInterfaceVariables(value: string, variables: Record<string, string>) {
  return value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (token, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : token;
  });
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  tone = "light",
  className,
  cmsKey,
  variables = {},
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: "light" | "dark";
  className?: string;
  cmsKey?: string;
  variables?: Record<string, string>;
}) {
  const pathname = usePathname();
  const content = useInterfaceContent();
  const prefix = cmsKey ?? pageHeaderCmsPrefix(pathname);
  const mediaKey = `${prefix}.media`;
  const media = content[mediaKey] ?? {};
  const participant = pathname === "/empreendedor" || pathname.startsWith("/empreendedor/");
  const desktopImage = media.image_file_object_id
    ? `/api/interface-content/image?key=${encodeURIComponent(mediaKey)}&variant=desktop`
    : safeMediaUrl(media.image_url);
  const mobileImage = media.mobile_image_file_object_id
    ? `/api/interface-content/image?key=${encodeURIComponent(mediaKey)}&variant=mobile`
    : safeMediaUrl(media.mobile_image_url) ?? desktopImage;
  const hasMedia = !participant && interfaceVisible(content, mediaKey, false) && Boolean(desktopImage);
  const configuredLayout = typeof media.layout_variant === "string" ? media.layout_variant : "";
  const layoutVariant = ["compact", "default", "wide", "hero"].includes(configuredLayout)
    ? configuredLayout
    : hasMedia ? "hero" : "compact";
  const dark = !participant && (tone === "dark" || hasMedia);
  const resolvedEyebrow = eyebrow ? interpolateInterfaceVariables(interfaceText(content, `${prefix}.eyebrow`, eyebrow), variables) : "";
  const resolvedTitle = typeof title === "string" ? interpolateInterfaceVariables(interfaceText(content, `${prefix}.title`, title), variables) : title;
  const resolvedDescription = typeof description === "string" ? interpolateInterfaceVariables(interfaceText(content, `${prefix}.description`, description), variables) : description;
  const objectPosition = typeof media.image_position === "string" && media.image_position.trim() ? media.image_position : "center";
  const overlayOpacity = typeof media.overlay_opacity === "number" && Number.isFinite(media.overlay_opacity)
    ? Math.min(0.9, Math.max(0, media.overlay_opacity))
    : 0.48;

  if (participant) {
    return (
      <header className={cn("mb-6 flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
        <div className="min-w-0 max-w-2xl">
          {resolvedEyebrow && interfaceVisible(content, `${prefix}.eyebrow`) ? (
            <p data-interface-content-key={`${prefix}.eyebrow`} className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-muted">{resolvedEyebrow}</p>
          ) : null}
          {interfaceVisible(content, `${prefix}.title`) ? (
            <h1 data-interface-content-key={`${prefix}.title`} className="text-[26px] font-bold leading-tight tracking-[-.02em] text-primary sm:text-[32px]">{resolvedTitle}</h1>
          ) : null}
          {resolvedDescription && interfaceVisible(content, `${prefix}.description`) ? (
            <p data-interface-content-key={`${prefix}.description`} className="mt-2 text-[15px] leading-relaxed text-muted">{resolvedDescription}</p>
          ) : null}
        </div>
        {actions ? <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:shrink-0">{actions}</div> : null}
      </header>
    );
  }

  return (
    <header
      className={cn(
        "relative isolate flex flex-col overflow-hidden rounded-xl sm:flex-row sm:items-end sm:justify-between",
        "mb-5 gap-3 sm:gap-4",
        layoutVariant === "compact" ? "p-4 sm:p-5" : layoutVariant === "wide" ? "p-5 sm:p-7" : "p-5 sm:p-6",
        hasMedia && layoutVariant === "hero" ? "min-h-44 sm:min-h-52" : "",
        hasMedia && layoutVariant === "wide" ? "min-h-36 sm:min-h-40" : "",
        dark ? "brand-hero text-white" : "brand-page-header border border-border",
        className,
      )}
    >
      {hasMedia ? (
        <>
          <picture data-interface-content-key={mediaKey} className="absolute inset-0 -z-20">
            {mobileImage ? <source media="(max-width: 639px)" srcSet={mobileImage} /> : null}
            <img
              src={desktopImage ?? undefined}
              alt={typeof media.alt === "string" ? media.alt : ""}
              className="h-full w-full object-cover"
              style={{ objectPosition } as CSSProperties}
            />
          </picture>
          <div className="absolute inset-0 -z-10 bg-black" style={{ opacity: overlayOpacity }} aria-hidden="true" />
        </>
      ) : null}
      <div className="relative z-10 max-w-2xl">
        {resolvedEyebrow && interfaceVisible(content, `${prefix}.eyebrow`) ? (
          <p data-interface-content-key={`${prefix}.eyebrow`} className={cn("mb-2 text-xs font-bold uppercase tracking-[.14em]", dark ? "text-brand-cyan" : "text-primary")}>{resolvedEyebrow}</p>
        ) : null}
        {interfaceVisible(content, `${prefix}.title`) ? (
          <h1 data-interface-content-key={`${prefix}.title`} className={cn("display-font text-2xl sm:text-3xl", dark ? "text-white" : "text-ink")}>{resolvedTitle}</h1>
        ) : null}
        {resolvedDescription && interfaceVisible(content, `${prefix}.description`) ? (
          <p data-interface-content-key={`${prefix}.description`} className={cn("mt-2 text-sm leading-6 sm:text-base", dark ? "text-white/90" : "text-muted")}>{resolvedDescription}</p>
        ) : null}
      </div>
      {actions ? <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
