"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Brain, MessageCircle, UploadCloud } from "lucide-react";

type SectionId = "conteudo" | "avaliacao" | "pratica" | "comentarios";

type SectionDefinition = {
  id: SectionId;
  label: string;
  icon: typeof BookOpen;
};

const sectionDefinitions: SectionDefinition[] = [
  { id: "conteudo", label: "Conteúdo", icon: BookOpen },
  { id: "avaliacao", label: "Verificação", icon: Brain },
  { id: "pratica", label: "Prática", icon: UploadCloud },
  { id: "comentarios", label: "Discussão", icon: MessageCircle },
];

function sectionFromLocation(available: SectionId[]): SectionId {
  const hash = window.location.hash.slice(1) as SectionId;
  if (available.includes(hash)) return hash;

  const query = new URLSearchParams(window.location.search);
  if (query.has("avaliacao") && available.includes("avaliacao")) return "avaliacao";
  if (query.has("pratica") && available.includes("pratica")) return "pratica";
  if (query.has("comentario") && available.includes("comentarios")) return "comentarios";
  return available[0] ?? "conteudo";
}

export function ActivityCompactWorkspace() {
  const [available, setAvailable] = useState<SectionId[]>([]);
  const [active, setActive] = useState<SectionId>("conteudo");
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);

  const detectSections = useCallback((root: HTMLElement) => {
    const detected = sectionDefinitions
      .filter((section) => root.querySelector(`#${section.id}`))
      .map((section) => section.id);

    setAvailable(detected);
    setActive((current) => {
      const next = detected.includes(current) ? current : sectionFromLocation(detected);
      root.dataset.activeSection = next;
      return next;
    });
  }, []);

  const selectSection = useCallback((section: SectionId, behavior: ScrollBehavior = "smooth") => {
    const root = rootRef.current;
    if (!root) return;

    setActive(section);
    root.dataset.activeSection = section;
    const url = new URL(window.location.href);
    url.hash = section;
    window.history.replaceState(window.history.state, "", url);
    root.scrollIntoView({ block: "start", behavior });
  }, []);

  useEffect(() => {
    const root = anchorRef.current?.closest<HTMLElement>("[data-activity-workspace]") ?? null;
    if (!root) return;

    const activityPage = root.querySelector<HTMLElement>("[data-activity-page]");
    rootRef.current = root;
    detectSections(root);

    // Server Actions replace the activity page while the surrounding lesson
    // workspace persists. Observe only that replaceable region so rendering
    // the tabs themselves cannot retrigger the observer.
    const observer = activityPage ? new MutationObserver(() => detectSections(root)) : null;
    observer?.observe(activityPage, { childList: true, subtree: true });

    const syncHash = () => selectSection(sectionFromLocation(
      sectionDefinitions
        .filter((section) => root.querySelector(`#${section.id}`))
        .map((section) => section.id),
    ));
    const followSectionLink = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href^='#']") : null;
      if (!target || !root.contains(target)) return;
      const section = target.getAttribute("href")?.slice(1) as SectionId | undefined;
      if (!section || !sectionDefinitions.some((item) => item.id === section)) return;
      event.preventDefault();
      selectSection(section);
    };

    window.addEventListener("hashchange", syncHash);
    root.addEventListener("click", followSectionLink, true);

    return () => {
      observer?.disconnect();
      window.removeEventListener("hashchange", syncHash);
      root.removeEventListener("click", followSectionLink, true);
      delete root.dataset.activeSection;
      rootRef.current = null;
    };
  }, [detectSections, selectSection]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || available.length < 2) return;
    event.preventDefault();
    const currentIndex = Math.max(0, available.indexOf(active));
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? available.length - 1
        : event.key === "ArrowRight"
          ? (currentIndex + 1) % available.length
          : (currentIndex - 1 + available.length) % available.length;
    selectSection(available[nextIndex]);
  }

  return (
    <div ref={anchorRef} className={available.length ? "mx-auto w-full max-w-[1480px] px-4 pt-4 sm:px-5 lg:px-7 lg:pt-5" : "hidden"}>
      {available.length ? (
        <div
          role="tablist"
          aria-label="Etapas da aula"
          onKeyDown={handleKeyDown}
          className="sticky top-16 z-20 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-white/95 p-1.5 shadow-sm backdrop-blur sm:flex"
        >
          {sectionDefinitions.filter((section) => available.includes(section.id)).map((section) => {
            const Icon = section.icon;
            const selected = active === section.id;
            return (
              <button
                key={section.id}
                id={`tab-${section.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={section.id}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectSection(section.id)}
                className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${selected ? "bg-primary text-white shadow-sm" : "text-muted hover:bg-primary-soft hover:text-primary"}`}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
