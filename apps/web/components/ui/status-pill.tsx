import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const toneClasses = {
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-muted text-muted",
  expressive: "bg-[color-mix(in_oklab,var(--color-accent-magenta)_18%,white)] text-[#7a1a80]"
} as const;

export function StatusPill({
  children,
  tone = "neutral",
  className
}: {
  children: ReactNode;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", toneClasses[tone], className)}>
      {children}
    </span>
  );
}
