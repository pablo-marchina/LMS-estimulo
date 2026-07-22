import Link from "next/link";
import type { ParticipantAnnouncement } from "@/lib/engagement/contracts";

function isInternalHref(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

export function AnnouncementCarousel({ announcements }: { announcements: ParticipantAnnouncement[] }) {
  if (!announcements.length) return null;
  return <section className="announcement-section stack" aria-labelledby="anuncios-titulo">
    <div className="section-heading-row">
      <h2 id="anuncios-titulo">Acontecendo agora</h2>
      <p className="support-note">Deslize horizontalmente para ver os anúncios.</p>
    </div>
    <div className="announcement-carousel" role="region" aria-label="Carrossel de anúncios" tabIndex={0}>
      {announcements.map((announcement, index) => <article className="announcement-slide" key={announcement.id} aria-label={`Anúncio ${index + 1} de ${announcements.length}`}>
        <h3>{announcement.title}</h3>
        <p>{announcement.body}</p>
        {announcement.cta_label && announcement.cta_url ? (
          isInternalHref(announcement.cta_url)
            ? <Link className="button button--secondary" href={announcement.cta_url}>{announcement.cta_label}</Link>
            : <a className="button button--secondary" href={announcement.cta_url} target="_blank" rel="noopener noreferrer">{announcement.cta_label}</a>
        ) : null}
      </article>)}
    </div>
  </section>;
}
