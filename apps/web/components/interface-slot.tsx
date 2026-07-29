"use client";

import { usePathname } from "next/navigation";
import { useInterfaceContent } from "@/components/interface-content-provider";
import { ButtonLink } from "@/components/ui/button";
import { interfaceEntriesForRoute } from "@/lib/interface-content/contracts";
import { cn } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  info: "border-info/20 bg-info-soft text-info",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  primary: "border-primary/20 bg-primary-soft text-secondary",
  neutral: "border-border bg-surface text-ink",
};

function safeHref(value: unknown) {
  return typeof value === "string" && (value.startsWith("/") || value.startsWith("https://")) ? value : null;
}

function safeImage(value: unknown) {
  return typeof value === "string" && (value.startsWith("/") || value.startsWith("https://")) ? value : null;
}

export function InterfaceSlot({
  area,
  placement,
}: {
  area: "admin" | "participant" | "public" | "shared";
  placement: "before_content" | "after_content" | "footer";
}) {
  const pathname = usePathname();
  const content = useInterfaceContent();
  const entries = interfaceEntriesForRoute(content, { area, pathname, placement });
  if (!entries.length) return null;

  return (
    <section className="mx-auto grid w-full max-w-[1400px] gap-3 px-5 py-3 lg:px-9" aria-label="Conteúdo configurável">
      {entries.map(({ key, value }) => {
        const type = typeof value._element_type === "string" ? value._element_type : "text";
        const title = typeof value.title === "string" ? value.title : "";
        const text = typeof value.text === "string" ? value.text : "";
        const body = typeof value.body === "string" ? value.body : "";
        const href = safeHref(value.href);
        const image = safeImage(value.image_url);
        const tone = typeof value.tone === "string" ? value.tone : "neutral";

        if (type === "image" && image) {
          return (
            <figure key={key} className="overflow-hidden rounded-2xl border border-border bg-white">
              <img src={image} alt={typeof value.alt === "string" ? value.alt : ""} className="max-h-80 w-full object-cover" />
              {text ? <figcaption className="px-4 py-3 text-sm text-muted">{text}</figcaption> : null}
            </figure>
          );
        }

        if ((type === "button" || type === "link") && href) {
          return <ButtonLink key={key} href={href} variant={type === "button" ? "primary" : "secondary"} className="w-fit">{text || title || "Abrir"}</ButtonLink>;
        }

        if (type === "notice" || type === "section" || type === "element") {
          return (
            <article key={key} className={cn("rounded-2xl border p-4", toneClasses[tone] ?? toneClasses.neutral)}>
              {title ? <h2 className="font-semibold">{title}</h2> : null}
              {body || text ? <p className="mt-1 whitespace-pre-line text-sm leading-6">{body || text}</p> : null}
              {href ? <ButtonLink href={href} variant="secondary" size="sm" className="mt-3 w-fit">{typeof value.button_text === "string" && value.button_text ? value.button_text : "Saiba mais"}</ButtonLink> : null}
            </article>
          );
        }

        return text ? <p key={key} className="whitespace-pre-line text-sm leading-6 text-muted">{text}</p> : null;
      })}
    </section>
  );
}
