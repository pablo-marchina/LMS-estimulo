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
  className,
  interfaceContentKey,
  onNavigate,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: "light" | "dark" | "top";
  exact?: boolean;
  className?: string;
  interfaceContentKey?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      data-interface-content-key={interfaceContentKey}
      onClick={onNavigate}
      className={cn(
        "focus-ring flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-[background-color,color,transform] duration-150",
        variant === "dark"
          ? isActive ? "bg-white !text-primary" : "!text-white/75 hover:bg-white/10 hover:!text-white"
          : variant === "top"
            ? isActive ? "bg-primary-soft !text-primary shadow-sm" : "!text-secondary hover:bg-slate-100 hover:!text-primary"
            : isActive ? "bg-primary text-white" : "text-ink hover:bg-primary-light",
        className,
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
