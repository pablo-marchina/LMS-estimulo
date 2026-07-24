import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  tone = "light",
  className
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-4 rounded-xl p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8",
        dark ? "brand-hero text-white" : "brand-page-header border border-border",
        className
      )}
    >
      <div className="relative z-10 max-w-2xl">
        {eyebrow ? (
          <p className={cn("mb-2 text-xs font-bold uppercase tracking-[.14em]", dark ? "text-brand-cyan" : "text-primary")}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className={cn("display-font text-2xl sm:text-3xl", dark ? "text-white" : "text-ink")}>{title}</h1>
        {description ? (
          <p className={cn("mt-2 text-sm leading-6 sm:text-base", dark ? "text-white/85" : "text-muted")}>{description}</p>
        ) : null}
      </div>
      {actions ? <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
