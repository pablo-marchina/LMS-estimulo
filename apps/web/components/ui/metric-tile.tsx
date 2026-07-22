import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const accents = ["bg-primary", "bg-accent-cyan", "bg-success", "bg-accent-magenta"];

export function MetricTile({
  label,
  value,
  meta,
  index = 0,
  className
}: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <article className={cn("rounded-xl border border-border bg-surface p-5", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted">
        <span className={cn("size-2 shrink-0 rounded-full", accents[index % accents.length])} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums text-ink">{value}</p>
      {meta ? <div className="mt-1 text-sm text-primary">{meta}</div> : null}
    </article>
  );
}
