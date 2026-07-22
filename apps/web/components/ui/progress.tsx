import { cn } from "@/lib/utils";

export function Progress({
  value,
  label,
  tone = "primary",
  className
}: {
  /** Percentage from 0 to 100. Convert fractions (e.g. 0-1 progress ratios) before passing in. */
  value: number;
  label?: string;
  tone?: "primary" | "success";
  className?: string;
}) {
  const percent = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label ? (
        <div className="flex items-center justify-between text-sm font-medium text-ink">
          <span>{label}</span>
          <span className="tabular-nums text-muted">{percent}%</span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-primary-soft"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-(--ease-out-expo)",
            tone === "success" ? "bg-success" : "bg-primary"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
