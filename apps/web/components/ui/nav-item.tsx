"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function NavItem({
  href,
  children,
  icon,
  variant = "light",
  exact = false,
  className
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: "light" | "dark";
  exact?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-ring)",
        variant === "dark"
          ? isActive
            ? "bg-white text-primary"
            : "text-white/85 hover:bg-white/10 hover:text-white"
          : isActive
            ? "bg-primary text-white"
            : "text-ink hover:bg-primary-soft",
        className
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
