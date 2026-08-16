import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const toneStyles = {
  neutral: { wrap: "border-border bg-surface-muted text-ink", icon: null },
  info: { wrap: "border-info/25 bg-info-soft text-info", icon: Info },
  warning: { wrap: "border-warning/25 bg-warning-soft text-warning", icon: AlertTriangle },
  danger: { wrap: "border-danger/25 bg-danger-soft text-danger", icon: AlertTriangle },
  success: { wrap: "border-success/25 bg-success-soft text-success", icon: CheckCircle2 }
} as const;

export function StatusPanel({
  title,
  children,
  tone = "neutral"
}: {
  title: string;
  children: ReactNode;
  tone?: keyof typeof toneStyles;
}) {
  const { wrap, icon: Icon } = toneStyles[tone];
  return (
    <section className={cn("my-5 flex gap-3 rounded-xl border p-5", wrap)} aria-live="polite">
      {Icon ? <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> : null}
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <div className="mt-1 text-sm text-ink/90 [&_p]:m-0">{children}</div>
      </div>
    </section>
  );
}

export function ProgressMeter({ value, label }: { value: number; label: string }) {
  return <Progress value={value * 100} label={label} />;
}
