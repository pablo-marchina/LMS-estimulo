import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function TableScroll({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-x-auto rounded-xl border border-border", className)} {...props} />;
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse text-sm", className)} {...props} />;
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-border bg-surface-muted px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted",
        className
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-border px-4 py-3 text-ink", className)} {...props} />;
}
