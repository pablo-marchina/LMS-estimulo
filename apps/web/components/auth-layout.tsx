import type { ReactNode } from "react";
import { EstimuloBrand } from "@/components/estimulo-brand";
import { cn } from "@/lib/utils";

export function AuthLayout({
  eyebrow,
  title,
  description,
  wide = false,
  children
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-primary p-4 sm:p-6">
      <section className={cn("w-full rounded-xl bg-surface p-6 shadow-lg sm:p-10", wide ? "max-w-xl" : "max-w-md")}>
        <EstimuloBrand centered className="mb-6" />
        <div className="mb-6 text-center">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
          <h1 className="display-font text-2xl text-ink">{title}</h1>
          {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
        </div>
        {children}
      </section>
    </main>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const toneClasses = {
    error: "border-danger/25 bg-danger-soft text-danger",
    success: "border-success/25 bg-success-soft text-success",
    info: "border-info/25 bg-info-soft text-info"
  } as const;
  return (
    <p role={tone === "error" ? "alert" : "status"} className={cn("mb-5 rounded-lg border px-4 py-3 text-sm font-medium", toneClasses[tone])}>
      {children}
    </p>
  );
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 grid gap-3 border-t border-border pt-5 text-center text-sm">{children}</div>;
}
