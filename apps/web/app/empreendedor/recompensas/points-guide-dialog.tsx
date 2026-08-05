"use client";

import { CircleHelp, X } from "lucide-react";
import { useRef } from "react";
import type { ParticipantPointRule } from "@/lib/engagement/contracts";

const frequencyLabels: Record<ParticipantPointRule["frequency"], string> = {
  once: "uma vez",
  per_activity: "por atividade",
  per_assessment: "por avaliação",
  per_path: "por trilha",
  per_journey: "por jornada",
  daily: "por dia",
  weekly: "por semana",
  unlimited: "sem limite de frequência",
};

export function PointsGuideDialog({ rules }: { rules: ParticipantPointRule[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        id="como-funciona"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <CircleHelp size={17} aria-hidden="true" />
        Como funciona?
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="guia-pontos-titulo"
        className="m-auto w-[min(92vw,44rem)] rounded-[1.75rem] border border-border bg-white p-0 text-ink shadow-2xl backdrop:bg-secondary/65 backdrop:backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            <p className="brand-kicker">Pontos e recompensas</p>
            <h2 id="guia-pontos-titulo" className="display-font mt-1 text-3xl text-secondary">Como funciona?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Conclua ações elegíveis, acumule pontos de engajamento e converta parte deles em pontos de recompensa.</p>
          </div>
          <button type="button" onClick={() => dialogRef.current?.close()} className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-muted hover:bg-surface-muted hover:text-ink" aria-label="Fechar explicação"><X size={19} /></button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          {rules.length ? (
            <ol className="grid gap-3">
              {rules.map((rule) => (
                <li key={rule.definition_id} className="rounded-2xl border border-border bg-surface-muted/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-secondary">{rule.name}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted">{rule.description}</p>
                    </div>
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-black text-primary">+{rule.amount}</span>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-muted">Frequência: {frequencyLabels[rule.frequency]}. {rule.maximum_awards > 0 ? `Limite de ${rule.maximum_awards} concessões.` : "Sem limite adicional configurado."}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm leading-6 text-muted">As regras ativas de pontuação aparecerão aqui assim que forem publicadas pela administração.</p>
          )}
          <p className="mt-5 text-xs leading-5 text-muted">O ranking usa apenas pontos de aprendizagem da plataforma. Ele não representa avaliação financeira, crédito ou desempenho comercial.</p>
        </div>
      </dialog>
    </>
  );
}
