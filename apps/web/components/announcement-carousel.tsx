"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ParticipantAnnouncement } from "@/lib/engagement/contracts";

function isInternalHref(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

const artwork = [
  "/brand/announcement-openai.svg",
  "/brand/announcement-diagnostic.svg",
  "/brand/announcement-achievements.svg",
];

const fallbackAnnouncements: ParticipantAnnouncement[] = [
  {
    id: "welcome-openai",
    title: "Aprenda IA com a Estímulo e a OpenAI",
    body: "Explore três trilhas práticas para vender melhor, organizar o negócio e transformar ideias em soluções digitais.",
    cta_label: "Conhecer a jornada",
    cta_url: "/empreendedor/jornadas",
    priority: 100,
    starts_at: null,
    ends_at: null,
  },
  {
    id: "welcome-diagnostic",
    title: "Descubra o seu perfil empreendedor",
    body: "Responda ao diagnóstico e receba uma experiência mais adequada ao momento do seu negócio.",
    cta_label: "Fazer diagnóstico",
    cta_url: "/empreendedor/perfil",
    priority: 90,
    starts_at: null,
    ends_at: null,
  },
  {
    id: "welcome-achievements",
    title: "Transforme evolução em conquistas",
    body: "Acompanhe selos, certificados e resultados de cada etapa concluída na plataforma.",
    cta_label: "Ver conquistas",
    cta_url: "/empreendedor/conquistas",
    priority: 80,
    starts_at: null,
    ends_at: null,
  },
];

export function AnnouncementCarousel({ announcements }: { announcements: ParticipantAnnouncement[] }) {
  const slides = useMemo(() => announcements.length ? announcements : fallbackAnnouncements, [announcements]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const goTo = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const normalized = (index + slides.length) % slides.length;
    const target = viewport.children.item(normalized) as HTMLElement | null;
    target?.scrollIntoView({ behavior, block: "nearest", inline: "start" });
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

  return (
    <section className="brand-carousel animate-in" aria-labelledby="anuncios-titulo">
      <div className="brand-carousel-heading">
        <div>
          <p className="brand-kicker">Novidades para você</p>
          <h2 id="anuncios-titulo" className="display-font mt-1 text-2xl text-secondary sm:text-3xl">Acontecendo agora</h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => goTo(active - 1)} className="brand-carousel-control" aria-label="Anúncio anterior"><ChevronLeft size={20} /></button>
          <button type="button" onClick={() => goTo(active + 1)} className="brand-carousel-control" aria-label="Próximo anúncio"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div
        ref={viewportRef}
        onScroll={syncActiveSlide}
        className="brand-carousel-viewport"
        role="region"
        aria-label="Carrossel de anúncios"
        tabIndex={0}
      >
        {slides.map((announcement, index) => (
          <article key={announcement.id} className="brand-carousel-slide" aria-label={`Anúncio ${index + 1} de ${slides.length}`}>
            <img src={artwork[index % artwork.length]} alt="" className="brand-carousel-image" aria-hidden="true" />
            <div className="brand-carousel-overlay" aria-hidden="true" />
            <div className="brand-carousel-copy">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-bold uppercase tracking-[.12em] text-white backdrop-blur-sm"><Sparkles size={13} /> Estímulo em movimento</span>
              <h3 className="display-font mt-4 max-w-2xl text-3xl leading-none text-white sm:text-4xl lg:text-5xl">{announcement.title}</h3>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">{announcement.body}</p>
              {announcement.cta_label && announcement.cta_url ? (
                isInternalHref(announcement.cta_url) ? (
                  <Link href={announcement.cta_url} className="brand-carousel-cta">{announcement.cta_label}</Link>
                ) : (
                  <a href={announcement.cta_url} target="_blank" rel="noopener noreferrer" className="brand-carousel-cta">{announcement.cta_label}</a>
                )
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2" aria-label="Selecionar anúncio">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => goTo(index)}
            className={`h-2.5 rounded-full transition-all ${active === index ? "w-9 bg-primary" : "w-2.5 bg-border-strong hover:bg-primary/45"}`}
            aria-label={`Mostrar anúncio ${index + 1}`}
            aria-current={active === index ? "true" : undefined}
          />
        ))}
      </div>
    </section>
  );
}
