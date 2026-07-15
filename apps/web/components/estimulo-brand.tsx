import Link from "next/link";

const OFFICIAL_ESTIMULO_LOGO_URL =
  "https://cdn.prod.website-files.com/63dbfdf887f6a1cca0e4cbcc/641253f973926c213bb9dabd_logo-estimulo.png";

export function EstimuloBrand({
  href,
  centered = false,
  compact = false
}: {
  href?: string;
  centered?: boolean;
  compact?: boolean;
}) {
  const logoUrl = process.env.NEXT_PUBLIC_ESTIMULO_LOGO_URL?.trim() || OFFICIAL_ESTIMULO_LOGO_URL;
  const className = [
    "brand",
    "brand--official",
    centered ? "brand--center" : null,
    compact ? "brand--compact" : null
  ].filter(Boolean).join(" ");

  const content = (
    <>
      <span className="brand-logo-frame">
        <img
          className="brand-logo"
          src={logoUrl}
          width={180}
          height={64}
          alt="Estímulo"
          loading="eager"
          referrerPolicy="no-referrer"
        />
      </span>
      {compact ? null : <span className="brand-caption">Desenvolvimento do empreendedor</span>}
    </>
  );

  return href
    ? <Link className={className} href={href} aria-label="Plataforma Estímulo — início">{content}</Link>
    : <div className={className}>{content}</div>;
}
