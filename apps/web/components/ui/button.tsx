import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-ring) disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "border border-border-strong bg-surface text-primary hover:border-primary hover:bg-primary-soft active:bg-primary-soft",
  ghost: "text-ink hover:bg-primary-soft active:bg-primary-soft",
  danger: "bg-danger text-white hover:bg-danger/90 active:bg-danger/80"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-sm",
  md: "h-10 px-4.5 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10 p-0"
};

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}

export type ButtonProps = BaseButtonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variantClasses[variant], sizeClasses[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = BaseButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  href,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(base, variantClasses[variant], sizeClasses[size], className)} href={href} {...props}>
      {icon}
      {children}
    </Link>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
    </svg>
  );
}
