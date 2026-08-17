"use client";

import Link from "next/link";
import { Award, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { BadgeAward } from "@/lib/credentials/contracts";

const STORAGE_KEY = "estimulo:seen-badge-awards:v1";

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
    // The notification is best-effort when browser storage is unavailable.
  }
}

export function BadgeAcquisitionPopup({ badges }: BadgeAcquisitionPopupProps) {
  const orderedBadges = useMemo(
    () => badges.slice().sort((left, right) => Date.parse(left.awarded_at) - Date.parse(right.awarded_at)),
    [badges],
  );
  const [queue, setQueue] = useState<BadgeAward[]>([]);

  useEffect(() => {
    const seen = readSeenAwards();
    const currentIds = new Set(orderedBadges.map((badge) => badge.award_id));

    // The first visit establishes a baseline so historical badges are not presented
    // as if they had just been earned. Subsequent participant navigations reveal only
    // awards that appeared after that baseline.
    if (seen === null) {
      persistSeenAwards(currentIds);
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
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/30 p-4 backdrop-blur-[2px]" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-acquisition-title"
        aria-describedby="badge-acquisition-description"
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
      >
        <button
          type="button"
          onClick={dismissCurrent}
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-muted transition hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Fechar aviso de conquista"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary" aria-hidden="true">
          <Award size={30} strokeWidth={2.2} />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-primary">Nova conquista</p>
        <h2 id="badge-acquisition-title" className="mt-1 pr-8 text-2xl font-black text-secondary">
          Você conquistou um novo selo!
        </h2>
        <div id="badge-acquisition-description" className="mt-3 grid gap-1.5">
          <strong className="text-base text-ink">{current.title}</strong>
          {current.description ? <p className="text-sm leading-6 text-muted">{current.description}</p> : null}
          {current.journey_title ? <p className="text-xs font-semibold text-muted">Jornada: {current.journey_title}</p> : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/empreendedor/perfil/conquistas"
            onClick={dismissCurrent}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Ver conquistas
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
