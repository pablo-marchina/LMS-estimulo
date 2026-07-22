"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  items,
  defaultValue,
  className
}: {
  items: { value: string; label: string; content: ReactNode }[];
  defaultValue?: string;
  className?: string;
}) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value);
  const baseId = useId();

  return (
    <div className={className}>
      <div role="tablist" aria-label="Seções" className="flex flex-wrap gap-1 rounded-lg bg-surface-muted p-1">
        {items.map((item) => {
          const selected = item.value === active;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              onClick={() => setActive(item.value)}
              className={cn(
                "rounded-md px-3.5 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-ring)",
                selected ? "bg-surface text-primary shadow-xs" : "text-muted hover:text-ink"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`${baseId}-panel-${item.value}`}
          aria-labelledby={`${baseId}-tab-${item.value}`}
          hidden={item.value !== active}
          className="mt-5"
        >
          {item.value === active ? item.content : null}
        </div>
      ))}
    </div>
  );
}
