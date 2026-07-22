import { cn } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary",
        className
      )}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}
