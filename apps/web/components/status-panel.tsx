import type { ReactNode } from "react";

export function StatusPanel({ title, children, tone = "neutral" }: { title: string; children: ReactNode; tone?: "neutral" | "info" | "warning" | "success" }) {
  return (
    <section className={`status-panel status-panel--${tone}`} aria-live="polite">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

export function ProgressMeter({ value, label }: { value: number; label: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="progress-block">
      <div className="progress-label"><span>{label}</span><strong>{percent}%</strong></div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
