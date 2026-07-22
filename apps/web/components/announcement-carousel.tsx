import Link from "next/link";
import type { ParticipantAnnouncement } from "@/lib/engagement/contracts";
import { ButtonLink } from "@/components/ui/button";

function isInternalHref(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

const backgrounds = ["bg-primary", "bg-[#0020D8]", "bg-[#7B1FA2]"];

export function AnnouncementCarousel({ announcements }: { announcements: ParticipantAnnouncement[] }) {
  if (!announcements.length) return null;
  return (
    <section className="mb-8" aria-labelledby="anuncios-titulo">
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 id="anuncios-titulo" className="text-xl font-semibold text-ink">
          Acontecendo agora
        </h2>
        <p className="hidden text-sm text-muted sm:block">Deslize horizontalmente para ver os anúncios.</p>
      </div>
      <div
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        role="region"
        aria-label="Carrossel de anúncios"
        tabIndex={0}
      >
        {announcements.map((announcement, index) => (
          <article
            key={announcement.id}
            className={`flex min-h-40 w-[min(78vw,360px)] shrink-0 snap-start flex-col justify-end gap-2 rounded-xl p-6 text-white ${backgrounds[index % backgrounds.length]}`}
            aria-label={`Anúncio ${index + 1} de ${announcements.length}`}
          >
            <h3 className="text-lg font-semibold">{announcement.title}</h3>
            <p className="text-sm text-white/85">{announcement.body}</p>
            {announcement.cta_label && announcement.cta_url ? (
              isInternalHref(announcement.cta_url) ? (
                <ButtonLink href={announcement.cta_url} variant="secondary" size="sm" className="mt-2 self-start !border-white !bg-white !text-primary">
                  {announcement.cta_label}
                </ButtonLink>
              ) : (
                <Link
                  href={announcement.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex h-8 items-center self-start rounded-full bg-white px-3.5 text-sm font-semibold text-primary hover:bg-white/90"
                >
                  {announcement.cta_label}
                </Link>
              )
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
