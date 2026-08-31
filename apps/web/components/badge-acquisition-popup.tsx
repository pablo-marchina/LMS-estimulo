"use client";

import Link from "next/link";
import { Award, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { BadgeAward } from "@/lib/credentials/contracts";

const STORAGE_KEY = "estimulo:seen-badge-awards:v2";

type BadgeAcquisitionPopupProps = {
  badges: BadgeAward[];
};

function readSeenAwards(): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set<string>();
  }
}

function persistSeenAwards(seen: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // The celebration remains usable even when browser storage is unavailable.
  }
}

export function BadgeAcquisitionPopup({ badges }: BadgeAcquisitionPopupProps) {
  const orderedBadges = useMemo(
    () => badges
      .filter((badge) => badge.status === "active")
      .slice()
      .sort((left, right) => Date.parse(left.awarded_at) - Date.parse(right.awarded_at)),
    [badges],
  );
  const [queue, setQueue] = useState<BadgeAward[]>([]);

  useEffect(() => {
    if (!orderedBadges.length) return;

    const seen = readSeenAwards();
    if (seen === null) {
      // A missing browser baseline does not mean an award was just granted. Mark
      // the currently known history as seen so a new browser/device cannot replay
      // an old badge as a fresh acquisition. Future awards will still be detected
      // when their award_id first appears after this baseline is established.
      persistSeenAwards(new Set(orderedBadges.map((badge) => badge.award_id)));
      setQueue([]);
      return;
    }

    const unseen = orderedBadges.filter((badge) => !seen.has(badge.award_id));
    if (unseen.length) setQueue(unseen);
  }, [orderedBadges]);

  const current = queue[0] ?? null;
  if (!current) return null;

  function dismissCurrent() {
    const seen = readSeenAwards() ?? new Set<string>();
    seen.add(current.award_id);
    persistSeenAwards(seen);
    setQueue((value) => value.slice(1));
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/35 p-4 backdrop-blur-[3px]" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-acquisition-title"
        aria-describedby="badge-acquisition-description"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/20 bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="pointer-events-none absolute -right-7 -top-8 text-primary/10" aria-hidden="true">
          <Sparkles size={120} strokeWidth={1.4} />
        </div>
        <button
          type="button"
          onClick={dismissCurrent}
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full text-muted transition hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Fechar celebração da conquista"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="relative grid size-20 place-items-center rounded-3xl bg-primary-soft text-primary shadow-sm" aria-hidden="true">
          <Award size={42} strokeWidth={2.1} />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-primary">Nova conquista</p>
        <h2 id="badge-acquisition-title" className="mt-1 pr-8 text-2xl font-black leading-tight text-secondary">
          Parabéns! Você conquistou o selo {current.title}!
        </h2>
        <div id="badge-acquisition-description" className="mt-4 grid gap-2">
          {current.description ? <p className="text-sm leading-6 text-muted">{current.description}</p> : null}
          {current.journey_title ? <p className="text-xs font-semibold text-muted">Conquistado em: {current.journey_title}</p> : null}
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/empreendedor/conquistas"
            onClick={dismissCurrent}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Ver minha conquista
          </Link>
          <button
            type="button"
            onClick={dismissCurrent}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-secondary transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Continuar
          </button>
        </div>
      </section>
    </div>
  );
}
