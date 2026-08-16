"use client";

import { CheckCircle2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { completeParticipantActivityAction } from "@/app/empreendedor/atividade/[stepInstanceId]/completion-action";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type AssetState = { id: string; completed: boolean };

type Props = {
  completedSections: number;
  sectionTotal: number;
  assets: AssetState[];
};

const completionMessages: Record<string, { tone: string; text: string }> = {
  ok: { tone: "border-success/25 bg-success-soft text-success", text: "Aula concluída. Seu progresso e seus pontos já estão sendo atualizados." },
  conteudo_pendente: { tone: "border-warning/25 bg-warning-soft text-warning", text: "Conclua os materiais obrigatórios antes de finalizar a aula." },
  avaliacao_pendente: { tone: "border-warning/25 bg-warning-soft text-warning", text: "Faça e aprove a verificação desta aula antes de concluir." },
  pratica_pendente: { tone: "border-warning/25 bg-warning-soft text-warning", text: "Esta aula possui uma prática com revisão. A conclusão acontece após o fluxo de envio e revisão." },
  falha: { tone: "border-danger/25 bg-danger-soft text-danger", text: "Não foi possível concluir a aula agora. Recarregue a página e tente novamente." },
};

function routeContext(pathname: string, searchParams: URLSearchParams) {
  const inlineMatch = pathname.match(/^\/empreendedor\/jornada\/([^/]+)/);
  if (inlineMatch) return { journey: inlineMatch[1], step: searchParams.get("conteudo") ?? "" };
  const standaloneMatch = pathname.match(/^\/empreendedor\/atividade\/([^/]+)/);
  if (standaloneMatch) return { journey: searchParams.get("journey") ?? "", step: standaloneMatch[1] };
  return { journey: "", step: "" };
}

export function ActivityContentProgress({ completedSections, sectionTotal, assets }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [assetState, setAssetState] = useState(() => new Map(assets.map((asset) => [asset.id, asset.completed])));
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ assetId?: string; completed?: boolean }>).detail;
      const assetId = detail?.assetId;
      if (!assetId || !detail.completed) return;
      setAssetState((current) => {
        if (current.get(assetId)) return current;
        const next = new Map(current);
        next.set(assetId, true);
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
  const context = routeContext(pathname, searchParams);
  const completion = completionMessages[searchParams.get("conclusao") ?? ""];

  return (
    <section className="brand-progress-panel grid gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm" aria-label="Progresso do conteúdo da atividade">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Seu avanço nesta aula</p>
          <p className="mt-1 text-sm text-muted">{completed} de {total} partes concluídas</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${percentage === 100 ? "bg-success-soft text-success" : "bg-primary-soft text-primary"}`}>
          {percentage === 100 ? <CheckCircle2 size={15} /> : null}{percentage}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${percentage}%` }} />
      </div>

      {completion ? <p role="status" className={`rounded-xl border px-3 py-2.5 text-xs font-semibold leading-5 ${completion.tone}`}>{completion.text}</p> : null}

      {context.journey && context.step ? (
        <form id="concluir-aula" action={completeParticipantActivityAction} className="grid gap-2 border-t border-border pt-3">
          <input type="hidden" name="journey_instance_id" value={context.journey} />
          <input type="hidden" name="step_instance_id" value={context.step} />
          <PendingSubmitButton pendingLabel="Concluindo aula…" size="lg" type="submit" className="w-full shadow-sm">
            <CheckCircle2 size={18} aria-hidden="true" /> Concluir aula
          </PendingSubmitButton>
          <p className="text-center text-[11px] leading-4 text-muted">A conclusão só é confirmada quando os requisitos desta aula estiverem atendidos.</p>
        </form>
      ) : null}
    </section>
  );
}
