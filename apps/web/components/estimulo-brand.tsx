import Link from "next/link";
import { cn } from "@/lib/utils";

const OFFICIAL_ESTIMULO_LOGO_PATH = "/brand/estimulo-logo-horizontal-color.svg";

export function EstimuloBrand({
  href,
  centered = false,
  compact = false,
  invert = false,
  className
}: {
  href?: string;
  centered?: boolean;
  compact?: boolean;
  invert?: boolean;
  className?: string;
}) {
  const content = (
    <img
      className={cn(compact ? "h-9 w-auto" : "h-14 w-auto", invert ? "brightness-0 invert" : undefined)}
      src={OFFICIAL_ESTIMULO_LOGO_PATH}
      width={480}
      height={208}
      alt="Estímulo"
      loading="eager"
      decoding="async"
      fetchPriority="high"
    />
  );

  const wrapperClassName = cn("inline-flex items-center", centered && "w-full justify-center", className);

  return href ? (
    <Link className={wrapperClassName} href={href} aria-label="Plataforma Estímulo — início">
      {content}
    </Link>
  ) : (
    <div className={wrapperClassName}>{content}</div>
  );
}
