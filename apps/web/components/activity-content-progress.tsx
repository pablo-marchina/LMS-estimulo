"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";

type AssetState = { id: string; completed: boolean };

type Props = {
  completedSections: number;
  sectionTotal: number;
  assets: AssetState[];
};

export function ActivityContentProgress({ completedSections, sectionTotal, assets }: Props) {
  const [assetState, setAssetState] = useState(() => new Map(assets.map((asset) => [asset.id, asset.completed])));
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ assetId?: string; completed?: boolean }>).detail;
      if (!detail?.assetId || !detail.completed) return;
      setAssetState((current) => {
        if (current.get(detail.assetId)) return current;
        const next = new Map(current);
        next.set(detail.assetId, true);
        return next;
      });
    };
    window.addEventListener("estimulo:asset-progress", listener);
    return () => window.removeEventListener("estimulo:asset-progress", listener);
  }, []);

  const completedAssets = useMemo(() => Array.from(assetState.values()).filter(Boolean).length, [assetState]);
  const total = sectionTotal + assetState.size;
  const completed = Math.min(total, completedSections + completedAssets);
  const percentage = total ? Math.round((completed / total) * 100) : 100;

  return (
    <section className="brand-progress-panel grid gap-3 rounded-2xl border border-primary/15 bg-white p-4 shadow-sm" aria-label="Progresso do conteúdo da atividade">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Seu avanço nesta aula</p>
          <p className="mt-1 text-sm text-muted">{completed} de {total} partes concluídas</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${percentage === 100 ? "bg-success-soft text-success" : "bg-primary-soft text-primary"}`}>
          {percentage === 100 ? <CheckCircle2 size={15} /> : null}{percentage}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-primary-soft" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${percentage}%` }} />
      </div>
    </section>
  );
}