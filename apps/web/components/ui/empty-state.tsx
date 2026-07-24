import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const toneClasses = {
  neutral: "border-border bg-surface-muted",
  info: "border-info/25 bg-info-soft",
  warning: "border-warning/25 bg-warning-soft",
  success: "border-success/25 bg-success-soft"
} as const;

export function EmptyState({
  icon,
  title,
  children,
  action,
  tone = "neutral",
  className
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-lg border p-8 text-center", toneClasses[tone], className)}
      aria-live="polite"
    >
      {icon ? <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-surface text-primary">{icon}</div> : null}
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {children ? <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
