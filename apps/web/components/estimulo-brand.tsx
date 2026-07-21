import Link from "next/link";

const OFFICIAL_ESTIMULO_LOGO_PATH = "/brand/estimulo-logo-horizontal-color.svg";

export function EstimuloBrand({
  href,
  centered = false,
  compact = false
}: {
  href?: string;
  centered?: boolean;
  compact?: boolean;
}) {
  const className = [
    "brand",
    "brand--official",
    centered ? "brand--center" : null,
    compact ? "brand--compact" : null
  ].filter(Boolean).join(" ");

  const content = (
    <span className="brand-logo-clearspace">
      <img
        className="brand-logo"
        src={OFFICIAL_ESTIMULO_LOGO_PATH}
        width={480}
        height={208}
        alt="Estímulo"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    </span>
  );

  return href
    ? <Link className={className} href={href} aria-label="Plataforma Estímulo — início">{content}</Link>
    : <div className={className}>{content}</div>;
}
