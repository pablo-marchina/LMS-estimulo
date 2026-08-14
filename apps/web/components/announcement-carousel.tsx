"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ParticipantAnnouncement } from "@/lib/engagement/contracts";

function isInternalHref(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

const artwork = [
  "/brand/announcement-openai.svg",
  "/brand/announcement-diagnostic.svg",
  "/brand/announcement-achievements.svg",
];

function BannerImage({ announcement, index }: { announcement: ParticipantAnnouncement; index: number }) {
  const desktopSrc = announcement.image_file_object_id
    ? `/api/announcements/${announcement.id}/image`
    : artwork[index % artwork.length];
  const mobileSrc = announcement.mobile_image_file_object_id
    ? `/api/announcements/${announcement.id}/image?variant=mobile`
    : desktopSrc;
  return <picture><source media="(max-width: 639px)" srcSet={mobileSrc} /><img src={desktopSrc} alt={announcement.image_alt ?? ""} className="brand-carousel-image" /></picture>;
}

function SlideLink({ announcement, index }: { announcement: ParticipantAnnouncement; index: number }) {
  if (!announcement.cta_url) return null;
  const label = announcement.cta_label?.trim() || announcement.title || `Abrir anúncio ${index + 1}`;
  return isInternalHref(announcement.cta_url)
    ? <Link href={announcement.cta_url} aria-label={label} className="absolute inset-0 z-20"><span className="sr-only">{label}</span></Link>
    : <a href={announcement.cta_url} aria-label={label} className="absolute inset-0 z-20"><span className="sr-only">{label}</span></a>;
}

export function AnnouncementCarousel({ announcements }: { announcements: ParticipantAnnouncement[] }) {
  const slides = announcements;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const goTo = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const viewport = viewportRef.current;
    if (!viewport || !slides.length) return;
    const normalized = (index + slides.length) % slides.length;
    const target = viewport.children.item(normalized) as HTMLElement | null;
    if (target) viewport.scrollTo({ left: target.offsetLeft, behavior });
    setActive(normalized);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => goTo(active + 1), 6500);
    return () => window.clearInterval(timer);
  }, [active, goTo, slides.length]);

  const syncActiveSlide = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const children = Array.from(viewport.children) as HTMLElement[];
    const nearest = children.reduce((best, child, index) => {
      const distance = Math.abs(child.offsetLeft - viewport.scrollLeft);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Number.POSITIVE_INFINITY });
    setActive(nearest.index);
  }, []);

  if (!slides.length) return null;

  return (
    <section className="brand-carousel animate-in" aria-labelledby="anuncios-titulo">
      <div className="brand-carousel-heading">
        <div><p className="brand-kicker">DESCUBRA</p><h2 id="anuncios-titulo" className="display-font mt-1 text-2xl text-secondary sm:text-3xl">Novidades para você</h2></div>
        {slides.length > 1 ? <div className="flex items-center gap-2"><button type="button" onClick={() => goTo(active - 1)} className="brand-carousel-control" aria-label="Anúncio anterior"><ChevronLeft size={20} /></button><button type="button" onClick={() => goTo(active + 1)} className="brand-carousel-control" aria-label="Próximo anúncio"><ChevronRight size={20} /></button></div> : null}
      </div>

      <div ref={viewportRef} onScroll={syncActiveSlide} className="brand-carousel-viewport" role="region" aria-label="Carrossel de anúncios" tabIndex={0}>
        {slides.map((announcement, index) => {
          const imageOnly = announcement.display_mode === "image_only";
          return (
            <article key={announcement.id} className="brand-carousel-slide !h-[38svh] !max-h-[38svh] !min-h-0 !aspect-auto max-[720px]:!h-[36svh] max-[720px]:!max-h-[36svh]" aria-label={`Anúncio ${index + 1} de ${slides.length}: ${announcement.title}`}>
              <BannerImage announcement={announcement} index={index} />
              {imageOnly ? <span className="sr-only">{announcement.title}. {announcement.body}</span> : <><div className="brand-carousel-overlay" aria-hidden="true" /><div className="brand-carousel-copy"><span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-bold uppercase tracking-[.12em] text-white backdrop-blur-sm"><Sparkles size={13} /> Estímulo em movimento</span><h3 className="display-font mt-4 max-w-2xl text-3xl leading-none text-white sm:text-4xl lg:text-5xl">{announcement.title}</h3><p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">{announcement.body}</p></div></>}
              <SlideLink announcement={announcement} index={index} />
            </article>
          );
        })}
      </div>

      {slides.length > 1 ? <div className="mt-3 flex items-center justify-center gap-2" aria-label="Selecionar anúncio">{slides.map((slide, index) => <button key={slide.id} type="button" onClick={() => goTo(index)} className={`h-2.5 rounded-full transition-all ${active === index ? "w-9 bg-primary" : "w-2.5 bg-border-strong hover:bg-primary/45"}`} aria-label={`Mostrar anúncio ${index + 1}`} aria-current={active === index ? "true" : undefined} />)}</div> : null}
    </section>
  );
}
